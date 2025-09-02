export default function ScoreLegend() {
  const dot = (color: string) =>
    ({
      display: "inline-block",
      width: 10,
      height: 10,
      borderRadius: 999,
      background: color,
      marginRight: 6,
      verticalAlign: "middle",
    } as const);

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        fontSize: 12,
        color: "#64748b",
        flexWrap: "wrap",
      }}
    >
      <span>
        <i style={dot("hsl(0 82% 44%)")} />
        0%
      </span>
      <span>
        <i style={dot("hsl(60 82% 44%)")} />
        50%
      </span>
      <span>
        <i style={dot("hsl(120 82% 44%)")} />
        100%
      </span>
    </div>
  );
}
