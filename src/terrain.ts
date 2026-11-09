export type GroundHeight = (east: number, north: number) => number;
export type MapPoint = [number, number];

export interface TerrainGrid {
  origin: MapPoint;
  step: number;
  cols: number;
  rows: number;
  heights: number[];
}

export function createTerrain(grid: TerrainGrid) {
  const { origin: [west, south], step, cols, rows, heights } = grid;
  if (!Number.isFinite(west) || !Number.isFinite(south) || !Number.isFinite(step) || step <= 0
    || !Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 2
    || heights.length !== cols * rows || !heights.every(Number.isFinite)) {
    throw new Error("Invalid terrain grid");
  }

  const heightAt: GroundHeight = (x, y) => {
    const gx = (x - west) / step, gy = (y - south) / step;
    if (gx < 0 || gy < 0 || gx > cols - 1 || gy > rows - 1) return 0;
    const col = Math.min(Math.floor(gx), cols - 2);
    const row = Math.min(Math.floor(gy), rows - 2);
    const u = gx - col, v = gy - row, i = row * cols + col;
    const a = heights[i], b = heights[i + 1], c = heights[i + cols], d = heights[i + cols + 1];
    // Match the diagonal in the rendered terrain mesh.
    return u + v <= 1 ? a + u * (b - a) + v * (c - a) : d + (1 - u) * (c - d) + (1 - v) * (b - d);
  };

  return { grid, heightAt, west, south, east: west + step * (cols - 1), north: south + step * (rows - 1) };
}

export type Terrain = ReturnType<typeof createTerrain>;

export function subdividePath(points: readonly MapPoint[], maxStep = 5): MapPoint[] {
  const result = points.slice(0, 1);
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    const count = Math.ceil(Math.hypot(bx - ax, by - ay) / maxStep);
    for (let j = 1; j <= count; j++) {
      result.push([ax + (bx - ax) * j / count, ay + (by - ay) * j / count]);
    }
  }
  return result;
}
