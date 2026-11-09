import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SceneData } from "./types";
import type { CampusConfig } from "./campuses/types";

/** 校区总览沙盘（campusId=all）：各校区建筑轮廓挤出低模摆件陈列。
 *  点击摆件进入对应校区；在建/未实施校区为虚线占位基座。 */

export interface OverviewBuild {
  group: THREE.Group;
  /** 点击拾取（按校区 id） */
  pickMeshes: THREE.Mesh[];
  dispose(): void;
}

const SLOT_SIZE = 150; // 摆件归一化尺寸（米）

function campusBaseColor(id: string): number {
  if (id === "huxi") return 0xc0604a;      // 虎溪：馆红
  if (id === "shapingba") return 0x8a8578; // 沙坪坝：暖灰
  return 0x7d8a94;                          // 占位：青灰
}

async function fetchOutline(url: string): Promise<[number, number][][] | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as SceneData;
    return data.buildings.filter((b) => b.inside).map((b) => b.polygon as [number, number][]);
  } catch { return null; }
}

/** 轮廓集合 → 归一化居中的挤出低模（合并单 mesh） */
function extrudeOutlines(outlines: [number, number][][]): THREE.BufferGeometry | null {
  const geos: THREE.BufferGeometry[] = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const ring of outlines) {
    for (const [x, y] of ring) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const span = Math.max(x1 - x0, y1 - y0) || 1;
  const scale = SLOT_SIZE / span;
  for (const ring of outlines) {
    if (ring.length < 3) continue;
    const shape = new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2((x - (x0 + x1) / 2) * scale, (y - (y0 + y1) / 2) * scale)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false });
    geos.push(g);
  }
  if (!geos.length) return null;
  return geos.length === 1 ? geos[0] : mergeGeometries(geos)!;
}

export async function buildOverview(
  parent: THREE.Object3D,
  campuses: CampusConfig[],
  addLabel: (text: string, pos: THREE.Vector3, opts: { cls?: string; onClick?: () => void }) => void,
): Promise<OverviewBuild> {
  const group = new THREE.Group();
  group.name = "g-overview";
  parent.add(group);
  const disposables: THREE.BufferGeometry[] = [];
  const pickMeshes: THREE.Mesh[] = [];

  // 台面基座
  const baseGeo = new THREE.CylinderGeometry(190, 200, 4, 64);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xdad7cf, roughness: 0.95 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = -2;
  base.receiveShadow = true;
  group.add(base);
  disposables.push(baseGeo);

  const outlineCache: (THREE.BufferGeometry | null)[] = await Promise.all(
    campuses.map(async (c) => (c.available && c.sceneUrl ? extrudeOutlines((await fetchOutline(c.sceneUrl)) ?? []) : null)),
  );

  campuses.forEach((cfg, i) => {
    const [sx, sz] = cfg.overviewSlot ?? [0, 0];
    const slotGroup = new THREE.Group();
    slotGroup.position.set(sx, 0, sz);
    group.add(slotGroup);

    const geo = outlineCache[i];
    if (geo) {
      const mat = new THREE.MeshStandardMaterial({ color: campusBaseColor(cfg.id), roughness: 0.85 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 2;
      (mesh as THREE.Mesh & { campusId?: string }).campusId = cfg.id;
      slotGroup.add(mesh);
      pickMeshes.push(mesh);
      disposables.push(geo);
    } else {
      // 占位：虚线基座（细环）
      const ringGeo = new THREE.TorusGeometry(SLOT_SIZE * 0.42, 0.8, 6, 48);
      const ringMat = new THREE.MeshBasicMaterial({ color: campusBaseColor(cfg.id), transparent: true, opacity: 0.5 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 2;
      slotGroup.add(ring);
      disposables.push(ringGeo);
      // 占位浅基座
      const padGeo = new THREE.CylinderGeometry(SLOT_SIZE * 0.4, SLOT_SIZE * 0.42, 1.2, 40);
      const pad = new THREE.Mesh(padGeo, new THREE.MeshStandardMaterial({ color: 0xc8c5bd, roughness: 0.95, transparent: true, opacity: 0.7 }));
      pad.position.y = 0.6;
      slotGroup.add(pad);
      disposables.push(padGeo);
    }

    // 校区名标签（点击进校区）
    const labelPos = new THREE.Vector3(sx, geo ? 22 : 14, sz);
    const enter = cfg.available
      ? () => { const w = window as unknown as { __huxi?: { switchCampus?: (id: string) => void } }; w.__huxi?.switchCampus?.(cfg.id); }
      : undefined;
    addLabel(cfg.nameZh, labelPos, { cls: "gate", onClick: enter });
  });

  return {
    group,
    pickMeshes,
    dispose(): void {
      for (const g of disposables) g.dispose();
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) mat.dispose();
        }
      });
      parent.remove(group);
    },
  };
}
