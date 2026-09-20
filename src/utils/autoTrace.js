import {
  CANVAS_H,
  CANVAS_W,
  MIN_ITEM_SIZE,
  TRACE_CELL_SIZE,
  TRACE_DARKNESS_THRESHOLD,
  TRACE_MAX_ROOM_SUGGESTIONS,
  TRACE_MIN_ROOM_AREA_CELLS,
} from "../constants/editor";
import { clampRectToCanvas } from "./editorMath";

function assertRectangularGrid(grid) {
  if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0]) || grid[0].length === 0) {
    throw new Error("Auto-trace requires a non-empty occupancy grid.");
  }
  const width = grid[0].length;
  if (grid.some((row) => !Array.isArray(row) || row.length !== width)) {
    throw new Error("Auto-trace occupancy grid must be rectangular.");
  }
  return { rows: grid.length, cols: width };
}

function wallLength(wall) {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
}

export function analyzeOccupancyGrid(grid, options = {}) {
  const { rows, cols } = assertRectangularGrid(grid);
  const canvasW = options.canvasW ?? CANVAS_W;
  const canvasH = options.canvasH ?? CANVAS_H;
  const minItemSize = options.minItemSize ?? MIN_ITEM_SIZE;
  const minWallRun = Math.max(2, options.minWallRun ?? 3);
  const minRoomAreaCells = Math.max(4, options.minRoomAreaCells ?? TRACE_MIN_ROOM_AREA_CELLS);
  const maxRoomSuggestions = Math.max(1, options.maxRoomSuggestions ?? TRACE_MAX_ROOM_SUGGESTIONS);
  const maxRoomAspectRatio = Math.max(1, options.maxRoomAspectRatio ?? 5);
  const maxWallSegments = Math.max(20, options.maxWallSegments ?? 700);

  const cellW = canvasW / cols;
  const cellH = canvasH / rows;
  const walls = [];

  for (let y = 0; y < rows; y += 1) {
    let x = 0;
    while (x < cols) {
      if (!grid[y][x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < cols && grid[y][x]) {
        x += 1;
      }
      if (x - start >= minWallRun) {
        walls.push({
          orientation: "horizontal",
          x1: Math.round(start * cellW),
          y1: Math.round((y + 0.5) * cellH),
          x2: Math.round(x * cellW),
          y2: Math.round((y + 0.5) * cellH),
        });
      }
    }
  }

  for (let x = 0; x < cols; x += 1) {
    let y = 0;
    while (y < rows) {
      if (!grid[y][x]) {
        y += 1;
        continue;
      }
      const start = y;
      while (y < rows && grid[y][x]) {
        y += 1;
      }
      if (y - start >= minWallRun) {
        walls.push({
          orientation: "vertical",
          x1: Math.round((x + 0.5) * cellW),
          y1: Math.round(start * cellH),
          x2: Math.round((x + 0.5) * cellW),
          y2: Math.round(y * cellH),
        });
      }
    }
  }

  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const roomCandidates = [];
  const neighbors = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (visited[y][x] || grid[y][x]) {
        continue;
      }

      const queue = [[x, y]];
      visited[y][x] = true;
      let head = 0;
      let areaCells = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let touchesBoundary = false;

      while (head < queue.length) {
        const [cx, cy] = queue[head];
        head += 1;
        areaCells += 1;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
        if (cx === 0 || cy === 0 || cx === cols - 1 || cy === rows - 1) {
          touchesBoundary = true;
        }

        neighbors.forEach(([dx, dy]) => {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows || visited[ny][nx] || grid[ny][nx]) {
            return;
          }
          visited[ny][nx] = true;
          queue.push([nx, ny]);
        });
      }

      if (touchesBoundary || areaCells < minRoomAreaCells) {
        continue;
      }

      const widthCells = maxX - minX + 1;
      const heightCells = maxY - minY + 1;
      const aspectRatio = Math.max(widthCells / heightCells, heightCells / widthCells);
      if (aspectRatio > maxRoomAspectRatio) {
        continue;
      }

      const candidateRect = clampRectToCanvas(
        {
          x: Math.round(minX * cellW) + 1,
          y: Math.round(minY * cellH) + 1,
          w: Math.round(widthCells * cellW) - 2,
          h: Math.round(heightCells * cellH) - 2,
        },
        canvasW,
        canvasH,
        minItemSize
      );

      roomCandidates.push({
        ...candidateRect,
        areaCells,
      });
    }
  }

  const trimmedWalls = walls
    .sort((a, b) => wallLength(b) - wallLength(a))
    .slice(0, maxWallSegments);

  const rooms = roomCandidates
    .sort((a, b) => b.areaCells - a.areaCells)
    .slice(0, maxRoomSuggestions)
    .map(({ areaCells, ...rect }) => rect);

  return {
    walls: trimmedWalls,
    rooms,
    meta: {
      rows,
      cols,
      cellW,
      cellH,
      roomCandidates: roomCandidates.length,
      wallsDetected: walls.length,
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

export async function traceFloorPlanImage(file, options = {}) {
  if (!file) {
    throw new Error("Auto-trace requires an image file.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Auto-trace supports image files only (PNG/JPG/WebP).");
  }

  const canvasW = options.canvasW ?? CANVAS_W;
  const canvasH = options.canvasH ?? CANVAS_H;
  const cellSize = Math.max(4, options.cellSize ?? TRACE_CELL_SIZE);
  const darknessThreshold = options.darknessThreshold ?? TRACE_DARKNESS_THRESHOLD;
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

  const imageScale = Math.min(canvasW / image.width, canvasH / image.height);
  const drawW = image.width * imageScale;
  const drawH = image.height * imageScale;
  const drawX = (canvasW - drawW) / 2;
  const drawY = (canvasH - drawH) / 2;
  context.drawImage(image, drawX, drawY, drawW, drawH);

  const pixels = context.getImageData(0, 0, canvasW, canvasH).data;
  const cols = Math.max(4, Math.floor(canvasW / cellSize));
  const rows = Math.max(4, Math.floor(canvasH / cellSize));
  const sampleGrid = Array.from({ length: rows }, () => Array(cols).fill(false));
  const cellW = canvasW / cols;
  const cellH = canvasH / rows;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const sampleX = Math.min(canvasW - 1, Math.max(0, Math.round((col + 0.5) * cellW)));
      const sampleY = Math.min(canvasH - 1, Math.max(0, Math.round((row + 0.5) * cellH)));
      const idx = (sampleY * canvasW + sampleX) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sampleGrid[row][col] = a > 24 && luma <= darknessThreshold;
    }
  }

  return analyzeOccupancyGrid(sampleGrid, {
    ...options,
    canvasW,
    canvasH,
  });
}
