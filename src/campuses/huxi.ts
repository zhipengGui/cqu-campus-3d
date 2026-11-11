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
  walkSpawns: ["第一食堂", "第二食堂", "第三食堂", "校医院", "竹园#4", "梅园#4", "松园四栋", "兰园#3", "荷园#1", "菊园#1", "体育馆", "田径场", "学生活动中心", "第一教学楼", "信息技术科研楼", "理科楼", "工科大楼", "综合楼", "图书馆", "艺术楼"],
  shortcuts: [
    ["科学中心", "虎溪科学中心"],
    ["储能大楼", "储能技术产教融合创新大楼"],
    ["荷园新食堂", "荷园新食堂"],
    ["西南景观", "西南部景观"],
    ["一食堂", "第一食堂"],
    ["二食堂", "第二食堂"],
    ["三食堂", "第三食堂"],
    ["校医院", "校医院"],
    ["竹园", "竹园#4"],
    ["梅园", "梅园#4"],
    ["松园", "松园四栋"],
    ["兰园", "兰园#3"],
  ],
  tours: "full",
  mapPoints: [{name:"西南部景观",kind:"building",point:[-518,-463]}],
  overviewSlot: [-30, 0],
};
