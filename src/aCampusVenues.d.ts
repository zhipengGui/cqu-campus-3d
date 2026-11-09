import * as THREE from "three";
import { type GroundHeight, type MapPoint, type TerrainGrid } from "./terrain";
import type { Area, Building } from "./types";
export declare const WIND_CENTER: MapPoint;
export declare const SIQUN_CENTER: MapPoint;
export declare const VENUE_SPOTS: readonly [{
    readonly name: "风雨操场";
    readonly kind: "building";
    readonly point: MapPoint;
}, {
    readonly name: "思群广场";
    readonly kind: "building";
    readonly point: MapPoint;
}];
export declare function prepareVenueTerrain(grid: TerrainGrid): {
    grid: {
        heights: number[];
        origin: MapPoint;
        step: number;
        cols: number;
        rows: number;
    };
    windFloor: number;
    siqunFloor: number;
};
export declare function venueBuildings(buildings: Building[]): Building[];
export declare function venuePlantExclusions(): Area[];
export declare function buildCampusAVenues(parent: THREE.Group, terrain: ReturnType<typeof prepareVenueTerrain>, heightAt: GroundHeight, refined?: boolean): void;
