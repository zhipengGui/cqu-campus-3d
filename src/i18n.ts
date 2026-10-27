/** 中英双语（i18n）：界面字典 + 地名映射 + 语言状态。
 *  语言存 localStorage('huxi-lang')，URL ?lang=en 可指定并随分享链接传播。
 *  默认 zh；切换时 onLangChange 回调负责重渲染各面板。 */

export type Lang = "zh" | "en";
export interface Pair {
  zh: string;
  en: string;
}

export const D: Record<string, Pair> = {
  title: { zh: "重庆大学虎溪校区 3D 地图", en: "CQU Huxi Campus 3D Map" },
  metaDesc: {
    zh: "漫游重庆大学虎溪校区，探索地标建筑、湖泊与运动场地，体验昼夜光影与校园导览。",
    en: "Explore Chongqing University's Huxi campus in 3D — landmarks, lakes, sports venues, day-night lighting and a guided tour.",
  },
  watermark: { zh: "重庆大学虎溪校区 3D 地图 · zhipengGui", en: "CQU Huxi Campus 3D Map · zhipengGui" },
  exportBrand: { zh: "重庆大学虎溪校区 3D 地图 · zhipengGui", en: "CQU Huxi Campus 3D Map · zhipengGui" },

  bootTitle: { zh: "正在打开虎溪校园", en: "Opening Huxi campus…" },
  bootNote: { zh: "加载校园与地标模型，首次打开请稍候。", en: "Loading campus and landmark models — please wait a moment on first visit." },
  bootRetry: { zh: "重新加载", en: "Reload" },
  bootFailTitle: { zh: "地图暂时无法打开", en: "The map failed to open" },
  bootFailNote: { zh: "请检查网络或浏览器的 WebGL 支持，然后重试。", en: "Please check your network or WebGL support, then retry." },

  brandTitle: { zh: "重庆大学", en: "Chongqing University" },
  brandSub: { zh: "虎溪校区 · 三维校园地图", en: "Huxi Campus · 3D Map" },
  hudTitle: { zh: "探索虎溪", en: "Explore Huxi" },
  hudFold: { zh: "收起/展开", en: "Collapse/Expand" },
  tabPlaces: { zh: "地点", en: "Places" },
  tabLayers: { zh: "图层", en: "Layers" },
  tabLighting: { zh: "光影", en: "Lighting" },
  searchPh: { zh: "搜索楼栋、湖泊、运动场地", en: "Search buildings, lakes, venues" },
  hint: { zh: "左键旋转 · 滚轮缩放 · 右键平移 · 点楼看信息", en: "Drag to rotate · Scroll to zoom · Right-drag to pan · Click a building" },
  shortcutZonghe: { zh: "综合楼", en: "Complex" },
  shortcutSports: { zh: "体育区", en: "Sports" },
  shortcutLibrary: { zh: "图书馆", en: "Library" },

  tbNav: { zh: "导航", en: "Route" },
  tbWalk: { zh: "步行漫游", en: "Walk" },
  qualityLabel: { zh: "画质", en: "Quality" },
  qualityDesc: { zh: "低画质更省电，适合手机", en: "Low saves battery on phones" },
  qAuto: { zh: "自动", en: "Auto" },
  qHigh: { zh: "高", en: "High" },
  qLow: { zh: "低", en: "Low" },
  seasonLabel: { zh: "四季", en: "Seasons" },
  seasonDesc: { zh: "切换植被季相", en: "Switch foliage season" },
  navWalk: { zh: "步行前往", en: "Walk there" },
  walkArrive: { zh: "已到达", en: "Arrived at" },
  walkOffRoute: { zh: "已偏离路线，正在重新规划", en: "Off route, recalculating" },
  walkStartFail: { zh: "此处无法开始步行，请靠近道路后重试", en: "Cannot start walking here — get closer to a road and retry" },
  walkLeft: { zh: "左转", en: "turn left" },
  walkRight: { zh: "右转", en: "turn right" },
  walkAhead: { zh: "直行", en: "continue ahead" },
  tlFlag: { zh: "地图纠错", en: "Report a map issue" },
  flagHint: { zh: "纠错模式：点击地图上需要纠正的位置", en: "Correction mode: click a spot on the map" },
  flagTitle: { zh: "地图纠错", en: "Report a map issue" },
  flagTip: { zh: "提交后会打开 GitHub Issue（需登录），也可以复制信息发给作者。", en: "Submitting opens a GitHub Issue (login required), or copy the details to send to the author." },
  flagNear: { zh: "附近", en: "Nearby" },
  flagDescLabel: { zh: "问题说明", en: "Description" },
  flagOpenIssue: { zh: "打开 GitHub Issue", en: "Open GitHub Issue" },
  flagCopy: { zh: "复制信息", en: "Copy details" },
  flagCopied: { zh: "纠错信息已复制", en: "Details copied" },
  flagCopyFail: { zh: "复制失败，请手动复制", en: "Copy failed — please copy manually" },
  tourChoose: { zh: "选择游览路线", en: "Choose a tour" },
  tourClassic: { zh: "经典全线", en: "Classic Tour" },
  tourClassicSub: { zh: "全部站点一次走完", en: "Every stop, one pass" },
  tourFlora: { zh: "植物花卉", en: "Flora Tour" },
  tourFloraSub: { zh: "春季 · 环湖七园", en: "Spring · seven gardens" },
  tourArch: { zh: "建筑鉴赏", en: "Architecture Tour" },
  tourArchSub: { zh: "精建地标串游", en: "The detailed landmarks" },
  followHint: { zh: "正在跟随 · 拖动视角或按 Esc 退出", en: "Following · drag or press Esc to exit" },
  tlFly: { zh: "自由视角", en: "Free flight" },
  flyKeys: { zh: "WASD 移动 · <b>Space</b> 上升 · <b>C</b> 下降 · <b>Shift</b> 加速 · 滚轮调速 · <b>Esc</b> 退出", en: "WASD move · <b>Space</b> up · <b>C</b> down · <b>Shift</b> boost · scroll speed · <b>Esc</b> exit" },
  flyExit: { zh: "退出", en: "Exit" },
  flyEdge: { zh: "已到地图边缘", en: "Edge of the map" },
  flyRotateHint: { zh: "建议横屏使用自由视角", en: "Landscape is recommended for free flight" },
  flyEntered: { zh: "已进入自由视角 · WASD 移动 · 滚轮调速", en: "Free flight on · WASD to move · scroll to change speed" },
  walkEntered: { zh: "已进入步行漫游 · WASD 移动", en: "Walking on · WASD to move" },
  onboardReplay: { zh: "重新查看功能导览", en: "Replay the feature tour" },
  onboardNext: { zh: "下一步", en: "Next" },
  onboardPrev: { zh: "上一步", en: "Back" },
  onboardSkip: { zh: "跳过", en: "Skip" },
  onboardDone: { zh: "开始探索", en: "Start exploring" },
  seasonSpring: { zh: "春", en: "Spring" },
  seasonSummer: { zh: "夏", en: "Summer" },
  seasonAutumn: { zh: "秋", en: "Autumn" },
  seasonWinter: { zh: "冬", en: "Winter" },

  tlCompass: { zh: "回正北", en: "Face north" },
  tlHome: { zh: "返回全景", en: "Overview" },
  tlShare: { zh: "分享视角链接", en: "Share view link" },
  tlExport: { zh: "导出图片", en: "Export image" },
  tlFs: { zh: "全屏", en: "Fullscreen" },
  tlAbout: { zh: "关于本地图", en: "About this map" },
  tlLang: { zh: "Switch to English", en: "切换到中文" },

  tourStart: { zh: "开始游览", en: "Start tour" },
  tourState: { zh: "正在游览", en: "Now touring" },
  tourPaused: { zh: "游览已暂停", en: "Tour paused" },
  tourPause: { zh: "暂停", en: "Pause" },
  tourResume: { zh: "继续", en: "Resume" },
  tourPrev: { zh: "上一个", en: "Previous" },
  tourNext: { zh: "下一个", en: "Next" },
  tourExit: { zh: "退出", en: "Exit" },

  pdBack: { zh: "← 返回地点列表", en: "← Back to places" },
  pdFly: { zh: "前往此处", en: "Fly here" },
  pdNav: { zh: "导航到这里", en: "Route here" },
  viewOverview: { zh: "鸟瞰", en: "Overview" },
  viewFacade: { zh: "立面", en: "Facade" },
  viewCourt: { zh: "近景", en: "Close-up" },
  descFallback: { zh: "介绍待补充，欢迎提供资料。", en: "Description pending — contributions welcome." },
  kindBuilding: { zh: "建筑", en: "Building" },
  kindWater: { zh: "湖泊", en: "Lake" },
  kindGate: { zh: "校门", en: "Gate" },
  kindSports: { zh: "运动场地", en: "Sports" },
  tagLake: { zh: "湖", en: "Lake" },
  tagGate: { zh: "门", en: "Gate" },
  tagCourt: { zh: "场", en: "Field" },
  tagBldg: { zh: "楼", en: "Bldg" },
  heightCalibrated: { zh: "已校准楼高", en: "calibrated height" },
  heightEstimated: { zh: "楼高为推算值", en: "estimated height" },

  navStart: { zh: "起点", en: "Start" },
  navEnd: { zh: "终点", en: "Destination" },
  navPickMap: { zh: "地图选点", en: "Pick on map" },
  navPickSet: { zh: "地图选点（已设置）", en: "Pick on map (set)" },
  navGo: { zh: "开始导航", en: "Start routing" },
  navClear: { zh: "清除路线", en: "Clear route" },
  navExit: { zh: "退出导航", en: "Exit routing" },
  navStatusDefault: { zh: "点击道路或地面设置起点", en: "Click a road or the ground to set the start" },
  navPickStartHint: { zh: "点击道路或地点设置起点", en: "Click a road or place to set the start" },
  navPickEndHint: { zh: "点击道路或地点设置终点", en: "Click a road or place to set the destination" },
  navArrive: { zh: "到达附近道路", en: "Arrive at nearest road" },
  turnLeft: { zh: "前方左转", en: "Turn left ahead" },
  turnRight: { zh: "前方右转", en: "Turn right ahead" },
  turnBack: { zh: "前方折返", en: "Turn back ahead" },

  walkTitle: { zh: "在虎溪走一走", en: "Take a walk in Huxi" },
  walkDesc: {
    zh: "电脑端使用鼠标查看，WASD 移动，按住 Shift 加速，Esc 返回原视角。当前开放已映射道路与广场，地面及入口为示意。",
    en: "Desktop: look with the mouse, move with WASD, hold Shift to sprint, Esc returns to the map. Mapped roads and plazas are walkable; grounds and entrances are simplified.",
  },
  walkSpawnLabel: { zh: "从这里开始", en: "Start from" },
  walkStart: { zh: "开始步行", en: "Start walking" },
  walkCancel: { zh: "取消", en: "Cancel" },
  walkHint: {
    zh: "步行漫游 · WASD 移动 · Shift 加速 · 鼠标查看 · Esc 返回地图",
    en: "Walking · WASD to move · Shift to sprint · Mouse to look · Esc for map",
  },
  walkExit: { zh: "退出", en: "Exit" },
  walkDesktopOnly: { zh: "步行漫游请使用电脑浏览器与鼠标。", en: "Walking mode needs a desktop browser and mouse." },

  aboutTitle: { zh: "重庆大学虎溪校区 3D 地图", en: "CQU Huxi Campus 3D Map" },
  aboutAuthor: { zh: "作者：zhipengGui（重庆大学学生作品）", en: "By zhipengGui (a Chongqing University student)" },
  aboutSrc: {
    zh: "数据来源：OpenStreetMap（ODbL）· 重大官网图集 · 官方公示与校园平面图；部分新建建筑依卫星影像判读，高度与细部含估算。",
    en: "Data: OpenStreetMap (ODbL) · CQU official galleries · public notices and campus plans. Some new buildings were traced from satellite imagery; heights and details partly estimated.",
  },
  aboutNote: { zh: "建筑形态非测绘精度。代码与模型版权归作者所有，未经许可请勿复制使用；如需使用请开 Issue 联系作者。", en: "Not survey-grade. Code and models are the author's property — do not copy without permission; open an issue to request a license." },
  aboutClose: { zh: "关闭", en: "Close" },

  toastExported: { zh: "图片已导出", en: "Image exported" },
  toastCopied: { zh: "链接已复制", en: "Link copied" },
  keysHelp: {
    zh: "快捷键：方向键旋转 · H全景 · N正北 · 1-4光影 · Esc退出",
    en: "Keys: arrows rotate · H overview · N north · 1-4 lighting · Esc exits",
  },
  loadingStats: { zh: "正在加载场景数据…", en: "Loading scene data…" },
};

// ---- 地名（中文键 → 英文显示）----
const NAMES: Record<string, string> = {
  图书馆: "Library",
  第一教学楼: "Teaching Bldg 1",
  信息技术科研楼: "IT Research Bldg",
  体育馆: "Gymnasium",
  学生活动中心: "Student Center",
  综合楼: "Complex Bldg",
  理科楼: "Science Bldg",
  工科大楼: "Engineering Bldg",
  虎溪科学中心: "Science Center",
  储能技术产教融合创新大楼: "Energy-Storage Bldg",
  艺术楼: "Art Bldg",
  校医院: "Campus Clinic",
  药学院: "Pharmacy School",
  重庆大学出版社: "CQU Press",
  工程培训中心: "Engineering Training Ctr",
  第一实验楼: "Lab Bldg 1",
  第二实验楼: "Lab Bldg 2",
  第三实验楼: "Lab Bldg 3",
  第一食堂: "Canteen 1",
  第二食堂: "Canteen 2",
  第三食堂: "Canteen 3",
  北门: "North Gate",
  东门: "East Gate",
  西门: "West Gate",
  缙湖: "Jin Lake",
  云湖: "Cloud Lake",
  莲池: "Lotus Pond",
  荷苑: "Lotus Garden",
  水生植物展示区: "Aquatic Plant Garden",
  绣球园: "Hydrangea Garden",
  蔷薇园: "Rose Garden",
  木兰园: "Magnolia Garden",
  山茶园: "Camellia Garden",
  杜鹃园: "Azalea Garden",
  牡丹园: "Peony Garden",
  蕨类园: "Fern Garden",
  松林公园: "Pine Forest Park",
  含笑漫步道: "Michelia Walk",
  重庆海吉亚肿瘤医院: "Chongqing Haijia Oncology Hospital",
  医院门诊楼: "Hospital Outpatient Bldg",
  药学院研究中心: "Pharmacy Research Center",
  田径场: "Track & Field",
  室外球场区: "Outdoor Courts",
};
const DORM_PREFIX: [RegExp, string][] = [
  [/^菊园/, "Juyuan"], [/^荷园/, "Heyuan"], [/^松园/, "Songyuan"],
  [/^竹园/, "Zhuyuan"], [/^梅园/, "Meiyuan"], [/^兰园/, "Lanyuan"],
];
const CN_NUM: Record<string, string> = { 一: "1", 二: "2", 三: "3", 四: "4", 五: "5", 六: "6", 七: "7", 八: "8" };

/** 地点名的当前语言显示（zh 原样；en 查表/宿舍规则/兜底原样）。 */
export function localName(zh: string): string {
  if (lang === "zh") return zh;
  if (NAMES[zh]) return NAMES[zh];
  for (const [re, en] of DORM_PREFIX) {
    if (re.test(zh)) {
      const rest = zh.replace(re, "");
      const hash = rest.match(/^#(\d+)$/);
      if (hash) return `${en} #${hash[1]}`;
      const cn = rest.match(/^(.)栋$/);
      if (cn && CN_NUM[cn[1]]) return `${en} ${CN_NUM[cn[1]]}`;
      return `${en} Bldg`;
    }
  }
  return zh;
}

export const GROUP_LABEL: Record<string, Pair> = {
  教学: { zh: "教学", en: "Academic" },
  文体: { zh: "文体", en: "Venues" },
  运动: { zh: "运动", en: "Sports" },
  餐饮: { zh: "餐饮", en: "Dining" },
  宿舍: { zh: "宿舍", en: "Dorms" },
  楼宇: { zh: "楼宇", en: "Buildings" },
  湖泊: { zh: "湖泊", en: "Lakes" },
  校门: { zh: "校门", en: "Gates" },
};

// ---- 状态 ----
function detect(): Lang {
  const url = new URLSearchParams(location.search).get("lang");
  if (url === "en" || url === "zh") return url;
  const saved = localStorage.getItem("huxi-lang");
  return saved === "en" ? "en" : "zh";
}
let lang: Lang = detect();
const listeners: (() => void)[] = [];

export function getLang(): Lang {
  return lang;
}
export function t(key: string): string {
  const p = D[key];
  return p ? p[lang] : key;
}
export function tr(p: Pair): string {
  return p[lang];
}
export function onLangChange(cb: () => void): void {
  listeners.push(cb);
}
function applyDocument(): void {
  document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  document.title = t("title");
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", t("metaDesc"));
}
export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  localStorage.setItem("huxi-lang", next);
  const url = new URL(location.href);
  url.searchParams.set("lang", next);
  history.replaceState(null, "", url.toString());
  applyDocument();
  applyStaticI18n();
  for (const cb of listeners) cb();
}

/** 刷静态节点：data-i18n（textContent）/ data-i18n-html / data-i18n-ph（placeholder）/ data-i18n-title。 */
export function applyStaticI18n(): void {
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n!);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml!);
  });
  document.querySelectorAll<HTMLInputElement>("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh!);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle!);
  });
}
applyDocument();
