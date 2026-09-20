import { useRef } from "react";
import { chip, inp, lbl, pBtn } from "../styles/ui";

const requiredLabel = (
  <>
    <span style={{ color: "#fca5a5" }}>*</span> Required
  </>
);

function listMissing(missingItems) {
  if (missingItems.length === 0) {
    return "Ready";
  }
  return `Missing: ${missingItems.join(", ")}`;
}

export default function SetupStep({
  buildings,
  readinessByBuilding,
  activeBuildingReadiness,
  setupReadyCount,
  uploadStatus,
  uploadEnabled,
  onUploadConfiguration,
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
  const uploadInputRef = useRef(null);
  const invalidInput = {
    border: "1px solid #7f1d1d",
    background: "rgba(127,29,29,0.2)",
  };

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
      <div style={{ maxWidth: 760, width: "100%" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Setup Buildings & Floors</h2>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "#94a3b8" }}>
          Fill all required fields first so publishing/downloading your IMDF file is smooth.
        </p>

        <div
          style={{
            border: "1px solid #334155",
            background: "linear-gradient(180deg,rgba(15,23,42,0.8),rgba(12,12,20,0.6))",
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 10 }}>
            Publish checklist
          </div>
          <div style={{ display: "grid", gap: 8, fontSize: 12, color: "#94a3b8" }}>
            <div>1. Complete required building details (name + valid latitude/longitude).</div>
            <div>2. Ensure every floor has a name, then place rooms manually or with Auto-Trace from Image.</div>
            <div>3. Use Export step to download IMDF ZIP when building is marked ready.</div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "#cbd5e1" }}>
            {setupReadyCount}/{buildings.length} building profiles ready for editing
          </div>
          <div style={{ marginTop: 12 }}>
            <input
              ref={uploadInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                onUploadConfiguration(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={!uploadEnabled}
              style={{
                ...chip,
                border: uploadEnabled ? "1px solid #334155" : "1px solid #7f1d1d",
                color: uploadEnabled ? "#cbd5e1" : "#fca5a5",
                background: uploadEnabled ? "rgba(148,163,184,0.12)" : "rgba(127,29,29,0.2)",
                cursor: uploadEnabled ? "pointer" : "not-allowed",
                padding: "6px 10px",
              }}
              title={
                uploadEnabled
                  ? "Upload existing configuration JSON"
                  : "Upload is disabled on GitHub Pages"
              }
            >
              Upload Configuration (JSON)
            </button>
            <div style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>
              Upload works on local/self-hosted deployments and is disabled on GitHub Pages.
            </div>
            {uploadStatus && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: uploadStatus.type === "success" ? "#4ade80" : "#fca5a5",
                }}
              >
                {uploadStatus.text}
              </div>
            )}
          </div>
        </div>

        {buildings.map((building, buildingIndex) => {
          const readiness = readinessByBuilding[buildingIndex] || {
            setupReady: false,
            setupMissing: ["required setup fields"],
            missingFloorNameIndexes: [],
            hasName: false,
            hasValidLat: false,
            hasValidLng: false,
            roomCount: 0,
          };
          const isActive = activeBuildingIndex === buildingIndex;
          return (
            <div
              key={building.id}
              style={{
                background: "#12121e",
                border: isActive ? "1px solid rgba(99,102,241,0.4)" : "1px solid #1e293b",
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
                  marginBottom: isActive ? 16 : 0,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: `linear-gradient(135deg,${isActive ? "#6366f1" : "#334155"},${
                      isActive ? "#3b82f6" : "#475569"
                    })`,
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
                <span
                  style={{
                    ...chip,
                    border: readiness.setupReady ? "1px solid #166534" : "1px solid #7f1d1d",
                    color: readiness.setupReady ? "#4ade80" : "#fca5a5",
                    background: readiness.setupReady
                      ? "rgba(22,163,74,0.15)"
                      : "rgba(239,68,68,0.12)",
                    cursor: "default",
                  }}
                >
                  {readiness.setupReady ? "Ready" : "Needs Input"}
                </span>
                <button
                  onClick={() => onSelectBuilding(buildingIndex)}
                  style={{
                    ...chip,
                    background: isActive ? "rgba(99,102,241,0.2)" : "transparent",
                    color: isActive ? "#a5b4fc" : "#94a3b8",
                    border: isActive ? "1px solid #6366f1" : "1px solid #334155",
                  }}
                >
                  {isActive ? "✓ Active" : "Select"}
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

              {isActive ? (
                <>
                  <div
                    style={{
                      fontSize: 11,
                      marginBottom: 12,
                      color: readiness.setupReady ? "#4ade80" : "#fca5a5",
                    }}
                  >
                    {listMissing(readiness.setupMissing)}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 2 }}>
                      <label style={lbl}>
                        Building Name {requiredLabel}
                      </label>
                      <input
                        style={{ ...inp, ...(readiness.hasName ? null : invalidInput) }}
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
                  <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>
                        Latitude {requiredLabel}
                      </label>
                      <input
                        style={{ ...inp, ...(readiness.hasValidLat ? null : invalidInput) }}
                        value={building.lat}
                        onChange={(e) => onUpdateBuilding(buildingIndex, { lat: e.target.value })}
                        placeholder="45.3476"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>
                        Longitude {requiredLabel}
                      </label>
                      <input
                        style={{ ...inp, ...(readiness.hasValidLng ? null : invalidInput) }}
                        value={building.lng}
                        onChange={(e) => onUpdateBuilding(buildingIndex, { lng: e.target.value })}
                        placeholder="-75.7629"
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: 14, fontSize: 11, color: "#64748b" }}>
                    Tip: Right-click in Google Maps to copy exact latitude/longitude.
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

                  <label style={{ ...lbl, marginBottom: 8 }}>
                    Floors <span style={{ color: "#fca5a5" }}>*</span> Every floor needs a name
                  </label>
                  {building.levels.map((level, levelIndex) => {
                    const missingFloorName = readiness.missingFloorNameIndexes.includes(levelIndex);
                    return (
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
                            ...(missingFloorName ? invalidInput : null),
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
                    );
                  })}
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
                    flexWrap: "wrap",
                  }}
                >
                  <span>📍 {building.lat}, {building.lng}</span>
                  <span>
                    📐 {building.levels.length} floor{building.levels.length !== 1 ? "s" : ""}
                  </span>
                  <span>🚪 {readiness.roomCount} rooms</span>
                  {!readiness.setupReady && (
                    <span style={{ color: "#fca5a5" }}>{listMissing(readiness.setupMissing)}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

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
        <button
          style={{
            ...pBtn,
            opacity: activeBuildingReadiness.setupReady ? 1 : 0.55,
            cursor: activeBuildingReadiness.setupReady ? "pointer" : "not-allowed",
          }}
          onClick={onOpenEditor}
          disabled={!activeBuildingReadiness.setupReady}
          title={
            activeBuildingReadiness.setupReady
              ? "Open floor editor"
              : `Complete required fields: ${activeBuildingReadiness.setupMissing.join(", ")}`
          }
        >
          Open Floor Editor →
        </button>
        {!activeBuildingReadiness.setupReady && (
          <div style={{ marginTop: 8, fontSize: 11, color: "#fca5a5" }}>
            Complete required fields before continuing: {activeBuildingReadiness.setupMissing.join(", ")}.
          </div>
        )}
      </div>
    </div>
  );
}
