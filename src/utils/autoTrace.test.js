import { describe, expect, it } from "vitest";
import { buildWallMask, segmentRooms, traceFromPixels } from "./autoTrace";

function createPlan(width, height) {
  // White RGBA image.
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  const paint = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = (y * width + x) * 4;
    pixels[p] = r;
    pixels[p + 1] = g;
    pixels[p + 2] = b;
    pixels[p + 3] = 255;
  };
  const rect = (x0, y0, x1, y1, thickness, color) => {
    for (let t = 0; t < thickness; t += 1) {
      for (let x = x0; x <= x1; x += 1) {
        paint(x, y0 + t, ...color);
        paint(x, y1 - t, ...color);
      }
      for (let y = y0; y <= y1; y += 1) {
        paint(x0 + t, y, ...color);
        paint(x1 - t, y, ...color);
      }
    }
  };
  const fill = (x0, y0, x1, y1, color) => {
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        paint(x, y, ...color);
      }
    }
  };
  return { pixels, rect, fill };
}

const GRAY = [140, 140, 140];
const BLUE_FILL = [191, 215, 245];

describe("pixel auto-trace", () => {
  it("detects every enclosed room in a multi-room plan", () => {
    const width = 300;
    const height = 200;
    const plan = createPlan(width, height);
    // Outer wall.
    plan.rect(10, 10, 289, 189, 2, GRAY);
    // Vertical divider + horizontal divider => 4 rooms.
    plan.fill(150, 10, 151, 189, GRAY);
    plan.fill(10, 100, 289, 101, GRAY);

    const traced = traceFromPixels(plan.pixels, width, height);
    expect(traced.rooms.length).toBe(4);
    const widths = traced.rooms.map((room) => room.w);
    widths.forEach((w) => expect(w).toBeGreaterThan(120));
  });

  it("ignores colored fills when classifying walls and tags them as rooms", () => {
    const width = 200;
    const height = 200;
    const plan = createPlan(width, height);
    plan.rect(10, 10, 189, 189, 2, GRAY);
    plan.fill(100, 10, 101, 189, GRAY);
    // Pastel blue fill inside the right room must not be treated as a wall.
    plan.fill(104, 14, 185, 185, BLUE_FILL);

    const traced = traceFromPixels(plan.pixels, width, height);
    expect(traced.rooms.length).toBe(2);
    const colored = traced.rooms.find((room) => room.x > 90);
    const plain = traced.rooms.find((room) => room.x < 90);
    expect(colored.cat).toBe("room");
    expect(plain.cat).toBe("office");
  });

  it("does not suggest the exterior background or thin corridors", () => {
    const width = 200;
    const height = 200;
    const plan = createPlan(width, height);
    // Single room in the middle; everything else is background.
    plan.rect(60, 60, 139, 139, 2, GRAY);

    const traced = traceFromPixels(plan.pixels, width, height);
    expect(traced.rooms.length).toBe(1);
    expect(traced.rooms[0].x).toBeGreaterThanOrEqual(60);
    expect(traced.rooms[0].w).toBeLessThan(90);
  });

  it("seals hairline gaps so anti-aliased walls still enclose rooms", () => {
    const width = 200;
    const height = 200;
    const plan = createPlan(width, height);
    plan.rect(40, 40, 159, 159, 1, GRAY);
    // Punch a one-pixel hole in the top wall.
    plan.fill(100, 40, 100, 40, [255, 255, 255]);

    const wall = buildWallMask(plan.pixels, width, height, { closeGapPx: 1 });
    const rooms = segmentRooms(wall.mask, width, height, { closeGapPx: 1 });
    expect(rooms.rooms.length).toBe(1);
  });
});
