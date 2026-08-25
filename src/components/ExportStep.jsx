import { pBtn, sBtn } from "../styles/ui";

export default function ExportStep({ buildings, totalItems, onExportBuilding, onBackToEditor }) {
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
          Download one ZIP per building for Microsoft Places import.
        </p>
        {buildings.map((building, buildingIndex) => {
          const itemCount = building.levels.reduce((sum, level) => sum + level.items.length, 0);
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
              </div>
              <button
                onClick={() => onExportBuilding(building)}
                style={{
                  padding: "9px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: itemCount > 0 ? "linear-gradient(135deg,#6366f1,#3b82f6)" : "#1e293b",
                  color: itemCount > 0 ? "#fff" : "#475569",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: itemCount > 0 ? "pointer" : "default",
                  opacity: itemCount > 0 ? 1 : 0.5,
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
              buildings.forEach((building, i) => {
                const roomCount = building.levels.reduce((sum, level) => sum + level.items.length, 0);
                if (roomCount > 0) {
                  setTimeout(() => onExportBuilding(building), i * 300);
                }
              })
            }
          >
            ↓ Export All ({totalItems} rooms)
          </button>
        )}
        <button style={{ ...sBtn, marginTop: 12, width: "100%" }} onClick={onBackToEditor}>
          ← Back to Editor
        </button>
      </div>
    </div>
  );
}
