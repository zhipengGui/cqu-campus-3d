import * as THREE from "three";
import { Parts } from "./aCampusHeritage";
import { type TerrainGrid } from "./terrain";
import type { Building } from "./types";
import type { PlaceInfo } from "./placesInfo";
export declare const BATCH_SPOTS: readonly [{
    readonly key: "science";
    readonly id: 1556523863;
    readonly name: "理学院";
    readonly label: "一教";
    readonly height: 18.8;
    readonly view: readonly [-0.62, 0.57, 1];
}, {
    readonly key: "engineering";
    readonly id: 1556523886;
    readonly name: "重庆大学工学院楼";
    readonly label: "二教";
    readonly height: 14;
    readonly view: readonly [1, 0.52, 0.84];
}, {
    readonly key: "gate";
    readonly id: "batch-gate";
    readonly name: "A区正门";
    readonly label: "正门";
    readonly height: 7.4;
    readonly view: readonly [-1, 0.34, 0.24];
}, {
    readonly key: "clock";
    readonly id: "batch-clock";
    readonly name: "钟塔";
    readonly label: "钟塔";
    readonly height: 24;
    readonly view: readonly [-1, 0.37, 0.19];
}, {
    readonly key: "main";
    readonly id: 1556523865;
    readonly name: "重庆大学主教学楼";
    readonly label: "主教";
    readonly height: 121.3;
    readonly view: readonly [-1, 0.35, 0.28];
}, {
    readonly key: "eight";
    readonly id: 1075272611;
    readonly name: "第八教学楼";
    readonly label: "八教";
    readonly height: 19.8;
    readonly view: readonly [0.33, 0.46, -1];
}, {
    readonly key: "gym";
    readonly id: 1556523867;
    readonly name: "重庆大学A区体育馆";
    readonly label: "体育馆";
    readonly height: 23.3;
    readonly view: readonly [-0.85, 0.72, 0.86];
}];
export declare const batchSpot: (id: Building["id"]) => {
    readonly key: "science";
    readonly id: 1556523863;
    readonly name: "理学院";
    readonly label: "一教";
    readonly height: 18.8;
    readonly view: readonly [-0.62, 0.57, 1];
} | {
    readonly key: "engineering";
    readonly id: 1556523886;
    readonly name: "重庆大学工学院楼";
    readonly label: "二教";
    readonly height: 14;
    readonly view: readonly [1, 0.52, 0.84];
} | {
    readonly key: "gate";
    readonly id: "batch-gate";
    readonly name: "A区正门";
    readonly label: "正门";
    readonly height: 7.4;
    readonly view: readonly [-1, 0.34, 0.24];
} | {
    readonly key: "clock";
    readonly id: "batch-clock";
    readonly name: "钟塔";
    readonly label: "钟塔";
    readonly height: 24;
    readonly view: readonly [-1, 0.37, 0.19];
} | {
    readonly key: "main";
    readonly id: 1556523865;
    readonly name: "重庆大学主教学楼";
    readonly label: "主教";
    readonly height: 121.3;
    readonly view: readonly [-1, 0.35, 0.28];
} | {
    readonly key: "eight";
    readonly id: 1075272611;
    readonly name: "第八教学楼";
    readonly label: "八教";
    readonly height: 19.8;
    readonly view: readonly [0.33, 0.46, -1];
} | {
    readonly key: "gym";
    readonly id: 1556523867;
    readonly name: "重庆大学A区体育馆";
    readonly label: "体育馆";
    readonly height: 23.3;
    readonly view: readonly [-0.85, 0.72, 0.86];
} | undefined;
export declare const BATCH_INFO: Record<string, PlaceInfo>;
type V = [number, number, number];
export declare function batchBuildings(buildings: Building[]): Building[];
export declare function prepareBatchTerrain(grid: TerrainGrid, buildings: Building[]): {
    grid: {
        heights: number[];
        origin: import("./terrain").MapPoint;
        step: number;
        cols: number;
        rows: number;
    };
    pads: {
        [k: string]: number;
    };
};
export declare function sign(parent: THREE.Group, name: string, text: string, p: V, w: number, h: number, yaw?: number, vertical?: boolean, ink?: string, background?: string): void;
export declare function steps(parts: Parts, x: number, z: number, w: number, n: number, run: number, rise: number, yaw?: number): void;
export declare function archedPanel(group: THREE.Group, name: string, r: number, height: number, x: number, y: number, z: number, yaw: number, color: number): void;
export declare function buildBatchBuilding(b: Building, base: number): THREE.Group;
export declare function mainTeachingDetails(cx: number, cy: number): THREE.Group<THREE.Object3DEventMap>;
export {};
