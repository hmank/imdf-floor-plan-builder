export default function AppHeader({ step, setStep, exportStatus }) {
  return (
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
        <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>{exportStatus}</span>
      )}
      <div style={{ display: "flex", gap: 2 }}>
        {["Setup", "Floor Editor", "Export"].map((label, index) => (
          <button
            key={label}
            onClick={() => setStep(index)}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "none",
              fontSize: 11,
              fontWeight: step === index ? 700 : 500,
              fontFamily: "inherit",
              background: step === index ? "rgba(99,102,241,0.25)" : "transparent",
              color: step === index ? "#a5b4fc" : "#64748b",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
