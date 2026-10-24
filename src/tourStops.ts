/** 巡游精选站点（从 places 按名称精确匹配挑选），附一句导览文案。
 *  选点待用户确认，增删只需改本数组，无需动逻辑。2026-10-24 增加英文 noteEn。 */

export interface TourStop {
  name: string; // 必须与 places 里的地点名一致
  note: string; // 一句导览文案
  noteEn?: string;
}

export const TOUR_STOPS: TourStop[] = [
  { name: "图书馆", note: "虎溪地标，红棕百叶塔临缙湖而立", noteEn: "Campus landmark — the vermilion louvred tower by Jin Lake" },
  { name: "缙湖", note: "图书馆倒影的最佳机位，常见水鸟栖息", noteEn: "Best spot for the library's reflection; waterbirds gather here" },
  { name: "信息技术科研楼", note: "白色框架网格外立面的信息大楼", noteEn: "The IT building with its white grid facade" },
  { name: "体育馆", note: "银灰弧形金属屋顶，运动会主场地", noteEn: "Curved silver roof — the main sports venue" },
  { name: "学生活动中心", note: "锈红新月楼，社团与演出主场", noteEn: "The rust-red crescent — clubs and shows" },
  { name: "工科大楼", note: "工科教学实验楼群，回字形围合内院", noteEn: "Engineering labs around a courtyard" },
  { name: "第一教学楼", note: "主要教学楼之一", noteEn: "One of the main teaching buildings" },
  { name: "综合楼", note: "集行政办公与公共教室的综合楼宇", noteEn: "Offices and shared classrooms in one complex" },
  { name: "理科楼", note: "数理学科教学楼，紧邻实验楼群", noteEn: "Math and physics building by the labs" },
  { name: "第三实验楼", note: "实验教学中心", noteEn: "Laboratory teaching center" },
  { name: "艺术楼", note: "艺术类教学与创作空间", noteEn: "Teaching and studio space for the arts" },
  { name: "第一食堂", note: "主要食堂之一", noteEn: "One of the main canteens" },
  { name: "第二食堂", note: "主要食堂之一", noteEn: "One of the main canteens" },
  { name: "校医院", note: "校内医疗点", noteEn: "On-campus clinic" },
  { name: "云湖", note: "东北侧开阔水面，草坪环绕", noteEn: "Open water in the northeast, ringed by lawns" },
  { name: "荷苑", note: "夏季荷花盛开的园地", noteEn: "Lotus in full bloom in summer" },
  { name: "水生植物展示区", note: "缙湖云湖之间的水生植物科普园", noteEn: "Aquatic-plant garden between the two lakes" },
  { name: "北门", note: "大学城南路，复刻老校门", noteEn: "On Daxuecheng South Rd — replica of the historic gate" },
  { name: "东门", note: "四石柱门柱广场", noteEn: "The four-column gate plaza" },
  { name: "西门", note: "松园宿舍区旁的西侧出入口", noteEn: "West entrance by the Songyuan dorms" },
];
