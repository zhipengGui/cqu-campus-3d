import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Road } from "./types";
import { distPointSeg } from "./trees";

/** 校园动态层：
 *  - 路径预处理：拐角二次贝塞尔圆角化 → 2m 等距重采样 → 累计距离（运行时二分插值）
 *  - 实体推进：全局 elapsed 驱动（暂停/恢复零漂移），distance 为纯函数
 *  - 控制开关：行人/车辆/播放独立控制
 *  全部 InstancedMesh：行人 1 + 观光车 1 + 校车 1 = 3 个 draw call。 */

type Pt = [number, number];

export interface TrafficControls { walkers: boolean; vehicles: boolean; playing: boolean }

export interface TrafficSystem {
  update(dt: number): void;
  setPhase(phase: "day" | "dusk" | "night"): void;
  setControls(c: TrafficControls): void;
  group: THREE.Group;
}

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

// ---- 路径预处理 ----

/** 拐角二次贝塞尔圆角（切入邻段 ≤30%，不冲出路面） */
function roundPath(input: Pt[], closed: boolean, radius: number): Pt[] {
  const pts = input.filter((p, i) => !i || Math.hypot(p[0] - input[i - 1][0], p[1] - input[i - 1][1]) > 0.01);
  if (closed && pts.length > 1 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.01) pts.pop();
  if (pts.length < 2) return pts;
  const out: Pt[] = [];
  const seg = (a: Pt, b: Pt): number => Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (let i = 0; i < pts.length; i++) {
    const b = pts[i];
    if (!closed && (i === 0 || i === pts.length - 1)) { out.push(b); continue; }
    const a = pts[(i - 1 + pts.length) % pts.length];
    const c = pts[(i + 1) % pts.length];
    const la = seg(a, b), lc = seg(b, c);
    if (la < 0.01 || lc < 0.01) { out.push(b); continue; }
    const trim = Math.min(radius, la * 0.3, lc * 0.3);
    const enter: Pt = [b[0] + (a[0] - b[0]) * (trim / la), b[1] + (a[1] - b[1]) * (trim / la)];
    const exit: Pt = [b[0] + (c[0] - b[0]) * (trim / lc), b[1] + (c[1] - b[1]) * (trim / lc)];
    for (let j = 0; j <= 6; j++) {
      const t = j / 6;
      const m1x = enter[0] + (b[0] - enter[0]) * t, m1y = enter[1] + (b[1] - enter[1]) * t;
      const m2x = b[0] + (exit[0] - b[0]) * t, m2y = b[1] + (exit[1] - b[1]) * t;
      out.push([m1x + (m2x - m1x) * t, m1y + (m2y - m1y) * t]);
    }
  }
  if (closed) out.push([...out[0]]);
  return out;
}

/** 等距重采样 */
function resamplePath(pts: Pt[], spacing: number): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const steps = Math.max(1, Math.ceil(seg / spacing));
    for (let j = 1; j <= steps; j++) {
      out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * (j / steps), pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (j / steps)]);
    }
  }
  return out;
}

interface SampledRoute { pts: Pt[]; cum: number[]; length: number; closed: boolean }

function buildRoute(pts: Pt[], closed: boolean): SampledRoute {
  const rounded = roundPath(pts, closed, 6);
  const rs = resamplePath(rounded, 2.5);
  const cum = [0];
  for (let i = 1; i < rs.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(rs[i][0] - rs[i - 1][0], rs[i][1] - rs[i - 1][1]));
  }
  return { pts: rs, cum, length: cum[cum.length - 1], closed };
}

/** 二分查找按距离取位（含切线） */
function sampleRouteAt(r: SampledRoute, dist: number): { x: number; y: number; tx: number; ty: number } {
  let d = r.closed ? ((dist % r.length) + r.length) % r.length : Math.max(0, Math.min(r.length, dist));
  let lo = 0, hi = r.pts.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (r.cum[mid] <= d) lo = mid; else hi = mid;
  }
  const a = r.pts[lo], b = r.pts[hi];
  const segLen = r.cum[hi] - r.cum[lo];
  const t = segLen > 0 ? (d - r.cum[lo]) / segLen : 0;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const norm = Math.hypot(dx, dy) || 1;
  return { x: a[0] + dx * t, y: a[1] + dy * t, tx: dx / norm, ty: dy / norm };
}

// ---- 主体 ----

export function buildTraffic(
  parent: THREE.Object3D,
  opts: { roads: Road[]; lakeOutline: Pt[] | null; hotspots?: { x: number; y: number; r: number; hw: number; hd: number }[] },
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
  // 人流热点：按"路径圈内长度占比"加权
  const segHotLen = (a: Pt, b: Pt): number => {
    let hot = 0;
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(seg / 12));
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * seg;
      const x = a[0] + (b[0] - a[0]) * (seg ? t / seg : 0);
      const y = a[1] + (b[1] - a[1]) * (seg ? t / seg : 0);
      for (const h of opts.hotspots ?? []) {
        if (Math.hypot(x - h.x, y - h.y) < h.r) { hot += seg / steps; break; }
      }
    }
    return hot;
  };

  // ---- 行人路径：步道（环湖与热点加权）----
  interface WalkSrc { pts: Pt[]; len: number; lake: boolean }
  const walkPaths: WalkSrc[] = [];
  for (const r of opts.roads) {
    if (!WALK_KINDS.has(r.kind) || r.pts.length < 2) continue;
    const len = polylineLen(r.pts);
    if (len < 30) continue;
    const lake = r.pts.some((p) => nearLake(p[0], p[1]));
    let hotLen = 0;
    for (let i = 0; i < r.pts.length - 1; i++) hotLen += segHotLen(r.pts[i], r.pts[i + 1]);
    const copies = 1 + (lake ? 1 : 0) + Math.min(9, Math.round((hotLen / len) * 9));
    for (let c = 0; c < copies; c++) walkPaths.push({ pts: r.pts, len, lake });
  }
  // 热点周边的车行路也上人（上下课/就餐过路）
  for (const r of opts.roads) {
    if (!DRIVE_KINDS.has(r.kind) || r.pts.length < 2) continue;
    const len = polylineLen(r.pts);
    if (len < 40) continue;
    let hotLen = 0;
    for (let i = 0; i < r.pts.length - 1; i++) hotLen += segHotLen(r.pts[i], r.pts[i + 1]);
    if (hotLen < len * 0.3) continue;
    const copies = 1 + Math.min(6, Math.round((hotLen / len) * 7));
    for (let c = 0; c < copies; c++) walkPaths.push({ pts: r.pts, len, lake: false });
  }
  // 热点环楼步道（楼前广场人流形态）
  for (const h of opts.hotspots ?? []) {
    const x0 = h.x - h.hw - 9, x1 = h.x + h.hw + 9, y0 = h.y - h.hd - 9, y1 = h.y + h.hd + 9;
    const ring: Pt[] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
    const len = polylineLen(ring);
    for (let c = 0; c < 10; c++) walkPaths.push({ pts: ring, len, lake: false });
  }
  // ---- 车行路径：校内车行路（较长者为骨架）----
  interface DriveSrc { pts: Pt[]; len: number }
  const drivePaths: DriveSrc[] = [];
  for (const r of opts.roads) {
    if (!DRIVE_KINDS.has(r.kind) || r.pts.length < 2) continue;
    const len = polylineLen(r.pts);
    if (len < 120) continue;
    const c = r.pts[Math.floor(r.pts.length / 2)];
    if (Math.abs(c[0]) > 900 || Math.abs(c[1]) > 900) continue;
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

  const WALKER_TOTAL = 480;
  const walkers = new THREE.InstancedMesh(walkerGeo, walkerMat, WALKER_TOTAL);
  interface ActorState { route: SampledRoute; phase: number; dir: 1 | -1; speed: number; side: number; bob?: number; tint?: number }
  const walkerStates: ActorState[] = [];
  for (let i = 0; i < WALKER_TOTAL; i++) {
    const pool = walkPaths.length ? walkPaths : drivePaths;
    const src = pool[Math.floor(rng() * pool.length)];
    walkerStates.push({
      route: buildRoute(src.pts, false), phase: rng(), dir: rng() < 0.5 ? 1 : -1,
      speed: 0.9 + rng() * 0.6, side: (rng() - 0.5) * 2.6, bob: rng() * 10,
    });
    walkers.setColorAt(i, new THREE.Color(WALKER_COLORS[Math.floor(rng() * WALKER_COLORS.length)]));
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
  const cartStates: ActorState[] = [];
  const cartPool = lakeDrive.length ? [...lakeDrive, ...lakeDrive, ...drivePaths] : drivePaths;
  for (let i = 0; i < CART_TOTAL; i++) {
    const src = cartPool[Math.floor(rng() * cartPool.length)];
    cartStates.push({ route: buildRoute(src.pts, false), phase: rng(), dir: rng() < 0.5 ? 1 : -1, speed: 4.2 + rng() * 1.2, side: 0, tint: rng() < 0.82 ? 0xf7f7f4 : 0xe8e2d4 });
    carts.setColorAt(i, new THREE.Color(cartStates[i].tint!));
  }
  carts.castShadow = false;
  group.add(carts);

  // ---- 大客车（校车）1-2 辆：主环路慢速 ----
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
  const coachStates: ActorState[] = [];
  const coachPool = drivePaths.filter((p) => p.len > 260);
  for (let i = 0; i < COACH_TOTAL && coachPool.length; i++) {
    const src = coachPool[Math.floor(rng() * coachPool.length)];
    coachStates.push({ route: buildRoute(src.pts, false), phase: rng(), dir: rng() < 0.5 ? 1 : -1, speed: 6.5, side: 0, tint: 0xf2f4f6 });
    coaches.setColorAt(i, new THREE.Color(coachStates[i].tint!));
  }
  coaches.castShadow = false;
  group.add(coaches);

  // ---- 推进与放置 ----
  const controls: TrafficControls = { walkers: true, vehicles: true, playing: true };
  let phase: "day" | "dusk" | "night" = "day";
  let elapsed = 0;
  let lastWrite = 0;
  let wroteWhilePaused = false;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const s0 = new THREE.Vector3(0, 0, 0);
  const s1 = new THREE.Vector3(1, 1, 1);

  function placeMesh(mesh: THREE.InstancedMesh, states: ActorState[], isWalker: boolean, visible: boolean): void {
    let n = 0;
    for (const st of states) {
      if (n >= mesh.count) break;
      const route = st.route;
      // dir=-1 的实体：反向行进 = 反向距离
      let dist = (st.phase * route.length + elapsed * st.speed) % route.length;
      if (dist < 0) dist += route.length;
      if (st.dir === -1) dist = route.length - dist;
      // 开环路径端点 8m 内不显示（避免走到断头处凭空消失）
      if (!visible || (!route.closed && (dist < 8 || dist > route.length - 8))) {
        m.compose(v.set(0, -50, 0), q.identity(), s0);
        mesh.setMatrixAt(n, m); n++; continue;
      }
      const cur = sampleRouteAt(route, dist);
      // 侧向偏移：行人随机散布；车辆靠右 1.1m（世界 z=-y）
      const px = cur.x + cur.ty * st.side;
      const py = cur.y - cur.tx * st.side;
      e.set(0, Math.atan2(cur.tx, -cur.ty), 0);
      q.setFromEuler(e);
      const bob = isWalker && st.bob !== undefined ? Math.abs(Math.sin(dist * 0.55 + st.bob)) * 0.045 : 0;
      v.set(px, bob, -py);
      m.compose(v, q, s1);
      mesh.setMatrixAt(n, m);
      n++;
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    group,
    setControls(next: TrafficControls): void {
      const wasPlaying = controls.playing;
      Object.assign(controls, next);
      if (!wasPlaying && controls.playing) wroteWhilePaused = false; // 恢复后强制重写
    },
    setPhase(next: "day" | "dusk" | "night"): void {
      phase = next;
      wroteWhilePaused = false;
    },
    update(dt: number): void {
      if (controls.playing) elapsed += dt;
      // 30fps 节流；暂停且已写帧则跳过
      const now = performance.now();
      if (!controls.playing && wroteWhilePaused) return;
      if (controls.playing && now - lastWrite < 33) return;
      lastWrite = now;
      wroteWhilePaused = !controls.playing;
      const walkerCount = controls.walkers
        ? (phase === "night" ? Math.floor(WALKER_TOTAL * 0.35) : phase === "dusk" ? Math.floor(WALKER_TOTAL * 0.8) : WALKER_TOTAL)
        : 0;
      const cartCount = controls.vehicles ? (phase === "night" ? Math.floor(CART_TOTAL * 0.5) : CART_TOTAL) : 0;
      walkers.count = walkerCount;
      carts.count = cartCount;
      coaches.count = controls.vehicles ? COACH_TOTAL : 0;
      placeMesh(walkers, walkerStates.slice(0, walkerCount), true, controls.walkers);
      placeMesh(carts, cartStates.slice(0, cartCount), false, controls.vehicles);
      placeMesh(coaches, coachStates, false, controls.vehicles);
    },
  };
}
