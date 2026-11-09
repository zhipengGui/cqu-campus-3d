/** 校区配置类型：每个校区一份表现层配置（src/campuses/{id}.ts）。
 *  数据路径刻意允许虎溪保持历史位置（data/scene.json、models/），
 *  保证线上缓存与分享链接零变化；新校区用独立前缀路径。 */

export interface CampusGardens {
  /** 主湖名（环湖专类园母体），缺省无绿化带 */
  lakeName?: string;
  lotusName?: string;        // 荷叶湖
  aquaticName?: string;      // 水生植物展示区
  walkName?: string;         // 路名实证的漫步道绿篱
  pineRole?: boolean;        // 松林公园针叶化（private role:pine）
}

export interface CampusMapPoint {
  name: string;
  kind: "gate" | "building";
  /** [东向米数, 北向米数]，与本校区场景坐标一致 */
  point: [number, number];
}

export interface CampusConfig {
  id: string;
  nameZh: string;
  nameEn: string;
  /** 左侧面板标题（双语） */
  hudTitle: { zh: string; en: string };
  /** 是否已上线（false=总览中占位、切换器禁用） */
  available: boolean;
  /** scene 数据 URL（虎溪保持 data/scene.json 历史路径） */
  sceneUrl: string;
  /** 地标 GLB 目录（虎溪保持 models/ 历史路径） */
  modelDir: string;
  /** 飞行/边界范围（地图米坐标，来自管线输出） */
  extents: { x0: number; x1: number; y0: number; y1: number };
  /** 飞行高度区间 */
  yRange: [number, number];
  /** homeView 取景方向向量 */
  homeDirection: [number, number, number];
  /** 人流热点楼名（半径统一 95m，环楼步道） */
  hotspots: string[];
  /** 植物园配置（缺省无专类园/花境层） */
  gardens?: CampusGardens;
  /** 步行漫游出生点选项（地名，需存在于地点表） */
  walkSpawns: string[];
  /** 搜索快捷按钮：[显示名, 搜索词] */
  shortcuts: [string, string][];
  /** 仅用于标注与定位，未制作三维几何的地点 */
  mapPoints?: CampusMapPoint[];
  /** 游览线：'full'=虎溪三条主题线；'auto'=由地点表自动生成经典线 */
  tours: "full" | "auto";
  /** 搜索拼音别名（全校区共用表之外的校区专属） */
  searchAliases?: Record<string, string>;
  /** 总览沙盘摆件位置（批 2 用；[x,z] 台面坐标） */
  overviewSlot?: [number, number];
}

export type CampusId = string;
