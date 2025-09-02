// src/Components/ComfortChip.tsx
type Props = { score: number };

function palette(score: number) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const hue = Math.round((s / 100) * 120); // 0 rouge → 120 vert
  return {
    bg: `hsl(${hue} 85% 96%)`,
    border: `hsl(${hue} 60% 70%)`,
    text: `hsl(${hue} 50% 22%)`,
  };
}

function emoji(score: number) {
  if (score >= 80) return "😍";
  if (score >= 65) return "🙂";
  if (score >= 45) return "😐";
  return "🥶";
}

export default function ComfortChip({ score }: Props) {
  const { bg, border, text } = palette(score);
  return (
    <span
      title={`Confort ~ ${score}%`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color: text,
        border: `1px solid ${border}`,
        lineHeight: "18px",
      }}
    >
      <span>{emoji(score)}</span>
      <span>{score}%</span>
      <span style={{ opacity: 0.8 }}>Confort</span>
    </span>
  );
}
