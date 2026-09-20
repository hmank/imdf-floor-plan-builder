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
    expect(traced.rooms[0].w).toBeGreaterThan(20);
    expect(traced.rooms[0].h).toBeGreaterThan(20);
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

  it("can recover rooms when outer walls have tiny gaps", () => {
    const grid = createGrid(14, 14, false);
    for (let x = 3; x <= 10; x += 1) {
      grid[3][x] = true;
      grid[10][x] = true;
    }
    for (let y = 3; y <= 10; y += 1) {
      grid[y][3] = true;
      grid[y][10] = true;
    }

    // Simulate a doorway/gap that would otherwise leak the region.
    grid[6][3] = false;

    const strict = analyzeOccupancyGrid(grid, {
      canvasW: 280,
      canvasH: 280,
      minWallRun: 2,
      minRoomAreaCells: 4,
      wallDilationPasses: 0,
    });
    const relaxed = analyzeOccupancyGrid(grid, {
      canvasW: 280,
      canvasH: 280,
      minWallRun: 2,
      minRoomAreaCells: 4,
      wallDilationPasses: 2,
    });

    expect(strict.rooms.length).toBe(0);
    expect(relaxed.rooms.length).toBeGreaterThan(0);
  });
});
