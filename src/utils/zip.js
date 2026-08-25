export function buildZip(files) {
  const te = new TextEncoder();
  const entries = files.map((file) => ({
    name: te.encode(file.name),
    data: te.encode(file.content),
  }));
  let offset = 0;
  const localHeaders = [];
  const centralHeaders = [];

  for (const entry of entries) {
    let crc = 0xffffffff;
    for (let i = 0; i < entry.data.length; i += 1) {
      crc ^= entry.data[i];
      for (let j = 0; j < 8; j += 1) {
        crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
      }
    }
    crc = (crc ^ 0xffffffff) >>> 0;

    const localHeader = new Uint8Array(30 + entry.name.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, entry.data.length, true);
    localView.setUint32(22, entry.data.length, true);
    localView.setUint16(26, entry.name.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(entry.name, 30);

    localHeaders.push({ header: localHeader, data: entry.data, offset });

    const centralHeader = new Uint8Array(46 + entry.name.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, entry.data.length, true);
    centralView.setUint32(24, entry.data.length, true);
    centralView.setUint16(28, entry.name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(entry.name, 46);
    centralHeaders.push(centralHeader);

    offset += localHeader.length + entry.data.length;
  }

  const centralStart = offset;
  let centralSize = 0;
  centralHeaders.forEach((centralHeader) => {
    centralSize += centralHeader.length;
  });

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, centralStart, true);
  eocdView.setUint16(20, 0, true);

  const totalSize = offset + centralSize + 22;
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const localEntry of localHeaders) {
    result.set(localEntry.header, pos);
    pos += localEntry.header.length;
    result.set(localEntry.data, pos);
    pos += localEntry.data.length;
  }
  for (const centralHeader of centralHeaders) {
    result.set(centralHeader, pos);
    pos += centralHeader.length;
  }
  result.set(eocd, pos);

  return result;
}
