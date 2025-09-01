import type { NearbyItem } from "../types";

// Fonction helper pour éviter les NaN
function safeNumber(value: any, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export default function TerraceCard({ t }: { t: NearbyItem }) {
  const sunScore = safeNumber(t.sunScore, 0);
  const distance = safeNumber(t.distance_m, 0);
  const orientation = safeNumber(t.orientationDeg, 0);

  const badgeBg =
    sunScore > 66 ? "#FFD54F" : sunScore > 33 ? "#4FC3F7" : "#E0E0E0";

  return (
    <div
      style={{ padding: "0.8rem", border: "1px solid #eee", borderRadius: 12 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong>{t.name || "Sans nom"}</strong>
        <span
          style={{
            padding: ".2rem .6rem",
            borderRadius: 999,
            fontWeight: 700,
            background: badgeBg,
          }}
        >
          {Math.round(sunScore)}
        </span>
      </div>
      <small>
        {Math.round(distance)} m • orient. {Math.round(orientation)}° •{" "}
        {t.streetWidth || "medium"}
      </small>
    </div>
  );
}
