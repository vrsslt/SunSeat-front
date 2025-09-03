import type { NearbyItem } from "../types";
import type { ReactNode } from "react";
import ForecastBar from "./ForecastBar";
import ChipScore from "./ChipScore";
import ComfortChip from "./ComfortChip";
import { comfortScore } from "../lib/comfort";
import { buildDeepLink } from "../lib/deeplink";

function fmtMeters(n?: number) {
  const v = Number.isFinite(n) ? Number(n) : 0;
  if (v >= 1000) return `${(v / 1000).toFixed(1)} km`;
  return `${Math.round(v)} m`;
}

function buildGoogleMapsLinks(
  name: string | undefined,
  lat: number,
  lon: number
) {
  const query = name ? `${lat},${lon} (${name})` : `${lat},${lon}`;
  const placeUrl = `https://www.google.com/maps?q=${encodeURIComponent(query)}`;
  const dest = name ? `${lat},${lon} (${name})` : `${lat},${lon}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    dest
  )}&travelmode=walking`;
  return { placeUrl, directionsUrl };
}

type MetaWeather = { temp_c?: number | null; wind_ms?: number | null };

type Props = {
  t: NearbyItem;
  onSelect?: () => void;
  selected?: boolean;
  metaWeather?: MetaWeather;
  shareContext?: { center: [number, number]; t: number; min: number };
};

export default function TerraceCard({
  t,
  onSelect,
  selected,
  metaWeather,
  shareContext,
}: Props) {
  const distance = fmtMeters(t.distance_m);
  const orient = Number.isFinite(t.orientationDeg)
    ? `${Math.round(t.orientationDeg!)}°`
    : "—";
  const street = t.streetWidth ?? "—";
  const nowScore = Math.round(t.sunScore ?? 0);

  const { placeUrl, directionsUrl } = buildGoogleMapsLinks(
    t.name,
    t.lat,
    t.lon
  );

  // Comfort
  const cScore = comfortScore(
    t.sunScore,
    metaWeather?.temp_c ?? null,
    metaWeather?.wind_ms ?? null,
    t.streetWidth
  );

  // Tip Forecast
  let tip: ReactNode = null;
  if (Array.isArray(t.forecast) && t.forecast.length > 0) {
    const horizon = t.forecast
      .filter((f) => typeof f?.tmin === "number" && f.tmin >= 0)
      .slice(0, 10);
    const peak = horizon.reduce<{ tmin: number; score: number }>(
      (acc, f: { tmin: number; score: number }) => {
        const s = Math.round(Number(f?.score ?? 0));
        const tm = Math.round(Number(f?.tmin ?? 0));
        return s > acc.score ? { tmin: tm, score: s } : acc;
      },
      { tmin: 0, score: nowScore }
    );
    const delta = peak.score - nowScore;

    if (nowScore >= 70) {
      tip = (
        <>
          🔥 <strong>Moment parfait</strong> (≈ {nowScore}%)
        </>
      );
    } else if (peak.score >= 70 && delta >= 10 && peak.tmin > 0) {
      tip = (
        <>
          👉 <strong>Meilleur dans {peak.tmin} min</strong> (≈ {peak.score}%)
        </>
      );
    } else if (nowScore >= 45 && delta < 8) {
      tip = (
        <>
          👍 <strong>Correct maintenant</strong> (≈ {nowScore}%)
        </>
      );
    } else if (peak.score >= nowScore + 8 && peak.tmin > 0) {
      tip = (
        <>
          👉 <strong>Meilleur dans {peak.tmin} min</strong> (≈ {peak.score}%)
        </>
      );
    } else if (Math.max(nowScore, peak.score) < 45) {
      tip = (
        <>
          🌥️ <strong>Pas top sur les 2h</strong> (max ≈ {peak.score}%)
        </>
      );
    } else {
      tip = (
        <>
          👍 <strong>Maintenant</strong> est ok (≈ {nowScore}%)
        </>
      );
    }
  }

  async function sharePlace(e: React.MouseEvent) {
    e.stopPropagation();

    // 👉 centre le deep link sur LA TERRASSE partagée
    const url = buildDeepLink({
      lat: t.lat,
      lon: t.lon,
      id: t.id,
      t: shareContext?.t ?? 0,
      min: shareContext?.min ?? 0,
    });

    const title = `${t.name || "Terrasse"} — SunSeat`;
    const text =
      "Viens chiller ici ☀️ Je te partage une terrasse avec un bon ensoleillement.";

    try {
      const nav = window.navigator as Navigator & {
        clipboard?: { writeText?: (t: string) => Promise<void> };
        share?: (data: {
          title?: string;
          text?: string;
          url?: string;
        }) => Promise<void>;
      };
      if (nav.share) {
        await nav.share({ title, text, url });
        return;
      }
      if (window.isSecureContext && nav.clipboard?.writeText) {
        await nav.clipboard.writeText(url);
        alert("Lien copié ✅");
        return;
      }
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("Lien copié ✅");
    } catch {
      prompt("Copie ce lien :", url);
    }
  }

  const terraceBadge =
    typeof t.terraceConfidence === "number" ? (
      <span
        title={
          t.hasOutdoor
            ? `Terrasse confirmée OSM (${Math.round(
                (t.terraceConfidence || 0) * 100
              )}%)`
            : `Terrasse non confirmée OSM (${Math.round(
                (t.terraceConfidence || 0) * 100
              )}%)`
        }
        style={{
          fontSize: 11,
          padding: "2px 6px",
          borderRadius: 999,
          border: "1px solid #ddd",
          background: t.hasOutdoor ? "#ecfdf5" : "#f8fafc",
          color: t.hasOutdoor ? "#065f46" : "#475569",
        }}
      >
        🪑 {Math.round((t.terraceConfidence || 0) * 100)}%
      </span>
    ) : null;

  return (
    <button
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.stopPropagation();
        window.open(placeUrl, "_blank", "noopener,noreferrer");
      }}
      aria-pressed={selected}
      style={{
        textAlign: "left",
        width: "100%",
        border: selected ? "2px solid #2563eb" : "1px solid #eee",
        borderRadius: 10,
        padding: ".75rem",
        background: selected ? "#eff6ff" : "#fff",
        boxShadow: "0 1px 0 rgba(0,0,0,.03)",
        cursor: "pointer",
        outline: "none",
      }}
    >
      {/* Header chips */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: ".5rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, lineHeight: "20px" }}>
          {t.name || "Sans nom"}
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {terraceBadge}
          <ChipScore score={t.sunScore ?? 0} />
          <ComfortChip score={cScore} />
        </div>
      </div>

      <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
        {distance} • orient. {orient} • {street}{" "}
        {t.amenity ? ` • ${t.amenity}` : ""}
      </div>

      {Array.isArray(t.forecast) && t.forecast.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <ForecastBar data={t.forecast} selected={0} />
          <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
            {tip}
          </div>
        </div>
      )}

      {/* Liens & actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <a
          href={placeUrl}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12, color: "#2563eb" }}
          onClick={(e) => e.stopPropagation()}
        >
          📍 Google Maps
        </a>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12, color: "#2563eb" }}
          onClick={(e) => e.stopPropagation()}
        >
          🧭 Itinéraire
        </a>
        <button
          onClick={sharePlace}
          style={{
            fontSize: 12,
            color: "#2563eb",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
          title="Partager ce spot"
        >
          🔗 Partager
        </button>

        {t.website && (
          <a
            href={t.website}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, color: "#2563eb" }}
            onClick={(e) => e.stopPropagation()}
          >
            🌐 Site
          </a>
        )}
        {t.phone && (
          <a
            href={`tel:${t.phone}`}
            style={{ fontSize: 12, color: "#2563eb" }}
            onClick={(e) => e.stopPropagation()}
          >
            📞 Appeler
          </a>
        )}
        {t.opening_hours && (
          <span style={{ fontSize: 12, color: "#64748b" }}>
            🕒 {t.opening_hours}
          </span>
        )}
      </div>
    </button>
  );
}
