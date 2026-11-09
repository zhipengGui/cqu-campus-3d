/** scene.json 类型定义（由 scripts/build_scene_data.py 生成） */

export interface SceneMeta {
  origin: [number, number];
  bbox: [number, number, number, number];
  source: string;
  snapshotTakenAt: string;
  generatedAt: string;
  note: string;
}

export interface Building {
  id: number | string;
  name: string;
  inside: boolean;
  type: string;
  style: string;
  landmark: string; // stable landmark asset key
  height: number;
  heightSource: "tag:height" | "tag:levels" | "default" | "override";
  area: number;
  polygon: [number, number][];
  holes: [number, number][][];
  /** 建筑分级：core=校内 / ring=周边（居民楼等），ring 渲染降饱和 */
  tier?: "core" | "ring";
}

export interface Road {
  id: number;
  kind: string;
  name: string;
  width: number;
  pts: [number, number][];
}

export interface Area {
  id: number | string;
  name: string;
  kind?: string;
  sport?: string;
  inside?: boolean;
  manual?: boolean; // 人工判读绿地（private/manual_green.json）：context 渲染 + 校外植树区
  outers: [number, number][][];
  inners: [number, number][][];
}

export interface Boundary {
  id: number;
  pts: [number, number][];
}

export interface Gate {
  id: string;
  x: number;
  y: number;
  angle: number;
  name: string;
}

export interface RoadGraph {
  nodes: [number, number][];
  edges: [number, number, number][]; // [a, b, length]
}

export interface SceneData {
  meta: SceneMeta;
  boundary: Boundary | null;
  /** 多校区多环边界（沙坪坝 A/B/C）；虎溪单环时与 boundary 一致 */
  boundaries?: [number, number][][];
  buildings: Building[];
  roads: Road[];
  water: Area[];
  green: Area[];
  paving: Area[];
  gates: Gate[];
  graph: RoadGraph;
  trees: [number, number][];
}
