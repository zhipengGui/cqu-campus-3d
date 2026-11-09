import type { CampusConfig } from "./types";

/** 智谷校区：2025-03 动工在建（官网），暂不实施——总览占位 */
export const zhigu: CampusConfig = {
  id: "zhigu",
  nameZh: "智谷校区（在建）",
  nameEn: "Zhigu Campus (under construction)",
  hudTitle: { zh: "智谷校区（在建）", en: "Zhigu (under construction)" },
  available: false,
  sceneUrl: "",
  modelDir: "models/zhigu",
  extents: { x0: -600, x1: 600, y0: -500, y1: 500 },
  yRange: [2, 1600],
  homeDirection: [0.3, 1, 1],
  hotspots: [],
  walkSpawns: [],
  shortcuts: [],
  tours: "auto",
  overviewSlot: [40, 118],
};
