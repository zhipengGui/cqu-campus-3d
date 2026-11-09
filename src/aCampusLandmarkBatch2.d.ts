import * as THREE from "three";
import { Parts } from "./aCampusHeritage";
import { type TerrainGrid } from "./terrain";
import type { Building } from "./types";
import type { PlaceInfo } from "./placesInfo";
export declare const BATCH2_SPOTS: readonly [{
    readonly key: "library";
    readonly id: 1173588649;
    readonly name: "理工馆";
    readonly label: "理工馆";
    readonly height: 20;
    readonly view: readonly [-0.68, 0.65, -1];
}, {
    readonly key: "hall";
    readonly id: "batch2-hall";
    readonly name: "七七抗战大礼堂";
    readonly label: "七七礼堂";
    readonly height: 14.6;
    readonly view: readonly [1, 0.36, 0.54];
}, {
    readonly key: "pavilion";
    readonly id: "batch2-pavilion";
    readonly name: "寅初亭";
    readonly label: "寅初亭";
    readonly height: 8.1;
    readonly view: readonly [-0.36, 0.34, 1];
}, {
    readonly key: "sixth";
    readonly id: 1365750556;
    readonly name: "第六教学楼";
    readonly label: "六教";
    readonly height: 20.2;
    readonly view: readonly [0.47, 0.42, 1];
}, {
    readonly key: "report";
    readonly id: 1365750549;
    readonly name: "民主湖报告厅";
    readonly label: "报告厅";
    readonly height: 6.2;
    readonly view: readonly [-1, 0.48, 0.39];
}, {
    readonly key: "public";
    readonly id: 1365750550;
    readonly name: "公共管理学院";
    readonly label: "公管学院";
    readonly height: 21.7;
    readonly view: readonly [-1, 0.42, 0.44];
}, {
    readonly key: "boya";
    readonly id: 1281965503;
    readonly name: "博雅书院";
    readonly label: "博雅书院";
    readonly height: 8.7;
    readonly view: readonly [-0.44, 0.48, 1];
}];
export declare const batch2Spot: (id: Building["id"]) => {
    readonly key: "library";
    readonly id: 1173588649;
    readonly name: "理工馆";
    readonly label: "理工馆";
    readonly height: 20;
    readonly view: readonly [-0.68, 0.65, -1];
} | {
    readonly key: "hall";
    readonly id: "batch2-hall";
    readonly name: "七七抗战大礼堂";
    readonly label: "七七礼堂";
    readonly height: 14.6;
    readonly view: readonly [1, 0.36, 0.54];
} | {
    readonly key: "pavilion";
    readonly id: "batch2-pavilion";
    readonly name: "寅初亭";
    readonly label: "寅初亭";
    readonly height: 8.1;
    readonly view: readonly [-0.36, 0.34, 1];
} | {
    readonly key: "sixth";
    readonly id: 1365750556;
    readonly name: "第六教学楼";
    readonly label: "六教";
    readonly height: 20.2;
    readonly view: readonly [0.47, 0.42, 1];
} | {
    readonly key: "report";
    readonly id: 1365750549;
    readonly name: "民主湖报告厅";
    readonly label: "报告厅";
    readonly height: 6.2;
    readonly view: readonly [-1, 0.48, 0.39];
} | {
    readonly key: "public";
    readonly id: 1365750550;
    readonly name: "公共管理学院";
    readonly label: "公管学院";
    readonly height: 21.7;
    readonly view: readonly [-1, 0.42, 0.44];
} | {
    readonly key: "boya";
    readonly id: 1281965503;
    readonly name: "博雅书院";
    readonly label: "博雅书院";
    readonly height: 8.7;
    readonly view: readonly [-0.44, 0.48, 1];
} | undefined;
export declare const BATCH2_INFO: Record<string, PlaceInfo>;
type Point = [number, number];
export declare function batch2Buildings(buildings: Building[]): Building[];
export declare function prepareBatch2Terrain(grid: TerrainGrid, buildings: Building[]): {
    grid: {
        heights: number[];
        origin: import("./terrain").MapPoint;
        step: number;
        cols: number;
        rows: number;
    };
    pads: Record<string, number>;
};
export declare function mass(p: Parts, name: string, color: number, ring: Point[], bottom: number, top: number, holes?: Point[][]): void;
export declare function buildBatch2Building(building: Building, base: number): THREE.Group;
export {};
