import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Road } from "./types";
import { distPointSeg } from "./trees";

/** 校园动态层（aks-campus-3d 思路的自研实现）：
 *  - 行人：步道路网漫步（环湖人行带加权），胶囊+头实例合批，昼夜调密度
 *  - 车辆：白色小观光车占绝大多数（环湖/主路慢速）+ 大客车（校车）1-2 辆
 *  全部 InstancedMesh：行人 1 + 观光车 1 + 校车 1 = 3 个 draw call。 */

type Pt = [number, number];

export interface TrafficSystem {
  update(dt: number): void;
  setPhase(phase: "day" | "dusk" | "night"): void;
  group: THREE.Group;
}

interface WalkerPath { pts: Pt[]; len: number; lake: boolean }
interface VehiclePath { pts: Pt[]; len: number }

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function polylineLen(pts: Pt[]): number {
  let l = 0;
  for (let i = 0; i < pts.length - 1; i++) l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return l;
}

export function buildTraffic(
  parent: THREE.Object3D,
  opts: { roads: Road[]; lakeOutline: Pt[] | null },
): TrafficSystem {
  const rng = mulberry32(20261025);
  const group = new THREE.Group();
  parent.add(group);

  const WALK_KINDS = new Set(["footway", "path", "pedestrian", "steps"]);
  const DRIVE_KINDS = new Set(["trunk", "primary", "secondary", "tertiary", "residential", "service"]);

  const nearLake = (x: number, y: number): boolean => {
    const ring = opts.lakeOutline;
    if (!ring) return false;
    for (let i = 0; i < ring.length; i++) {
      if (distPointSeg(x, y, ring[i][0], ring[i][1], ring[(i + 1) % ring.length][0], ring[(i + 1) % ring.length][1]) < 32) return true;
    }
    return false;
  };

  // ---- 行人路径：步道（环湖加权）----
  const walkPaths: WalkerPath[] = [];
  for (const r of opts.roads) {
    if (!WALK_KINDS.has(r.kind) || r.pts.length < 2) continue;
    const len = polylineLen(r.pts);
    if (len < 30) continue;
    const lake = r.pts.some((p) => nearLake(p[0], p[1]));
    walkPaths.push({ pts: r.pts, len, lake });
    if (lake) walkPaths.push({ pts: r.pts, len, lake }); // 环湖人行带双倍权重
  }
  // ---- 车行路径：校内车行路（较长者为骨架）----
  const drivePaths: VehiclePath[] = [];
  for (const r of opts.roads) {
    if (!DRIVE_KINDS.has(r.kind) || r.pts.length < 2) continue;
    const len = polylineLen(r.pts);
    if (len < 120) continue;
    const c = r.pts[Math.floor(r.pts.length / 2)];
    if (Math.abs(c[0]) > 900 || Math.abs(c[1]) > 900) continue; // 排除远外围公路
    drivePaths.push({ pts: r.pts, len });
  }
  const lakeDrive = drivePaths.filter((p) => p.pts.some((q) => nearLake(q[0], q[1])));

  // ---- 几何模板 ----
  const bodyGeo = new THREE.CylinderGeometry(0.2, 0.26, 1.02, 6);
  bodyGeo.translate(0, 0.55, 0);
  const headGeo = new THREE.SphereGeometry(0.16, 6, 5);
  headGeo.translate(0, 1.22, 0);
  const walkerGeo = mergeGeometries([bodyGeo, headGeo])!;
  const walkerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const WALKER_COLORS = [0xb23c3c, 0x3c62b2, 0x3c8a55, 0xd0a13c, 0x7a5aa8, 0x9c9c9c, 0xc4703c];

  const WALKER_TOTAL = 320;
  const walkers = new THREE.InstancedMesh(walkerGeo, walkerMat, WALKER_TOTAL);
  interface WalkerState { path: WalkerPath; t: number; dir: 1 | -1; speed: number; color: number; bob: number }
  const walkerStates: WalkerState[] = [];
  for (let i = 0; i < WALKER_TOTAL; i++) {
    const pool = walkPaths.length ? walkPaths : drivePaths;
    const path = pool[Math.floor(rng() * pool.length)];
    walkerStates.push({
      path: path as WalkerPath, t: rng(), dir: rng() < 0.5 ? 1 : -1,
      speed: 0.9 + rng() * 0.6, color: WALKER_COLORS[Math.floor(rng() * WALKER_COLORS.length)], bob: rng() * 10,
    });
    walkers.setColorAt(i, new THREE.Color(walkerStates[i].color));
  }
  walkers.castShadow = false;
  group.add(walkers);

  // ---- 白色小观光车（绝大多数）----
  function golfCart(): THREE.BufferGeometry {
    const parts: THREE.BufferGeometry[] = [];
    const body = new THREE.BoxGeometry(1.6, 0.85, 3.4); body.translate(0, 0.72, 0); parts.push(body);
    const roof = new THREE.BoxGeometry(1.55, 0.14, 2.5); roof.translate(0, 1.55, -0.15); parts.push(roof);
    const post1 = new THREE.BoxGeometry(0.09, 0.5, 0.09); post1.translate(0.68, 1.28, 0.95); parts.push(post1);
    const post2 = post1.clone(); post2.translate(-1.36, 0, 0); parts.push(post2);
    const post3 = post1.clone(); post3.translate(0, 0, -1.9); parts.push(post3);
    const post4 = post3.clone(); post4.translate(-1.36, 0, 0); parts.push(post4);
    const windshield = new THREE.BoxGeometry(1.4, 0.6, 0.06); windshield.translate(0, 1.15, 1.62); parts.push(windshield);
    const seat = new THREE.BoxGeometry(1.3, 0.12, 1.1); seat.translate(0, 1.2, -0.2); parts.push(seat);
    for (const [wx, wz] of [[0.72, 1.15], [-0.72, 1.15], [0.72, -1.15], [-0.72, -1.15]] as const) {
      const wheel = new THREE.CylinderGeometry(0.26, 0.26, 0.18, 8);
      wheel.rotateZ(Math.PI / 2); wheel.translate(wx, 0.26, wz); parts.push(wheel);
    }
    return mergeGeometries(parts)!;
  }
  const cartGeo = golfCart();
  const cartMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1 });
  const CART_TOTAL = 24;
  const carts = new THREE.InstancedMesh(cartGeo, cartMat, CART_TOTAL);
  interface VehicleState { path: VehiclePath; t: number; dir: 1 | -1; speed: number; tint: number }
  const cartStates: VehicleState[] = [];
  const cartPool = lakeDrive.length ? [...lakeDrive, ...lakeDrive, ...drivePaths] : drivePaths;
  for (let i = 0; i < CART_TOTAL; i++) {
    const path = cartPool[Math.floor(rng() * cartPool.length)];
    cartStates.push({ path, t: rng(), dir: rng() < 0.5 ? 1 : -1, speed: 4.2 + rng() * 1.2, tint: rng() < 0.82 ? 0xf7f7f4 : 0xe8e2d4 });
    carts.setColorAt(i, new THREE.Color(cartStates[i].tint));
  }
  carts.castShadow = false;
  group.add(carts);

  // ---- 大客车（校车）1-2 辆：发车间隔大、只在主环路慢速巡航 ----
  function coach(): THREE.BufferGeometry {
    const parts: THREE.BufferGeometry[] = [];
    const body = new THREE.BoxGeometry(2.4, 2.5, 9.4); body.translate(0, 1.55, 0); parts.push(body);
    const winBand = new THREE.BoxGeometry(2.46, 0.95, 7.6); winBand.translate(0, 2.15, -0.3); parts.push(winBand);
    const windshield = new THREE.BoxGeometry(2.2, 1.0, 0.08); windshield.translate(0, 2.1, 4.72); parts.push(windshield);
    const skirt = new THREE.BoxGeometry(2.44, 0.5, 8.8); skirt.translate(0, 0.55, -0.1); parts.push(skirt);
    for (const [wx, wz] of [[1.05, 3.2], [-1.05, 3.2], [1.05, 0.4], [-1.05, 0.4], [1.05, -3.2], [-1.05, -3.2]] as const) {
      const wheel = new THREE.CylinderGeometry(0.46, 0.46, 0.26, 8);
      wheel.rotateZ(Math.PI / 2); wheel.translate(wx, 0.46, wz); parts.push(wheel);
    }
    return mergeGeometries(parts)!;
  }
  const coachGeo = coach();
  const coachMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
  const COACH_TOTAL = 2;
  const coaches = new THREE.InstancedMesh(coachGeo, coachMat, COACH_TOTAL);
  const coachStates: VehicleState[] = [];
  const coachPool = drivePaths.filter((p) => p.len > 260);
  for (let i = 0; i < COACH_TOTAL && coachPool.length; i++) {
    const path = coachPool[Math.floor(rng() * coachPool.length)];
    coachStates.push({ path, t: rng(), dir: rng() < 0.5 ? 1 : -1, speed: 6.5, tint: 0xf2f4f6 });
    coaches.setColorAt(i, new THREE.Color(coachStates[i].tint));
  }
  coaches.castShadow = false;
  group.add(coaches);

  // ---- 沿折线取位 ----
  function at(pathPts: Pt[], total: number, dist: number, dir: 1 | -1, forward: THREE.Vector3): Pt {
    let rest = dist % total; if (rest < 0) rest += total;
    if (dir === -1) rest = total - rest;
    for (let i = 0; i < pathPts.length - 1; i++) {
      const seg = Math.hypot(pathPts[i + 1][0] - pathPts[i][0], pathPts[i + 1][1] - pathPts[i][1]);
      if (rest <= seg || i === pathPts.length - 2) {
        const t = seg ? Math.min(1, rest / seg) : 0;
        const x = pathPts[i][0] + (pathPts[i + 1][0] - pathPts[i][0]) * t;
        const y = pathPts[i][1] + (pathPts[i + 1][1] - pathPts[i][1]) * t;
        forward.set(pathPts[i + 1][0] - pathPts[i][0], 0, -(pathPts[i + 1][1] - pathPts[i][1]));
        if (forward.lengthSq() > 1e-8) forward.normalize();
        return [x, y];
      }
      rest -= seg;
    }
    return pathPts[pathPts.length - 1];
  }

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);
  const fwd = new THREE.Vector3();

  function place(mesh: THREE.InstancedMesh, states: VehicleState[] | (WalkerState & { speed: number })[], dt: number, isWalker: boolean): void {
    let n = 0;
    for (const st of states as { path: { pts: Pt[]; len: number }; t: number; dir: 1 | -1; speed: number; bob?: number }[]) {
      if (n >= mesh.count) break;
      st.t += (st.speed * dt) / st.path.len;
      if (st.t > 1) st.t -= 1;
      const [x, y] = at(st.path.pts, st.path.len, st.t * st.path.len, st.dir, fwd);
      if (st.dir === -1) fwd.negate(); // 逆行时朝向反转
      const yaw = Math.atan2(fwd.x, fwd.z);
      e.set(0, yaw, 0); q.setFromEuler(e);
      const bob = isWalker && st.bob !== undefined ? Math.abs(Math.sin(st.t * st.path.len * 1.6 + st.bob)) * 0.045 : 0;
      v.set(x, bob, -y);
      m.compose(v, q, s);
      mesh.setMatrixAt(n, m);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  }

  let phase: "day" | "dusk" | "night" = "day";
  const fullWalker = walkerStates.length;
  return {
    group,
    update(dt: number): void {
      // 行人密度按昼夜（夜 35%）；车流（夜 50%）
      const walkerCount = phase === "night" ? Math.floor(fullWalker * 0.35) : phase === "dusk" ? Math.floor(fullWalker * 0.8) : fullWalker;
      const cartCount = phase === "night" ? Math.floor(CART_TOTAL * 0.5) : CART_TOTAL;
      walkers.count = walkerCount;
      carts.count = cartCount;
      place(walkers, walkerStates.slice(0, walkerCount), dt, true);
      place(carts, cartStates.slice(0, cartCount), dt, false);
      place(coaches, coachStates, dt, false);
    },
    setPhase(next: "day" | "dusk" | "night"): void { phase = next; },
  };
}
