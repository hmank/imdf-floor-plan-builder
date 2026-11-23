import { describe, expect, it } from "vitest";
import { detectDeskFixtures } from "./deskDetection";
import { classifyRoomLabel } from "./roomLabels";

describe("floor plan suggestions", () => {
  it("finds repeated horizontal and vertical rectangles inside rooms only", () => {
    const width = 1000;
    const height = 800;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
    const fill = (x, y, w, h) => {
      for (let row = y; row < y + h; row += 1) {
        for (let col = x; col < x + w; col += 1) {
          pixels.fill(255, (row * width + col) * 4, (row * width + col) * 4 + 4);
        }
      }
    };
    for (const x of [100, 140, 180]) fill(x, 100, 20, 10);
    for (const x of [100, 140, 180]) fill(x, 140, 10, 20);
    fill(700, 100, 20, 10);
    const fixtures = detectDeskFixtures(pixels, width, height,
      [{ x: 40, y: 20, w: 150, h: 100 }], { scale: 0.5, x: 0, y: 0 });
    expect(fixtures).toHaveLength(6);
    expect(fixtures[0]).toMatchObject({ x: 50, y: 50, w: 10, h: 5, cat: "desk", featureType: "fixture" });
    expect(fixtures[3]).toMatchObject({ w: 5, h: 10 });
  });

  it("recognizes supported labels and leaves unreadable labels unclassified", () => {
    expect(classifyRoomLabel("Lounge")).toEqual({ cat: "lounge", name: "Lounge" });
    expect(classifyRoomLabel("Rest Room")).toEqual({ cat: "restroom", name: "Rest Room" });
    expect(classifyRoomLabel("Elevator 2")).toEqual({ cat: "elevator", name: "Elevator 2" });
    expect(classifyRoomLabel("Office 6 =")).toEqual({ cat: "office", name: "Office 6" });
    expect(classifyRoomLabel("unreadable")).toBeNull();
  });
});
