export default function ScoreChip({ score }: { score: number }) {
  const s = Math.max(0, Math.min(100, Math.round(score || 0)));
  // 0 → rouge, 100 → vert (HSL 0..120)
  const hue = Math.round((s / 100) * 120);
  const bg = `hsl(${hue} 82% 44%)`;
  return (
    <span
      style={{
        background: bg,
        color: "white",
        padding: "2px 8px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 12,
        lineHeight: "18px",
        boxShadow: "0 3px 10px rgba(0,0,0,.15)",
      }}
    >
      {s}%
    </span>
  );
}
