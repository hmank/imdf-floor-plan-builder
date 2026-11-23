const LABELS = [
  { pattern: /\b(?:rest\s*room|washroom|toilet|wc)\b/i, cat: "restroom" },
  { pattern: /\b(?:elevator|lift)\b/i, cat: "elevator" },
  { pattern: /\b(?:stairs?|stairwell)\b/i, cat: "stairs" },
  { pattern: /\b(?:kitchen|kitchenette)\b/i, cat: "kitchen" },
  { pattern: /\blounge\b/i, cat: "lounge" },
  { pattern: /\bstorage\b/i, cat: "storage" },
  { pattern: /\boffice\b/i, cat: "office" },
  { pattern: /\b(?:meeting|conference|boardroom|huddle|focus room|phone booth|print room)\b/i, cat: "room" },
  { pattern: /\bworkspace\b/i, cat: "workspace" },
];

export function classifyRoomLabel(text) {
  for (const line of text.split("\n")) {
    const label = line.trim().replace(/^[^\w]+|[^\w)]+$/g, "").trim();
    if (!label) continue;
    for (const entry of LABELS) {
      if (entry.pattern.test(label)) return { cat: entry.cat, name: label };
    }
  }
  return null;
}

export async function recognizeRoomLabels(imageContext, imageWidth, imageHeight, rooms, transform, onProgress) {
  const { createWorker, PSM } = await import("tesseract.js");
  const assetUrl = new URL(`${import.meta.env.BASE_URL}ocr/`, window.location.origin).href.replace(/\/$/, "");
  const worker = await createWorker("eng", 1, {
    workerPath: `${assetUrl}/worker.min.js`,
    corePath: assetUrl,
    langPath: assetUrl,
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const results = [];
    for (let i = 0; i < rooms.length; i += 1) {
      const room = rooms[i];
      const x = Math.max(0, Math.floor((room.x - transform.x) / transform.scale) + 2);
      const y = Math.max(0, Math.floor((room.y - transform.y) / transform.scale) + 2);
      const right = Math.min(imageWidth, Math.ceil((room.x + room.w - transform.x) / transform.scale) - 2);
      const bottom = Math.min(imageHeight, Math.ceil((room.y + room.h - transform.y) / transform.scale) - 2);
      if (right <= x || bottom <= y) {
        results.push(null);
        continue;
      }
      const data = imageContext.getImageData(x, y, right - x, bottom - y);
      for (let p = 0; p < data.data.length; p += 4) {
        const luma = 0.2126 * data.data[p] + 0.7152 * data.data[p + 1] + 0.0722 * data.data[p + 2];
        const value = luma < 120 ? 0 : 255;
        data.data[p] = value;
        data.data[p + 1] = value;
        data.data[p + 2] = value;
        data.data[p + 3] = 255;
      }
      const small = document.createElement("canvas");
      small.width = data.width;
      small.height = data.height;
      small.getContext("2d").putImageData(data, 0, 0);
      const enlarged = document.createElement("canvas");
      enlarged.width = data.width * 3;
      enlarged.height = data.height * 3;
      const context = enlarged.getContext("2d");
      context.imageSmoothingEnabled = false;
      context.drawImage(small, 0, 0, enlarged.width, enlarged.height);
      const { data: recognized } = await worker.recognize(enlarged);
      results.push(classifyRoomLabel(recognized.text));
      onProgress?.(i + 1, rooms.length);
    }
    if (results.some((result) => !result)) {
      const { data } = await worker.recognize(imageContext.canvas, {}, { blocks: true, text: true });
      const textByRoom = rooms.map(() => []);
      for (const block of data.blocks || []) {
        for (const paragraph of block.paragraphs || []) {
          for (const line of paragraph.lines || []) {
            const wordsByRoom = new Map();
            for (const word of line.words || []) {
              const x = ((word.bbox.x0 + word.bbox.x1) / 2) * transform.scale + transform.x;
              const y = ((word.bbox.y0 + word.bbox.y1) / 2) * transform.scale + transform.y;
              const index = rooms.findIndex((room) =>
                x >= room.x && x <= room.x + room.w && y >= room.y && y <= room.y + room.h
              );
              if (index >= 0) {
                if (!wordsByRoom.has(index)) wordsByRoom.set(index, []);
                wordsByRoom.get(index).push(word.text);
              }
            }
            for (const [index, words] of wordsByRoom) textByRoom[index].push(words.join(" "));
          }
        }
      }
      return results.map((result, index) => result || classifyRoomLabel(textByRoom[index].join("\n")));
    }
    return results;
  } finally {
    await worker.terminate();
  }
}
