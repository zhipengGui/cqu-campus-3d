import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { inCampus } from "./campusClip";
import { subdividePath, type GroundHeight, type MapPoint, type Terrain } from "./terrain";
import type { Building } from "./types";

export function buildTerrainGround(scene: THREE.Scene, terrain: Terrain, boundary: MapPoint[]) {
  const { grid: { step, cols, rows, heights }, west, east, south, north } = terrain;
  const positions = [], colors = [], indices = [];
  const inner = new THREE.Color(0xa7b690), outer = new THREE.Color(0xd6d8c8);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = west + col * step, y = south + row * step, i = row * cols + col;
      positions.push(x, heights[i] - 0.12, -y);
      const color = inCampus([x, y], boundary) ? inner : outer;
      colors.push(color.r, color.g, color.b);
      if (row < rows - 1 && col < cols - 1) {
        indices.push(i, i + 1, i + cols, i + 1, i + cols + 1, i + cols);
      }
    }
  }
  const grid = new THREE.BufferGeometry();
  grid.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  grid.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  grid.setIndex(indices);
  grid.computeVertexNormals();
  const terrainMesh = new THREE.Mesh(grid, new THREE.MeshLambertMaterial({ vertexColors: true }));
  terrainMesh.name = "campus-terrain";
  terrainMesh.receiveShadow = true;

  const path = (points: MapPoint[]) => points.map(([x, y]) => new THREE.Vector2(x, y));
  const ground = new THREE.Shape(path([[-10000, -10000], [10000, -10000], [10000, 10000], [-10000, 10000]]));
  ground.holes.push(new THREE.Path(path([[west, south], [west, north], [east, north], [east, south]])));
  const outside = new THREE.ShapeGeometry(ground);
  outside.rotateX(-Math.PI / 2);
  outside.translate(0, -0.12, 0);
  const outsideMesh = new THREE.Mesh(outside, new THREE.MeshLambertMaterial({ color: outer }));
  outsideMesh.receiveShadow = true;
  outsideMesh.name = "flat-terrain-surroundings";

  const group = new THREE.Group();
  group.add(terrainMesh, outsideMesh);
  scene.add(group);
  return group;
}

export function drapeSurfaces(group: THREE.Group, heightAt: GroundHeight): void {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const source = object.geometry;
    const position = source.getAttribute("position");
    const index = source.index;
    const count = index?.count ?? position.count;
    const positions: number[] = [];
    const vertex = (i: number) => {
      const n = index ? index.getX(i) : i;
      return new THREE.Vector3(position.getX(n), position.getY(n), position.getZ(n));
    };
    // Cut long triangles so a road chord cannot bridge a slope between OSM nodes.
    const emit = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): void => {
      const span = (p: THREE.Vector3, q: THREE.Vector3) => (p.x - q.x) ** 2 + (p.z - q.z) ** 2;
      const ab = span(a, b), bc = span(b, c), ca = span(c, a);
      if (ab > 36 || bc > 36 || ca > 36) {
        if (bc > ab && bc >= ca) { emit(b, c, a); return; }
        if (ca > ab && ca > bc) { emit(c, a, b); return; }
        const mid = a.clone().lerp(b, 0.5);
        emit(a, mid, c);
        emit(mid, b, c);
        return;
      }
      for (const p of [a, b, c]) {
        const x = p.x + object.position.x, z = p.z + object.position.z;
        positions.push(p.x, p.y + heightAt(x, -z) + 0.14, p.z);
      }
    };
    for (let i = 0; i < count; i += 3) emit(vertex(i), vertex(i + 1), vertex(i + 2));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    source.dispose();
    object.geometry = geometry;
  });
}

export function liftPlants(group: THREE.Group, heightAt: GroundHeight): void {
  const matrix = new THREE.Matrix4();
  group.traverse((object) => {
    if (!(object instanceof THREE.InstancedMesh)) return;
    for (let i = 0; i < object.count; i++) {
      object.getMatrixAt(i, matrix);
      matrix.elements[13] += heightAt(matrix.elements[12], -matrix.elements[14]);
      object.setMatrixAt(i, matrix);
    }
    object.instanceMatrix.needsUpdate = true;
    object.computeBoundingSphere();
  });
}

export function buildFoundations(scene: THREE.Scene, buildings: Building[], heightAt: GroundHeight, pads: Readonly<Record<string, number>> = {}) {
  const bases = new Map<Building, number>();
  const geometries: THREE.BufferGeometry[] = [];
  for (const building of buildings) {
    const outline = [...building.polygon, building.polygon[0]];
    const samples = subdividePath(outline).map(([x, y]) => heightAt(x, y));
    // Use a single foundation elevation so roofs and storeys remain level.
    const base = pads[String(building.id)] ?? Math.max(...samples);
    const bottom = Math.min(base, ...samples) - 0.35;
    bases.set(building, base);
    if (base - bottom < 0.55) continue;
    const toVectors = (ring: MapPoint[]) => ring.map(([x, y]) => new THREE.Vector2(x, y));
    const shape = new THREE.Shape(toVectors(building.polygon));
    shape.holes = building.holes.map((ring) => new THREE.Path(toVectors(ring)));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: base - bottom, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, bottom, 0);
    geometries.push(geometry);
  }
  if (geometries.length) {
    const mesh = new THREE.Mesh(mergeGeometries(geometries)!, new THREE.MeshLambertMaterial({ color: 0x969585 }));
    mesh.name = "terrain-foundations";
    mesh.receiveShadow = true;
    scene.add(mesh);
    for (const geometry of geometries) geometry.dispose();
  }
  return (building: Building) => bases.get(building) ?? 0;
}
