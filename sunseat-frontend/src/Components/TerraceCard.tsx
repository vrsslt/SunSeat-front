import React from "react";
import type { NearbyItem } from "../types";
import ForecastBar from "./ForecastBar";

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
const toNum = (v: any, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);

function scoreAt(t: NearbyItem, offsetMin: number) {
  const s = t.forecast?.find((f) => f.tmin === offsetMin)?.score;
  return clamp(Math.round(toNum(s ?? t.sunScore ?? 0, 0)), 0, 100);
}

export default function TerraceCard({
  t,
  offsetMin,
  onSelectOffset,
}: {
  t: NearbyItem;
  offsetMin: number;
  onSelectOffset?: (m: number) => void;
}) {
  const score = scoreAt(t, offsetMin);
  const badgeClass =
    score > 66
      ? "badge badge--sunny"
      : score > 33
      ? "badge badge--mixed"
      : "badge badge--shade";

  return (
    <div className="card terrace">
      <div className="terrace__top">
        <strong>{t.name || "Sans nom"}</strong>
        <span className={badgeClass}>{score}</span>
      </div>
      <div className="meta">
        {Math.round(t.distance_m || 0)} m • orient.{" "}
        {Math.round(t.orientationDeg)}° • {t.streetWidth}
      </div>

      <ForecastBar
        data={t.forecast}
        selected={offsetMin}
        onSelect={onSelectOffset}
      />
    </div>
  );
}
