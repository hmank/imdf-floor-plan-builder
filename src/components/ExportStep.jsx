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
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted)" }}>
          Download one ZIP per building for Microsoft Places import and publishing.
        </p>
        <div
          style={{
            border: "1px solid var(--border-strong)",
            borderRadius: 12,
            padding: 14,
            background: "var(--panel-background)",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-strong)", marginBottom: 8 }}>
            Export readiness
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55 }}>
            A building is export-ready when required setup fields are complete and at least one room exists.
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-strong)" }}>
            {exportReadyCount}/{buildings.length} buildings ready · {readyRoomCount} ready rooms
          </div>
          <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-muted)" }}>
            Total planned rooms across all buildings: {totalItems}
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
                background: "var(--card-background)",
                border: "1px solid var(--border)",
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
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {building.levels.length} floor{building.levels.length !== 1 ? "s" : ""} · {itemCount} room
                  {itemCount !== 1 ? "s" : ""}
                </div>
                {!canExport && (
                  <div style={{ fontSize: 11, color: "var(--error-text)", marginTop: 6 }}>
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
                  background: canExport ? "var(--primary-background)" : "var(--disabled-background)",
                  color: canExport ? "#fff" : "var(--text-subtle)",
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
              border: "1px solid var(--error-border)",
              borderRadius: 10,
              background: "rgba(127,29,29,0.2)",
              color: "var(--error-text)",
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
