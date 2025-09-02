type Props = {
  minutes: number; // 0..120
  onChange: (m: number) => void;
};

export default function SunSlider({ minutes, onChange }: Props) {
  const label = minutes === 0 ? "Maintenant" : `+${minutes} min`;
  return (
    <div
      style={{
        padding: ".6rem",
        background: "#f9f9f9",
        borderRadius: 6,
        marginBottom: ".75rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
          fontSize: ".85rem",
          color: "#444",
        }}
      >
        <span>🕒 Projection</span>
        <strong>{label}</strong>
      </div>

      <input
        type="range"
        min={0}
        max={120}
        step={15}
        value={minutes}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%" }}
        aria-label="Définir la projection de temps"
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: ".7rem",
          color: "#666",
          marginTop: 4,
        }}
      >
        <span>0</span>
        <span>30</span>
        <span>60</span>
        <span>90</span>
        <span>120</span>
      </div>
    </div>
  );
}
