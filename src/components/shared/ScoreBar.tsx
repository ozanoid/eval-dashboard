import { getScoreColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ScoreBarProps {
  score: number;
  maxScore?: number;
  height?: number;
  showLabel?: boolean;
  className?: string;
  animated?: boolean;
}

export function ScoreBar({
  score,
  maxScore = 100,
  height = 6,
  showLabel = false,
  className,
  animated = true,
}: ScoreBarProps) {
  const pct = Math.min((score / maxScore) * 100, 100);
  const color = getScoreColor(score);

  return (
    <div className={cn("flex items-center gap-2.5 w-full", className)}>
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height, backgroundColor: "var(--color-bg-page)" }}
      >
        <div
          className={cn(
            "h-full rounded-full",
            animated && "animate-progress-fill"
          )}
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span
          className="text-sm font-mono font-bold tabular-nums"
          style={{ color }}
        >
          {score.toFixed(1)}
        </span>
      )}
    </div>
  );
}
