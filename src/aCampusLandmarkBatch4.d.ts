import * as THREE from "three";
import type { GroundHeight } from "./terrain";
import type { Building, Road } from "./types";
import type { PlaceInfo } from "./placesInfo";
type Point = [number, number];
type RoofBlock = [x: number, z: number, width: number, depth: number, rise: number, pitched?: boolean, color?: number];
type Recipe = "teaching" | "masonry" | "dorm" | "house" | "canteen" | "lab";
interface Specification {
    recipe: Recipe;
    roofColor?: number;
    wallColor?: number;
    roofs?: RoofBlock[];
    levels?: number;
    confirmedLevels?: boolean;
    front?: Point;
    court?: [x: number, z: number, width: number, depth: number];
    note?: PlaceInfo;
}
export declare const BATCH4_SHORTCUTS: readonly [{
    readonly key: "science";
    readonly label: "理科楼";
    readonly name: "理科教学楼";
}, {
    readonly key: "resources";
    readonly label: "资安学院";
    readonly name: "资源与安全学院";
}, {
    readonly key: "bio";
    readonly label: "生命工程";
    readonly name: "生命工程学院";
}, {
    readonly key: "xinhua";
    readonly label: "新华楼";
    readonly name: "新华楼";
}, {
    readonly key: "business";
    readonly label: "经管学院";
    readonly name: "经济与工商管理学院";
}, {
    readonly key: "canteen";
    readonly label: "一食堂";
    readonly name: "学生一食堂";
}, {
    readonly key: "dorm";
    readonly label: "七舍";
    readonly name: "学生七宿舍";
}, {
    readonly key: "lab";
    readonly label: "综合实验楼";
    readonly name: "综合实验大楼";
}];
export declare const batch4Spec: (id: Building["id"]) => Specification | undefined;
export declare function batch4Buildings(buildings: Building[]): Building[];
export declare function batch4Info(id: Building["id"]): PlaceInfo | undefined;
export declare function buildBatch4Building(building: Building, base: number, ground: GroundHeight, roads: Road[]): THREE.Group;
export {};
