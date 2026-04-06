import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { Sparkline } from "@/components/shared/Sparkline";
import { formatDate, formatScore, gradeFromScore, cn } from "@/lib/utils";
import type { EvalListItem } from "@/hooks/useEvals";

interface EvalCardProps {
  eval: EvalListItem;
  systemGroup: string;
  isFocused?: boolean;
  scoreHistory?: number[];
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function EvalCard({
  eval: ev,
  systemGroup,
  isFocused,
  scoreHistory,
  isSelected,
  onToggleSelect,
}: EvalCardProps) {
  const overallGrade = gradeFromScore(ev.overall_avg);
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isFocused]);

  return (
    <div className="relative">
      {/* Compare checkbox */}
      {onToggleSelect && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect();
          }}
          aria-label={`Select ${ev.brand_name ?? "eval"} for comparison`}
          aria-pressed={isSelected}
          className={cn(
            "absolute top-3 left-3 z-10 w-5 h-5 rounded border flex items-center justify-center transition-all",
            isSelected
              ? "bg-accent-primary border-accent-primary text-white"
              : "border-border-default bg-bg-elevated hover:border-accent-primary/50 text-transparent"
          )}
        >
          {isSelected && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      )}

      <Link
        ref={ref}
        to={`/evals/${systemGroup}/${ev.id}`}
        className={cn(
          "group block bg-bg-card border rounded-xl p-5 hover-lift",
          isSelected
            ? "border-accent-primary/50 ring-1 ring-accent-primary/20"
            : isFocused
            ? "border-accent-primary/50 ring-1 ring-accent-primary/20"
            : "border-border-subtle",
          onToggleSelect && "pl-10"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-base font-semibold text-text-primary truncate group-hover:text-accent-primary transition-colors">
            {ev.brand_name ?? "Unknown Brand"}
          </h3>
          <span className="text-xs text-text-muted flex-shrink-0 ml-3">
            {formatDate(ev.created_at)}
          </span>
        </div>
        {ev.keyword && (
          <p className="text-sm text-text-secondary mb-4 truncate">
            {ev.keyword}
          </p>
        )}

        {/* Agent score mini-grid */}
        <div className="flex border border-border-subtle rounded-lg overflow-hidden mb-4">
          {ev.agents.map((agent, i) => (
            <div
              key={agent.agent_key}
              className={`flex-1 py-3 px-3 text-center ${
                i < ev.agents.length - 1
                  ? "border-r border-border-subtle"
                  : ""
              }`}
            >
              <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.05em] mb-1.5">
                {agent.display_name.split(" ")[0]}
              </p>
              <p className="text-xl font-mono font-bold text-text-primary tabular-nums">
                {formatScore(agent.weighted_total)}
              </p>
              <div className="mt-1.5">
                <GradeBadge grade={agent.grade} size="sm" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Overall:{" "}
            <span className="font-mono font-bold text-text-primary">
              {formatScore(ev.overall_avg)}
            </span>
          </span>
          <div className="flex items-center gap-2">
            {scoreHistory && scoreHistory.length >= 2 && (
              <Sparkline data={scoreHistory} width={64} height={22} />
            )}
            <GradeBadge grade={overallGrade} size="sm" />
          </div>
        </div>
      </Link>
    </div>
  );
}
