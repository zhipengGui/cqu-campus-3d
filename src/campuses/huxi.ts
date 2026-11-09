import type { CampusConfig } from "./types";

/** 虎溪校区（默认）：全部数值自 v12 main.ts/vegetation.ts/freecam.ts 硬编码原样迁移 */
export const huxi: CampusConfig = {
  id: "huxi",
  nameZh: "虎溪校区",
  nameEn: "Huxi Campus",
  hudTitle: { zh: "探索虎溪", en: "Explore Huxi" },
  available: true,
  sceneUrl: "data/scene.json", // 历史路径，保持线上缓存与分享链接零变化
  modelDir: "models",
  extents: { x0: -1515, x1: 1604, y0: -1352, y1: 1659 },
  yRange: [2, 1600],
  homeDirection: [0.30, 1.02, 1],
  hotspots: ["第一教学楼", "图书馆", "综合楼", "第一食堂", "第二食堂"],
  gardens: {
    lakeName: "缙湖",
    lotusName: "荷苑",
    aquaticName: "水生植物展示区",
    walkName: "含笑漫步道",
    pineRole: true,
  },
  walkSpawns: ["综合楼", "第一教学楼", "信息技术科研楼", "图书馆"],
  shortcuts: [
    ["综合楼", "综合楼"],
    ["体育区", "田径场"],
    ["图书馆", "图书馆"],
  ],
  tours: "full",
  overviewSlot: [-30, 0],
};
