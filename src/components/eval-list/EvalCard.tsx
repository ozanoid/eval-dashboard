import { Link } from "react-router-dom";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { formatDate, formatScore, gradeFromScore } from "@/lib/utils";
import type { EvalListItem } from "@/hooks/useEvals";

interface EvalCardProps {
  eval: EvalListItem;
  systemGroup: string;
}

export function EvalCard({ eval: ev, systemGroup }: EvalCardProps) {
  const overallGrade = gradeFromScore(ev.overall_avg);

  return (
    <Link
      to={`/evals/${systemGroup}/${ev.id}`}
      className="group block bg-bg-card border border-border-subtle rounded-xl p-5 hover-lift"
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
        <p className="text-sm text-text-secondary mb-4 truncate">{ev.keyword}</p>
      )}

      {/* Agent score mini-grid */}
      <div className="flex border border-border-subtle rounded-lg overflow-hidden mb-4">
        {ev.agents.map((agent, i) => (
          <div
            key={agent.agent_key}
            className={`flex-1 py-3 px-3 text-center ${
              i < ev.agents.length - 1 ? "border-r border-border-subtle" : ""
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
          Overall: <span className="font-mono font-bold text-text-primary">{formatScore(ev.overall_avg)}</span>
        </span>
        <GradeBadge grade={overallGrade} size="sm" />
      </div>
    </Link>
  );
}
