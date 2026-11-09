import type { CampusConfig } from "./types";

/** 两江校区：OSM 覆盖薄弱（实测仅 26 栋），按用户指示暂不实施——总览占位 */
export const liangjiang: CampusConfig = {
  id: "liangjiang",
  nameZh: "两江校区",
  nameEn: "Liangjiang Campus",
  hudTitle: { zh: "探索两江校区", en: "Explore Liangjiang" },
  available: false,
  sceneUrl: "data/liangjiang.json",
  modelDir: "models/liangjiang",
  extents: { x0: -800, x1: 800, y0: -700, y1: 700 },
  yRange: [2, 1600],
  homeDirection: [0.3, 1, 1],
  hotspots: [],
  walkSpawns: [],
  shortcuts: [],
  tours: "auto",
  overviewSlot: [40, 46],
};
