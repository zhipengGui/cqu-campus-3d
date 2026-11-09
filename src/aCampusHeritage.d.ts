import * as THREE from "three";
import { type TerrainGrid } from "./terrain";
import type { Building } from "./types";
export declare const FIFTH_ID = 1173588650;
export declare const WENZI_ID = 1556523862;
export declare const HERITAGE_NAMES: readonly ["第五教学楼", "文字斋"];
export declare function prepareHeritageTerrain(grid: TerrainGrid, buildings: Building[]): {
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
type Pt = [number, number, number];
type Tile = [number, number];
export declare class Parts {
    private batches;
    put(name: string, color: number, g: THREE.BufferGeometry): void;
    box(name: string, color: number, x: number, y: number, z: number, w: number, h: number, d: number, yaw?: number): void;
    beam(name: string, color: number, a: Pt, b: Pt, width: number): void;
    add(group: THREE.Group): void;
}
export declare class Surface {
    positions: number[];
    uvs: number[];
    triangle(a: Pt, b: Pt, c: Pt, ua?: Tile, ub?: Tile, uc?: Tile): void;
    quad(a: Pt, b: Pt, c: Pt, d: Pt, u: number, v0: number, v1: number): void;
    add(group: THREE.Group, name: string, color: number, map?: THREE.Texture): void;
}
export declare function tileTexture(fine?: boolean): THREE.CanvasTexture;
export declare function roof(surface: Surface, gables: Surface, parts: Parts, center: [number, number], w: number, d: number, eave: number, rise: number, hip: number, curl: number, yaw?: number): void;
export declare function windowOn(parts: Parts, prefix: string, x: number, y: number, z: number, width: number, height: number, yaw: number, color?: number): void;
export declare function buildHeritageBuilding(id: number, x: number, north: number, base: number, refined?: boolean): THREE.Group;
export {};
