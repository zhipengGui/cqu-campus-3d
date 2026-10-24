import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Area, Building, Road, SceneData } from "./types";
import { detailedSport } from './sports';
import {
  dormBalconyMaterial,
  dormGableMaterial,
  dormWindowFrameMaterial,
  dormWindowGlassMaterial,
  dormWindowLitMaterial,
  facadeGlowTexture,
  facadeTexture,
  idHash01,
  offsetPolygon,
  parapetMaterial,
  dormRoofMaterial,
  dormRoofKindOf,
  rewriteFacadeUV,
  roofMaterial,
  roofUnitMaterial,
  styleVariant,
  STYLE_TINT,
  type FacadeStyle,
} from "./facades";

/** 场景坐标系约定：scene.json 的 X(东)/Y(北) 映射到 three.js 世界
 *  x = 东, z = -北（即 -z 朝北）, y 向上。 */

export const COLORS = {
  ground: 0xb7c6a2, // 草地基调（对齐 gxu 观感）
  building: 0xf5f2ec,
  water: 0x4f8b94,
  shore: 0xd8cdb0,
  paving: 0xc8c4b5,
  park: 0xa4bc88,
  grass: 0xb2c697,
  forest: 0x88ad79,
  roadAsphalt: 0x59655f,
  roadPath: 0xcbbfa5,
  sidewalk: 0xd4d2c4,
  roadMark: 0xe6e8e6,
};

const GREEN_COLORS: Record<string, number> = {
  park: COLORS.park,
  grass: COLORS.grass,
  forest: COLORS.forest,
  pitch: 0xa8bf92,
  track: 0xc9735c,
  pool: 0x74b9d8,
};

const SPORT_COLORS: Record<string, number> = {
  soccer: 0x8fbf7a,
  basketball: 0xa4b496,
  tennis: 0x86a8b0,
  badminton: 0xb3c2a0,
  volleyball: 0xb3c2a0,
  running: 0xc9735c,
  multisport: 0xa4b496,
};

const ROAD_CLASS: Record<string, "major" | "campus" | "path"> = {
  motorway: "major", trunk: "major",
  primary: "major", secondary: "major", tertiary: "major",
  primary_link: "major", secondary_link: "major", tertiary_link: "major",
  service: "campus", residential: "campus", unclassified: "campus",
  living_street: "campus", pedestrian: "campus", road: "campus",
  footway: "path", path: "path", track: "path", cycleway: "path",
};

function hash01(id: number | string): number {
  return idHash01(id);
}

function ensureCCW(pts: [number, number][]): [number, number][] {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a >= 0 ? pts : [...pts].reverse();
}

function pointInPoly(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function shapeFromRings(outer: [number, number][], holes: [number, number][][]): THREE.Shape {
  const shape = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const hole of holes) {
    shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
  }
  return shape;
}

export function buildGround(scene: THREE.Scene): void {
  const geo = new THREE.PlaneGeometry(20000, 20000);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({
      color: 0xd6d8c8,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
    }),
  );
  mesh.position.y = -0.2;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function flatAreaMeshes(geos: THREE.BufferGeometry[], color: number, y: number, parent: THREE.Object3D): void {
  if (!geos.length) return;
  const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos)!;
  const mesh = new THREE.Mesh(
    merged,
    new THREE.MeshLambertMaterial({
      color,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }),
  );
  mesh.position.y = y;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

export function buildGreen(greenGroup: THREE.Object3D, sportsGroup: THREE.Object3D, green: Area[]): void {
  const buckets = new Map<string, { parent: THREE.Object3D; color: number; geos: THREE.BufferGeometry[] }>();
  for (const a of green) {
    if (detailedSport(a)) continue;
    const isSport = a.kind === "pitch" || a.kind === "track" || a.kind === "pool";
    const parent = isSport ? sportsGroup : greenGroup;
    const color = isSport && a.sport && SPORT_COLORS[a.sport] ? SPORT_COLORS[a.sport]
      : a.kind === "track" ? 0xc9735c
      : a.kind === "pool" ? 0x74b9d8
      : GREEN_COLORS[a.kind ?? "park"] ?? COLORS.park;
    const key = (isSport ? "s" : "g") + color;
    if (!buckets.has(key)) buckets.set(key, { parent, color, geos: [] });
    for (const outer of a.outers) {
      const geo = new THREE.ShapeGeometry(shapeFromRings(outer, a.inners));
      geo.rotateX(-Math.PI / 2);
      buckets.get(key)!.geos.push(geo);
    }
  }
  for (const { parent, color, geos } of buckets.values()) {
    flatAreaMeshes(geos, color, 0.02, parent);
  }
}

export function buildPaving(parent: THREE.Object3D, paving: Area[]): void {
  const geos: THREE.BufferGeometry[] = [];
  for (const a of paving) {
    for (const outer of a.outers) {
      const geo = new THREE.ShapeGeometry(shapeFromRings(outer, a.inners));
      geo.rotateX(-Math.PI / 2);
      geos.push(geo);
    }
  }
  flatAreaMeshes(geos, COLORS.paving, 0.015, parent);
}

/** 程序化水面波纹法线贴图（两方向正弦叠加的高度场 → Sobel 梯度法线） */
function rippleNormalTexture(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const g = c.getContext("2d")!;
  const img = g.createImageData(s, s);
  const height = (u: number, v: number): number =>
    Math.sin(u * Math.PI * 6 + Math.sin(v * Math.PI * 4) * 1.6) * 0.6 +
    Math.sin(v * Math.PI * 8 + Math.sin(u * Math.PI * 5) * 1.2) * 0.4;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const u = x / s;
      const v = y / s;
      const e = 1 / s;
      const dx = height(u + e, v) - height(u - e, v);
      const dy = height(u, v + e) - height(u, v - e);
      const nx = -dx * 1.4;
      const ny = -dy * 1.4;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * s + x) * 4;
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** 水面材质（导出供渲染循环做波纹流动动画） */
export const waterMaterial: THREE.MeshStandardMaterial = (() => {
  const normalMap = rippleNormalTexture();
  normalMap.repeat.set(1 / 26, 1 / 26); // ShapeGeometry uv 单位 = 米，约 26m 重复一波纹块
  const m = new THREE.MeshStandardMaterial({
    color: COLORS.water,
    roughness: 0.48,
    metalness: 0.12,
    normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
  });
  m.name = "waterMat";
  return m;
})();

/** 湖面：Standard 反光材质 + 波纹法线贴图；湖岸升级为砌石岸壁 + 压顶石 */
export function buildWater(parent: THREE.Object3D, water: Area[]): void {
  const waterGeos: THREE.BufferGeometry[] = [];
  const wallGeos: THREE.BufferGeometry[] = [];
  const curbGeos: THREE.BufferGeometry[] = [];
  for (const a of water) {
    for (const outer of a.outers) {
      const geo = new THREE.ShapeGeometry(shapeFromRings(outer, a.inners));
      geo.rotateX(-Math.PI / 2);
      waterGeos.push(geo);
      // 砌石岸壁：外扩 0.9m 环带垂直挤出 0.55m（石色）
      const ccwRing = ensureCCW(outer);
      const outerRing = offsetPolygon(ccwRing, 0.9);
      const wall = new THREE.Shape(outerRing.map(([x, y]) => new THREE.Vector2(x, y)));
      wall.holes.push(new THREE.Path(ccwRing.map(([x, y]) => new THREE.Vector2(x, y))));
      const wg = new THREE.ExtrudeGeometry(wall, { depth: 0.55, bevelEnabled: false });
      wg.rotateX(-Math.PI / 2);
      wallGeos.push(wg);
      // 压顶石：外扩 0.9→1.5m 的环带平面（浅石色）
      const curbRing = offsetPolygon(ccwRing, 1.5);
      const curb = new THREE.Shape(curbRing.map(([x, y]) => new THREE.Vector2(x, y)));
      curb.holes.push(new THREE.Path(outerRing.map(([x, y]) => new THREE.Vector2(x, y))));
      const cg = new THREE.ShapeGeometry(curb);
      cg.rotateX(-Math.PI / 2);
      curbGeos.push(cg);
    }
  }
  const stone = new THREE.MeshStandardMaterial({ color: 0xb0aca2, roughness: 0.9 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xc6c2b6, roughness: 0.92 });
  if (wallGeos.length) {
    const merged = wallGeos.length === 1 ? wallGeos[0] : mergeGeometries(wallGeos)!;
    const mesh = new THREE.Mesh(merged, stone);
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
  if (curbGeos.length) {
    const merged = curbGeos.length === 1 ? curbGeos[0] : mergeGeometries(curbGeos)!;
    const mesh = new THREE.Mesh(merged, curbMat);
    mesh.position.y = 0.56;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
  if (waterGeos.length) {
    const merged = waterGeos.length === 1 ? waterGeos[0] : mergeGeometries(waterGeos)!;
    const mesh = new THREE.Mesh(merged, waterMaterial);
    mesh.name = "water";
    mesh.position.y = 0.05;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
}

export function bboxCenter(pts: [number, number][]): [number, number] {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}

/** 校区边界白线（返回线条对象，由调用方挂载并控制显隐） */
export function buildBoundaryLine(boundary: { pts: [number, number][] }): THREE.LineLoop {
  const pts = boundary.pts.map(([x, y]) => new THREE.Vector3(x, 0.12, -y));
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.75,
  }));
  line.renderOrder = 4;
  return line;
}

/** 宿舍精修：红坡顶（长条两坡/近方四坡）+ 三维窗阵 + 凸阳台 + 单元门。
 *  卫星实证形态；几何按需并入全局 merged 数组（draw call 恒定）。 */
interface DormRect { x0: number; y0: number; x1: number; y1: number }

/** 单矩形两坡/四坡顶（含山墙；interiorEnds 指定该端与他翼相接、跳过山墙防穿帮）。 */
function pitchRoofRect(r: DormRect, height: number, interiorNeg: boolean, interiorPos: boolean): {
  roof: THREE.BufferGeometry; gable: THREE.BufferGeometry | null;
} | null {
  const w = r.x1 - r.x0, d = r.y1 - r.y0;
  if (w < 6 || d < 6) return null;
  const along = w >= d;
  const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
  const spanHalf = (along ? d : w) / 2 + 0.45;
  const ridge = height + 2.3, eaveZ = height + 0.15;
  const ridgeHalfBase = (along ? w : d) / 2 + 0.45;
  const ratio = Math.min(w, d) / Math.max(w, d);
  const ridgeHalf = ratio > 0.75 ? ridgeHalfBase * 0.35 : ridgeHalfBase;
  const v = (ex: number, no: number, z: number): [number, number, number] =>
    along ? [cx + ex, z, cy + no] : [cx + no, z, cy + ex];
  const roofPos: number[] = [], roofIdx: number[] = [], roofUv: number[] = [];
  for (const side of [-1, 1]) {
    const base = roofPos.length / 3;
    const quad: [number, number, number][] = [
      v(-ridgeHalfBase, side * spanHalf, eaveZ),
      v(ridgeHalfBase, side * spanHalf, eaveZ),
      v(ridgeHalf, 0, ridge),
      v(-ridgeHalf, 0, ridge),
    ];
    for (const [px, py, pz] of quad) {
      roofPos.push(px, py, -pz);
      roofUv.push((px - (cx - ridgeHalfBase)) / 2, (py - eaveZ) / 2);
    }
    roofIdx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  // 四坡端斜面（脊线短于檐口时）
  for (const end of [-1, 1]) {
    if (ridgeHalf >= ridgeHalfBase - 0.01) break;
    for (const side of [-1, 1]) {
      const base = roofPos.length / 3;
      const tri: [number, number, number][] = [
        v(end * ridgeHalfBase, side * spanHalf, eaveZ),
        v(end * ridgeHalfBase, -side * spanHalf, eaveZ),
        v(end * ridgeHalf, 0, ridge),
      ];
      for (const [px, py, pz] of end === side ? tri : [tri[1], tri[0], tri[2]]) roofPos.push(px, py, -pz);
      roofIdx.push(base, base + 1, base + 2);
    }
  }
  const roof = new THREE.BufferGeometry();
  roof.setAttribute("position", new THREE.Float32BufferAttribute(roofPos, 3));
  roof.setAttribute("uv", new THREE.Float32BufferAttribute(roofUv, 2));
  roof.setIndex(roofIdx);
  roof.computeVertexNormals();
  // 山墙（接缝端跳过）
  const gablePos: number[] = [], gableIdx: number[] = [];
  for (const end of [-1, 1]) {
    if ((end === -1 && interiorNeg) || (end === 1 && interiorPos)) continue;
    const base = gablePos.length / 3;
    const a = v(end * ridgeHalfBase, -spanHalf, height);
    const b = v(end * ridgeHalfBase, spanHalf, height);
    const c = v(end * ridgeHalf, 0, ridge);
    for (const [px, py, pz] of end === -1 ? [a, b, c] : [b, a, c]) gablePos.push(px, py, -pz);
    gableIdx.push(base, base + 1, base + 2);
  }
  if (!gablePos.length) return { roof, gable: null };
  const gable = new THREE.BufferGeometry();
  gable.setAttribute("position", new THREE.Float32BufferAttribute(gablePos, 3));
  gable.setIndex(gableIdx);
  gable.computeVertexNormals();
  return { roof, gable };
}

/** 任意（含 L/U 形）轮廓 → 轴对齐条带矩形分解（围合式宿舍每翼独立起坡）。 */
function decomposeRects(poly: [number, number][]): DormRect[] {
  const xsSet = new Set<number>();
  for (const [x] of poly) xsSet.add(Math.round(x * 2) / 2);
  const xs = [...xsSet].sort((a, b) => a - b);
  const rects: DormRect[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const xa = xs[i], xb = xs[i + 1];
    if (xb - xa < 0.4) continue;
    const mid = (xa + xb) / 2;
    const ys: number[] = [];
    for (let k = 0; k < poly.length; k++) {
      const [px, py] = poly[k];
      const [qx, qy] = poly[(k + 1) % poly.length];
      if ((px <= mid && qx > mid) || (qx <= mid && px > mid)) {
        ys.push(py + ((qy - py) * (mid - px)) / (qx - px));
      }
    }
    ys.sort((a, b) => a - b);
    for (let k = 0; k + 1 < ys.length; k += 2) {
      if (ys[k + 1] - ys[k] >= 3) rects.push({ x0: xa, x1: xb, y0: ys[k], y1: ys[k + 1] });
    }
  }
  // 同 y 区间的相邻条带横向合并
  const merged: DormRect[] = [];
  for (const r of rects.sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0))) {
    const hit = merged.find(
      (m) => Math.abs(m.y0 - r.y0) < 0.05 && Math.abs(m.y1 - r.y1) < 0.05 && Math.abs(m.x1 - r.x0) < 0.3,
    );
    if (hit) hit.x1 = Math.max(hit.x1, r.x1);
    else merged.push({ ...r });
  }
  return merged;
}

function dormRoofParts(poly: [number, number][], height: number): {
  roofs: THREE.BufferGeometry[]; gables: THREE.BufferGeometry[];
} | null {
  // 主朝向 = 最长边方向（兰园等斜置楼：轴对齐 bbox 会错位，坡顶在旋转坐标系里生成）
  let bestLen = 0, theta = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const L = Math.hypot(bx - ax, by - ay);
    if (L > bestLen) {
      bestLen = L;
      theta = Math.atan2(by - ay, bx - ax);
    }
  }
  // 归一到 [-45°,45°]（矩形楼的长边等价方向）
  while (theta > Math.PI / 4) theta -= Math.PI / 2;
  while (theta < -Math.PI / 4) theta += Math.PI / 2;
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  const cosT = Math.cos(-theta), sinT = Math.sin(-theta);
  const local: [number, number][] = poly.map(([x, y]) => {
    const dx = x - cx, dy = y - cy;
    return [dx * cosT - dy * sinT, dx * sinT + dy * cosT];
  });
  const rects = decomposeRects(local);
  if (!rects.length) return null;
  let polyArea = 0;
  for (let i = 0; i < local.length; i++) {
    polyArea += local[i][0] * local[(i + 1) % local.length][1] - local[(i + 1) % local.length][0] * local[i][1];
  }
  polyArea = Math.abs(polyArea) / 2;
  const rectArea = rects.reduce((s, r) => s + (r.x1 - r.x0) * (r.y1 - r.y0), 0);
  if (rectArea < 0.55 * polyArea) return null; // 形状过于破碎，回退平顶
  // 生成后把顶点从局部坐标转回世界坐标（局部 x/y 平面旋转 theta，z 不变）
  const cosB = Math.cos(theta), sinB = Math.sin(theta);
  const unrotate = (geo: THREE.BufferGeometry): THREE.BufferGeometry => {
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i), ly = -pos.getZ(i); // 世界 z=-北 → 局部北
      const wx = cx + lx * cosB - ly * sinB;
      const wy = cy + lx * sinB + ly * cosB;
      pos.setXYZ(i, wx, pos.getY(i), -wy);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  };
  const roofs: THREE.BufferGeometry[] = [];
  const gables: THREE.BufferGeometry[] = [];
  for (const r of rects) {
    const w = r.x1 - r.x0, d = r.y1 - r.y0;
    const along = w >= d;
    // 与他翼相接的端头（同楼另一矩形贴着该边）→ 跳过山墙
    const touching = (edge: "neg" | "pos"): boolean =>
      rects.some((o) => {
        if (o === r) return false;
        const ov = Math.min(r.y1, o.y1) - Math.max(r.y0, o.y0);
        const oh = Math.min(r.x1, o.x1) - Math.max(r.x0, o.x0);
        return along
          ? ov > 2 && ((edge === "neg" && Math.abs(o.x1 - r.x0) < 0.3) || (edge === "pos" && Math.abs(o.x0 - r.x1) < 0.3))
          : oh > 2 && ((edge === "neg" && Math.abs(o.y1 - r.y0) < 0.3) || (edge === "pos" && Math.abs(o.y0 - r.y1) < 0.3));
      });
    const part = pitchRoofRect(r, height, touching("neg"), touching("pos"));
    if (!part) continue;
    roofs.push(unrotate(part.roof));
    if (part.gable) gables.push(unrotate(part.gable));
  }
  return roofs.length ? { roofs, gables } : null;
}

/** 沿轮廓边布宿舍窗阵/阳台/门（几何并入全局数组）。 */
function dormFacadeDetails(
  b: Building,
  geos: { frame: THREE.BufferGeometry[]; glass: THREE.BufferGeometry[]; glassLit: THREE.BufferGeometry[]; balcony: THREE.BufferGeometry[]; door: THREE.BufferGeometry[] },
): void {
  // 统一 CCW（外法向 = (uy,-ux)；OSM 轮廓绕向混杂，CW 楼的窗会嵌墙）
  let poly = b.polygon;
  let sa = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    sa += ax * by - bx * ay;
  }
  if (sa < 0) poly = [...poly].reverse();
  const floors = Math.max(1, Math.round(b.height / 3.3));
  const box = (cx: number, cy: number, cz: number, w: number, h: number, d: number, angle: number) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.rotateY(angle);
    g.translate(cx, cz, -cy);
    return g;
  };
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const dx = bx - ax, dy = by - ay;
    const L = Math.hypot(dx, dy);
    if (L < 6) continue;
    const angle = -Math.atan2(-dy, dx);
    const ux = dx / L, uy = dy / L;
    const nx = uy, ny = -ux; // 外法向（多边形 CCW 时朝外）
    const bays = Math.max(1, Math.round(L / 3.6));
    for (let f = 0; f < floors; f++) {
      const z = f * 3.3 + 2.1;
      for (let k = 0; k < bays; k++) {
        const t = (k + 0.5) / bays;
        const px = ax + dx * t + nx * 0.09, py = ay + dy * t + ny * 0.09;
        // 隔开间交替点亮（夜景窗灯的几何版）
        const bucket = (f + k + Math.floor(i * 7.13)) % 3 === 0 ? geos.glassLit : geos.glass;
        bucket.push(box(px, py, z, 1.9, 1.55, 0.08, angle));
        if (f > 0 && k % 2 === 1 && L > 24) {
          // 阳台栏板（二层起隔开间）
          const bx2 = ax + dx * t + nx * 0.42, by2 = ay + dy * t + ny * 0.42;
          geos.balcony.push(box(bx2, by2, f * 3.3 + 1.35, 3.1, 1.05, 0.75, angle));
        }
      }
      // 层间窗框横条
      geos.frame.push(box(ax + dx * 0.5 + nx * 0.07, ay + dy * 0.5 + ny * 0.07, z + 0.87, L, 0.14, 0.06, angle));
      geos.frame.push(box(ax + dx * 0.5 + nx * 0.07, ay + dy * 0.5 + ny * 0.07, z - 0.87, L, 0.14, 0.06, angle));
    }
    // 单元门（每条长边中点，首层）
    if (L > 20) {
      const mx = ax + dx * 0.5 + nx * 0.12, my = ay + dy * 0.5 + ny * 0.12;
      geos.door.push(box(mx, my, 1.15, 2.6, 2.3, 0.16, angle));
      geos.frame.push(box(mx - nx * 0.1, my - ny * 0.1, 2.55, 3.4, 0.35, 1.1, angle)); // 雨棚
    }
  }
}

/** 楼栋：立面纹理 + 女儿墙 + 屋顶设备块。landmark 楼由调用方过滤后另行构建。 */
export function buildBuildings(scene: THREE.Scene, buildings: Building[]): THREE.Group {
  const group = new THREE.Group();
  group.name = "buildings";
  const parapetGeos: THREE.BufferGeometry[] = [];
  const unitGeos: THREE.BufferGeometry[] = [];
  const dormRoofGeos: Record<string, THREE.BufferGeometry[]> = { red: [], gray: [], brown: [] };
  const dormGableGeos: THREE.BufferGeometry[] = [];
  const dormParts = { frame: [] as THREE.BufferGeometry[], glass: [] as THREE.BufferGeometry[], glassLit: [] as THREE.BufferGeometry[], balcony: [] as THREE.BufferGeometry[], door: [] as THREE.BufferGeometry[] };

  for (const b of buildings) {
    const shape = shapeFromRings(b.polygon, b.holes);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(b.height, 2),
      bevelEnabled: false,
    });
    geo.rotateX(-Math.PI / 2);
    const floors = Math.max(1, Math.round(b.height / 3.3));
    rewriteFacadeUV(geo, b.polygon, floors);

    const style = (b.style ?? "office") as FacadeStyle;
    const variant = styleVariant(style, b.id);
    const tex = facadeTexture(style, variant).clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, floors); // v 已按楼层归一，纵向重复 = 层数
    const glow = facadeGlowTexture(style, variant).clone();
    glow.needsUpdate = true;
    glow.repeat.set(1, floors);
    const wallMat = new THREE.MeshLambertMaterial({ map: tex, emissiveMap: glow });
    wallMat.emissive.setHex(0x000000);
    const tint = STYLE_TINT[style] ?? [1, 1, 1];
    const lum = 0.93 + hash01(b.id) * 0.09;
    wallMat.color.setRGB(tint[0] * lum, tint[1] * lum, tint[2] * lum);

    // ExtrudeGeometry 分组：material 0 = 顶底面，1 = 侧面
    const mesh = new THREE.Mesh(geo, [roofMaterial, wallMat]);
    const [cx, cy] = bboxCenter(b.polygon);
    mesh.userData = {
      id: b.id,
      name: b.name,
      type: b.type,
      style,
      height: b.height,
      heightSource: b.heightSource,
      area: b.area,
      cx,
      cy: -cy,
    };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const pitched = style === "dorm" ? dormRoofParts(b.polygon, b.height) : null;
    if (!pitched && b.area >= 80) {
      const pg = parapetGeometry(b.polygon, b.height);
      if (pg) parapetGeos.push(pg);
    }
    if (!pitched && b.area >= 1200) {
      const n = Math.max(1, Math.min(6, Math.floor(b.area / 900)));
      addRoofUnits(unitGeos, b, n);
    }
    if (pitched) {
      for (const r of pitched.roofs) dormRoofGeos[dormRoofKindOf(b.name)].push(r);
      dormGableGeos.push(...pitched.gables);
      dormFacadeDetails(b, dormParts);
    }
  }
  scene.add(group);

  if (parapetGeos.length) {
    const merged = mergeGeometries(parapetGeos)!;
    const m = new THREE.Mesh(merged, parapetMaterial);
    scene.add(m);
  }
  for (const kind of ["red", "gray", "brown"] as const) {
    const list = dormRoofGeos[kind];
    if (!list.length) continue;
    const merged = mergeGeometries(list)!;
    const m = new THREE.Mesh(merged, dormRoofMaterial(kind));
    m.castShadow = true;
    scene.add(m);
  }
  if (dormGableGeos.length) {
    const merged = mergeGeometries(dormGableGeos)!;
    const m = new THREE.Mesh(merged, dormGableMaterial);
    scene.add(m);
  }
  const dormMeshes: [THREE.BufferGeometry[], THREE.MeshLambertMaterial][] = [
    [dormParts.frame, dormWindowFrameMaterial],
    [dormParts.glass, dormWindowGlassMaterial],
    [dormParts.glassLit, dormWindowLitMaterial],
    [dormParts.balcony, dormBalconyMaterial],
    [dormParts.door, dormWindowGlassMaterial],
  ];
  for (const [list, mat] of dormMeshes) {
    if (!list.length) continue;
    const merged = mergeGeometries(list)!;
    const m = new THREE.Mesh(merged, mat);
    scene.add(m);
  }
  if (unitGeos.length) {
    const merged = mergeGeometries(unitGeos)!;
    const m = new THREE.Mesh(merged, roofUnitMaterial);
    m.castShadow = true;
    scene.add(m);
  }
  return group;
}

function parapetGeometry(poly: [number, number][], height: number): THREE.BufferGeometry | null {
  const ccw = ensureCCW(poly);
  const inner = offsetPolygon(ccw, -0.55);
  const shape = new THREE.Shape(ccw.map(([x, y]) => new THREE.Vector2(x, y)));
  shape.holes.push(new THREE.Path(inner.map(([x, y]) => new THREE.Vector2(x, y))));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, height, 0);
  return geo;
}

function addRoofUnits(geos: THREE.BufferGeometry[], b: Building, n: number): void {
  const [cx, cy] = bboxCenter(b.polygon);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of b.polygon) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const span = Math.min(x1 - x0, y1 - y0);
  for (let i = 0; i < n; i++) {
    const h1 = idHash01(`${b.id}u${i}`);
    const h2 = idHash01(`${b.id}w${i}`);
    const px = cx + (h1 - 0.5) * span * 0.6;
    const py = cy + (h2 - 0.5) * span * 0.6;
    if (!pointInPoly(px, py, b.polygon)) continue;
    const sx = 1.8 + idHash01(`${b.id}s${i}`) * 2.2;
    const sy = 1.2 + idHash01(`${b.id}t${i}`) * 1.4;
    const g = new THREE.BoxGeometry(sx, sy, sx);
    g.translate(px, b.height + sy / 2, -py);
    geos.push(g);
  }
}

/** 折线 → 带斜接(Miter)接头的扁平条带 */
function ribbonGeometry(pts: [number, number][], width: number): THREE.BufferGeometry {
  const half = width / 2;
  const positions: number[] = [];
  const indices: number[] = [];
  const normals: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    normals.push([dy / len, -dx / len]);
  }
  const pushVertex = (x: number, y: number) => positions.push(x, 0, -y);
  for (let i = 0; i < pts.length; i++) {
    let nx: number, ny: number;
    if (i === 0) {
      [nx, ny] = normals[0];
    } else if (i === normals.length) {
      [nx, ny] = normals[normals.length - 1];
    } else {
      const [a1x, a1y] = normals[i - 1];
      const [a2x, a2y] = normals[i];
      let mx = a1x + a2x;
      let my = a1y + a2y;
      const mlen = Math.hypot(mx, my) || 1;
      mx /= mlen;
      my /= mlen;
      const cosHalf = Math.max(0.4, mx * a2x + my * a2y);
      const scale = Math.min(1 / cosHalf, 2.5);
      nx = mx * scale;
      ny = my * scale;
    }
    pushVertex(pts[i][0] + nx * half, pts[i][1] + ny * half);
    pushVertex(pts[i][0] - nx * half, pts[i][1] - ny * half);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); // 法线朝上（+Y）
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** 沿折线的中央虚线（短四边形合批） */
function dashGeometry(pts: [number, number][], dashLen: number, gapLen: number, width: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  let arc = 0;
  let nextAt = dashLen; // 先留一段空
  const cycle = dashLen + gapLen;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const segLen = Math.hypot(x2 - x1, y2 - y1);
    if (!segLen) continue;
    const dx = (x2 - x1) / segLen;
    const dy = (y2 - y1) / segLen;
    let t = 0;
    while (t < segLen) {
      if (arc + (segLen - t) < nextAt + dashLen && arc + t < nextAt + dashLen && arc + t >= nextAt) {
        const d0 = Math.min(dashLen, segLen - t);
        const ax = x1 + dx * t;
        const ay = y1 + dy * t;
        const bx = x1 + dx * (t + d0);
        const by = y1 + dy * (t + d0);
        const nx = -dy * width * 0.5;
        const ny = dx * width * 0.5;
        const base = positions.length / 3;
        positions.push(ax + nx, 0, -(ay + ny), ax - nx, 0, -(ay - ny), bx + nx, 0, -(by + ny), bx - nx, 0, -(by - ny));
        indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
        t += d0;
        nextAt += cycle;
      } else {
        const jump = Math.min(segLen - t, Math.max(0.01, nextAt - arc - t));
        t += jump;
        if (arc + t >= nextAt + dashLen) nextAt += cycle;
      }
    }
    arc += segLen;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** 道路分级渲染：沥青主路面 + 人行道衬带 + 主要道路中央虚线，全部合批 */
export function buildRoads(parent: THREE.Object3D, roads: Road[]): void {
  const sidewalkGeos: THREE.BufferGeometry[] = [];
  const asphaltGeos: THREE.BufferGeometry[] = [];
  const pathGeos: THREE.BufferGeometry[] = [];
  const dashGeos: THREE.BufferGeometry[] = [];

  roads.forEach((r, idx) => {
    if (r.pts.length < 2) return;
    const cls = ROAD_CLASS[r.kind] ?? "path";
    if (cls === "path") {
      const g = ribbonGeometry(r.pts, r.width);
      g.translate(0, 0.03 + (idx % 5) * 0.003, 0);
      pathGeos.push(g);
      return;
    }
    const sw = ribbonGeometry(r.pts, r.width + 3);
    sw.translate(0, 0.02, 0);
    sidewalkGeos.push(sw);
    const g = ribbonGeometry(r.pts, r.width);
    g.translate(0, 0.06 + (idx % 5) * 0.004, 0);
    asphaltGeos.push(g);
    if (cls === "major" || (cls === "campus" && r.width >= 5)) {
      const d = dashGeometry(r.pts, 3, 5, 0.35);
      d.translate(0, 0.14, 0); // 与沥青拉开 8cm，防拉高后深度冲突闪动
      const idx = d.getIndex();
      if (idx && idx.count > 0) dashGeos.push(d);
    }
  });

  const batch = (geos: THREE.BufferGeometry[], color: number, yOff: number): void => {
    if (!geos.length) return;
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos)!;
    const mesh = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ color }));
    mesh.position.y = yOff;
    mesh.receiveShadow = true;
    parent.add(mesh);
  };
  batch(sidewalkGeos, COLORS.sidewalk, 0);
  batch(asphaltGeos, COLORS.roadAsphalt, 0);
  batch(pathGeos, COLORS.roadPath, 0);
  if (dashGeos.length) {
    const merged = dashGeos.length === 1 ? dashGeos[0] : mergeGeometries(dashGeos)!;
    parent.add(new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ color: COLORS.roadMark })));
  }
}

export type { SceneData };
