import { useState, useEffect, useRef, useCallback } from "react";

// ── Helpers ────────────────────────────────────────────────────────
const uid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

const ROOM_TYPES = [
  { cat: "office", icon: "🏢", label: "Office", w: 100, h: 80, color: "#3b82f6" },
  { cat: "room", icon: "🚪", label: "Room", w: 90, h: 70, color: "#6366f1" },
  { cat: "workspace", icon: "💻", label: "Workspace", w: 60, h: 50, color: "#8b5cf6" },
  { cat: "restroom", icon: "🚻", label: "Restroom", w: 60, h: 50, color: "#ec4899" },
  { cat: "kitchen", icon: "🍳", label: "Kitchen", w: 80, h: 60, color: "#f59e0b" },
  { cat: "walkway", icon: "🚶", label: "Walkway", w: 140, h: 30, color: "#94a3b8" },
  { cat: "stairs", icon: "🪜", label: "Stairs", w: 50, h: 50, color: "#10b981" },
  { cat: "elevator", icon: "🛗", label: "Elevator", w: 45, h: 45, color: "#14b8a6" },
  { cat: "nonpublic", icon: "🔒", label: "Non-Public", w: 80, h: 60, color: "#ef4444" },
  { cat: "unspecified", icon: "▫️", label: "Other", w: 80, h: 60, color: "#6b7280" },
];
const CAT_MAP = Object.fromEntries(ROOM_TYPES.map((r) => [r.cat, r]));

// ── ZIP builder (STORE compression, pure JS) ───────────────────────
function buildZip(files) {
  const te = new TextEncoder();
  const entries = files.map((f) => ({
    name: te.encode(f.name),
    data: te.encode(f.content),
  }));
  let offset = 0;
  const localHeaders = [];
  const centralHeaders = [];

  for (const e of entries) {
    // CRC-32
    let crc = 0xffffffff;
    for (let i = 0; i < e.data.length; i++) {
      crc ^= e.data[i];
      for (let j = 0; j < 8; j++)
        crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    crc = (crc ^ 0xffffffff) >>> 0;

    // Local file header
    const lh = new Uint8Array(30 + e.name.length);
    const ldv = new DataView(lh.buffer);
    ldv.setUint32(0, 0x04034b50, true); // signature
    ldv.setUint16(4, 20, true); // version needed
    ldv.setUint16(6, 0, true); // flags
    ldv.setUint16(8, 0, true); // compression: STORE
    ldv.setUint16(10, 0, true); // mod time
    ldv.setUint16(12, 0, true); // mod date
    ldv.setUint32(14, crc, true); // crc32
    ldv.setUint32(18, e.data.length, true); // compressed size
    ldv.setUint32(22, e.data.length, true); // uncompressed size
    ldv.setUint16(26, e.name.length, true); // filename length
    ldv.setUint16(28, 0, true); // extra field length
    lh.set(e.name, 30);

    localHeaders.push({ header: lh, data: e.data, offset });

    // Central directory header
    const ch = new Uint8Array(46 + e.name.length);
    const cdv = new DataView(ch.buffer);
    cdv.setUint32(0, 0x02014b50, true); // signature
    cdv.setUint16(4, 20, true); // version made by
    cdv.setUint16(6, 20, true); // version needed
    cdv.setUint16(8, 0, true); // flags
    cdv.setUint16(10, 0, true); // compression
    cdv.setUint16(12, 0, true); // mod time
    cdv.setUint16(14, 0, true); // mod date
    cdv.setUint32(16, crc, true); // crc32
    cdv.setUint32(20, e.data.length, true); // compressed size
    cdv.setUint32(24, e.data.length, true); // uncompressed size
    cdv.setUint16(28, e.name.length, true); // filename length
    cdv.setUint16(30, 0, true); // extra field length
    cdv.setUint16(32, 0, true); // comment length
    cdv.setUint16(34, 0, true); // disk number start
    cdv.setUint16(36, 0, true); // internal attrs
    cdv.setUint32(38, 0, true); // external attrs
    cdv.setUint32(42, offset, true); // offset of local header
    ch.set(e.name, 46);
    centralHeaders.push(ch);

    offset += lh.length + e.data.length;
  }

  const centralStart = offset;
  let centralSize = 0;
  centralHeaders.forEach((c) => (centralSize += c.length));

  // End of central directory
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(4, 0, true); // disk number
  edv.setUint16(6, 0, true); // disk with central dir
  edv.setUint16(8, entries.length, true);
  edv.setUint16(10, entries.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, centralStart, true);
  edv.setUint16(20, 0, true); // comment length

  const totalSize = offset + centralSize + 22;
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const l of localHeaders) {
    result.set(l.header, pos);
    pos += l.header.length;
    result.set(l.data, pos);
    pos += l.data.length;
  }
  for (const c of centralHeaders) {
    result.set(c, pos);
    pos += c.length;
  }
  result.set(eocd, pos);
  return result;
}

const mkBldg = () => ({
  id: uid(),
  name: "",
  lat: "45.3476",
  lng: "-75.7629",
  category: "office",
  levels: [{ id: uid(), name: "1", ordinal: 0, items: [] }],
});

// ── Pixel to Geo conversion ────────────────────────────────────────
const CANVAS_W = 800,
  CANVAS_H = 600;
const METERS_PER_PX = 0.1;
function pxToGeo(px_x, px_y, centerLat, centerLng) {
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const dx_m = (px_x - CANVAS_W / 2) * METERS_PER_PX;
  const dy_m = (CANVAS_H / 2 - px_y) * METERS_PER_PX;
  return [centerLng + dx_m / mPerDegLng, centerLat + dy_m / mPerDegLat];
}

// ═══════════════════════════════════════════════════════════════════
export default function IMDFBuilder() {
  const [buildings, setBuildings] = useState([mkBldg()]);
  const [bi, setBi] = useState(0);
  const [li, setLi] = useState(0);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [exportStatus, setExportStatus] = useState(null);
  const canvasRef = useRef(null);

  const bldg = buildings[bi];
  const levels = bldg?.levels || [];
  const level = levels[li];
  const items = level?.items || [];

  const updateBldg = (idx, u) =>
    setBuildings((p) => p.map((b, i) => (i === idx ? { ...b, ...u } : b)));
  const setItems = (fn) =>
    setBuildings((p) =>
      p.map((b, i) => {
        if (i !== bi) return b;
        return {
          ...b,
          levels: b.levels.map((lv, j) =>
            j !== li
              ? lv
              : {
                  ...lv,
                  items: typeof fn === "function" ? fn(lv.items) : fn,
                }
          ),
        };
      })
    );
  const setLevels = (fn) =>
    setBuildings((p) =>
      p.map((b, i) =>
        i !== bi
          ? b
          : {
              ...b,
              levels: typeof fn === "function" ? fn(b.levels) : fn,
            }
      )
    );
  const updateItem = (id, u) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...u } : it)));
  const deleteItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (selected === id) setSelected(null);
  };

  const selectedItem = items.find((it) => it.id === selected);

  // Keyboard delete
  useEffect(() => {
    const handler = (e) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selected &&
        !["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)
      ) {
        e.preventDefault();
        deleteItem(selected);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected]);

  // ── Canvas mouse ─────────────────────────────────────────────────
  const onCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current) setSelected(null);
  };
  const onItemMouseDown = (e, item) => {
    e.stopPropagation();
    setSelected(item.id);
    const rect = canvasRef.current.getBoundingClientRect();
    setDragging({
      id: item.id,
      offX: e.clientX - rect.left - item.x,
      offY: e.clientY - rect.top - item.y,
    });
  };
  const onResizeMouseDown = (e, item, handle) => {
    e.stopPropagation();
    setSelected(item.id);
    setResizing({
      id: item.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startW: item.w,
      startH: item.h,
      startItemX: item.x,
      startItemY: item.y,
    });
  };

  const onMouseMove = useCallback(
    (e) => {
      if (dragging && dragging.id) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        updateItem(dragging.id, {
          x: Math.max(0, Math.min(CANVAS_W, e.clientX - rect.left - dragging.offX)),
          y: Math.max(0, Math.min(CANVAS_H, e.clientY - rect.top - dragging.offY)),
        });
      } else if (resizing) {
        const dx = e.clientX - resizing.startX;
        const dy = e.clientY - resizing.startY;
        const h = resizing.handle;
        let nw = resizing.startW,
          nh = resizing.startH,
          nx = resizing.startItemX,
          ny = resizing.startItemY;
        if (h.includes("e")) nw = Math.max(20, resizing.startW + dx);
        if (h.includes("w")) {
          nw = Math.max(20, resizing.startW - dx);
          nx = resizing.startItemX + dx;
        }
        if (h.includes("s")) nh = Math.max(20, resizing.startH + dy);
        if (h.includes("n")) {
          nh = Math.max(20, resizing.startH - dy);
          ny = resizing.startItemY + dy;
        }
        updateItem(resizing.id, { w: nw, h: nh, x: nx, y: ny });
      }
    },
    [dragging, resizing]
  );

  const onMouseUp = useCallback(
    (e) => {
      if (dragging?.fromPalette) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = e.clientX - rect.left - dragging.offX;
          const y = e.clientY - rect.top - dragging.offY;
          if (x >= -50 && x <= CANVAS_W + 50 && y >= -50 && y <= CANVAS_H + 50) {
            const rt = CAT_MAP[dragging.cat];
            const newItem = {
              id: uid(),
              cat: dragging.cat,
              name: "",
              x: Math.max(0, x),
              y: Math.max(0, y),
              w: rt.w,
              h: rt.h,
            };
            setItems((prev) => [...prev, newItem]);
            setSelected(newItem.id);
          }
        }
      }
      setDragging(null);
      setResizing(null);
    },
    [dragging]
  );

  useEffect(() => {
    if (dragging || resizing) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
    }
  }, [dragging, resizing, onMouseMove, onMouseUp]);

  const onPaletteDragStart = (e, cat) => {
    const rt = CAT_MAP[cat];
    setDragging({ fromPalette: true, cat, offX: rt.w / 2, offY: rt.h / 2 });
  };

  // ── IMDF Export ──────────────────────────────────────────────────
  const exportBldg = (b) => {
    const lat = parseFloat(b.lat) || 45.3476;
    const lng = parseFloat(b.lng) || -75.7629;
    const allUnits = [];
    b.levels.forEach((lv, lvi) => {
      lv.items.forEach((it) => {
        const tl = pxToGeo(it.x, it.y, lat, lng);
        const tr = pxToGeo(it.x + it.w, it.y, lat, lng);
        const br = pxToGeo(it.x + it.w, it.y + it.h, lat, lng);
        const bl = pxToGeo(it.x, it.y + it.h, lat, lng);
        allUnits.push({
          id: it.id,
          cat: it.cat,
          name: it.name,
          levelIdx: lvi,
          coords: [[tl, tr, br, bl, tl]],
        });
      });
    });

    const bGJ = {
      type: "FeatureCollection",
      features: [
        {
          id: b.id,
          type: "Feature",
          feature_type: "building",
          geometry: null,
          properties: {
            name: { en: b.name || "Building" },
            alt_name: null,
            category: b.category,
            restriction: null,
            display_point: { type: "Point", coordinates: [lng, lat] },
            address_id: null,
          },
        },
      ],
    };

    let fp;
    if (allUnits.length > 0) {
      let mnLo = Infinity, mxLo = -Infinity, mnLa = Infinity, mxLa = -Infinity;
      allUnits
        .flatMap((u) => u.coords[0])
        .forEach(([lo, la]) => {
          mnLo = Math.min(mnLo, lo);
          mxLo = Math.max(mxLo, lo);
          mnLa = Math.min(mnLa, la);
          mxLa = Math.max(mxLa, la);
        });
      const p = 0.00002;
      fp = [[[mnLo - p, mnLa - p], [mxLo + p, mnLa - p], [mxLo + p, mxLa + p], [mnLo - p, mxLa + p], [mnLo - p, mnLa - p]]];
    } else {
      const d = 0.0003;
      fp = [[[lng - d, lat - d], [lng + d, lat - d], [lng + d, lat + d], [lng - d, lat + d], [lng - d, lat - d]]];
    }

    const fpGJ = {
      type: "FeatureCollection",
      features: [
        {
          id: uid(),
          type: "Feature",
          feature_type: "footprint",
          geometry: { type: "Polygon", coordinates: fp },
          properties: { category: "ground", name: null, building_ids: [b.id] },
        },
      ],
    };
    const lvGJ = {
      type: "FeatureCollection",
      features: b.levels.map((lv, i) => {
        const lu = allUnits.filter((u) => u.levelIdx === i);
        let lp = fp;
        if (lu.length > 0) {
          let a = Infinity, c = -Infinity, d = Infinity, e2 = -Infinity;
          lu.flatMap((u) => u.coords[0]).forEach(([lo, la]) => {
            a = Math.min(a, lo);
            c = Math.max(c, lo);
            d = Math.min(d, la);
            e2 = Math.max(e2, la);
          });
          const p = 0.00001;
          lp = [[[a - p, d - p], [c + p, d - p], [c + p, e2 + p], [a - p, e2 + p], [a - p, d - p]]];
        }
        return {
          id: lv.id,
          type: "Feature",
          feature_type: "level",
          geometry: { type: "Polygon", coordinates: lp },
          properties: {
            category: "unspecified",
            restriction: null,
            outdoor: false,
            ordinal: lv.ordinal,
            name: { en: lv.name },
            short_name: { en: lv.name },
            display_point: { type: "Point", coordinates: [lng, lat] },
            address_id: null,
            building_ids: [b.id],
          },
        };
      }),
    };
    const uGJ = {
      type: "FeatureCollection",
      features: allUnits.map((u) => ({
        id: u.id,
        type: "Feature",
        feature_type: "unit",
        geometry: { type: "Polygon", coordinates: u.coords },
        properties: {
          name: u.name ? { en: u.name } : null,
          alt_name: null,
          category: u.cat,
          restriction: null,
          level_id: b.levels[u.levelIdx]?.id,
          building_ids: [b.id],
          address_id: null,
        },
      })),
    };
    const fxGJ = { type: "FeatureCollection", features: [] };

    const files = [
      { name: "building.geojson", content: JSON.stringify(bGJ, null, 2) },
      { name: "footprint.geojson", content: JSON.stringify(fpGJ, null, 2) },
      { name: "level.geojson", content: JSON.stringify(lvGJ, null, 2) },
      { name: "unit.geojson", content: JSON.stringify(uGJ, null, 2) },
      { name: "fixture.geojson", content: JSON.stringify(fxGJ, null, 2) },
    ];

    // In standalone mode: download ZIP directly
    // In artifact mode: use sendPrompt fallback
    try {
      const zipData = buildZip(files);
      const blob = new Blob([zipData], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(b.name || "building").replace(/\s+/g, "_")}_IMDF.zip`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2000);
      setExportStatus(`✓ Downloaded ${a.download}`);
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      // Fallback for sandboxed environments
      if (typeof sendPrompt === "function") {
        const payload = JSON.stringify({
          buildingName: b.name || "building",
          files: files.map((f) => ({ name: f.name, content: f.content })),
        });
        sendPrompt(
          `Please create an IMDF ZIP file from this data:\n\`\`\`json\n${payload}\n\`\`\``
        );
      } else {
        // Final fallback: open as JSON
        const combined = {};
        files.forEach((f) => (combined[f.name] = JSON.parse(f.content)));
        const blob = new Blob([JSON.stringify(combined, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    }
  };

  const totalItems = buildings.reduce(
    (s, b) => s + b.levels.reduce((s2, l) => s2 + l.items.length, 0),
    0
  );

  // ═══════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif",
        background: "#0c0c14",
        color: "#e2e8f0",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: "linear-gradient(90deg,#0f172a,#1a1036)",
          borderBottom: "1px solid #1e293b",
          padding: "8px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "linear-gradient(135deg,#6366f1,#3b82f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 800,
            color: "#fff",
          }}
        >
          ⬡
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.03em" }}>
          IMDF Floor Plan Builder
        </span>
        <div style={{ flex: 1 }} />
        {exportStatus && (
          <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>
            {exportStatus}
          </span>
        )}
        <div style={{ display: "flex", gap: 2 }}>
          {["Setup", "Floor Editor", "Export"].map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              style={{
                padding: "5px 14px",
                borderRadius: 6,
                border: "none",
                fontSize: 11,
                fontWeight: step === i ? 700 : 500,
                fontFamily: "inherit",
                background: step === i ? "rgba(99,102,241,0.25)" : "transparent",
                color: step === i ? "#a5b4fc" : "#64748b",
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* STEP 0: SETUP */}
      {step === 0 && (
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 28,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div style={{ maxWidth: 620, width: "100%" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>
              Setup Buildings & Floors
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748b" }}>
              Configure your buildings, then switch to the Floor Editor to
              drag-and-drop rooms.
            </p>

            {buildings.map((b, bIdx) => (
              <div
                key={b.id}
                style={{
                  background: "#12121e",
                  border:
                    bi === bIdx
                      ? "1px solid rgba(99,102,241,0.4)"
                      : "1px solid #1e293b",
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: bi === bIdx ? 16 : 0,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `linear-gradient(135deg,${bi === bIdx ? "#6366f1" : "#334155"},${bi === bIdx ? "#3b82f6" : "#475569"})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {bIdx + 1}
                  </div>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>
                    {b.name || "Untitled Building"}
                  </span>
                  <button
                    onClick={() => {
                      setBi(bIdx);
                      setLi(0);
                      setSelected(null);
                    }}
                    style={{
                      ...chip,
                      background:
                        bi === bIdx ? "rgba(99,102,241,0.2)" : "transparent",
                      color: bi === bIdx ? "#a5b4fc" : "#94a3b8",
                      border:
                        bi === bIdx ? "1px solid #6366f1" : "1px solid #334155",
                    }}
                  >
                    {bi === bIdx ? "✓ Active" : "Select"}
                  </button>
                  {buildings.length > 1 && (
                    <button
                      onClick={() => {
                        setBuildings((p) => p.filter((_, j) => j !== bIdx));
                        if (bi >= bIdx && bi > 0) setBi(bi - 1);
                      }}
                      style={{
                        ...chip,
                        border: "1px solid #7f1d1d",
                        color: "#f87171",
                        background: "rgba(239,68,68,0.08)",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {bi === bIdx && (
                  <>
                    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                      <div style={{ flex: 2 }}>
                        <label style={lbl}>Name</label>
                        <input
                          style={inp}
                          value={b.name}
                          onChange={(e) =>
                            updateBldg(bIdx, { name: e.target.value })
                          }
                          placeholder="Ottawa HQ"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={lbl}>Category</label>
                        <select
                          style={inp}
                          value={b.category}
                          onChange={(e) =>
                            updateBldg(bIdx, { category: e.target.value })
                          }
                        >
                          <option value="office">Office</option>
                          <option value="retail">Retail</option>
                          <option value="hospital">Hospital</option>
                          <option value="unspecified">Other</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                      <div style={{ flex: 1 }}>
                        <label style={lbl}>Latitude</label>
                        <input
                          style={inp}
                          value={b.lat}
                          onChange={(e) =>
                            updateBldg(bIdx, { lat: e.target.value })
                          }
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={lbl}>Longitude</label>
                        <input
                          style={inp}
                          value={b.lng}
                          onChange={(e) =>
                            updateBldg(bIdx, { lng: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <label style={{ ...lbl, marginBottom: 8 }}>Floors</label>
                    {b.levels.map((lv, lIdx) => (
                      <div
                        key={lv.id}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <input
                          style={{
                            ...inp,
                            flex: 1,
                            marginBottom: 0,
                            padding: "6px 10px",
                            fontSize: 13,
                          }}
                          value={lv.name}
                          placeholder="Floor name"
                          onChange={(e) => {
                            const nl = [...b.levels];
                            nl[lIdx] = { ...nl[lIdx], name: e.target.value };
                            updateBldg(bIdx, { levels: nl });
                          }}
                        />
                        <input
                          style={{
                            ...inp,
                            width: 70,
                            marginBottom: 0,
                            padding: "6px 10px",
                            fontSize: 13,
                          }}
                          type="number"
                          value={lv.ordinal}
                          title="Ordinal"
                          onChange={(e) => {
                            const nl = [...b.levels];
                            nl[lIdx] = {
                              ...nl[lIdx],
                              ordinal: parseInt(e.target.value) || 0,
                            };
                            updateBldg(bIdx, { levels: nl });
                          }}
                        />
                        <span style={{ fontSize: 10, color: "#475569" }}>
                          {lv.items.length} items
                        </span>
                        {b.levels.length > 1 && (
                          <button
                            onClick={() => {
                              const nl = b.levels.filter((_, j) => j !== lIdx);
                              updateBldg(bIdx, { levels: nl });
                              if (li >= lIdx && li > 0) setLi(li - 1);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#f87171",
                              cursor: "pointer",
                              fontSize: 14,
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const nl = [
                          ...b.levels,
                          {
                            id: uid(),
                            name: `${b.levels.length + 1}`,
                            ordinal: b.levels.length,
                            items: [],
                          },
                        ];
                        updateBldg(bIdx, { levels: nl });
                      }}
                      style={{
                        ...inp,
                        marginTop: 6,
                        marginBottom: 0,
                        background: "rgba(99,102,241,0.06)",
                        border: "1px dashed #334155",
                        color: "#818cf8",
                        cursor: "pointer",
                        textAlign: "center",
                        fontWeight: 600,
                        padding: "8px",
                        fontSize: 12,
                      }}
                    >
                      + Add Floor
                    </button>
                  </>
                )}

                {bi !== bIdx && (
                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      fontSize: 11,
                      color: "#64748b",
                      marginTop: 6,
                    }}
                  >
                    <span>📍 {b.lat}, {b.lng}</span>
                    <span>📐 {b.levels.length} floor{b.levels.length !== 1 ? "s" : ""}</span>
                    <span>
                      🚪 {b.levels.reduce((s, l) => s + l.items.length, 0)} rooms
                    </span>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => {
                setBuildings((p) => [...p, mkBldg()]);
                setBi(buildings.length);
                setLi(0);
              }}
              style={{
                ...inp,
                background: "rgba(99,102,241,0.06)",
                border: "1px dashed #334155",
                color: "#818cf8",
                cursor: "pointer",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              + Add Another Building
            </button>
            <button style={pBtn} onClick={() => setStep(1)}>
              Open Floor Editor →
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: FLOOR EDITOR */}
      {step === 1 && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* LEFT: Palette */}
          <div
            style={{
              width: 190,
              background: "#0e0e1a",
              borderRight: "1px solid #1e293b",
              padding: "12px 10px",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              overflow: "auto",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#64748b",
                fontWeight: 700,
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              DRAG ONTO FLOOR
            </div>
            {ROOM_TYPES.map((rt) => (
              <div
                key={rt.cat}
                onMouseDown={(e) => onPaletteDragStart(e, rt.cat)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 10px",
                  marginBottom: 4,
                  borderRadius: 10,
                  border: "1px solid #1e293b",
                  background: "#12121e",
                  cursor: "grab",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = rt.color;
                  e.currentTarget.style.background = rt.color + "15";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1e293b";
                  e.currentTarget.style.background = "#12121e";
                }}
              >
                <span style={{ fontSize: 18 }}>{rt.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>
                  {rt.label}
                </span>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: rt.color,
                  }}
                />
              </div>
            ))}
            <div
              style={{
                marginTop: "auto",
                paddingTop: 12,
                borderTop: "1px solid #1e293b",
              }}
            >
              <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.5 }}>
                <strong style={{ color: "#94a3b8" }}>Drag</strong> items to floor
                <br />
                <strong style={{ color: "#94a3b8" }}>Click</strong> to select
                <br />
                <strong style={{ color: "#94a3b8" }}>Drag handles</strong> to resize
                <br />
                <strong style={{ color: "#f87171" }}>Delete</strong> key to remove
              </div>
            </div>
          </div>

          {/* CENTER: Canvas */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "8px 16px",
                background: "#0e0e1a",
                borderBottom: "1px solid #1e293b",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              {buildings.length > 1 &&
                buildings.map((b, bIdx) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setBi(bIdx);
                      setLi(0);
                      setSelected(null);
                    }}
                    style={{
                      ...chip,
                      background:
                        bi === bIdx ? "rgba(99,102,241,0.2)" : "transparent",
                      color: bi === bIdx ? "#a5b4fc" : "#64748b",
                      border:
                        bi === bIdx
                          ? "1px solid #6366f1"
                          : "1px solid #1e293b",
                    }}
                  >
                    {b.name || `Bldg ${bIdx + 1}`}
                  </button>
                ))}
              {buildings.length > 1 && (
                <div style={{ width: 1, height: 20, background: "#1e293b" }} />
              )}
              {levels.map((lv, lIdx) => (
                <button
                  key={lv.id}
                  onClick={() => {
                    setLi(lIdx);
                    setSelected(null);
                  }}
                  style={{
                    ...chip,
                    background:
                      li === lIdx ? "rgba(99,102,241,0.2)" : "transparent",
                    color: li === lIdx ? "#a5b4fc" : "#64748b",
                    border:
                      li === lIdx ? "1px solid #6366f1" : "1px solid #1e293b",
                  }}
                >
                  Floor {lv.name}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: "#475569" }}>
                {items.length} items
              </span>
            </div>

            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#080810",
                overflow: "auto",
                padding: 20,
              }}
            >
              <div
                ref={canvasRef}
                onMouseDown={onCanvasMouseDown}
                style={{
                  width: CANVAS_W,
                  height: CANVAS_H,
                  background: "#10101c",
                  borderRadius: 12,
                  border: "1px solid #1e293b",
                  position: "relative",
                  boxShadow: "0 0 60px rgba(0,0,0,0.5)",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {/* Grid */}
                <svg
                  width={CANVAS_W}
                  height={CANVAS_H}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                    opacity: 0.15,
                  }}
                >
                  {Array.from({ length: Math.floor(CANVAS_W / 40) + 1 }).map(
                    (_, i) => (
                      <line
                        key={`v${i}`}
                        x1={i * 40}
                        y1={0}
                        x2={i * 40}
                        y2={CANVAS_H}
                        stroke="#334155"
                        strokeWidth={0.5}
                      />
                    )
                  )}
                  {Array.from({ length: Math.floor(CANVAS_H / 40) + 1 }).map(
                    (_, i) => (
                      <line
                        key={`h${i}`}
                        x1={0}
                        y1={i * 40}
                        x2={CANVAS_W}
                        y2={i * 40}
                        stroke="#334155"
                        strokeWidth={0.5}
                      />
                    )
                  )}
                </svg>

                {items.length === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <div style={{ textAlign: "center", color: "#334155" }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>📐</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        Drag rooms from the left panel
                      </div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Drop them here to build your floor plan
                      </div>
                    </div>
                  </div>
                )}

                {items.map((it) => {
                  const rt = CAT_MAP[it.cat] || CAT_MAP.unspecified;
                  const isSel = selected === it.id;
                  return (
                    <div
                      key={it.id}
                      onMouseDown={(e) => onItemMouseDown(e, it)}
                      style={{
                        position: "absolute",
                        left: it.x,
                        top: it.y,
                        width: it.w,
                        height: it.h,
                        background: rt.color + "25",
                        border: isSel
                          ? `2px solid ${rt.color}`
                          : `1px solid ${rt.color}60`,
                        borderRadius: 6,
                        cursor: "move",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: isSel
                          ? `0 0 20px ${rt.color}30`
                          : "none",
                        zIndex: isSel ? 10 : 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize:
                            Math.min(it.w, it.h) > 40 ? 18 : 12,
                          lineHeight: 1,
                        }}
                      >
                        {rt.icon}
                      </span>
                      {it.w > 50 && it.h > 35 && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#e2e8f0",
                            marginTop: 2,
                            maxWidth: it.w - 8,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textAlign: "center",
                          }}
                        >
                          {it.name || rt.label}
                        </span>
                      )}
                      {it.w > 60 && it.h > 50 && (
                        <span
                          style={{
                            fontSize: 8,
                            color: rt.color,
                            fontWeight: 600,
                            marginTop: 1,
                          }}
                        >
                          {Math.round(it.w * METERS_PER_PX)}×
                          {Math.round(it.h * METERS_PER_PX)}m
                        </span>
                      )}

                      {isSel &&
                        ["nw", "ne", "sw", "se", "n", "s", "e", "w"].map(
                          (h) => {
                            const s = {
                              position: "absolute",
                              width: 10,
                              height: 10,
                              background: rt.color,
                              borderRadius: 2,
                              zIndex: 20,
                            };
                            if (h.includes("n")) s.top = -5;
                            if (h.includes("s")) s.bottom = -5;
                            if (h.includes("w")) s.left = -5;
                            if (h.includes("e")) s.right = -5;
                            if (h === "n" || h === "s") {
                              s.left = "50%";
                              s.transform = "translateX(-50%)";
                              s.cursor = h + "-resize";
                              s.width = 14;
                              s.height = 6;
                            }
                            if (h === "e" || h === "w") {
                              s.top = "50%";
                              s.transform = "translateY(-50%)";
                              s.cursor = h + "-resize";
                              s.width = 6;
                              s.height = 14;
                            }
                            if (h === "nw") s.cursor = "nw-resize";
                            if (h === "ne") s.cursor = "ne-resize";
                            if (h === "sw") s.cursor = "sw-resize";
                            if (h === "se") s.cursor = "se-resize";
                            return (
                              <div
                                key={h}
                                style={s}
                                onMouseDown={(e) =>
                                  onResizeMouseDown(e, it, h)
                                }
                              />
                            );
                          }
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Properties */}
          <div
            style={{
              width: 240,
              background: "#0e0e1a",
              borderLeft: "1px solid #1e293b",
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
            }}
          >
            {selectedItem ? (
              <>
                <div
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
                  PROPERTIES
                </div>
                <label style={lbl}>Name</label>
                <input
                  style={{ ...inp, fontSize: 13, padding: "7px 10px" }}
                  value={selectedItem.name}
                  placeholder={CAT_MAP[selectedItem.cat]?.label}
                  onChange={(e) =>
                    updateItem(selectedItem.id, { name: e.target.value })
                  }
                />
                <label style={lbl}>Type</label>
                <select
                  style={{ ...inp, fontSize: 13, padding: "7px 10px" }}
                  value={selectedItem.cat}
                  onChange={(e) =>
                    updateItem(selectedItem.id, { cat: e.target.value })
                  }
                >
                  {ROOM_TYPES.map((rt) => (
                    <option key={rt.cat} value={rt.cat}>
                      {rt.icon} {rt.label}
                    </option>
                  ))}
                </select>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={lbl}>W (px)</label>
                    <input
                      style={{ ...inp, fontSize: 12, padding: "6px 8px" }}
                      type="number"
                      value={Math.round(selectedItem.w)}
                      onChange={(e) =>
                        updateItem(selectedItem.id, {
                          w: Math.max(20, parseInt(e.target.value) || 20),
                        })
                      }
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={lbl}>H (px)</label>
                    <input
                      style={{ ...inp, fontSize: 12, padding: "6px 8px" }}
                      type="number"
                      value={Math.round(selectedItem.h)}
                      onChange={(e) =>
                        updateItem(selectedItem.id, {
                          h: Math.max(20, parseInt(e.target.value) || 20),
                        })
                      }
                    />
                  </div>
                </div>
                <div
                  style={{ fontSize: 10, color: "#475569", marginBottom: 12 }}
                >
                  ≈ {(selectedItem.w * METERS_PER_PX).toFixed(1)} ×{" "}
                  {(selectedItem.h * METERS_PER_PX).toFixed(1)} meters
                </div>
                <div style={{ marginTop: "auto" }} />
                <button
                  onClick={() => deleteItem(selectedItem.id)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: 8,
                    border: "1px solid #7f1d1d",
                    background: "rgba(239,68,68,0.08)",
                    color: "#f87171",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  🗑 Delete Room
                </button>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    color: "#334155",
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>👈</div>
                  Click a room on the
                  <br />
                  canvas to edit it
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: EXPORT */}
      {step === 2 && (
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 28,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div style={{ maxWidth: 560, width: "100%" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>
              Export IMDF
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748b" }}>
              Download one ZIP per building for Microsoft Places import.
            </p>
            {buildings.map((b, bIdx) => {
              const cnt = b.levels.reduce(
                (s, l) => s + l.items.length,
                0
              );
              return (
                <div
                  key={b.id}
                  style={{
                    background: "#12121e",
                    border: "1px solid #1e293b",
                    borderRadius: 12,
                    padding: 18,
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                      {b.name || `Building ${bIdx + 1}`}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#64748b",
                        marginTop: 2,
                      }}
                    >
                      {b.levels.length} floor
                      {b.levels.length !== 1 ? "s" : ""} · {cnt} room
                      {cnt !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => exportBldg(b)}
                    style={{
                      padding: "9px 20px",
                      borderRadius: 8,
                      border: "none",
                      background:
                        cnt > 0
                          ? "linear-gradient(135deg,#6366f1,#3b82f6)"
                          : "#1e293b",
                      color: cnt > 0 ? "#fff" : "#475569",
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      cursor: cnt > 0 ? "pointer" : "default",
                      opacity: cnt > 0 ? 1 : 0.5,
                    }}
                  >
                    ↓ Download ZIP
                  </button>
                </div>
              );
            })}
            {totalItems > 0 && buildings.length > 1 && (
              <button
                style={pBtn}
                onClick={() =>
                  buildings.forEach((b, i) => {
                    const c = b.levels.reduce(
                      (s, l) => s + l.items.length,
                      0
                    );
                    if (c > 0) setTimeout(() => exportBldg(b), i * 300);
                  })
                }
              >
                ↓ Export All ({totalItems} rooms)
              </button>
            )}
            <button
              style={{ ...sBtn, marginTop: 12, width: "100%" }}
              onClick={() => setStep(1)}
            >
              ← Back to Editor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#94a3b8",
  marginBottom: 5,
  letterSpacing: "0.02em",
};
const inp = {
  display: "block",
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #1e293b",
  background: "#181826",
  color: "#e2e8f0",
  fontSize: 14,
  fontFamily: "inherit",
  marginBottom: 14,
  outline: "none",
  boxSizing: "border-box",
};
const pBtn = {
  display: "block",
  width: "100%",
  padding: "12px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg,#6366f1,#3b82f6)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
  marginTop: 14,
};
const sBtn = {
  display: "block",
  padding: "12px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "transparent",
  color: "#a5b4fc",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
};
const chip = {
  padding: "4px 12px",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  background: "transparent",
};
