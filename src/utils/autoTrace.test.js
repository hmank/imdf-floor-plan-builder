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

  it("does not mistake colored fills for walls and uses warm fills for meeting rooms", () => {
    const width = 300;
    const height = 200;
    const plan = createPlan(width, height);
    plan.rect(10, 10, 289, 189, 2, GRAY);
    plan.fill(100, 10, 101, 189, GRAY);
    plan.fill(200, 10, 201, 189, GRAY);
    plan.fill(104, 14, 196, 185, BLUE_FILL);
    plan.fill(204, 14, 285, 185, [250, 230, 205]);

    const traced = traceFromPixels(plan.pixels, width, height);
    expect(traced.rooms.length).toBe(3);
    const blue = traced.rooms.find((room) => room.x > 90 && room.x < 190);
    const warm = traced.rooms.find((room) => room.x > 190);
    const plain = traced.rooms.find((room) => room.x < 90);
    expect(blue.cat).toBe("office");
    expect(warm.cat).toBe("room");
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

  it("types perimeter rooms as offices and enclosed interior cells as workstations", () => {
    const width = 300;
    const height = 300;
    const plan = createPlan(width, height);
    // 3x3 grid of rooms with exterior background around it.
    plan.rect(30, 30, 269, 269, 2, GRAY);
    plan.fill(110, 30, 111, 269, GRAY);
    plan.fill(190, 30, 191, 269, GRAY);
    plan.fill(30, 110, 269, 111, GRAY);
    plan.fill(30, 190, 269, 191, GRAY);

    const traced = traceFromPixels(plan.pixels, width, height);
    expect(traced.rooms.length).toBe(9);
    const center = traced.rooms.find((r) => r.x > 100 && r.x < 130 && r.y > 100 && r.y < 130);
    expect(center.cat).toBe("workspace");
    expect(traced.rooms.filter((r) => r.cat === "office").length).toBe(8);
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

  it("finds furnished rooms instead of turning desks into rooms", () => {
    const width = 800;
    const height = 600;
    const plan = createPlan(width, height);
    const wall = [60, 75, 85];
    const desk = [140, 155, 165];
    plan.fill(30, 80, 769, 249, BLUE_FILL);
    plan.rect(30, 80, 769, 249, 3, wall);
    for (const x of [215, 400, 585]) {
      plan.fill(x, 80, x + 2, 249, wall);
    }
    for (let room = 0; room < 4; room += 1) {
      const left = 30 + room * 185;
      plan.fill(left + 30, 80, left + 55, 82, [169, 205, 231]);
      plan.fill(left + 95, 247, left + 110, 249, [255, 255, 255]);
      for (let row = 0; row < 2; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          const x = left + 20 + col * 48;
          const y = 110 + row * 60;
          plan.rect(x, y, x + 35, y + 22, 2, desk);
          plan.fill(x + 2, y + 2, x + 33, y + 20, [255, 255, 255]);
        }
      }
    }

    const traced = traceFromPixels(plan.pixels, width, height);
    expect(traced.rooms).toHaveLength(4);
    for (const room of traced.rooms) {
      expect(room.w).toBeGreaterThan(170);
      expect(room.h).toBeGreaterThan(150);
      expect(room.cat).toBe("office");
    }
  });
});
