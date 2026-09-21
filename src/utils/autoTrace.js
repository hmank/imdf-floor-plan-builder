import {
  CANVAS_H,
  CANVAS_W,
  MIN_ITEM_SIZE,
  TRACE_MAX_ROOM_SUGGESTIONS,
  TRACE_MIN_ROOM_SIZE_PX,
} from "../constants/editor";
import { clampRectToCanvas } from "./editorMath";

// Pixel-level floor-plan tracer.
// 1. Classify every pixel as wall / not-wall using an adaptive (Otsu) luma threshold,
//    excluding saturated pixels so colored room fills never count as walls.
// 2. Morphologically close the wall mask to seal doorways and anti-aliasing breaks,
//    sweeping the closing radius and keeping the pass that yields the most rooms.
// 3. Flood-fill the non-wall pixels; every enclosed, reasonably rectangular
//    component becomes a room suggestion.

const DEFAULTS = {
  saturationCutoff: 0.18,
  thresholdBias: 0,
  closeGapPx: 1,
  minRoomSizePx: TRACE_MIN_ROOM_SIZE_PX,
  minFillRatio: 0.55,
  maxAreaFraction: 0.6,
  frameFillRatio: 0.75,
  frameAreaFraction: 0.3,
  maxRooms: TRACE_MAX_ROOM_SUGGESTIONS,
  coloredSaturation: 0.1,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function otsuThreshold(hist, total) {
  if (total === 0) {
    return 128;
  }
  let sum = 0;
  for (let i = 0; i < 256; i += 1) {
    sum += i * hist[i];
  }
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t += 1) {
    wB += hist[t];
    if (wB === 0) {
      continue;
    }
    const wF = total - wB;
    if (wF === 0) {
      break;
    }
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

function dilateMask(mask, width, height, radius) {
  if (radius <= 0) {
    return mask;
  }
  const horizontal = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if (!mask[row + x]) {
        continue;
      }
      const from = Math.max(0, x - radius);
      const to = Math.min(width - 1, x + radius);
      for (let k = from; k <= to; k += 1) {
        horizontal[row + k] = 1;
      }
    }
  }
  const result = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    const from = Math.max(0, y - radius);
    const to = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x += 1) {
      if (!horizontal[y * width + x]) {
        continue;
      }
      for (let k = from; k <= to; k += 1) {
        result[k * width + x] = 1;
      }
    }
  }
  return result;
}

function erodeMask(mask, width, height, radius) {
  if (radius <= 0) {
    return mask;
  }
  // Erosion is dilation of the complement.
  const inverted = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) {
    inverted[i] = mask[i] ? 0 : 1;
  }
  const grown = dilateMask(inverted, width, height, radius);
  const result = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) {
    result[i] = grown[i] ? 0 : 1;
  }
  return result;
}

// Morphological closing: seals gaps (doorways, anti-aliasing breaks) narrower than
// ~2*radius while restoring the original wall thickness afterwards.
export function closeMask(mask, width, height, radius) {
  if (radius <= 0) {
    return mask;
  }
  return erodeMask(dilateMask(mask, width, height, radius), width, height, radius);
}

export function buildWallMask(pixels, width, height, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const count = width * height;
  const luma = new Uint8Array(count);
  const sat = new Uint8Array(count);
  const hist = new Uint32Array(256);
  const satCut = Math.round(clamp(opts.saturationCutoff, 0, 1) * 255);
  let histTotal = 0;

  for (let i = 0; i < count; i += 1) {
    const p = i * 4;
    const a = pixels[p + 3];
    if (a < 24) {
      luma[i] = 255;
      sat[i] = 0;
      continue;
    }
    const r = pixels[p];
    const g = pixels[p + 1];
    const b = pixels[p + 2];
    const l = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const s = mx === 0 ? 0 : Math.round((255 * (mx - mn)) / mx);
    luma[i] = l;
    sat[i] = s;
    if (s <= satCut) {
      hist[l] += 1;
      histTotal += 1;
    }
  }

  let cumulative = 0;
  let median = 255;
  for (let i = 0; i < 256; i += 1) {
    cumulative += hist[i];
    if (cumulative >= histTotal / 2) {
      median = i;
      break;
    }
  }
  // Light background => walls are dark. Dark background => walls are light.
  const darkWalls = median >= 110;
  const threshold = clamp(otsuThreshold(hist, histTotal) + opts.thresholdBias, 30, 245);

  const rawMask = new Uint8Array(count);
  let wallPixelCount = 0;
  for (let i = 0; i < count; i += 1) {
    if (sat[i] > satCut) {
      continue;
    }
    const isWall = darkWalls ? luma[i] <= threshold : luma[i] >= threshold;
    if (isWall) {
      rawMask[i] = 1;
      wallPixelCount += 1;
    }
  }

  // Close doorways / hairline breaks, then re-thin so rooms keep their true size.
  const closed = closeMask(rawMask, width, height, Math.max(0, Math.round(opts.closeGapPx)));
  // A 1px dilation afterwards guarantees diagonal (8-connected) leaks are sealed for 4-connected fill.
  const sealed = dilateMask(closed, width, height, 1);
  // Treat the image frame as a wall so cropped plans still form closed regions.
  for (let x = 0; x < width; x += 1) {
    sealed[x] = 1;
    sealed[(height - 1) * width + x] = 1;
  }
  for (let y = 0; y < height; y += 1) {
    sealed[y * width] = 1;
    sealed[y * width + width - 1] = 1;
  }

  return { rawMask, mask: sealed, threshold, darkWalls, wallPixelCount };
}

export function segmentRooms(mask, width, height, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const pixels = options.pixels || null;
  const count = width * height;
  const labels = new Int32Array(count).fill(-1);
  const queue = new Int32Array(count);
  const components = [];
  const totalArea = count;
  // The sealed mask is 1px thicker than the drawn walls, so grow boxes back by 1px.
  const bboxGrow = Math.max(0, Math.round(opts.bboxGrowPx ?? 1));

  for (let start = 0; start < count; start += 1) {
    if (mask[start] || labels[start] >= 0) {
      continue;
    }
    const label = components.length;
    let head = 0;
    let tail = 0;
    queue[tail] = start;
    tail += 1;
    labels[start] = label;

    let area = 0;
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let touchesFrame = false;

    while (head < tail) {
      const idx = queue[head];
      head += 1;
      area += 1;
      const x = idx % width;
      const y = (idx - x) / width;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x <= 1 || y <= 1 || x >= width - 2 || y >= height - 2) {
        touchesFrame = true;
      }
      if (pixels) {
        const p = idx * 4;
        rSum += pixels[p];
        gSum += pixels[p + 1];
        bSum += pixels[p + 2];
      }

      if (x > 0) {
        const n = idx - 1;
        if (!mask[n] && labels[n] < 0) {
          labels[n] = label;
          queue[tail] = n;
          tail += 1;
        }
      }
      if (x < width - 1) {
        const n = idx + 1;
        if (!mask[n] && labels[n] < 0) {
          labels[n] = label;
          queue[tail] = n;
          tail += 1;
        }
      }
      if (y > 0) {
        const n = idx - width;
        if (!mask[n] && labels[n] < 0) {
          labels[n] = label;
          queue[tail] = n;
          tail += 1;
        }
      }
      if (y < height - 1) {
        const n = idx + width;
        if (!mask[n] && labels[n] < 0) {
          labels[n] = label;
          queue[tail] = n;
          tail += 1;
        }
      }
    }

    components.push({ area, minX, maxX, minY, maxY, rSum, gSum, bSum, touchesFrame });
  }

  // Exterior = sprawling regions that reach the image frame. Rooms that border the
  // exterior sit on the building envelope (windows) and are treated as offices; enclosed
  // interior cells are workstations.
  const exteriorLabels = new Set();
  components.forEach((component, label) => {
    const bw = component.maxX - component.minX + 1;
    const bh = component.maxY - component.minY + 1;
    const fill = component.area / (bw * bh);
    if (
      component.touchesFrame &&
      (fill < opts.frameFillRatio || component.area > opts.frameAreaFraction * totalArea)
    ) {
      exteriorLabels.add(label);
    }
  });
  const ringPx = Math.max(4, Math.round(opts.exteriorRingPx ?? 10));
  const bordersExterior = (minX, minY, maxX, maxY) => {
    if (exteriorLabels.size === 0) {
      return false;
    }
    const x0 = Math.max(0, minX - ringPx);
    const x1 = Math.min(width - 1, maxX + ringPx);
    const y0 = Math.max(0, minY - ringPx);
    const y1 = Math.min(height - 1, maxY + ringPx);
    for (let x = x0; x <= x1; x += 1) {
      if (exteriorLabels.has(labels[y0 * width + x]) || exteriorLabels.has(labels[y1 * width + x])) {
        return true;
      }
    }
    for (let y = y0; y <= y1; y += 1) {
      if (exteriorLabels.has(labels[y * width + x0]) || exteriorLabels.has(labels[y * width + x1])) {
        return true;
      }
    }
    return false;
  };

  const candidates = [];
  components.forEach((component) => {
    const bw = component.maxX - component.minX + 1;
    const bh = component.maxY - component.minY + 1;
    if (bw < opts.minRoomSizePx || bh < opts.minRoomSizePx) {
      return;
    }
    if (component.area > opts.maxAreaFraction * totalArea) {
      return;
    }
    const fillRatio = component.area / (bw * bh);
    if (fillRatio < opts.minFillRatio) {
      return;
    }
    // The exterior background always reaches the image frame; real rooms rarely do
    // unless the plan is cropped right at its outer wall, so only drop frame-touching
    // regions when they look like background (sprawling or huge).
    if (
      component.touchesFrame &&
      (fillRatio < opts.frameFillRatio || component.area > opts.frameAreaFraction * totalArea)
    ) {
      return;
    }

    let colored = false;
    if (pixels && component.area > 0) {
      const r = component.rSum / component.area;
      const g = component.gSum / component.area;
      const b = component.bSum / component.area;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      colored = mx > 0 && (mx - mn) / mx >= opts.coloredSaturation;
    }

    // Grow the box back by the sealing radius so rooms meet their walls.
    const rect = clampRectToCanvas(
      {
        x: component.minX - bboxGrow,
        y: component.minY - bboxGrow,
        w: bw + bboxGrow * 2,
        h: bh + bboxGrow * 2,
      },
      width,
      height,
      MIN_ITEM_SIZE
    );

    let cat = "workspace";
    if (colored) {
      cat = "room";
    } else if (bordersExterior(component.minX, component.minY, component.maxX, component.maxY)) {
      cat = "office";
    }

    candidates.push({
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      area: component.area,
      fillRatio,
      cat,
      minX: component.minX,
      minY: component.minY,
      maxX: component.maxX,
      maxY: component.maxY,
    });
  });

  // If the plan was cropped exactly at its outer wall there is no exterior region;
  // fall back to treating rooms on the edge of the plan's bounding box as perimeter offices.
  if (exteriorLabels.size === 0 && candidates.length > 0) {
    const plan = candidates.reduce(
      (acc, c) => ({
        minX: Math.min(acc.minX, c.minX),
        minY: Math.min(acc.minY, c.minY),
        maxX: Math.max(acc.maxX, c.maxX),
        maxY: Math.max(acc.maxY, c.maxY),
      }),
      { minX: width, minY: height, maxX: -1, maxY: -1 }
    );
    candidates.forEach((c) => {
      if (c.cat !== "workspace") {
        return;
      }
      const onEdge =
        c.minX - plan.minX <= ringPx ||
        c.minY - plan.minY <= ringPx ||
        plan.maxX - c.maxX <= ringPx ||
        plan.maxY - c.maxY <= ringPx;
      if (onEdge) {
        c.cat = "office";
      }
    });
  }

  // Hallways and open areas often pass the fill test but wrap around real rooms.
  // Drop any candidate whose box swallows two or more other candidates.
  const overlapArea = (a, b) => {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  };
  const filtered = candidates.filter((candidate) => {
    let swallowed = 0;
    for (let i = 0; i < candidates.length; i += 1) {
      const other = candidates[i];
      if (other === candidate || other.w * other.h >= candidate.w * candidate.h) {
        continue;
      }
      if (overlapArea(candidate, other) >= 0.8 * other.w * other.h) {
        swallowed += 1;
        if (swallowed >= 2) {
          return false;
        }
      }
    }
    return true;
  });

  // Reading order: top-to-bottom in bands, then left-to-right.
  const band = 24;
  filtered.sort((a, b) => {
    const rowA = Math.floor(a.y / band);
    const rowB = Math.floor(b.y / band);
    if (rowA !== rowB) {
      return rowA - rowB;
    }
    return a.x - b.x;
  });

  return {
    rooms: filtered
      .slice(0, Math.max(1, opts.maxRooms))
      .map(({ minX, minY, maxX, maxY, ...room }) => room),
    meta: {
      components: components.length,
      candidates: candidates.length,
    },
  };
}

const SEAL_RADII = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];

export function traceFromPixels(pixels, width, height, options = {}) {
  // Doorways are gaps in the walls. Sweep the closing radius and keep the pass that
  // seals the most rooms without swallowing the small ones.
  const radii = options.closeGapPx != null ? [options.closeGapPx] : options.sealRadii || SEAL_RADII;
  let best = null;
  radii.forEach((radius) => {
    const wall = buildWallMask(pixels, width, height, { ...options, closeGapPx: radius });
    const segmentation = segmentRooms(wall.mask, width, height, { ...options, pixels });
    const coverage = segmentation.rooms.reduce((sum, room) => sum + room.w * room.h, 0);
    const score = segmentation.rooms.length * 1_000_000 + coverage;
    if (!best || score > best.score) {
      best = { wall, segmentation, radius, score };
    }
  });

  return {
    rooms: best.segmentation.rooms,
    rawMask: best.wall.rawMask,
    wallPixelCount: best.wall.wallPixelCount,
    meta: {
      ...best.segmentation.meta,
      threshold: best.wall.threshold,
      darkWalls: best.wall.darkWalls,
      sealRadius: best.radius,
      width,
      height,
    },
  };
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Auto-trace could not read this image file."));
    };
    image.src = objectUrl;
  });
}

function renderMaskToDataUrl(mask, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const imageData = context.createImageData(width, height);
  const data = imageData.data;
  for (let i = 0; i < mask.length; i += 1) {
    if (!mask[i]) {
      continue;
    }
    const p = i * 4;
    data[p] = 203;
    data[p + 1] = 213;
    data[p + 2] = 225;
    data[p + 3] = 240;
  }
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

const RETRY_PROFILES = [
  { label: "default", params: {} },
  { label: "relaxed", params: { thresholdBias: 25, saturationCutoff: 0.4 } },
];

export async function traceFloorPlanImage(file, options = {}) {
  if (!file) {
    throw new Error("Auto-trace requires an image file.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Auto-trace supports image files only (PNG/JPG/WebP).");
  }

  const canvasW = options.canvasW ?? CANVAS_W;
  const canvasH = options.canvasH ?? CANVAS_H;
  const image = await loadImageElement(file);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Auto-trace could not initialize the image processor.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvasW, canvasH);
  const scale = Math.min(canvasW / image.width, canvasH / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const drawX = (canvasW - drawW) / 2;
  const drawY = (canvasH - drawH) / 2;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, drawX, drawY, drawW, drawH);

  const pixels = context.getImageData(0, 0, canvasW, canvasH).data;

  let best = null;
  let bestProfile = RETRY_PROFILES[0].label;
  for (let i = 0; i < RETRY_PROFILES.length; i += 1) {
    const profile = RETRY_PROFILES[i];
    const result = traceFromPixels(pixels, canvasW, canvasH, { ...options, ...profile.params });
    if (!best || result.rooms.length > best.rooms.length) {
      best = result;
      bestProfile = profile.label;
    }
    if (result.rooms.length >= 6) {
      break;
    }
  }

  return {
    rooms: best.rooms,
    wallPixelCount: best.wallPixelCount,
    wallMaskUrl: renderMaskToDataUrl(best.rawMask, canvasW, canvasH),
    profile: bestProfile,
    meta: best.meta,
  };
}
