// src/Components/HeatLegend.tsx
export default function HeatLegend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 12,
        left: 12,
        zIndex: 1000,
        background: "rgba(255,255,255,.9)",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "8px 10px",
        boxShadow: "0 2px 10px rgba(0,0,0,.08)",
        fontSize: 12,
        color: "#334155",
        minWidth: 180,
      }}
    >
      <div style={{ marginBottom: 6, fontWeight: 600 }}>
        Ensoleillement estimé
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, #fff3b0 20%, #fdcc4e 50%, #fb8c00 70%, #e53935 90%, #b71c1c 100%)",
          border: "1px solid #e5e7eb",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          color: "#64748b",
        }}
      >
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
      <div style={{ marginTop: 6, color: "#64748b" }}>Zones chaudes = ☀️</div>
    </div>
  );
}
