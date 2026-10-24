import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Area, Building, Road } from "./types";
import { pointInPoly, distPointSeg, type Season } from "./trees";

/** 植物园低层植被层（gxu low-planting 思路 + 虎溪植物园特色）：
 *  - 环湖专类园（蔷薇/牡丹/木兰/蕨类/山茶/杜鹃/绣球，官网品种，落位=用户确认"图书馆前湖周围"）
 *  - 含笑漫步道含笑绿篱（OSM 路名实证）
 *  - 私有绿篱/花境（manual_green role:hedge/flowerbed）
 *  - 湖畔路自动花境（2024 官网花境品种三色，降饱和 20%）
 *  - 荷苑荷叶荷花 + 水生植物展示区芦苇
 *  - 松林公园林下蕨类
 *  全部 InstancedMesh 合批（约 6 个 draw call），四季换色只重写实例色。 */

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

interface VegArea extends Area {
  role?: string;
  species?: string;
  params?: { lines?: Pt[][]; width?: number; height?: number };
}

// ---- 环湖专类园品种（官网植物园简介：蔷薇园/牡丹园/木兰园/蕨类园/山茶园/杜鹃园/绣球园）----
// 花色统一降饱和约 20%，避免喧宾夺主（用户已拍板）
interface ShrubSpecies {
  zh: string; en: string; bloom: number; fern?: boolean;
}
const RING_SPECIES: ShrubSpecies[] = [
  { zh: "绣球园", en: "Hydrangea Garden", bloom: 0x9799c2 },
  { zh: "蔷薇园", en: "Rose Garden", bloom: 0xc48ba0 },
  { zh: "木兰园", en: "Magnolia Garden", bloom: 0xd8d2c8 },
  { zh: "山茶园", en: "Camellia Garden", bloom: 0xb55a52 },
  { zh: "杜鹃园", en: "Azalea Garden", bloom: 0xb87a94 },
  { zh: "牡丹园", en: "Peony Garden", bloom: 0xbb6f74 },
  { zh: "蕨类园", en: "Fern Garden", bloom: 0x4f7042, fern: true },
];
// 四季灌木色：春=盛花色，夏=保留 65% 花色（盛夏绣球/紫薇仍盛花），秋=转褐，冬=枯枝灰
const SHRUB_SEASON = (sp: ShrubSpecies): Record<Season, number> => {
  const c = new THREE.Color(sp.bloom);
  const green = new THREE.Color(0x53703f);
  const brown = new THREE.Color(0x8a6a3c);
  const summer = c.clone().lerp(green, 0.35);
  const autumn = c.clone().lerp(brown, 0.5);
  const winter = sp.fern ? 0x50643d : 0x55503f;
  return { spring: sp.bloom, summer: summer.getHex(), autumn: autumn.getHex(), winter };
};

// ---- 2024 花境三色（绣球紫/百子莲蓝/鼠尾草紫红，降饱和 20%）----
const FLOWER_KINDS = [0x9793bd, 0x7f8fb5, 0xa87f95];
const FLOWER_SEASON: Record<Season, (k: number) => number> = {
  spring: (k) => new THREE.Color(k).lerp(new THREE.Color(0xffffff), 0.08).getHex(),
  summer: (k) => k,
  autumn: (k) => new THREE.Color(k).lerp(new THREE.Color(0x8a6a3c), 0.55).getHex(),
  winter: () => 0x4a443c,
};
// 绿篱（含笑常绿小暗绿；黄杨常绿）
const HEDGE_KINDS: Record<string, Record<Season, number>> = {
  michelia: { spring: 0x6d8a52, summer: 0x4d6b45, autumn: 0x49633f, winter: 0x456040 },
  boxwood: { spring: 0x55743f, summer: 0x46603e, autumn: 0x4a5c38, winter: 0x425737 },
};
const MICHELIA_CREAM = 0xd6d0be; // 含笑春花（乳白，稀疏点缀）

export interface VegetationSystem {
  applySeason(s: Season): void;
  /** 环湖专类园标牌（中文键 + 世界坐标），供 labels/i18n 使用 */
  gardenLabels: { zh: string; x: number; y: number }[];
  counts: { bushes: number; hedges: number; flowers: number; beds: number; ringBeds: number; pads: number; reeds: number };
}

function blob(sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 0);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return g;
}

export function buildVegetation(
  parent: THREE.Object3D,
  opts: { green: Area[]; roads: Road[]; water: Area[]; buildings: Building[] },
): VegetationSystem {
  const rng = mulberry32(20261024);
  const { green, roads, water, buildings } = opts;
  const vegGreen = green as VegArea[];

  const roadHit = (x: number, y: number, margin: number): boolean => {
    for (const r of roads) {
      const half = r.width / 2 + margin;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const [ax, ay] = r.pts[i];
        const [bx, by] = r.pts[i + 1];
        const minX = Math.min(ax, bx) - half, maxX = Math.max(ax, bx) + half;
        const minY = Math.min(ay, by) - half, maxY = Math.max(ay, by) + half;
        if (x < minX || x > maxX || y < minY || y > maxY) continue;
        if (distPointSeg(x, y, ax, ay, bx, by) < half) return true;
      }
    }
    return false;
  };
  const waterHit = (x: number, y: number): boolean => water.some((w) => w.outers[0] && pointInPoly(x, y, w.outers[0]));
  const buildingHit = (x: number, y: number, margin: number): boolean =>
    buildings.some((b) => {
      const p = b.polygon;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [px, py] of p) {
        if (px < x0) x0 = px; if (px > x1) x1 = px;
        if (py < y0) y0 = py; if (py > y1) y1 = py;
      }
      if (x < x0 - margin || x > x1 + margin || y < y0 - margin || y > y1 + margin) return false;
      if (pointInPoly(x, y, p)) return true;
      return p.some((q, i) => distPointSeg(x, y, q[0], q[1], p[(i + 1) % p.length][0], p[(i + 1) % p.length][1]) < margin);
    });
  const blocked = (x: number, y: number): boolean =>
    roadHit(x, y, 1.4) || waterHit(x, y) || buildingHit(x, y, 2.2);

  // 实例登记（几何 + 季节色重算种子）
  const bushPos: Pt[] = [], bushSp: number[] = [], bushFern: boolean[] = [], bushJ: number[] = [];
  const hedgePos: Pt[] = [], hedgeYaw: number[] = [], hedgeLen: number[] = [], hedgeH: number[] = [], hedgeW: number[] = [], hedgeKind: string[] = [], hedgeJ: number[] = [];
  const bedPos: Pt[] = [], bedYaw: number[] = [], bedLen: number[] = [], bedKind: number[] = [], bedJ: number[] = [];
  let ringBedCount = 0;
  const flowerPos: Pt[] = [], flowerKind: number[] = [], flowerJ: number[] = [];
  const padPos: Pt[] = [], padScale: number[] = [], padFlower: boolean[] = [], padJ: number[] = [];
  const reedPos: Pt[] = [], reedH: number[] = [], reedJ: number[] = [];
  const gardenLabels: VegetationSystem["gardenLabels"] = [];

  const pushBush = (x: number, y: number, sp: number): void => {
    if (blocked(x, y)) return;
    bushPos.push([x, y]);
    bushSp.push(sp);
    bushFern.push(!!RING_SPECIES[sp].fern);
    bushJ.push(rng());
  };
  const pushFlower = (x: number, y: number): void => {
    if (blocked(x, y)) return;
    flowerPos.push([x, y]);
    flowerKind.push(Math.floor(rng() * FLOWER_KINDS.length));
    flowerJ.push(rng());
  };

  // ---- 环湖专类园：缙湖岸线按周长 6m 步进采样，质心角分 7 扇区，外扩 4-19m 种植带 ----
  const jin = water.find((w) => w.name === "缙湖");
  if (jin?.outers[0]) {
    const ring = jin.outers[0];
    const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    let perim = 0;
    for (let i = 0; i < ring.length; i++) {
      perim += Math.hypot(ring[(i + 1) % ring.length][0] - ring[i][0], ring[(i + 1) % ring.length][1] - ring[i][1]);
    }
    const stationAt = (d: number): { p: Pt; ux: number; uy: number; tx: number; ty: number; ang: number } => {
      let rest = d;
      for (let i = 0; i < ring.length; i++) {
        const [ax, ay] = ring[i];
        const [bx, by] = ring[(i + 1) % ring.length];
        const segLen = Math.hypot(bx - ax, by - ay);
        if (rest <= segLen || i === ring.length - 1) {
          const t = segLen ? Math.min(1, rest / segLen) : 0;
          const px = ax + (bx - ax) * t;
          const py = ay + (by - ay) * t;
          let dx = px - cx, dy = py - cy;
          const len = Math.hypot(dx, dy) || 1;
          dx /= len; dy /= len;
          const tx = segLen ? (bx - ax) / segLen : 1;
          const ty = segLen ? (by - ay) / segLen : 0;
          return { p: [px, py], ux: dx, uy: dy, tx, ty, ang: Math.atan2(py - cy, px - cx) };
        }
        rest -= segLen;
      }
      return { p: ring[0], ux: 1, uy: 0, tx: 1, ty: 0, ang: 0 };
    };
    const nStations = Math.max(40, Math.floor(perim / 6));
    const sectorOf = (ang: number): number => {
      let a = ang + Math.PI * 0.5; // 起点朝北（含笑漫步道一侧）
      if (a < 0) a += Math.PI * 2;
      return Math.floor((a / (Math.PI * 2)) * RING_SPECIES.length) % RING_SPECIES.length;
    };
    const sectorMean: Pt[][] = RING_SPECIES.map(() => []);
    RING_SPECIES.forEach((sp, si) => {
      let placed = 0;
      for (let st = 0; st < nStations; st++) {
        const { p, ux, uy, tx, ty, ang } = stationAt((st / nStations) * perim);
        if (sectorOf(ang) !== si) continue;
        sectorMean[si].push(p);
        const [vx, vy] = p;
        // 环湖花境主带：步道外侧 3.2-4.8m 连续色盒，颜色=本扇区品种色（四季随灌木换色）
        const bedT = 3.2 + rng() * 1.6;
        const bx = vx + ux * bedT;
        const by = vy + uy * bedT;
        if (!waterHit(bx, by) && !buildingHit(bx, by, 1.0) && !roadHit(bx, by, 0)) {
          bedPos.push([bx, by]);
          bedYaw.push(Math.atan2(-ty, tx));
          bedLen.push(6.6);
          bedKind.push(10 + si); // >=10：品种色（RING_SPECIES[si]）
          bedJ.push(rng());
          ringBedCount++;
        }
        const nBush = sp.fern ? 5 : 4;
        for (let k = 0; k < nBush; k++) {
          const t = 2.5 + rng() * 12;
          const lat = (rng() - 0.5) * 8;
          const before = bushPos.length;
          pushBush(vx + ux * t - uy * lat, vy + uy * t + ux * lat, si);
          if (bushPos.length > before) placed++;
        }
        const nFlower = sp.fern ? 0 : 5;
        for (let k = 0; k < nFlower; k++) {
          const t = 2 + rng() * 11;
          const lat = (rng() - 0.5) * 10;
          pushFlower(vx + ux * t - uy * lat, vy + uy * t + ux * lat);
        }
      }
      if (placed > 0 && sectorMean[si].length) {
        const mid = sectorMean[si][Math.floor(sectorMean[si].length / 2)];
        const dx = mid[0] - cx, dy = mid[1] - cy;
        const len = Math.hypot(dx, dy) || 1;
        gardenLabels.push({ zh: sp.zh, x: mid[0] + (dx / len) * 14, y: mid[1] + (dy / len) * 14 });
      }
    });
  }

  // ---- 含笑漫步道：路名实证，双侧含笑绿篱 ----
  const hedgeAlong = (pts: Pt[], width: number, height: number, kind: string, step: number, offset: number): void => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const segLen = Math.hypot(x2 - x1, y2 - y1);
      if (!segLen) continue;
      const dx = (x2 - x1) / segLen, dy = (y2 - y1) / segLen;
      const yaw = Math.atan2(-(y2 - y1), x2 - x1); // 世界系（z=-y）
      for (let acc = step * 0.5; acc < segLen; acc += step) {
        const px = x1 + dx * acc, py = y1 + dy * acc;
        for (const side of [1, -1] as const) {
          const hx = px - dy * offset * side;
          const hy = py + dx * offset * side;
          if (roadHit(hx, hy, 0.2) || waterHit(hx, hy) || buildingHit(hx, hy, 1.2)) continue;
          hedgePos.push([hx, hy]);
          hedgeYaw.push(yaw);
          hedgeLen.push(step * 1.12);
          hedgeH.push(height * (0.9 + rng() * 0.25));
          hedgeW.push(width);
          hedgeKind.push(kind);
          hedgeJ.push(rng());
        }
      }
    }
  };
  for (const r of roads) {
    if (r.name === "含笑漫步道") hedgeAlong(r.pts, 1.8, 1.05, "michelia", 1.5, 2.1);
  }

  // ---- 私有绿篱/花境（manual_green role:hedge/flowerbed）----
  for (const g of vegGreen) {
    if (g.role === "hedge" && g.params?.lines) {
      const w = g.params.width ?? 1.5;
      const h = g.params.height ?? 1.0;
      for (const line of g.params.lines) hedgeAlong(line, w, h, g.species === "michelia" ? "michelia" : "boxwood", 1.7, 0);
    }
    if (g.role === "flowerbed" && g.params?.lines) {
      for (const line of g.params.lines) {
        if (line.length < 2) continue;
        let len = 0;
        for (let i = 0; i < line.length - 1; i++) {
          len += Math.hypot(line[i + 1][0] - line[i][0], line[i + 1][1] - line[i][1]);
        }
        const walkTo = (dist: number): Pt => {
          let rest = dist;
          for (let i = 0; i < line.length - 1; i++) {
            const [ax, ay] = line[i];
            const [bx, by] = line[i + 1];
            const segLen = Math.hypot(bx - ax, by - ay);
            if (rest < segLen || i === line.length - 2) {
              const t = segLen ? Math.min(1, rest / segLen) : 0;
              return [ax + (bx - ax) * t, ay + (by - ay) * t];
            }
            rest -= segLen;
          }
          return line[line.length - 1];
        };
        const dxLine = line[line.length - 1][0] - line[0][0];
        const dyLine = line[line.length - 1][1] - line[0][1];
        for (let acc = 0.6; acc < len; acc += 1.2) {
          const [px, py] = walkTo(acc);
          // 连续花带底衬（彩色低盒）+ 顶面花球点缀
          bedPos.push([px, py]);
          bedYaw.push(Math.atan2(-dyLine, dxLine));
          bedLen.push(1.35);
          bedKind.push(Math.floor(rng() * FLOWER_KINDS.length));
          bedJ.push(rng());
          if (rng() < 0.6) pushFlower(px + (rng() - 0.5) * 1.2, py + (rng() - 0.5) * 1.2);
        }
      }
    }
  }

  // ---- 湖畔路自动花境：距缙湖岸 60m 内的车行/步行路，双侧花带 ----
  if (jin?.outers[0]) {
    const ring = jin.outers[0];
    const nearLake = (x: number, y: number): boolean => {
      for (let i = 0; i < ring.length; i++) {
        const [ax, ay] = ring[i];
        const [bx, by] = ring[(i + 1) % ring.length];
        if (distPointSeg(x, y, ax, ay, bx, by) < 60) return true;
      }
      return false;
    };
    let autoBudget = 1500;
    for (const r of roads) {
      if (autoBudget <= 0) break;
      if (!["service", "tertiary", "secondary", "pedestrian", "residential"].includes(r.kind)) continue;
      if (!r.pts.some((p) => nearLake(p[0], p[1]))) continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const [x1, y1] = r.pts[i];
        const [x2, y2] = r.pts[i + 1];
        const segLen = Math.hypot(x2 - x1, y2 - y1);
        if (!segLen) continue;
        const dx = (x2 - x1) / segLen, dy = (y2 - y1) / segLen;
        for (let acc = 0.9; acc < segLen; acc += 1.4) {
          const px = x1 + dx * acc, py = y1 + dy * acc;
          if (!nearLake(px, py)) continue;
          for (const side of [1, -1] as const) {
            const off = r.width / 2 + 2.6;
            const fx = px - dy * off * side;
            const fy = py + dx * off * side;
            if (waterHit(fx, fy) || buildingHit(fx, fy, 1.6)) continue;
            if (roadHit(fx, fy, 0.3)) continue;
            // 连续彩色花带底衬 + 稀疏花球
            bedPos.push([fx, fy]);
            bedYaw.push(Math.atan2(-(y2 - y1), x2 - x1));
            bedLen.push(1.55);
            bedKind.push(Math.floor(rng() * FLOWER_KINDS.length));
            bedJ.push(rng());
            if (rng() < 0.35) pushFlower(fx + (rng() - 0.5) * 1.4, fy + (rng() - 0.5) * 1.4);
            autoBudget--;
          }
        }
      }
    }
  }

  // ---- 荷苑荷叶荷花 + 水生植物展示区芦苇 ----
  for (const w of water) {
    if (w.name !== "荷苑" && w.name !== "水生植物展示区") continue;
    const o = w.outers[0];
    if (!o) continue;
    const cx = o.reduce((s, p) => s + p[0], 0) / o.length;
    const cy = o.reduce((s, p) => s + p[1], 0) / o.length;
    const isLotus = w.name === "荷苑";
    let area = 0;
    for (let i = 0; i < o.length; i++) {
      area += o[i][0] * o[(i + 1) % o.length][1] - o[(i + 1) % o.length][0] * o[i][1];
    }
    area = Math.abs(area) / 2;
    const nPads = Math.min(220, Math.floor(area / (isLotus ? 12 : 40)));
    let placed = 0, tries = 0;
    while (placed < nPads && tries < nPads * 12) {
      tries++;
      const x = cx + (rng() - 0.5) * Math.sqrt(area) * 0.72;
      const y = cy + (rng() - 0.5) * Math.sqrt(area) * 0.72;
      if (!pointInPoly(x, y, o)) continue;
      padPos.push([x, y]);
      padScale.push(0.55 + rng() * 0.35);
      padFlower.push(isLotus && rng() < 0.16);
      padJ.push(rng());
      placed++;
    }
    // 岸线芦苇丛
    for (let i = 0; i < o.length; i++) {
      const [ax, ay] = o[i];
      const [bx, by] = o[(i + 1) % o.length];
      const segLen = Math.hypot(bx - ax, by - ay);
      const dx = (bx - ax) / segLen, dy = (by - ay) / segLen;
      for (let acc = 2; acc < segLen - 2; acc += 3.5) {
        const n = 3 + Math.floor(rng() * 4);
        for (let k = 0; k < n; k++) {
          const px = ax + dx * acc + (rng() - 0.5) * 2.6;
          const py = ay + dy * acc + (rng() - 0.5) * 2.6;
          if (!pointInPoly(px, py, o)) continue;
          reedPos.push([px, py]);
          reedH.push(1.1 + rng() * 0.8);
          reedJ.push(rng());
        }
      }
    }
  }

  // ---- 松林公园林下蕨类（manual_green role:pine 区域内）----
  for (const g of vegGreen) {
    if (g.role !== "pine") continue;
    const o = g.outers[0];
    if (!o) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [px, py] of o) {
      if (px < x0) x0 = px; if (px > x1) x1 = px;
      if (py < y0) y0 = py; if (py > y1) y1 = py;
    }
    const target = Math.min(90, Math.floor(Math.abs((x1 - x0) * (y1 - y0)) / 3800));
    let placed = 0, tries = 0;
    while (placed < target && tries < target * 14) {
      tries++;
      const x = x0 + rng() * (x1 - x0);
      const y = y0 + rng() * (y1 - y0);
      if (!pointInPoly(x, y, o)) continue;
      if (blocked(x, y)) continue;
      bushPos.push([x, y]);
      bushSp.push(RING_SPECIES.length - 1); // 蕨类园品种复用
      bushFern.push(true);
      bushJ.push(rng());
      placed++;
    }
  }

  // ---- 几何与实例网格（6 个 draw call）----
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const c = new THREE.Color();

  const bushGeo = mergeGeometries([
    blob(1.05, 0.85, 1.05, 0, 0.75, 0),
    blob(0.7, 0.6, 0.7, 0.55, 0.55, 0.3),
  ])!;
  const bushMesh = new THREE.InstancedMesh(bushGeo, mat, Math.max(1, bushPos.length));
  bushPos.forEach(([x, y], i) => {
    const fern = bushFern[i];
    const sc = fern ? 3.2 + bushJ[i] * 1.6 : 2.4 + bushJ[i] * 1.5;
    e.set(0, bushJ[i] * Math.PI * 2, 0);
    q.setFromEuler(e);
    s.set(sc, fern ? sc * 0.4 : sc * (0.72 + bushJ[i] * 0.33), sc);
    v.set(x, 0, -y);
    m.compose(v, q, s);
    bushMesh.setMatrixAt(i, m);
    bushMesh.setColorAt(i, c.setHex(0x53703f));
  });
  bushMesh.castShadow = true;

  const hedgeGeo = new THREE.BoxGeometry(1, 1, 1);
  hedgeGeo.translate(0, 0.5, 0);
  const hedgeMesh = new THREE.InstancedMesh(hedgeGeo, mat, Math.max(1, hedgePos.length));
  hedgePos.forEach(([x, y], i) => {
    e.set(0, hedgeYaw[i], 0);
    q.setFromEuler(e);
    s.set(hedgeLen[i], hedgeH[i], hedgeW[i]);
    v.set(x, 0, -y);
    m.compose(v, q, s);
    hedgeMesh.setMatrixAt(i, m);
    hedgeMesh.setColorAt(i, c.setHex(0x46603e));
  });
  hedgeMesh.castShadow = true;

  const flowerGeo = blob(0.5, 0.42, 0.5, 0, 0.42, 0);
  const flowerMesh = new THREE.InstancedMesh(flowerGeo, mat, Math.max(1, flowerPos.length));
  flowerPos.forEach(([x, y], i) => {
    e.set(0, flowerJ[i] * Math.PI * 2, 0);
    q.setFromEuler(e);
    s.set(1.0 + flowerJ[i] * 0.7, 0.9 + flowerJ[i] * 0.6, 1.0 + flowerJ[i] * 0.7);
    v.set(x, 0, -y);
    m.compose(v, q, s);
    flowerMesh.setMatrixAt(i, m);
    flowerMesh.setColorAt(i, c.setHex(FLOWER_KINDS[flowerKind[i]]));
  });

  const padGeo = new THREE.CircleGeometry(1, 9);
  padGeo.rotateX(-Math.PI / 2);
  const padMesh = new THREE.InstancedMesh(padGeo, mat, Math.max(1, padPos.length));
  padPos.forEach(([x, y], i) => {
    e.set(0, padJ[i] * Math.PI * 2, 0);
    q.setFromEuler(e);
    s.set(padScale[i] * 1.35, 1, padScale[i] * 1.35);
    v.set(x, 0.08, -y);
    m.compose(v, q, s);
    padMesh.setMatrixAt(i, m);
    padMesh.setColorAt(i, c.setHex(0x3f6b3a).offsetHSL(0, (padJ[i] - 0.5) * 0.08, (padJ[i] - 0.5) * 0.08));
  });

  const padFlowerGeo = mergeGeometries([
    blob(0.2, 0.16, 0.2, 0, 0.24, 0),
    blob(0.13, 0.1, 0.13, 0.1, 0.32, 0.05),
  ])!;
  const padFlowerMesh = new THREE.InstancedMesh(padFlowerGeo, mat, Math.max(1, padPos.length));
  let padFlowerCount = 0;
  padPos.forEach(([x, y], i) => {
    if (!padFlower[i]) return;
    e.set(0, padJ[i] * Math.PI * 2, 0);
    q.setFromEuler(e);
    s.set(padScale[i] * 1.6, padScale[i] * 1.6, padScale[i] * 1.6);
    v.set(x, 0.1, -y);
    m.compose(v, q, s);
    padFlowerMesh.setMatrixAt(padFlowerCount, m);
    padFlowerMesh.setColorAt(padFlowerCount, c.setHex(0xc9a4b4).offsetHSL(0, 0, (padJ[i] - 0.5) * 0.08));
    padFlowerCount++;
  });
  padFlowerMesh.count = padFlowerCount;

  const reedGeo = new THREE.CylinderGeometry(0.03, 0.045, 1, 4);
  reedGeo.translate(0, 0.5, 0);
  const reedMesh = new THREE.InstancedMesh(reedGeo, mat, Math.max(1, reedPos.length));
  reedPos.forEach(([x, y], i) => {
    e.set((reedJ[i] - 0.5) * 0.2, reedJ[i] * Math.PI * 2, (reedJ[i] - 0.5) * 0.2);
    q.setFromEuler(e);
    s.set(1, reedH[i], 1);
    v.set(x, 0.05, -y);
    m.compose(v, q, s);
    reedMesh.setMatrixAt(i, m);
    reedMesh.setColorAt(i, c.setHex(0x7a7a4c).offsetHSL(0, 0, (reedJ[i] - 0.5) * 0.1));
  });

  // 花境连续色带底衬（低矮彩色长盒，串成俯瞰可读的色线；环湖主带=品种色，路缘/楼前=三色花境）
  const bedColor = (kind: number, s: Season): number =>
    kind >= 10 ? SHRUB_SEASON(RING_SPECIES[kind - 10])[s] : FLOWER_SEASON[s](FLOWER_KINDS[kind]);
  const bedGeo = new THREE.BoxGeometry(1, 1, 1);
  bedGeo.translate(0, 0.5, 0);
  const bedMesh = new THREE.InstancedMesh(bedGeo, mat, Math.max(1, bedPos.length));
  bedMesh.name = "veg-beds";
  bedPos.forEach(([x, y], i) => {
    e.set(0, bedYaw[i], 0);
    q.setFromEuler(e);
    s.set(bedLen[i], 0.5, 2.1);
    v.set(x, 0, -y);
    m.compose(v, q, s);
    bedMesh.setMatrixAt(i, m);
    bedMesh.setColorAt(i, c.setHex(bedColor(bedKind[i], "summer")));
  });
  bedMesh.castShadow = true;

  parent.add(bushMesh, hedgeMesh, flowerMesh, padMesh, padFlowerMesh, reedMesh, bedMesh);

  const applySeason = (next: Season): void => {
    bushPos.forEach((_, i) => {
      const sp = RING_SPECIES[bushSp[i]];
      const hex = SHRUB_SEASON(sp)[next];
      bushMesh.setColorAt(i, c.setHex(hex).offsetHSL(0, (bushJ[i] - 0.5) * 0.08, (bushJ[i] - 0.5) * 0.1));
    });
    if (bushMesh.instanceColor) bushMesh.instanceColor.needsUpdate = true;
    hedgePos.forEach((_, i) => {
      const kind = HEDGE_KINDS[hedgeKind[i]] ?? HEDGE_KINDS.boxwood;
      let hex = kind[next];
      if (hedgeKind[i] === "michelia" && next === "spring" && hedgeJ[i] < 0.22) hex = MICHELIA_CREAM;
      hedgeMesh.setColorAt(i, c.setHex(hex).offsetHSL(0, 0, (hedgeJ[i] - 0.5) * 0.08));
    });
    if (hedgeMesh.instanceColor) hedgeMesh.instanceColor.needsUpdate = true;
    flowerPos.forEach((_, i) => {
      flowerMesh.setColorAt(i, c.setHex(FLOWER_SEASON[next](FLOWER_KINDS[flowerKind[i]]))
        .offsetHSL(0, 0, (flowerJ[i] - 0.5) * 0.1));
    });
    if (flowerMesh.instanceColor) flowerMesh.instanceColor.needsUpdate = true;
    bedPos.forEach((_, i) => {
      bedMesh.setColorAt(i, c.setHex(bedColor(bedKind[i], next))
        .offsetHSL(0, 0, (bedJ[i] - 0.5) * 0.08));
    });
    if (bedMesh.instanceColor) bedMesh.instanceColor.needsUpdate = true;
  };
  applySeason("summer");

  return {
    applySeason,
    gardenLabels,
    counts: {
      bushes: bushPos.length,
      hedges: hedgePos.length,
      flowers: flowerPos.length,
      beds: bedPos.length,
      ringBeds: ringBedCount,
      pads: padPos.length,
      reeds: reedPos.length,
    },
  };
}
