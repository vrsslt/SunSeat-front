type ForecastPoint = { tmin: number; score: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function bucket(score: number) {
  if (score > 66) return "sunny";
  if (score > 33) return "mixed";
  return "shade";
}

export default function ForecastBar({
  data,
  selected,
  onSelect,
  compact = false,
}: {
  data: ForecastPoint[] | undefined;
  selected: number;
  onSelect?: (tmin: number) => void;
  compact?: boolean;
}) {
  if (!data || !data.length) return null;
  const maxH = compact ? 22 : 28;
  const baseH = compact ? 6 : 8;

  return (
    <div className="forecast">
      {data.map((f) => {
        const score = clamp(Math.round(f.score ?? 0), 0, 100);
        const h = baseH + Math.round((score / 100) * maxH);
        const isSel = f.tmin === selected;
        const hue = bucket(score);
        return (
          <div
            key={f.tmin}
            title={`+${f.tmin} min: ${score}`}
            className={`forecast__bar ${
              isSel ? "forecast__bar--selected" : ""
            }`}
            data-c={hue}
            style={{ ["--h" as string]: `${h}px` }}
            onClick={() => onSelect?.(f.tmin)}
            onMouseDown={(e) => onSelect && e.preventDefault()}
          />
        );
      })}
    </div>
  );
}
