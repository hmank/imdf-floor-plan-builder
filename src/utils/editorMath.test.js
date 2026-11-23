import { describe, expect, it } from "vitest";
import { alignRectToItems, clampRectToCanvas, clientToCanvasPoint, snapValue } from "./editorMath";

describe("editor math", () => {
  it("maps screen coordinates into canvas coordinates at different zoom levels", () => {
    const rect = { left: 100, top: 50 };
    expect(clientToCanvasPoint(300, 150, rect, 2)).toEqual({ x: 100, y: 50 });
    expect(clientToCanvasPoint(150, 75, rect, 0.5)).toEqual({ x: 100, y: 50 });
  });
  it("snaps scalar values to the grid", () => {
    expect(snapValue(41, 40)).toBe(40);
    expect(snapValue(59, 40)).toBe(40);
    expect(snapValue(61, 40)).toBe(80);
  });

  it("clamps rect to canvas boundaries", () => {
    const rect = clampRectToCanvas(
      { x: -20, y: 620, w: 900, h: 10 },
      800,
      600,
      20
    );

    expect(rect).toEqual({ x: 0, y: 580, w: 800, h: 20 });
  });

  it("aligns moving rect with nearby item edges and centers", () => {
    const moving = { id: "moving", x: 97, y: 53, w: 80, h: 40 };
    const fixed = { id: "fixed", x: 100, y: 50, w: 200, h: 120 };

    const aligned = alignRectToItems({
      rect: moving,
      items: [moving, fixed],
      activeItemId: moving.id,
      threshold: 5,
      canvasW: 800,
      canvasH: 600,
    });

    expect(aligned.rect.x).toBe(100);
    expect(aligned.rect.y).toBe(50);
    expect(aligned.guides).toHaveLength(2);
    expect(aligned.guides[0].orientation).toBe("vertical");
    expect(aligned.guides[1].orientation).toBe("horizontal");
  });
});
