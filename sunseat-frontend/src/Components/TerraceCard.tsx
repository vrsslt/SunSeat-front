import type { NearbyItem } from "../types";
import ForecastBar from "./ForecastBar";
import ScoreChip from "./ScoreChip"; // ← ton composant existant

function fmtMeters(n?: number) {
  const v = Number.isFinite(n) ? Number(n) : 0;
  if (v >= 1000) return `${(v / 1000).toFixed(1)} km`;
  return `${Math.round(v)} m`;
}

export default function TerraceCard({ t }: { t: NearbyItem }) {
  const distance = fmtMeters(t.distance_m);
  const orient = Number.isFinite(t.orientationDeg)
    ? `${Math.round(t.orientationDeg!)}°`
    : "—";
  const street = t.streetWidth ?? "—";

  // “meilleur créneau” basé sur le forecast (si présent)
  const nowScore = Math.round(t.sunScore ?? 0);
  const best =
    Array.isArray(t.forecast) && t.forecast.length > 0
      ? t.forecast.reduce<{ tmin: number; score: number }>(
          (acc, f: any) => {
            const s = Math.round(Number(f?.score ?? 0));
            return s > acc.score
              ? { tmin: Number(f?.tmin ?? 0), score: s }
              : acc;
          },
          { tmin: 0, score: nowScore }
        )
      : null;

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 10,
        padding: ".75rem",
        background: "#fff",
        boxShadow: "0 1px 0 rgba(0,0,0,.03)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: ".5rem",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, lineHeight: "20px" }}>
          {t.name || "Sans nom"}
        </div>
        {/* Ton ChipScore */}
        <ScoreChip score={t.sunScore ?? 0} />
      </div>

      <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
        {distance} • orient. {orient} • {street}
        {t.amenity ? ` • ${t.amenity}` : ""}
      </div>

      {/* Prévision (si fournie par l'API) */}
      {Array.isArray(t.forecast) && t.forecast.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <ForecastBar data={t.forecast as any} />
          <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
            {best && best.tmin > 0 && best.score > nowScore + 8 ? (
              <>
                👉 <strong>Meilleur dans {best.tmin} min</strong> (≈{" "}
                {best.score}
                %)
              </>
            ) : (
              <>
                👍 <strong>Maintenant</strong> est un bon créneau
              </>
            )}
          </div>
        </div>
      )}

      {/* Infos utiles si dispo */}
      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        {t.website && (
          <a
            href={t.website}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, color: "#2563eb" }}
          >
            🌐 Site
          </a>
        )}
        {t.phone && (
          <a href={`tel:${t.phone}`} style={{ fontSize: 12, color: "#2563eb" }}>
            📞 Appeler
          </a>
        )}
        {t.opening_hours && (
          <span style={{ fontSize: 12, color: "#64748b" }}>
            🕒 {t.opening_hours}
          </span>
        )}
      </div>
    </div>
  );
}
