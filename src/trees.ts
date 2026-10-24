import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Area, Building, Road } from "./types";

/** 绿地内程序化散植示意树 + 行道树（避开水面、道路与建筑）。
 *  四种模板（阔叶/小阔叶/棕榈/针叶）+ 实例色 + 四季换色 + 近远双档 LOD，
 *  对标 gxu 植被方案（avenues 间距/路口净空、no-tree 禁区、双档树冠）。
 *  OSM 无树点数据，此处为装饰性分布，密度按绿地类型区分。 */

export type Season = "spring" | "summer" | "autumn" | "winter";
export const SEASON_KEYS: Season[] = ["spring", "summer", "autumn", "winter"];

type Pt = [number, number];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bbox(pts: Pt[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

export function shoelace(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

export function pointInPoly(x: number, y: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distPointSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const DENSITY: Record<string, number> = { forest: 1 / 300, park: 1 / 350, grass: 1 / 700 };
const MAX_PER_AREA = 500;
const MAX_TOTAL = 3600;
const JUNCTION_CLEAR = 7; // 路口净空（米），gxu 同款
const LOD_NEAR = 300; // 近档树冠半径（米）
const LOD_REFRESH = 30; // 相机移动超过该距离才重分档

// ---- 行道树按路种配置（gxu avenues 数据化：间距/偏移/品种配比）----
const AVENUE_BY_KIND: Record<string, { step: number; off: number; mix: [number, number] }> = {
  trunk: { step: 12, off: 1.0, mix: [0.9, 0.1] },
  primary: { step: 12, off: 1.0, mix: [0.9, 0.1] },
  secondary: { step: 12, off: 1.0, mix: [0.85, 0.15] },
  tertiary: { step: 12, off: 0.8, mix: [0.8, 0.2] },
  residential: { step: 11, off: 0.8, mix: [0.75, 0.25] },
  service: { step: 10, off: 0.4, mix: [0.35, 0.65] },
  pedestrian: { step: 9, off: 0.3, mix: [0.3, 0.7] },
};

// ---- 四季树冠色板（春花粉降饱和、秋叶暖色、冬常绿灰调）----
const SPRING_FLOWER = 0xd2a9b6; // 春季粉花树（樱/紫荆示意，降饱和）
const AUTUMN_RED = 0xa65a32; // 秋季红叶（黄葛/乌桕示意）
const SEASON_PALETTES: number[][][] = [
  // 0 阔叶
  [
    [0x5d8a4f, 0x6fa35e, 0x54824a], // 夏（原色）
    [0x8cad60, 0x99b96c, 0x82a358], // 春：嫩绿
    [0xb08a45, 0xa8763c, 0xbfa050], // 秋：黄褐
    [0x6f7f5c, 0x7b8a66, 0x62704f], // 冬：灰绿
  ],
  // 1 小阔叶
  [
    [0x74a862, 0x86b573, 0x6a9c58],
    [0x93b877, 0xa2c483, 0x8aad6c],
    [0xb5974a, 0xab7f42, 0xc0a558],
    [0x77875f, 0x83936b, 0x6b7a57],
  ],
  // 2 棕榈（常绿）
  [
    [0x6f9c52, 0x82a95e],
    [0x6f9c52, 0x82a95e],
    [0x6f9c52, 0x82a95e],
    [0x687f4d, 0x74855a],
  ],
  // 3 针叶（松，四季常绿偏冷）
  [
    [0x3e5c3d, 0x476846, 0x36523a],
    [0x446546, 0x4c7049, 0x3d5a40],
    [0x3e5c3d, 0x476846, 0x36523a],
    [0x3a5239, 0x426045, 0x334d38],
  ],
];
const SEASON_ORDER: Record<Season, number> = { summer: 0, spring: 1, autumn: 2, winter: 3 };

// ---- 四种树冠模板（低模椭球团/圆锥，近档单棵 ≤200 三角形，远档单椭球）----

function ellipsoid(sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 0);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return g;
}

function broadleafCrown(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [ellipsoid(2.3, 1.9, 2.3, 0, 5.4, 0)];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    parts.push(ellipsoid(1.7, 1.4, 1.7, Math.cos(a) * 1.9, 4.4 + (i % 2) * 0.7, Math.sin(a) * 1.9));
  }
  return mergeGeometries(parts)!;
}

function smallCrown(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [ellipsoid(1.8, 1.6, 1.8, 0, 4.6, 0)];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    parts.push(ellipsoid(1.3, 1.1, 1.3, Math.cos(a) * 1.3, 3.8, Math.sin(a) * 1.3));
  }
  return mergeGeometries(parts)!;
}

function palmCrown(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const g = new THREE.IcosahedronGeometry(1, 0);
    g.scale(2.6, 0.22, 0.55);
    g.rotateZ(-0.45);
    g.rotateY(-a);
    g.translate(Math.cos(a) * 1.5, 5.3 - (i % 2) * 0.3, Math.sin(a) * 1.5);
    parts.push(g);
  }
  return mergeGeometries(parts)!;
}

function coniferCrown(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const tiers: [number, number, number][] = [[2.5, 3.2, 3.0], [2.0, 2.8, 5.2], [1.4, 2.4, 7.0]];
  for (const [r, h, y] of tiers) {
    const g = new THREE.ConeGeometry(r, h, 7);
    g.translate(0, y, 0);
    parts.push(g);
  }
  return mergeGeometries(parts)!;
}

/** 远档树冠：单椭球/圆锥（近档的廉价替身） */
function farCrown(ti: number): THREE.BufferGeometry {
  if (ti === 3) return new THREE.ConeGeometry(2.4, 6.8, 6).translate(0, 4.9, 0);
  if (ti === 2) return ellipsoid(2.4, 1.1, 2.4, 0, 5.3, 0);
  if (ti === 1) return ellipsoid(2.1, 1.9, 2.1, 0, 4.4, 0);
  return ellipsoid(2.9, 2.4, 2.9, 0, 5.1, 0);
}

export interface TreeSystem {
  count: number;
  applySeason(s: Season): void;
  /** 相机移动超过阈值时将近景树切换到细几何，远景用廉价几何 */
  updateLod(cam: THREE.Vector3): void;
}

interface ManualArea extends Area {
  role?: string;
}

export function buildTrees(
  parent: THREE.Object3D,
  green: Area[],
  roads: Road[],
  water: Area[],
  buildings: Building[],
  boundary?: Pt[] | null,
  manualZones: ManualArea[] = [],
): TreeSystem {
  const rng = mulberry32(20261013);
  const treeZones = manualZones.filter((z) => !z.role);
  const noTreePolys = manualZones.filter((z) => z.role === "no-tree").map((z) => z.outers[0]).filter(Boolean) as Pt[][];
  const pinePolys = manualZones.filter((z) => z.role === "pine").map((z) => z.outers[0]).filter(Boolean) as Pt[][];
  const inPolyList = (polys: Pt[][], x: number, y: number): boolean => {
    for (const p of polys) if (pointInPoly(x, y, p)) return true;
    return false;
  };

  // 校外人工植树区（private/manual_green）：区内允许越界种植
  const inManualZone = (x: number, y: number): boolean =>
    treeZones.some((z) => z.outers[0] && pointInPoly(x, y, z.outers[0]));

  // 避让结构：水面多边形 / 道路段 / 楼栋多边形（含校外楼，均带 bbox 粗筛）
  const roadBoxes = roads.map((r) => ({ bbox: bbox(r.pts), half: r.width / 2 + 2.5, pts: r.pts }));
  const waterBoxes = water.map((w) => ({ bbox: bbox(w.outers[0]), pts: w.outers[0] }));
  const buildingBoxes = buildings.map((b) => ({ bbox: bbox(b.polygon), pts: b.polygon }));
  const sportsBoxes = green.filter(g=>g.kind==='pitch'||g.kind==='track'||g.kind==='pool')
    .flatMap(g=>g.outers.map(pts=>({bbox:bbox(pts),pts})));
  const planted=new Map<string,Pt[]>(),cell=7;
  const remember=(x:number,y:number):void=>{const k=`${Math.floor(x/cell)},${Math.floor(y/cell)}`;if(!planted.has(k))planted.set(k,[]);planted.get(k)!.push([x,y]);};

  function blocked(x: number, y: number): boolean {
    if (noTreePolys.length && inPolyList(noTreePolys, x, y)) return true; // 开阔草坪/广场禁区
    if (boundary && !pointInPoly(x, y, boundary) && !inManualZone(x, y)) return true; // 校界外仅人工植树区可种
    const gx=Math.floor(x/cell),gy=Math.floor(y/cell);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)
      if(planted.get(`${gx+dx},${gy+dy}`)?.some(p=>Math.hypot(x-p[0],y-p[1])<6.2))return true;
    for(const sb of sportsBoxes) {
      if(x<sb.bbox[0]-3||x>sb.bbox[2]+3||y<sb.bbox[1]-3||y>sb.bbox[3]+3)continue;
      if(pointInPoly(x,y,sb.pts)||sb.pts.some((p,i)=>distPointSeg(x,y,...p,...sb.pts[(i+1)%sb.pts.length])<3.1))return true;
    }
    for (const wb of waterBoxes) {
      if (x >= wb.bbox[0] && x <= wb.bbox[2] && y >= wb.bbox[1] && y <= wb.bbox[3]
        && pointInPoly(x, y, wb.pts)) return true;
    }
    for (const rb of roadBoxes) {
      if (x < rb.bbox[0] - rb.half || x > rb.bbox[2] + rb.half
        || y < rb.bbox[1] - rb.half || y > rb.bbox[3] + rb.half) continue;
      const pts = rb.pts;
      for (let i = 0; i < pts.length - 1; i++) {
        if (distPointSeg(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < rb.half) return true;
      }
    }
    for (const bb of buildingBoxes) {
      if (x < bb.bbox[0] - 4.2 || x > bb.bbox[2] + 4.2 || y < bb.bbox[1] - 4.2 || y > bb.bbox[3] + 4.2) continue;
      if (pointInPoly(x, y, bb.pts)) return true;
      if(bb.pts.some((p,i)=>distPointSeg(x,y,...p,...bb.pts[(i+1)%bb.pts.length])<4.2))return true;
    }
    return false;
  }

  // 路口净空点：车行级道路共享顶点聚类（gxu junctionClearance 同思路）
  const junctions: Pt[] = [];
  {
    const grid = new Map<string, { p: Pt; roads: Set<number> }>();
    for (let ri = 0; ri < roads.length; ri++) {
      const k = roads[ri].kind;
      if (k === "footway" || k === "path" || k === "steps" || k === "cycleway") continue;
      for (const [x, y] of roads[ri].pts) {
        const key = `${Math.round(x / 2)},${Math.round(y / 2)}`;
        const cellHit = grid.get(key);
        if (cellHit) cellHit.roads.add(ri);
        else grid.set(key, { p: [x, y], roads: new Set([ri]) });
      }
    }
    for (const c of grid.values()) if (c.roads.size >= 2) junctions.push(c.p);
  }
  const nearJunction = (x: number, y: number): boolean => {
    for (const [jx, jy] of junctions) {
      if (Math.abs(x - jx) > JUNCTION_CLEAR || Math.abs(y - jy) > JUNCTION_CLEAR) continue;
      if (Math.hypot(x - jx, y - jy) < JUNCTION_CLEAR) return true;
    }
    return false;
  };

  // 每棵树记录：模板/位置/缩放/朝向/色彩种子（供四季换色与 LOD 重分档零成本重建）
  interface TreeRec { x: number; y: number; ti: number; sc: number; rot: number; r1: number; r2: number; r3: number }
  const recs: TreeRec[] = [];
  const push = (x: number, y: number, ti: number): void => {
    recs.push({ x, y, ti, sc: 0.88 + rng() * 0.34, rot: rng() * Math.PI * 2,
      r1: rng(), r2: rng(), r3: rng() });
    remember(x, y);
  };
  let total = 0;

  // 缙湖环湖花带让位：岸线 24m 内散植树保留 38%（花灌木由 vegetation 层呈现，行道树不受影响）
  const jinOutline = water.find((w) => w.name === "缙湖")?.outers[0];
  const nearShore = (x: number, y: number): boolean => {
    if (!jinOutline) return false;
    for (let i = 0; i < jinOutline.length; i++) {
      const [ax, ay] = jinOutline[i];
      const [bx, by] = jinOutline[(i + 1) % jinOutline.length];
      if (distPointSeg(x, y, ax, ay, bx, by) < 24) return true;
    }
    return false;
  };

  // 采样布点：绿地内散植（松林公园区针叶化）
  for (const g of green) {
    const outer = g.outers[0];
    if (!outer) continue;
    if (boundary && !pointInPoly(outer[0][0], outer[0][1], boundary)) continue;
    let density = DENSITY[g.kind ?? "park"];
    if (!density) continue;
    const n = Math.min(MAX_PER_AREA, Math.floor(shoelace(outer) * density));
    const [x0, y0, x1, y1] = bbox(outer);
    let accepted = 0;
    let attempts = 0;
    while (accepted < n && attempts < n * 10 && total < MAX_TOTAL) {
      attempts++;
      const x = x0 + rng() * (x1 - x0);
      const y = y0 + rng() * (y1 - y0);
      if (!pointInPoly(x, y, outer)) continue;
      if (blocked(x, y)) continue;
      if (nearShore(x, y) && rng() < 0.85) continue;
      const pine = pinePolys.length > 0 && inPolyList(pinePolys, x, y);
      let ti: number;
      if (pine) ti = rng() < 0.85 ? 3 : 0; // 松林公园：针叶为主夹阔叶
      else {
        const r = rng();
        ti = r < 0.66 ? 0 : r < 0.91 ? 1 : 2;
      }
      push(x, y, ti);
      accepted++;
      total++;
    }
  }

  // 人工植树区散植（校外：医院院区等，阔叶/小阔叶）
  for (const z of treeZones) {
    const outer = z.outers[0];
    if (!outer) continue;
    const n = Math.min(220, Math.floor(shoelace(outer) / 260));
    const [x0, y0, x1, y1] = bbox(outer);
    let accepted = 0;
    let attempts = 0;
    while (accepted < n && attempts < n * 10 && total < MAX_TOTAL) {
      attempts++;
      const x = x0 + rng() * (x1 - x0);
      const y = y0 + rng() * (y1 - y0);
      if (!pointInPoly(x, y, outer)) continue;
      if (blocked(x, y)) continue;
      push(x, y, rng() < 0.75 ? 0 : 1);
      accepted++;
      total++;
    }
  }

  // 行道树：按路种配置双侧成列（gxu avenues：间距/偏移/品种），路口留空
  for (const r of roads) {
    const cfg = AVENUE_BY_KIND[r.kind];
    if (!cfg) continue; // footway/path/steps/track/cycleway 不种
    const pts = r.pts;
    if (pts.length < 2) continue;
    const off = r.width / 2 + cfg.off + 4.3;
    let acc = cfg.step * 0.5;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const segLen = Math.hypot(x2 - x1, y2 - y1);
      if (!segLen) continue;
      const dx = (x2 - x1) / segLen;
      const dy = (y2 - y1) / segLen;
      while (acc < segLen) {
        const px = x1 + dx * acc;
        const py = y1 + dy * acc;
        acc += cfg.step;
        for (const side of [1, -1] as const) {
          const tx = px - dy * off * side;
          const ty = py + dx * off * side;
          if (blocked(tx, ty) || nearJunction(tx, ty)) continue;
          if (nearShore(tx, ty) && rng() < 0.8) continue; // 环湖 24m 内行道树稀疏让位花带
          const mix = rng();
          const ti = mix < cfg.mix[0] ? 0 : 1;
          push(tx, ty, ti);
          total++;
        }
      }
      acc -= segLen;
    }
  }
  if (!total) return { count: 0, applySeason: () => {}, updateLod: () => {} };

  // 材质与几何（近/远双档）
  const nearGeos = [broadleafCrown(), smallCrown(), palmCrown(), coniferCrown()];
  const farGeos = [farCrown(0), farCrown(1), farCrown(2), farCrown(3)];
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.4, 4.2, 6);
  trunkGeo.translate(0, 2.1, 0);
  const coniferTrunkGeo = new THREE.CylinderGeometry(0.14, 0.3, 3.4, 5);
  coniferTrunkGeo.translate(0, 1.7, 0);
  const palmTrunkGeo = new THREE.CylinderGeometry(0.16, 0.3, 5.6, 6);
  palmTrunkGeo.translate(0, 2.8, 0);
  const trunkGeos = [trunkGeo, trunkGeo, palmTrunkGeo, coniferTrunkGeo];
  const crownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a7256, roughness: 0.95 });

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const c = new THREE.Color();

  const byTemplate: TreeRec[][] = [[], [], [], []];
  for (const rec of recs) byTemplate[rec.ti].push(rec);

  // 每模板：树干全量 + 近/远双档树冠（容量=该模板总数，count 动态）
  let season: Season = "summer";
  const nearMeshes: (THREE.InstancedMesh | null)[] = [null, null, null, null];
  const farMeshes: (THREE.InstancedMesh | null)[] = [null, null, null, null];
  const colorOf = (rec: TreeRec, out: THREE.Color): THREE.Color => {
    const pal = SEASON_PALETTES[rec.ti][SEASON_ORDER[season]];
    let hex = pal[Math.floor(rec.r1 * pal.length) % pal.length];
    if (rec.ti === 0 && season === "spring" && rec.r2 < 0.16) hex = SPRING_FLOWER;
    if (rec.ti === 0 && season === "autumn" && rec.r2 > 0.8) hex = AUTUMN_RED;
    return out.setHex(hex).offsetHSL((rec.r3 - 0.5) * 0.03, (rec.r3 - 0.5) * 0.1, (rec.r2 - 0.5) * 0.06);
  };

  for (let ti = 0; ti < 4; ti++) {
    const list = byTemplate[ti];
    if (!list.length) continue;
    const trunks = new THREE.InstancedMesh(trunkGeos[ti], trunkMat, list.length);
    const near = new THREE.InstancedMesh(nearGeos[ti], crownMat, list.length);
    const far = new THREE.InstancedMesh(farGeos[ti], crownMat, list.length);
    list.forEach((rec, i) => {
      e.set(0, rec.rot, 0);
      q.setFromEuler(e);
      s.set(rec.sc, rec.sc, rec.sc);
      v.set(rec.x, 0, -rec.y);
      m.compose(v, q, s);
      trunks.setMatrixAt(i, m);
      // 初始全部进远档，首次 updateLod 分档
      far.setMatrixAt(i, m);
      colorOf(rec, c);
      far.setColorAt(i, c);
      near.setColorAt(i, c);
    });
    trunks.castShadow = true;
    near.castShadow = true;
    far.castShadow = false; // 远档不投影，省阴影开销
    parent.add(trunks, near, far);
    nearMeshes[ti] = near;
    farMeshes[ti] = far;
  }

  const writeColors = (ti: number): void => {
    const near = nearMeshes[ti];
    const far = farMeshes[ti];
    if (!near || !far) return;
    byTemplate[ti].forEach((rec, i) => {
      colorOf(rec, c);
      near.setColorAt(i, c);
      far.setColorAt(i, c);
    });
    near.instanceColor!.needsUpdate = true;
    far.instanceColor!.needsUpdate = true;
  };

  let lastCam = new THREE.Vector3(1e9, 0, 0);
  const sys: TreeSystem = {
    count: total,
    applySeason(next: Season): void {
      if (next === season) return;
      season = next;
      for (let ti = 0; ti < 4; ti++) writeColors(ti);
    },
    updateLod(cam: THREE.Vector3): void {
      if (cam.distanceToSquared(lastCam) < LOD_REFRESH * LOD_REFRESH) return;
      lastCam.copy(cam);
      const cx = cam.x, cz = cam.z;
      for (let ti = 0; ti < 4; ti++) {
        const near = nearMeshes[ti];
        const far = farMeshes[ti];
        if (!near || !far) continue;
        let ni = 0, fi = 0;
        for (const rec of byTemplate[ti]) {
          const dx = rec.x - cx;
          const dz = -rec.y - cz;
          e.set(0, rec.rot, 0);
          q.setFromEuler(e);
          s.set(rec.sc, rec.sc, rec.sc);
          v.set(rec.x, 0, -rec.y);
          m.compose(v, q, s);
          colorOf(rec, c);
          const isNear = dx * dx + dz * dz < LOD_NEAR * LOD_NEAR;
          if (isNear) { near.setMatrixAt(ni, m); near.setColorAt(ni, c); ni++; }
          else { far.setMatrixAt(fi, m); far.setColorAt(fi, c); fi++; }
        }
        near.count = ni;
        far.count = fi;
        near.instanceMatrix.needsUpdate = true;
        far.instanceMatrix.needsUpdate = true;
        if (near.instanceColor) near.instanceColor.needsUpdate = true;
        if (far.instanceColor) far.instanceColor.needsUpdate = true;
      }
    },
  };
  // 首帧立即分档
  sys.updateLod(new THREE.Vector3(0, 0, 0));
  return sys;
}
