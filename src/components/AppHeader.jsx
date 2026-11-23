export default function AppHeader({ step, setStep, exportStatus, theme, onThemeChange }) {
  return (
    <div
      style={{
        background: "var(--header-background)",
        borderBottom: "1px solid var(--border)",
        padding: "8px 20px",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 14,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: "var(--primary-background)",
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
        <span style={{ fontSize: 12, color: "var(--success-status)", fontWeight: 600 }}>{exportStatus}</span>
      )}
      <label style={{ fontSize: 12, color: "var(--text-strong)", whiteSpace: "nowrap" }}>
        Theme{" "}
        <select
          value={theme}
          onChange={(event) => onThemeChange(event.target.value)}
          style={{
            background: "var(--input-background)",
            color: "var(--text)",
            border: "1px solid var(--border-strong)",
            borderRadius: 6,
            padding: "5px",
            font: "inherit",
          }}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="high-contrast">High contrast</option>
        </select>
      </label>
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
              color: step === index ? "var(--accent-text)" : "var(--text-muted)",
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
