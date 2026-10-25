import * as THREE from "three";
import { CatmullRomCurve3 } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** 轻量镜头飞行：直线插值相机位置与观察目标，缓入缓出。无第三方依赖。 */

let cancelCurrent: (() => void) | null = null;

export function cancelFly(): void {
  cancelCurrent?.();
  cancelCurrent = null;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** 飞到 target 点，落点距离 distance（保持当前方位角与俯仰角） */
export function flyTo(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  target: THREE.Vector3,
  distance: number,
  durationMs = 1100,
  direction?: THREE.Vector3,
): void {
  cancelFly();
  const startCam = camera.position.clone();
  const startTgt = controls.target.clone();
  const dir = direction?.clone() ?? startCam.clone().sub(startTgt);
  if (dir.lengthSq() < 1e-6) dir.set(300, 400, 500);
  dir.normalize();
  // 系统开启「减少动态效果」时直接跳转，不做飞行动画
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    camera.position.copy(target).add(dir.clone().multiplyScalar(distance));
    controls.target.copy(target);
    return;
  }
  const endCam = target.clone().add(dir.multiplyScalar(distance));

  let raf = 0;
  let cancelled = false;
  const t0 = performance.now();
  const step = (): void => {
    if (cancelled) return;
    const t = Math.min(1, (performance.now() - t0) / durationMs);
    const e = easeInOutCubic(t);
    camera.position.lerpVectors(startCam, endCam, e);
    controls.target.lerpVectors(startTgt, target, e);
    if (t < 1) {
      raf = requestAnimationFrame(step);
    } else {
      cancelCurrent = null;
    }
  };
  raf = requestAnimationFrame(step);
  cancelCurrent = (): void => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}

/** 巡游段飞行：CatmullRom 弧线相机路径（中段抬升侧偏）+ 目标点平滑过渡。
 *  比 flyTo 更有"旅程感"，用于游览线段间移动。 */
export function flyAlong(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  target: THREE.Vector3,
  distance: number,
  opts: { durationMs?: number; arcHeight?: number; direction?: THREE.Vector3 } = {},
): void {
  cancelFly();
  const startCam = camera.position.clone();
  const startTgt = controls.target.clone();
  const dir = opts.direction?.clone() ?? startCam.clone().sub(startTgt);
  if (dir.lengthSq() < 1e-6) dir.set(300, 400, 500);
  dir.normalize();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    camera.position.copy(target).add(dir.clone().multiplyScalar(distance));
    controls.target.copy(target);
    return;
  }
  const endCam = target.clone().add(dir.multiplyScalar(distance));
  // 中段弧线：抬升 + 侧偏，让镜头划过而非直线掠过
  const span = startCam.distanceTo(endCam);
  const arcH = opts.arcHeight ?? Math.min(160, Math.max(30, span * 0.18));
  const mid1 = startCam.clone().lerp(endCam, 0.33).add(new THREE.Vector3(0, arcH, 0));
  const mid2 = startCam.clone().lerp(endCam, 0.66).add(new THREE.Vector3(0, arcH * 0.55, 0));
  const curve = new CatmullRomCurve3([startCam, mid1, mid2, endCam], false, "catmullrom", 0.4);
  const durationMs = opts.durationMs ?? 2400;

  let raf = 0;
  let cancelled = false;
  const t0 = performance.now();
  const tmp = new THREE.Vector3();
  const step = (): void => {
    if (cancelled) return;
    const t = Math.min(1, (performance.now() - t0) / durationMs);
    const e = easeInOutCubic(t);
    curve.getPoint(e, tmp);
    camera.position.copy(tmp);
    controls.target.lerpVectors(startTgt, target, e);
    if (t < 1) raf = requestAnimationFrame(step);
    else cancelCurrent = null;
  };
  raf = requestAnimationFrame(step);
  cancelCurrent = (): void => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}
