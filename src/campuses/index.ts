import type { CampusConfig, CampusId } from "./types";
import { huxi } from "./huxi";
import { shapingba } from "./shapingba";
import { liangjiang } from "./liangjiang";
import { zhigu } from "./zhigu";

/** 校区注册表。两江/智谷按用户指示暂不实施——仅总览占位（批 2 加）。 */
export const CAMPUSES: Record<CampusId, CampusConfig> = {
  huxi,
  shapingba,
  liangjiang,
  zhigu,
  all: {
    id: "all", nameZh: "校区总览", nameEn: "All campuses", available: true,
    sceneUrl: "", modelDir: "models",
    extents: { x0: -260, x1: 260, y0: -240, y1: 240 }, yRange: [10, 800],
    hudTitle: { zh: "校区总览", en: "All campuses" },
    homeDirection: [0, 1, 1.1], hotspots: [], walkSpawns: [], shortcuts: [], tours: "auto",
  },
};

export const DEFAULT_CAMPUS = "huxi";

/** 解析当前校区：?campus= 参数 > 缺省虎溪。未知值回落虎溪。 */
export function campusFromUrl(search: string): CampusConfig {
  const m = /[?&]campus=([\w-]+)/.exec(search);
  const id = m ? m[1] : DEFAULT_CAMPUS;
  return CAMPUSES[id] ?? CAMPUSES[DEFAULT_CAMPUS];
}

export type { CampusConfig, CampusId } from "./types";
