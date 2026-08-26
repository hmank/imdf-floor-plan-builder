import { pBtn, sBtn } from "../styles/ui";

export default function ExportStep({
  buildings,
  readinessByBuilding,
  exportReadyCount,
  totalItems,
  onExportBuilding,
  onBackToEditor,
}) {
  const readyBuildings = buildings.filter((_, idx) => readinessByBuilding[idx]?.exportReady);
  const readyRoomCount = readyBuildings.reduce(
    (sum, building) =>
      sum + building.levels.reduce((floorSum, level) => floorSum + level.items.length, 0),
    0
  );

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
      <div style={{ maxWidth: 560, width: "100%" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Export IMDF</h2>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748b" }}>
          Download one ZIP per building for Microsoft Places import and publishing.
        </p>
        <div
          style={{
            border: "1px solid #334155",
            borderRadius: 12,
            padding: 14,
            background: "linear-gradient(180deg,rgba(15,23,42,0.7),rgba(12,12,20,0.5))",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 8 }}>
            Export readiness
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.55 }}>
            A building is export-ready when required setup fields are complete and at least one room exists.
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#cbd5e1" }}>
            {exportReadyCount}/{buildings.length} buildings ready · {readyRoomCount} ready rooms
          </div>
        </div>
        {buildings.map((building, buildingIndex) => {
          const readiness = readinessByBuilding[buildingIndex] || {
            exportReady: false,
            exportMissing: ["required setup fields"],
          };
          const itemCount = building.levels.reduce((sum, level) => sum + level.items.length, 0);
          const canExport = readiness?.exportReady;
          return (
            <div
              key={building.id}
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
                  {building.name || `Building ${buildingIndex + 1}`}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {building.levels.length} floor{building.levels.length !== 1 ? "s" : ""} · {itemCount} room
                  {itemCount !== 1 ? "s" : ""}
                </div>
                {!canExport && (
                  <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 6 }}>
                    Missing: {readiness.exportMissing.join(", ")}
                  </div>
                )}
              </div>
              <button
                onClick={() => onExportBuilding(building)}
                disabled={!canExport}
                style={{
                  padding: "9px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: canExport ? "linear-gradient(135deg,#6366f1,#3b82f6)" : "#1e293b",
                  color: canExport ? "#fff" : "#475569",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: canExport ? "pointer" : "not-allowed",
                  opacity: canExport ? 1 : 0.5,
                }}
                title={canExport ? "Download IMDF ZIP" : `Missing: ${readiness.exportMissing.join(", ")}`}
              >
                ↓ Download ZIP
              </button>
            </div>
          );
        })}
        {readyBuildings.length > 0 && buildings.length > 1 && (
          <button
            style={pBtn}
            onClick={() =>
              readyBuildings.forEach((building, i) => {
                setTimeout(() => onExportBuilding(building), i * 300);
              })
            }
          >
            ↓ Export All Ready Buildings ({readyRoomCount} rooms)
          </button>
        )}
        {readyBuildings.length === 0 && (
          <div
            style={{
              border: "1px solid #7f1d1d",
              borderRadius: 10,
              background: "rgba(127,29,29,0.2)",
              color: "#fca5a5",
              padding: "10px 12px",
              fontSize: 12,
            }}
          >
            No buildings are ready to export yet. Go back and complete required setup fields, then add at
            least one room.
          </div>
        )}
        <button style={{ ...sBtn, marginTop: 12, width: "100%" }} onClick={onBackToEditor}>
          ← Back to Editor
        </button>
      </div>
    </div>
  );
}
