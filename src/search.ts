import * as THREE from "three";
import type { BuildingUserData } from "./interact";
import { getLang, localName } from "./i18n";

/** 搜索：楼名/湖名子串匹配，回车选第一条。 */

export interface SearchItem {
  name: string;
  kind: "building" | "water" | "gate" | "sports";
  extent?: {width:number;length:number};
  target: THREE.Vector3;
  distance: number; // 建议的落点距离
  mesh?: THREE.Mesh;
}

/** 搜索别名：拼音/常用简称 → 展开为标准子串再匹配（如 "shitang"→"食堂" 命中三个食堂）。 */
const SEARCH_ALIASES: Record<string, string> = {
  tushuguan: "图书馆", tsg: "图书馆",
  yijiao: "一教", jiaoxuelou: "教学楼",
  zonghelou: "综合楼",
  likelou: "理科楼",
  shitang: "食堂", yishitang: "第一食堂", ershitang: "第二食堂", sanshitang: "第三食堂",
  tiyuguan: "体育馆", tyg: "体育馆",
  kexuezhongxin: "科学中心",
  jinhu: "缙湖", yunhu: "云湖", hehua: "荷苑",
  songyuan: "松园", zhuyuan: "竹园", meiyuan: "梅园", lanyuan: "兰园",
  juyuan: "菊园", heyuan: "荷园",
  beimen: "北门", dongmen: "东门", ximen: "西门",
  sushe: "园", qinshi: "园",
  lanqiu: "球场", paiqiu: "球场", wangqiu: "球场",
  yishulou: "艺术楼", shiyanshi: "实验", xiaoyiyuan: "医院",
  gongke: "工科", xinxilou: "信息技术",
};

export function initSearch(
  input: HTMLInputElement,
  listEl: HTMLElement,
  items: SearchItem[],
  onSelect: (item: SearchItem) => void,
): void {
  let current: SearchItem[] = [];

  const hide = (): void => {
    listEl.classList.remove("open");
    current = [];
  };

  const render = (): void => {
    listEl.innerHTML = "";
    for (const [i, it] of current.entries()) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "suggestion";
      const tag=document.createElement('span');tag.className='tag';
      const en=getLang()==='en';
      tag.textContent=it.kind==='water'?(en?'Lake':'湖'):it.kind==='gate'?(en?'Gate':'门'):it.kind==='sports'?(en?'Field':'场'):(en?'Bldg':'楼');
      btn.append(tag,document.createTextNode(localName(it.name)));
      btn.addEventListener("pointerdown", (e) => e.preventDefault()); // 防止输入框失焦抢点击
      btn.addEventListener("click", () => {
        hide();
        input.blur();
        onSelect(it);
      });
      if (i === 0) btn.classList.add("first");
      listEl.appendChild(btn);
    }
    listEl.classList.toggle("open", current.length > 0);
  };

  const query = (): void => {
    const q = input.value.trim();
    if (!q) {
      hide();
      return;
    }
    const expanded = SEARCH_ALIASES[q.toLowerCase()] ?? q;
    const lq = expanded.toLowerCase();
    const matched = items.filter((it) => it.name.includes(expanded) || localName(it.name).toLowerCase().includes(lq));
    matched.sort((a, b) => {
      const sa = a.name.startsWith(expanded) ? 0 : 1;
      const sb = b.name.startsWith(expanded) ? 0 : 1;
      return sa - sb || a.name.length - b.name.length;
    });
    current = matched.slice(0, 8);
    render();
  };

  input.addEventListener("input", query);
  input.addEventListener("focus", query);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && current.length) {
      const it = current[0];
      hide();
      input.blur();
      onSelect(it);
    } else if (e.key === "Escape") {
      hide();
      input.blur();
    }
  });
  input.addEventListener("blur", () => setTimeout(hide, 120));
}

/** 从楼栋网格构造搜索条目 */
export function buildingSearchItem(mesh: THREE.Mesh): SearchItem {
  const d = mesh.userData as BuildingUserData;
  const radius = Math.sqrt(d.area / Math.PI);
  return {
    name: d.name,
    kind: "building",
    target: new THREE.Vector3(d.cx, d.height / 2, d.cy),
    distance: Math.max(150, radius * 3.4),
    mesh,
  };
}
