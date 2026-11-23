export function detectDeskFixtures(pixels, width, height, rooms, transform) {
  const mask = new Uint8Array(width * height);
  const queue = new Int32Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) {
    const p = i * 4;
    mask[i] = pixels[p + 3] >= 24 && pixels[p] > 245 &&
      pixels[p + 1] > 245 && pixels[p + 2] > 245 ? 1 : 0;
  }

  const candidates = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start]) continue;
    let head = 0;
    let tail = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    queue[tail++] = start;
    mask[start] = 0;
    while (head < tail) {
      const current = queue[head++];
      const x = current % width;
      const y = Math.floor(current / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x + 1 < width ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y + 1 < height ? current + width : -1,
      ];
      for (const neighbor of neighbors) {
        if (neighbor >= 0 && mask[neighbor]) {
          mask[neighbor] = 0;
          queue[tail++] = neighbor;
        }
      }
    }

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w < width * 0.01 || w > width * 0.041 ||
        h < height * 0.009 || h > height * 0.04 ||
        tail / (w * h) < 0.65 || Math.max(w / h, h / w) < 1.4) continue;

    const rect = {
      x: minX * transform.scale + transform.x,
      y: minY * transform.scale + transform.y,
      w: w * transform.scale,
      h: h * transform.scale,
    };
    const centerX = rect.x + rect.w / 2;
    const centerY = rect.y + rect.h / 2;
    if (rooms.some((room) => centerX >= room.x && centerX <= room.x + room.w &&
        centerY >= room.y && centerY <= room.y + room.h)) {
      candidates.push({ ...rect, sourceW: w, sourceH: h });
    }
  }

  return candidates
    .filter((candidate) => candidates.filter((other) =>
      Math.abs(other.sourceW - candidate.sourceW) <= Math.max(2, candidate.sourceW * 0.2) &&
      Math.abs(other.sourceH - candidate.sourceH) <= Math.max(2, candidate.sourceH * 0.2)
    ).length >= 3)
    .map(({ sourceW, sourceH, ...rect }) => ({ ...rect, cat: "desk", featureType: "fixture" }));
}
