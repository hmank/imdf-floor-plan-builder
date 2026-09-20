import { describe, expect, it } from "vitest";
import { analyzeOccupancyGrid } from "./autoTrace";

function createGrid(rows, cols, fill = false) {
  return Array.from({ length: rows }, () => Array(cols).fill(fill));
}

describe("auto-trace grid analysis", () => {
  it("detects room suggestions inside enclosed wall loops", () => {
    const grid = createGrid(12, 12, false);

    for (let x = 2; x <= 9; x += 1) {
      grid[2][x] = true;
      grid[9][x] = true;
    }
    for (let y = 2; y <= 9; y += 1) {
      grid[y][2] = true;
      grid[y][9] = true;
    }

    const traced = analyzeOccupancyGrid(grid, {
      canvasW: 240,
      canvasH: 240,
      minWallRun: 2,
      minRoomAreaCells: 4,
    });

    expect(traced.walls.length).toBeGreaterThan(0);
    expect(traced.rooms.length).toBe(1);
    expect(traced.rooms[0].w).toBeGreaterThan(80);
    expect(traced.rooms[0].h).toBeGreaterThan(80);
  });

  it("does not suggest open areas that leak to the boundary", () => {
    const grid = createGrid(10, 10, false);
    const traced = analyzeOccupancyGrid(grid, {
      canvasW: 200,
      canvasH: 200,
      minRoomAreaCells: 4,
    });
    expect(traced.rooms).toEqual([]);
  });
});
