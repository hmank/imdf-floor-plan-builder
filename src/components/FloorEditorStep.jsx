import { useRef } from "react";
import { CANVAS_H, CANVAS_W, GRID_SIZE, METERS_PER_PX } from "../constants/editor";
import { chip, inp, lbl } from "../styles/ui";

function HistoryPill({ historyActions }) {
  const lastAction = historyActions[historyActions.length - 1];
  if (!lastAction) {
    return <span style={{ fontSize: 11, color: "#475569" }}>No edits yet</span>;
  }
  return (
    <span style={{ fontSize: 11, color: "#94a3b8" }}>
      Last: <strong style={{ color: "#cbd5e1" }}>{lastAction.label}</strong>
    </span>
  );
}

export default function FloorEditorStep({
  buildings,
  bi,
  li,
  levels,
  items,
  selected,
  selectedItem,
  roomTypes,
  catMap,
  canvasRef,
  alignmentGuides,
  isPaletteDragging,
  snapEnabled,
  canUndo,
  canRedo,
  historyActions,
  onUndo,
  onRedo,
  onToggleSnap,
  onSelectBuilding,
  onSelectLevel,
  onPaletteDragStart,
  onCanvasMouseDown,
  onItemMouseDown,
  onResizeMouseDown,
  onDeleteSelected,
  onUpdateItem,
  onDeleteItem,
  traceOverlay,
  traceStatus,
  onAutoTraceImage,
  onApplyTraceSuggestions,
  onClearTraceOverlay,
  onGoToExport,
}) {
  const traceInputRef = useRef(null);
  const traceStatusColor =
    traceStatus?.type === "error"
      ? "#fca5a5"
      : traceStatus?.type === "progress"
        ? "#fbbf24"
        : traceStatus?.type === "success"
          ? "#4ade80"
          : "#94a3b8";

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div
        style={{
          width: 210,
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
        {roomTypes.map((roomType) => (
          <div
            key={roomType.cat}
            onMouseDown={(e) => onPaletteDragStart(e, roomType.cat)}
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
              e.currentTarget.style.borderColor = roomType.color;
              e.currentTarget.style.background = `${roomType.color}15`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#1e293b";
              e.currentTarget.style.background = "#12121e";
            }}
          >
            <span style={{ fontSize: 18 }}>{roomType.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{roomType.label}</span>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: roomType.color,
              }}
            />
          </div>
        ))}
        <div
          style={{
            marginTop: 10,
            border: "1px solid #334155",
            borderRadius: 10,
            background: "linear-gradient(180deg,rgba(15,23,42,0.65),rgba(12,12,20,0.5))",
            padding: 10,
          }}
        >
          <input
            ref={traceInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/bmp"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              onAutoTraceImage(file);
              e.target.value = "";
            }}
          />
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.08em" }}>
            AUTO-TRACE FLOOR PLAN
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
            Upload a floor-plan image to trace wall outlines and generate editable room suggestions.
          </div>
          <button
            onClick={() => traceInputRef.current?.click()}
            style={{
              ...chip,
              width: "100%",
              marginTop: 8,
              border: "1px solid #1d4ed8",
              color: "#bfdbfe",
              background: "rgba(37,99,235,0.18)",
              padding: "7px 10px",
            }}
            title="Upload floor-plan image and auto-trace walls"
          >
            🪄 Auto-Trace from Image
          </button>
          {traceOverlay && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8", lineHeight: 1.45 }}>
              <div>Source: {traceOverlay.sourceName}</div>
              <div>
                {traceOverlay.walls.length} walls ·{" "}
                {traceOverlay.applied
                  ? `${traceOverlay.appliedRoomCount || 0} suggestions applied`
                  : `${traceOverlay.rooms.length} room suggestions`}
                {traceOverlay.relaxedModeApplied
                  ? ` · ${traceOverlay.profile || "relaxed"} sensitivity applied`
                  : ""}
              </div>
              {traceOverlay.applied && (
                <div style={{ marginTop: 6, color: "#86efac" }}>
                  Blueprint mode: outer and interior walls are now shown without suggestion overlays.
                </div>
              )}
              {!traceOverlay.applied && traceOverlay.rooms.length === 0 && (
                <div style={{ marginTop: 6, color: "#fbbf24" }}>
                  No enclosed rooms detected yet. Try cropping to the floor map area and re-run auto-trace.
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button
                  onClick={onApplyTraceSuggestions}
                  disabled={traceOverlay.rooms.length === 0}
                  style={{
                    ...chip,
                    flex: 1,
                    border: "1px solid #166534",
                    color: traceOverlay.rooms.length > 0 ? "#86efac" : "#475569",
                    background: traceOverlay.rooms.length > 0 ? "rgba(34,197,94,0.15)" : "transparent",
                    cursor: traceOverlay.rooms.length > 0 ? "pointer" : "not-allowed",
                    padding: "6px 8px",
                    textAlign: "center",
                  }}
                >
                  + Add Suggested Rooms
                </button>
                <button
                  onClick={onClearTraceOverlay}
                  style={{
                    ...chip,
                    border: "1px solid #7f1d1d",
                    color: "#fca5a5",
                    background: "rgba(127,29,29,0.2)",
                    padding: "6px 8px",
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          {traceStatus && (
            <div style={{ marginTop: 8, fontSize: 11, color: traceStatusColor, lineHeight: 1.4 }}>
              {traceStatus.text}
            </div>
          )}
        </div>
        <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid #1e293b" }}>
          <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.6 }}>
            <div>
              <strong style={{ color: "#94a3b8" }}>Undo/Redo:</strong> Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z
            </div>
            <div>
              <strong style={{ color: "#94a3b8" }}>Copy/Paste:</strong> Ctrl/Cmd+C, Ctrl/Cmd+V
            </div>
            <div>
              <strong style={{ color: "#94a3b8" }}>Snap:</strong> press G to toggle
            </div>
            <div>
              <strong style={{ color: "#f87171" }}>Delete:</strong> Delete/Backspace
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
            buildings.map((building, buildingIndex) => (
              <button
                key={building.id}
                onClick={() => onSelectBuilding(buildingIndex)}
                style={{
                  ...chip,
                  background: bi === buildingIndex ? "rgba(99,102,241,0.2)" : "transparent",
                  color: bi === buildingIndex ? "#a5b4fc" : "#64748b",
                  border: bi === buildingIndex ? "1px solid #6366f1" : "1px solid #1e293b",
                }}
              >
                {building.name || `Bldg ${buildingIndex + 1}`}
              </button>
            ))}
          {buildings.length > 1 && <div style={{ width: 1, height: 20, background: "#1e293b" }} />}
          {levels.map((level, levelIndex) => (
            <button
              key={level.id}
              onClick={() => onSelectLevel(levelIndex)}
              style={{
                ...chip,
                background: li === levelIndex ? "rgba(99,102,241,0.2)" : "transparent",
                color: li === levelIndex ? "#a5b4fc" : "#64748b",
                border: li === levelIndex ? "1px solid #6366f1" : "1px solid #1e293b",
              }}
            >
              Floor {level.name}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={onUndo}
            disabled={!canUndo}
            style={{
              ...chip,
              border: "1px solid #334155",
              color: canUndo ? "#cbd5e1" : "#475569",
              cursor: canUndo ? "pointer" : "not-allowed",
            }}
            title="Undo (Ctrl/Cmd+Z)"
          >
            ↶ Undo
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            style={{
              ...chip,
              border: "1px solid #334155",
              color: canRedo ? "#cbd5e1" : "#475569",
              cursor: canRedo ? "pointer" : "not-allowed",
            }}
            title="Redo (Ctrl/Cmd+Shift+Z)"
          >
            ↷ Redo
          </button>
          <button
            onClick={onToggleSnap}
            style={{
              ...chip,
              border: snapEnabled ? "1px solid #16a34a" : "1px solid #334155",
              color: snapEnabled ? "#4ade80" : "#94a3b8",
              background: snapEnabled ? "rgba(34,197,94,0.12)" : "transparent",
            }}
            title="Toggle grid snap (G)"
          >
            {snapEnabled ? "🧲 Snap ON" : "Snap OFF"}
          </button>
          <HistoryPill historyActions={historyActions} />
          <button
            onClick={onGoToExport}
            style={{
              ...chip,
              border: "1px solid #1d4ed8",
              color: "#bfdbfe",
              background: "rgba(37,99,235,0.18)",
            }}
            title="Go to Export tab and download IMDF"
          >
            Ready? Open Export Tab →
          </button>
          <span style={{ fontSize: 11, color: "#475569" }}>{items.length} items</span>
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
              border: isPaletteDragging ? "1px solid #6366f1" : "1px solid #1e293b",
              position: "relative",
              boxShadow: isPaletteDragging ? "0 0 20px rgba(99,102,241,0.4)" : "0 0 60px rgba(0,0,0,0.5)",
              overflow: "hidden",
              flexShrink: 0,
              transition: "border-color 120ms ease, box-shadow 120ms ease",
            }}
          >
            <svg
              width={CANVAS_W}
              height={CANVAS_H}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                pointerEvents: "none",
                opacity: 0.18,
              }}
            >
              {Array.from({ length: Math.floor(CANVAS_W / GRID_SIZE) + 1 }).map((_, i) => (
                <line
                  key={`v${i}`}
                  x1={i * GRID_SIZE}
                  y1={0}
                  x2={i * GRID_SIZE}
                  y2={CANVAS_H}
                  stroke="#334155"
                  strokeWidth={0.5}
                />
              ))}
              {Array.from({ length: Math.floor(CANVAS_H / GRID_SIZE) + 1 }).map((_, i) => (
                <line
                  key={`h${i}`}
                  x1={0}
                  y1={i * GRID_SIZE}
                  x2={CANVAS_W}
                  y2={i * GRID_SIZE}
                  stroke="#334155"
                  strokeWidth={0.5}
                />
              ))}
            </svg>

            {traceOverlay?.imagePreviewUrl && (
              <img
                src={traceOverlay.imagePreviewUrl}
                alt="Auto-trace floor plan source"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: CANVAS_W,
                  height: CANVAS_H,
                  objectFit: "contain",
                  background: "rgba(255,255,255,0.4)",
                  opacity: 0.16,
                  pointerEvents: "none",
                }}
              />
            )}

            {traceOverlay?.walls?.length > 0 && (
              <svg
                width={CANVAS_W}
                height={CANVAS_H}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  pointerEvents: "none",
                  opacity: 0.7,
                }}
              >
                {traceOverlay.walls.map((wall, index) => (
                  <line
                    key={`trace-wall-${index}`}
                    x1={wall.x1}
                    y1={wall.y1}
                    x2={wall.x2}
                    y2={wall.y2}
                    stroke={traceOverlay.applied ? "rgba(148,163,184,0.88)" : "#0ea5e9"}
                    strokeWidth={traceOverlay.applied ? 1.4 : 1}
                    strokeDasharray={traceOverlay.applied ? undefined : "4 3"}
                    strokeLinecap="round"
                  />
                ))}
              </svg>
            )}

            {!traceOverlay?.applied &&
              traceOverlay?.rooms?.map((room, index) => (
              <div
                key={`trace-room-${index}`}
                style={{
                  position: "absolute",
                  left: room.x,
                  top: room.y,
                  width: room.w,
                  height: room.h,
                  border: "1px dashed rgba(74,222,128,0.75)",
                  background: "rgba(74,222,128,0.08)",
                  borderRadius: 4,
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
              ))}

            {alignmentGuides.length > 0 && (
              <svg
                width={CANVAS_W}
                height={CANVAS_H}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  pointerEvents: "none",
                  zIndex: 15,
                }}
              >
                {alignmentGuides.map((guide, idx) =>
                  guide.orientation === "vertical" ? (
                    <line
                      key={`vg-${idx}`}
                      x1={guide.position}
                      y1={guide.start}
                      x2={guide.position}
                      y2={guide.end}
                      stroke="#38bdf8"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  ) : (
                    <line
                      key={`hg-${idx}`}
                      x1={guide.start}
                      y1={guide.position}
                      x2={guide.end}
                      y2={guide.position}
                      stroke="#38bdf8"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  )
                )}
              </svg>
            )}

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
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Drag rooms from the left panel</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Drop them here or use Auto-Trace from Image to bootstrap room placement
                  </div>
                </div>
              </div>
            )}

            {items.map((item) => {
              const roomType = catMap[item.cat] || catMap.unspecified;
              const isSelected = selected === item.id;
              return (
                <div
                  key={item.id}
                  onMouseDown={(e) => onItemMouseDown(e, item)}
                  style={{
                    position: "absolute",
                    left: item.x,
                    top: item.y,
                    width: item.w,
                    height: item.h,
                    background: `${roomType.color}25`,
                    border: isSelected ? `2px solid ${roomType.color}` : `1px solid ${roomType.color}60`,
                    borderRadius: 6,
                    cursor: "move",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isSelected ? `0 0 20px ${roomType.color}30` : "none",
                    zIndex: isSelected ? 10 : 6,
                  }}
                >
                  <span style={{ fontSize: Math.min(item.w, item.h) > 40 ? 18 : 12, lineHeight: 1 }}>
                    {roomType.icon}
                  </span>
                  {item.w > 50 && item.h > 35 && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#e2e8f0",
                        marginTop: 2,
                        maxWidth: item.w - 8,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        textAlign: "center",
                      }}
                    >
                      {item.name || roomType.label}
                    </span>
                  )}
                  {item.w > 60 && item.h > 50 && (
                    <span
                      style={{
                        fontSize: 8,
                        color: roomType.color,
                        fontWeight: 600,
                        marginTop: 1,
                      }}
                    >
                      {Math.round(item.w * METERS_PER_PX)}×{Math.round(item.h * METERS_PER_PX)}m
                    </span>
                  )}

                  {isSelected &&
                    ["nw", "ne", "sw", "se", "n", "s", "e", "w"].map((handle) => {
                      const style = {
                        position: "absolute",
                        width: 10,
                        height: 10,
                        background: roomType.color,
                        borderRadius: 2,
                        zIndex: 20,
                      };
                      if (handle.includes("n")) style.top = -5;
                      if (handle.includes("s")) style.bottom = -5;
                      if (handle.includes("w")) style.left = -5;
                      if (handle.includes("e")) style.right = -5;
                      if (handle === "n" || handle === "s") {
                        style.left = "50%";
                        style.transform = "translateX(-50%)";
                        style.cursor = `${handle}-resize`;
                        style.width = 14;
                        style.height = 6;
                      }
                      if (handle === "e" || handle === "w") {
                        style.top = "50%";
                        style.transform = "translateY(-50%)";
                        style.cursor = `${handle}-resize`;
                        style.width = 6;
                        style.height = 14;
                      }
                      if (handle === "nw") style.cursor = "nw-resize";
                      if (handle === "ne") style.cursor = "ne-resize";
                      if (handle === "sw") style.cursor = "sw-resize";
                      if (handle === "se") style.cursor = "se-resize";
                      return (
                        <div
                          key={handle}
                          style={style}
                          onMouseDown={(e) => onResizeMouseDown(e, item, handle)}
                        />
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          width: 260,
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
              placeholder={catMap[selectedItem.cat]?.label}
              onChange={(e) => onUpdateItem(selectedItem.id, { name: e.target.value })}
            />
            <label style={lbl}>Type</label>
            <select
              style={{ ...inp, fontSize: 13, padding: "7px 10px" }}
              value={selectedItem.cat}
              onChange={(e) => onUpdateItem(selectedItem.id, { cat: e.target.value })}
            >
              {roomTypes.map((roomType) => (
                <option key={roomType.cat} value={roomType.cat}>
                  {roomType.icon} {roomType.label}
                </option>
              ))}
            </select>
            <label style={lbl}>Accessibility</label>
            <select
              style={{ ...inp, fontSize: 13, padding: "7px 10px" }}
              value={selectedItem.accessibility || ""}
              onChange={(e) =>
                onUpdateItem(selectedItem.id, { accessibility: e.target.value || null })
              }
            >
              <option value="">Not set</option>
              <option value="yes">♿ Accessible</option>
              <option value="no">Not accessible</option>
            </select>
            <label style={lbl}>
              PlaceId <span style={{ fontWeight: 400, color: "#475569" }}>(optional)</span>
            </label>
            <input
              style={{
                ...inp,
                fontSize: 10,
                padding: "6px 10px",
                fontFamily: "'SF Mono','Fira Code',monospace",
              }}
              value={selectedItem.directoryId || ""}
              placeholder="Room PlaceId from MS Places"
              onChange={(e) => onUpdateItem(selectedItem.id, { directoryId: e.target.value })}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>X</label>
                <input
                  style={{ ...inp, fontSize: 12, padding: "6px 8px" }}
                  type="number"
                  value={Math.round(selectedItem.x)}
                  onChange={(e) =>
                    onUpdateItem(selectedItem.id, { x: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Y</label>
                <input
                  style={{ ...inp, fontSize: 12, padding: "6px 8px" }}
                  type="number"
                  value={Math.round(selectedItem.y)}
                  onChange={(e) =>
                    onUpdateItem(selectedItem.id, { y: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Width (m) [{Math.round(selectedItem.w)} px]</label>
                <input
                  style={{ ...inp, fontSize: 12, padding: "6px 8px" }}
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={(selectedItem.w * METERS_PER_PX).toFixed(1)}
                  onChange={(e) => {
                    const widthMeters = Number.parseFloat(e.target.value);
                    if (!Number.isFinite(widthMeters)) {
                      return;
                    }
                    onUpdateItem(selectedItem.id, {
                      w: Math.max(20, Math.round(widthMeters / METERS_PER_PX)),
                    });
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Length (m) [{Math.round(selectedItem.h)} px]</label>
                <input
                  style={{ ...inp, fontSize: 12, padding: "6px 8px" }}
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={(selectedItem.h * METERS_PER_PX).toFixed(1)}
                  onChange={(e) => {
                    const lengthMeters = Number.parseFloat(e.target.value);
                    if (!Number.isFinite(lengthMeters)) {
                      return;
                    }
                    onUpdateItem(selectedItem.id, {
                      h: Math.max(20, Math.round(lengthMeters / METERS_PER_PX)),
                    });
                  }}
                />
              </div>
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 12 }}>
              Enter dimensions in meters; pixel values are shown in brackets for placement preview.
            </div>
            <div style={{ marginTop: "auto" }} />
            <button
              onClick={() => onDeleteItem(selectedItem.id)}
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
                marginBottom: 8,
              }}
            >
              🗑 Delete Room
            </button>
            <button
              onClick={onDeleteSelected}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "transparent",
                color: "#94a3b8",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Clear Selection
            </button>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "#334155", fontSize: 12 }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>👈</div>
              Click a room on the
              <br />
              canvas to edit it
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
