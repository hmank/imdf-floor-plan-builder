// Dev harness: run the tracer on a floor-plan PNG (optionally cropped) and dump a debug PNG.
// Usage: node scripts/trace-harness.mjs input.png [x,y,w,h] [debug-out.png]
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";
import { traceFromPixels } from "../src/utils/autoTrace.js";

const [, , input, cropSpec, output] = process.argv;
const src = PNG.sync.read(fs.readFileSync(input));

let { width, height, data } = src;
if (cropSpec) {
  const [cx, cy, cw, ch] = cropSpec.split(",").map(Number);
  const out = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const si = ((cy + y) * width + (cx + x)) * 4;
      const di = (y * cw + x) * 4;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = data[si + 3];
    }
  }
  data = out;
  width = cw;
  height = ch;
}

// Scale into the editor canvas (contain), nearest-neighbour, like the app's drawImage.
const CW = 800;
const CH = 600;
const scale = Math.min(CW / width, CH / height);
const dw = Math.round(width * scale);
const dh = Math.round(height * scale);
const ox = Math.floor((CW - dw) / 2);
const oy = Math.floor((CH - dh) / 2);
const canvas = new Uint8ClampedArray(CW * CH * 4).fill(255);
for (let y = 0; y < dh; y += 1) {
  const sy = Math.min(height - 1, Math.floor(y / scale));
  for (let x = 0; x < dw; x += 1) {
    const sx = Math.min(width - 1, Math.floor(x / scale));
    const si = (sy * width + sx) * 4;
    const di = ((oy + y) * CW + (ox + x)) * 4;
    canvas[di] = data[si];
    canvas[di + 1] = data[si + 1];
    canvas[di + 2] = data[si + 2];
    canvas[di + 3] = data[si + 3];
  }
}

const t0 = Date.now();
const result = traceFromPixels(canvas, CW, CH);
console.log(
  `rooms=${result.rooms.length} wallPixels=${result.wallPixelCount} threshold=${result.meta.threshold} darkWalls=${result.meta.darkWalls} components=${result.meta.components} ms=${Date.now() - t0}`
);
console.log(
  result.rooms
    .slice(0, 12)
    .map((r) => `${r.cat} ${r.x},${r.y} ${r.w}x${r.h} fill=${r.fillRatio.toFixed(2)}`)
    .join("\n")
);

if (output) {
  const png = new PNG({ width: CW, height: CH });
  for (let i = 0; i < CW * CH; i += 1) {
    const p = i * 4;
    const wall = result.rawMask[i];
    png.data[p] = wall ? 30 : 255;
    png.data[p + 1] = wall ? 30 : 255;
    png.data[p + 2] = wall ? 30 : 255;
    png.data[p + 3] = 255;
  }
  const mark = (x, y) => {
    const p = (y * CW + x) * 4;
    png.data[p] = 0;
    png.data[p + 1] = 170;
    png.data[p + 2] = 0;
  };
  result.rooms.forEach((r) => {
    for (let x = r.x; x < r.x + r.w; x += 1) {
      mark(x, r.y);
      mark(x, r.y + r.h - 1);
    }
    for (let y = r.y; y < r.y + r.h; y += 1) {
      mark(r.x, y);
      mark(r.x + r.w - 1, y);
    }
  });
  fs.writeFileSync(output, PNG.sync.write(png));
  console.log("wrote", path.resolve(output));
}
