// src/Components/GoldenHourToggle.tsx
type Props = {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  startLabel: string;
  endLabel: string;
  onNotify?: () => void; // optionnel: rappel -45 min
};

export default function GoldenHourToggle({
  enabled,
  onToggle,
  startLabel,
  endLabel,
  onNotify,
}: Props) {
  return (
    <div
      style={{
        padding: ".6rem",
        background: enabled ? "#fff7ed" : "#f9f9f9",
        border: "1px solid #fde68a",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: ".5rem",
        marginBottom: ".75rem",
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".6rem",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          style={{ cursor: "pointer" }}
        />
        <div>
          <div style={{ fontWeight: 600 }}>✨ Golden Hour</div>
          <div style={{ fontSize: ".85rem", color: "#6b7280" }}>
            {startLabel} – {endLabel}
          </div>
        </div>
      </label>

      <button
        onClick={onNotify}
        style={{
          padding: ".45rem .7rem",
          borderRadius: 6,
          border: "1px solid #fcd34d",
          background: "#fffbeb",
          cursor: "pointer",
          fontSize: ".85rem",
          whiteSpace: "nowrap",
        }}
        title="Recevoir un rappel 45 min avant"
      >
        🔔 -45 min
      </button>
    </div>
  );
}
