import { chip, inp, lbl, pBtn } from "../styles/ui";

export default function SetupStep({
  buildings,
  activeBuildingIndex,
  onSelectBuilding,
  onDeleteBuilding,
  onAddBuilding,
  onUpdateBuilding,
  onAddLevel,
  onUpdateLevel,
  onDeleteLevel,
  onOpenEditor,
}) {
  return (
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
        <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Setup Buildings & Floors</h2>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748b" }}>
          Configure your buildings, then switch to the Floor Editor to drag-and-drop rooms.
        </p>

        {buildings.map((building, buildingIndex) => (
          <div
            key={building.id}
            style={{
              background: "#12121e",
              border:
                activeBuildingIndex === buildingIndex
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
                marginBottom: activeBuildingIndex === buildingIndex ? 16 : 0,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `linear-gradient(135deg,${
                    activeBuildingIndex === buildingIndex ? "#6366f1" : "#334155"
                  },${activeBuildingIndex === buildingIndex ? "#3b82f6" : "#475569"})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {buildingIndex + 1}
              </div>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>
                {building.name || "Untitled Building"}
              </span>
              <button
                onClick={() => onSelectBuilding(buildingIndex)}
                style={{
                  ...chip,
                  background:
                    activeBuildingIndex === buildingIndex
                      ? "rgba(99,102,241,0.2)"
                      : "transparent",
                  color: activeBuildingIndex === buildingIndex ? "#a5b4fc" : "#94a3b8",
                  border:
                    activeBuildingIndex === buildingIndex
                      ? "1px solid #6366f1"
                      : "1px solid #334155",
                }}
              >
                {activeBuildingIndex === buildingIndex ? "✓ Active" : "Select"}
              </button>
              {buildings.length > 1 && (
                <button
                  onClick={() => onDeleteBuilding(buildingIndex)}
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

            {activeBuildingIndex === buildingIndex ? (
              <>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 2 }}>
                    <label style={lbl}>Name</label>
                    <input
                      style={inp}
                      value={building.name}
                      onChange={(e) => onUpdateBuilding(buildingIndex, { name: e.target.value })}
                      placeholder="Ottawa HQ"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={lbl}>Category</label>
                    <select
                      style={inp}
                      value={building.category}
                      onChange={(e) => onUpdateBuilding(buildingIndex, { category: e.target.value })}
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
                      value={building.lat}
                      onChange={(e) => onUpdateBuilding(buildingIndex, { lat: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={lbl}>Longitude</label>
                    <input
                      style={inp}
                      value={building.lng}
                      onChange={(e) => onUpdateBuilding(buildingIndex, { lng: e.target.value })}
                    />
                  </div>
                </div>
                <label style={lbl}>
                  Building PlaceId <span style={{ fontWeight: 400, color: "#475569" }}>(optional)</span>
                </label>
                <input
                  style={{ ...inp, fontSize: 12, fontFamily: "'SF Mono','Fira Code',monospace" }}
                  value={building.directoryId || ""}
                  onChange={(e) => onUpdateBuilding(buildingIndex, { directoryId: e.target.value })}
                  placeholder="e.g. 1b9a176e-8f65-44bd-bf20-8aceca8f395a"
                />

                <label style={{ ...lbl, marginBottom: 8 }}>Floors</label>
                {building.levels.map((level, levelIndex) => (
                  <div
                    key={level.id}
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
                      value={level.name}
                      placeholder="Floor name"
                      onChange={(e) =>
                        onUpdateLevel(buildingIndex, levelIndex, { name: e.target.value })
                      }
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
                      value={level.ordinal}
                      title="Ordinal"
                      onChange={(e) =>
                        onUpdateLevel(buildingIndex, levelIndex, {
                          ordinal: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                    <span style={{ fontSize: 10, color: "#475569" }}>{level.items.length} items</span>
                    <input
                      style={{
                        ...inp,
                        width: 180,
                        marginBottom: 0,
                        padding: "6px 8px",
                        fontSize: 10,
                        fontFamily: "'SF Mono','Fira Code',monospace",
                      }}
                      value={level.directoryId || ""}
                      placeholder="Floor PlaceId (optional)"
                      onChange={(e) =>
                        onUpdateLevel(buildingIndex, levelIndex, { directoryId: e.target.value })
                      }
                    />
                    {building.levels.length > 1 && (
                      <button
                        onClick={() => onDeleteLevel(buildingIndex, levelIndex)}
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
                  onClick={() => onAddLevel(buildingIndex)}
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
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  fontSize: 11,
                  color: "#64748b",
                  marginTop: 6,
                }}
              >
                <span>📍 {building.lat}, {building.lng}</span>
                <span>
                  📐 {building.levels.length} floor{building.levels.length !== 1 ? "s" : ""}
                </span>
                <span>🚪 {building.levels.reduce((sum, level) => sum + level.items.length, 0)} rooms</span>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={onAddBuilding}
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
        <button style={pBtn} onClick={onOpenEditor}>
          Open Floor Editor →
        </button>
      </div>
    </div>
  );
}
