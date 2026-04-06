interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({ data, width = 80, height = 28, className }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * innerW;
      const y = padding + innerH - ((v - min) / range) * innerH;
      return `${x},${y}`;
    })
    .join(" ");

  const trending = data[data.length - 1] >= data[0];
  const color = trending ? "var(--color-grade-a)" : "var(--color-grade-d)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={`Score trend: ${trending ? "up" : "down"} from ${data[0].toFixed(1)} to ${data[data.length - 1].toFixed(1)}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {(() => {
        const lastX = padding + innerW;
        const lastY = padding + innerH - ((data[data.length - 1] - min) / range) * innerH;
        return <circle cx={lastX} cy={lastY} r={2} fill={color} />;
      })()}
    </svg>
  );
}
