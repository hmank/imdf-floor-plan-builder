import { CANVAS_H, CANVAS_W, GRID_SIZE, MIN_ITEM_SIZE } from "../constants/editor";

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function snapValue(value, gridSize = GRID_SIZE) {
  return Math.round(value / gridSize) * gridSize;
}

export function clampRectToCanvas(
  rect,
  canvasW = CANVAS_W,
  canvasH = CANVAS_H,
  minSize = MIN_ITEM_SIZE
) {
  const w = clamp(rect.w, minSize, canvasW);
  const h = clamp(rect.h, minSize, canvasH);
  const x = clamp(rect.x, 0, Math.max(0, canvasW - w));
  const y = clamp(rect.y, 0, Math.max(0, canvasH - h));
  return { ...rect, x, y, w, h };
}

export function snapRectToGrid(rect, gridSize = GRID_SIZE) {
  return {
    ...rect,
    x: snapValue(rect.x, gridSize),
    y: snapValue(rect.y, gridSize),
    w: Math.max(MIN_ITEM_SIZE, snapValue(rect.w, gridSize)),
    h: Math.max(MIN_ITEM_SIZE, snapValue(rect.h, gridSize)),
  };
}

function collectPoints(item) {
  return {
    x: [
      { key: "left", value: item.x },
      { key: "center", value: item.x + item.w / 2 },
      { key: "right", value: item.x + item.w },
    ],
    y: [
      { key: "top", value: item.y },
      { key: "middle", value: item.y + item.h / 2 },
      { key: "bottom", value: item.y + item.h },
    ],
  };
}

function findClosestAxisSnap(movingPoints, staticPoints, threshold) {
  let best = null;
  movingPoints.forEach((movingPoint) => {
    staticPoints.forEach((staticPoint) => {
      const delta = staticPoint.value - movingPoint.value;
      const distance = Math.abs(delta);
      if (distance > threshold) {
        return;
      }
      if (!best || distance < best.distance) {
        best = {
          distance,
          delta,
          staticValue: staticPoint.value,
        };
      }
    });
  });
  return best;
}

export function alignRectToItems({
  rect,
  items,
  activeItemId,
  threshold = 6,
  canvasW = CANVAS_W,
  canvasH = CANVAS_H,
}) {
  const others = items.filter((item) => item.id !== activeItemId);
  if (others.length === 0) {
    return { rect, guides: [] };
  }

  const movingPoints = collectPoints(rect);
  const otherPointsX = [];
  const otherPointsY = [];
  others.forEach((item) => {
    const points = collectPoints(item);
    points.x.forEach((point) => otherPointsX.push(point));
    points.y.forEach((point) => otherPointsY.push(point));
  });

  const bestX = findClosestAxisSnap(movingPoints.x, otherPointsX, threshold);
  const bestY = findClosestAxisSnap(movingPoints.y, otherPointsY, threshold);

  const nextRect = { ...rect };
  const guides = [];
  if (bestX) {
    nextRect.x += bestX.delta;
    guides.push({
      orientation: "vertical",
      position: bestX.staticValue,
      start: 0,
      end: canvasH,
    });
  }
  if (bestY) {
    nextRect.y += bestY.delta;
    guides.push({
      orientation: "horizontal",
      position: bestY.staticValue,
      start: 0,
      end: canvasW,
    });
  }

  return { rect: nextRect, guides };
}
