import type { CampusConfig } from "./types";
import type { FlyBounds } from "../freecam";

/** 校区配置 → 飞行边界 */
export function flyBoundsOf(cfg: CampusConfig): FlyBounds {
  const e = cfg.extents;
  return { x0: e.x0, x1: e.x1, y0: e.y0, y1: e.y1, yMin: cfg.yRange[0], yMax: cfg.yRange[1] };
}
