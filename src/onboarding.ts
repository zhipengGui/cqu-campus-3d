import type { Pair } from "./i18n";

/** 新用户功能导览：首次访问自动弹出 5 步引导卡；关于面板可重新查看。
 *  localStorage['huxi-onboarded'] 记录已完成；双语；跳过=完成。 */

interface OnboardingI18n {
  t(key: string): string;
  getLang(): "zh" | "en";
}

interface Step {
  icon: string;
  title: Pair;
  body: Pair;
}

const STEPS: Step[] = [
  {
    icon: "🗺",
    title: { zh: "欢迎来到虎溪 3D 地图", en: "Welcome to the Huxi 3D Map" },
    body: {
      zh: "拖动旋转视角，滚轮缩放；点击任意楼栋、湖泊或校门查看介绍与照片。",
      en: "Drag to rotate, scroll to zoom. Click any building, lake or gate for details and photos.",
    },
  },
  {
    icon: "🔍",
    title: { zh: "搜索与地点面板", en: "Search & places" },
    body: {
      zh: "搜索支持中文、拼音（如 shitang）与英文；左侧面板按分类浏览全部地点，点击即可飞达。",
      en: "Search in Chinese, pinyin (e.g. \"canteen\") or English; the left panel lists every place by category — click to fly there.",
    },
  },
  {
    icon: "🧭",
    title: { zh: "导航与步行漫游", en: "Navigation & walking" },
    body: {
      zh: "选起终点算出路线后，可点\"步行前往\"以第一人称沿路引导；也可以直接开始步行漫游逛校园。",
      en: "Pick a start and destination, then \"Walk there\" for first-person guided walking — or just start a free stroll.",
    },
  },
  {
    icon: "✈",
    title: { zh: "自由视角", en: "Free flight" },
    body: {
      zh: "工具栏 ✈ 或按 V 进入飞行：WASD 移动、Space 上升、C 下降、Shift 加速、滚轮调速度（手机端用摇杆）。",
      en: "Press V or the ✈ tool to fly: WASD to move, Space up, C down, Shift boost, scroll to change speed (joystick on mobile).",
    },
  },
  {
    icon: "🌸",
    title: { zh: "更多玩法", en: "More to explore" },
    body: {
      zh: "主题游览线（花卉线联动四季）、光影与四季切换、行人车流、双语切换，以及工具栏 ⚑ 地图纠错。",
      en: "Themed tours (the flora tour follows spring), lighting & seasons, pedestrians & traffic, bilingual UI, and ⚑ to report map issues.",
    },
  },
];

const LS_KEY = "huxi-onboarded";

export function initOnboarding(i18n: OnboardingI18n): void {
  const root = () => document.querySelector("#onboard");
  if (!root()) {
    const el = document.createElement("div");
    el.id = "onboard";
    el.hidden = true;
    el.innerHTML = `
      <div class="onboard-mask"></div>
      <div class="onboard-card" role="dialog" aria-labelledby="onboard-title">
        <div class="onboard-icon"></div>
        <h2 id="onboard-title"></h2>
        <p></p>
        <div class="onboard-dots"></div>
        <div class="onboard-actions">
          <button class="tb" id="onboard-skip"></button>
          <span class="spacer"></span>
          <button class="tb" id="onboard-prev"></button>
          <button id="onboard-next"></button>
        </div>
      </div>`;
    document.body.appendChild(el);
    const close = (done: boolean): void => {
      el.hidden = true;
      if (done) try { localStorage.setItem(LS_KEY, "1"); } catch { /* 私隐模式忽略 */ }
    };
    let idx = 0;
    const render = (): void => {
      const step = STEPS[idx];
      el.querySelector<HTMLElement>(".onboard-icon")!.textContent = step.icon;
      el.querySelector<HTMLHeadingElement>("#onboard-title")!.textContent =
        i18n.getLang() === "en" ? step.title.en : step.title.zh;
      el.querySelector<HTMLParagraphElement>(".onboard-card p")!.textContent =
        i18n.getLang() === "en" ? step.body.en : step.body.zh;
      el.querySelectorAll(".onboard-dots i").forEach((d, i) =>
        (d as HTMLElement).classList.toggle("on", i === idx));
      el.querySelector<HTMLButtonElement>("#onboard-prev")!.disabled = idx === 0;
      el.querySelector<HTMLButtonElement>("#onboard-next")!.textContent =
        idx === STEPS.length - 1 ? i18n.t("onboardDone") : i18n.t("onboardNext");
      el.querySelector<HTMLButtonElement>("#onboard-skip")!.textContent = i18n.t("onboardSkip");
      el.querySelector<HTMLButtonElement>("#onboard-prev")!.textContent = i18n.t("onboardPrev");
    };
    el.querySelector(".onboard-dots")!.innerHTML = STEPS.map(() => "<i></i>").join("");
    el.querySelector("#onboard-skip")!.addEventListener("click", () => close(true));
    el.querySelector("#onboard-prev")!.addEventListener("click", () => { if (idx > 0) { idx--; render(); } });
    el.querySelector("#onboard-next")!.addEventListener("click", () => {
      if (idx < STEPS.length - 1) { idx++; render(); } else close(true);
    });
    el.querySelector(".onboard-mask")!.addEventListener("click", () => close(true));
    (el as unknown as { __show: () => void }).__show = () => { idx = 0; render(); el.hidden = false; };
  }
  const show = (): void => {
    const el = document.querySelector<HTMLElement>("#onboard") as unknown as (HTMLElement & { __show?: () => void }) | null;
    el?.__show?.();
  };
  // 关于面板的"重新查看导览"入口
  const aboutBtn = document.querySelector("#onboard-about-entry");
  aboutBtn?.addEventListener("click", () => show());
  // 首次访问自动弹出
  let seen = false;
  try { seen = !!localStorage.getItem(LS_KEY); } catch { seen = false; }
  if (!seen) setTimeout(show, 300);
}
