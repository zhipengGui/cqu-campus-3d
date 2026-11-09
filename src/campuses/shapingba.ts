import type { CampusConfig } from "./types";

/** 沙坪坝校区群（A/B/C 三区一域）：OSM 实测 bbox 106.4450-106.4820 / 29.5480-29.5760（339 栋）。
 *  批 3 数据域开工后 available 置 true；extents 由管线产出后回填。 */
export const shapingba: CampusConfig = {
  id: "shapingba",
  nameZh: "沙坪坝校区（A/B/C）",
  nameEn: "Shapingba Campuses (A/B/C)",
  hudTitle: { zh: "探索沙坪坝校区", en: "Explore Shapingba" },
  available: true,
  sceneUrl: "data/shapingba.json",
  modelDir: "models/shapingba",
  extents: { x0: -1330, x1: 1090, y0: -1830, y1: 1340 }, // 管线实测建筑范围外扩 80m
  yRange: [2, 1600],
  homeDirection: [0.3, 1.0, 1],
  hotspots: [],
  walkSpawns: ["A区正门", "钟塔", "重庆大学主教学楼", "民主湖", "重庆大学B区图书馆", "综合实验大楼", "建工馆"],
  shortcuts: [
    ["A区正门", "A区正门"],
    ["钟塔", "钟塔"],
    ["主教学楼", "主教学楼"],
    ["民主湖", "民主湖"],
  ],
  mapPoints: [
    // 高德正门 POI 转 WGS84 后投影到 OSM way 404075241 的校前进场道路。
    { name: "A区正门", kind: "gate", point: [-318.64, 891.55] },
    // OSM way 1556523869 为纪念景观范围，取其质心作为定位点。
    { name: "钟塔", kind: "building", point: [-8.73, 881.40] },
    // 校方 A 区总平面图的九舍标注，对应 OSM way 1556523930 的东南翼，入口待核。
    { name: "A区学生九舍", kind: "building", point: [267, 158] },
  ],
  tours: "auto",
  overviewSlot: [40, -18],
};
