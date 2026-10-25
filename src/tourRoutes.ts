import type { Pair } from "./i18n";
import type { Season } from "./trees";

/** 主题游览线：每条路线 = 站点序列（地名站走地点表，园标签站带坐标）。
 *  经典线复用 TOUR_STOPS 的解说；花卉线联动春季季相；建筑线串精建地标。 */

export interface TourRouteStop {
  name: string;
  note?: string;
  noteEn?: string;
  x?: number; // 园标签站坐标（地图米坐标）
  y?: number;
}

export interface TourRoute {
  id: string;
  name: Pair;
  sub: Pair;
  season?: Season;
  stops: TourRouteStop[];
}

const GARDEN_NOTES: Record<string, [string, string]> = {
  绣球园: ["绣球成片开在云湖畔，夏季花球如雪。", "Hydrangeas bloom in masses by Cloud Lake, snowball rounds in summer."],
  蔷薇园: ["蔷薇攀架沿湖开放，春末最盛。", "Climbing roses along the lake peak in late spring."],
  木兰园: ["早春玉兰先花后叶，满树素白。", "Magnolias bloom before leafing — a tree of white in early spring."],
  山茶园: ["山茶冬春之交盛开，红瓣耐寒。", "Camellias bridge winter and spring with hardy red blooms."],
  杜鹃园: ["杜鹃春日映山，沿坡成带。", "Azaleas blanket the slope in spring."],
  牡丹园: ["谷雨前后牡丹盛放，花型硕大。", "Peonies bloom around Grain Rain with large showy flowers."],
  蕨类园: ["林下蕨类喜阴湿，松林公园一景。", "Shade-loving ferns thrive under the pines."],
};

export function buildTourRoutes(gardens: { zh: string; x: number; y: number }[], classicNames: { name: string; note?: string; noteEn?: string }[]): TourRoute[] {
  const classic: TourRoute = {
    id: "classic",
    name: { zh: "经典全线", en: "Classic Tour" },
    sub: { zh: "全部站点", en: "Every stop" },
    stops: classicNames.map((s) => ({ name: s.name, note: s.note, noteEn: s.noteEn })),
  };
  const gardenStops: TourRouteStop[] = gardens
    .filter((g) => GARDEN_NOTES[g.zh])
    .map((g) => ({
      name: g.zh, x: g.x, y: g.y,
      note: GARDEN_NOTES[g.zh]?.[0], noteEn: GARDEN_NOTES[g.zh]?.[1],
    }));
  const flora: TourRoute = {
    id: "flora",
    name: { zh: "植物花卉", en: "Flora Tour" },
    sub: { zh: "春季 · 环湖七园", en: "Spring · seven gardens" },
    season: "spring",
    stops: [
      { name: "荷苑", note: "荷苑夏看荷叶田田，春看新叶初卷。", noteEn: "Lotus leaves unfurl here — new curls in spring, full canopy in summer." },
      { name: "水生植物展示区", note: "芦苇与水生植物群落沿展示区排布。", noteEn: "Reeds and aquatic plant communities line the display beds." },
      ...gardenStops,
      { name: "缙湖", note: "环湖一圈走完，四季各有花信。", noteEn: "A loop around Jin Lake — each season has its own blooms." },
    ],
  };
  const arch: TourRoute = {
    id: "arch",
    name: { zh: "建筑鉴赏", en: "Architecture Tour" },
    sub: { zh: "精建地标串游", en: "The detailed landmarks" },
    stops: [
      { name: "综合楼", note: "毛石墙与底层柱廊，校园最早的地标之一。", noteEn: "Stone-clad walls and an open colonnade — one of the campus's first landmarks." },
      { name: "第一教学楼", note: "云湖畔的五层连廊楼群，工整对称。", noteEn: "Five storeys of linked wings by Cloud Lake, neatly symmetric." },
      { name: "图书馆", note: "朱红 12 层板楼临缙湖而立，鲁班奖作品。", noteEn: "A vermilion 12-storey slab by Jin Lake — Luban Award winner." },
      { name: "理科楼", note: "三条板楼组合的实验科研楼群。", noteEn: "A science complex of three slab blocks." },
      { name: "信息技术科研楼", note: "白框架与穿孔铝板立面的信息学科群楼。", noteEn: "IT building with white frames and perforated aluminium screens." },
      { name: "工科大楼", note: "工科群的实践教学综合体。", noteEn: "The engineering complex for hands-on teaching." },
      { name: "虎溪科学中心", note: "隔街相望的科研新地标，鳞状玻璃幕墙。", noteEn: "A research landmark across the road with scaled glass facade." },
      { name: "体育馆", note: "学位帽造型的大跨场馆，金属屋面。", noteEn: "A large-span hall shaped like a doctoral cap, metal roof." },
    ],
  };
  return [classic, flora, arch];
}
