import * as THREE from "three";
import type { Building } from "./types";

/** 地标 GLB 流式加载（gxu streaming 思路的本地形态）：
 *  首屏用参数化回退模型立即出画面，far 档 GLB 按与观察点距离排序、
 *  双并发后台拉取，到位后替换回退模型；相机大幅移动时重排未加载队列。
 *  near 档依旧由 updateDetailAssets 按距离懒加载（原有机制）。 */

export interface LandmarkDef {
  asset: string;
  building: Building;
  fallback: THREE.Group;
}

export interface LandmarkStreamOpts {
  parent: THREE.Group;
  center: THREE.Vector3; // 观察参考点（初始 home target）
  load: (asset: string, b: Building) => Promise<THREE.Group | null>;
  onSwap: (asset: string, root: THREE.Group, fallback: THREE.Group) => void;
  concurrency?: number;
  onProgress?: (loaded: number, total: number) => void;
}

export function streamLandmarkGLBs(defs: LandmarkDef[], opts: LandmarkStreamOpts): (center: THREE.Vector3) => void {
  const { parent, load, onSwap } = opts;
  const concurrency = opts.concurrency ?? 2;
  const pending: LandmarkDef[] = [];
  const active = new Set<string>();
  let center = opts.center.clone();
  let done = 0;

  const dist = (b: Building): number => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of b.polygon) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return Math.hypot((x0 + x1) / 2 - center.x, -(y0 + y1) / 2 - center.z);
  };
  const resort = (): void => { pending.sort((a, b) => dist(a.building) - dist(b.building)); };

  for (const d of defs) pending.push(d);
  resort();

  const pump = (): void => {
    while (active.size < concurrency && pending.length) {
      const def = pending.shift()!;
      active.add(def.asset);
      load(def.asset, def.building).then((root) => {
        if (root) {
          parent.remove(def.fallback);
          parent.add(root);
          onSwap(def.asset, root, def.fallback);
        }
        // load 失败（返回 null）时保留参数化回退，不再重试
      }).catch(() => { /* 保留回退 */ }).finally(() => {
        active.delete(def.asset);
        done++;
        opts.onProgress?.(done, defs.length);
        pump();
      });
    }
  };
  pump();

  // 相机大幅移动 → 重排未加载队列（近处优先）；正在加载的不打断
  let lastCenter = center.clone();
  return (next: THREE.Vector3): void => {
    center.copy(next);
    if (pending.length && center.distanceToSquared(lastCenter) > 150 * 150) {
      lastCenter.copy(center);
      resort();
    }
  };
}
