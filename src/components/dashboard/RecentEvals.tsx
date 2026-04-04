import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useEvals } from "@/hooks/useEvals";
import type { AgentRegistryEntry } from "@/lib/types";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { formatDate, formatScore } from "@/lib/utils";

export function RecentEvals() {
  const { agents, systemGroups } = useAgentRegistry();

  return (
    <div>
      <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-[0.08em] mb-4">
        Recent Evals
      </h2>
      <div className="space-y-4">
        {systemGroups.map((group) => (
          <RecentGroupEvals key={group.group_key} group={group} allAgents={agents} />
        ))}
      </div>
    </div>
  );
}

function RecentGroupEvals({
  group,
  allAgents,
}: {
  group: { group_key: string; display_name: string };
  allAgents: AgentRegistryEntry[];
}) {
  const { data: evals } = useEvals(group.group_key, allAgents);
  const recent = evals?.slice(0, 5) ?? [];

  if (recent.length === 0) return null;

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
        <span className="text-sm font-semibold text-text-primary">{group.display_name}</span>
        <Link
          to={`/evals/${group.group_key}`}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-accent-primary transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-border-subtle">
        {recent.map((ev) => (
          <Link
            key={ev.id}
            to={`/evals/${group.group_key}/${ev.id}`}
            className="flex items-center gap-4 px-5 py-3 hover:bg-bg-card-hover transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {ev.brand_name ?? "Unknown"}
              </p>
              <p className="text-xs text-text-muted mt-0.5">{formatDate(ev.created_at)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {ev.agents.map((a) => (
                <GradeBadge key={a.agent_key} grade={a.grade} size="sm" />
              ))}
            </div>
            <span className="text-sm font-mono font-bold text-text-primary tabular-nums w-10 text-right">
              {formatScore(ev.overall_avg)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
