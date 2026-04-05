import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useEvals } from "@/hooks/useEvals";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { formatScore, gradeFromScore, cn } from "@/lib/utils";
import type { AgentRegistryEntry, SystemGroup } from "@/lib/types";

interface StatsCardsProps {
  activeSystem: string | null;
  onSystemSelect: (key: string | null) => void;
}

export function StatsCards({ activeSystem, onSystemSelect }: StatsCardsProps) {
  const { agents, systemGroups } = useAgentRegistry();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
      {systemGroups.map((group) => (
        <SystemCard
          key={group.group_key}
          group={group}
          allAgents={agents}
          isActive={activeSystem === group.group_key}
          onSelect={() =>
            onSystemSelect(activeSystem === group.group_key ? null : group.group_key)
          }
        />
      ))}
    </div>
  );
}

function SystemCard({
  group,
  allAgents,
  isActive,
  onSelect,
}: {
  group: SystemGroup;
  allAgents: AgentRegistryEntry[];
  isActive: boolean;
  onSelect: () => void;
}) {
  const { data: evals } = useEvals(group.group_key, allAgents);

  // Calculate AVERAGE scores across all evals (not latest)
  const agentAvgs = group.agents.map((agent) => {
    const scores: number[] = [];
    for (const ev of evals ?? []) {
      const agentData = ev.agents.find((a) => a.agent_key === agent.agent_key);
      if (agentData) scores.push(agentData.weighted_total);
    }
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { agent, avg, count: scores.length };
  });

  const systemAvg =
    agentAvgs.length > 0 && agentAvgs.some((a) => a.count > 0)
      ? agentAvgs.filter((a) => a.count > 0).reduce((s, a) => s + a.avg, 0) /
        agentAvgs.filter((a) => a.count > 0).length
      : 0;

  const systemGrade = systemAvg > 0 ? gradeFromScore(systemAvg) : "—";
  const evalCount = evals?.length ?? 0;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "bg-bg-card border rounded-xl p-5 text-left hover-lift animate-fade-in-up transition-all",
        isActive
          ? "border-accent-primary/50 ring-1 ring-accent-primary/20"
          : "border-border-subtle hover:border-border-default"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">{group.display_name}</h3>
        <span className="text-[10px] text-text-muted font-mono">{evalCount} eval{evalCount !== 1 ? "s" : ""}</span>
      </div>

      {/* System avg score */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-[2rem] font-mono font-extrabold text-text-primary tabular-nums tracking-tight leading-none">
          {systemAvg > 0 ? formatScore(systemAvg) : "—"}
        </span>
        {systemGrade !== "—" && <GradeBadge grade={systemGrade} size="sm" />}
        <span className="text-[10px] text-text-muted ml-auto">avg score</span>
      </div>

      {/* Agent breakdown */}
      <div className="space-y-2 pt-3 border-t border-border-subtle">
        {agentAvgs.map(({ agent, avg, count }) => (
          <div key={agent.agent_key} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: agent.color }}
            />
            <span className="text-xs text-text-tertiary flex-1 truncate">{agent.display_name}</span>
            {count > 0 ? (
              <>
                <span className="text-xs font-mono font-semibold text-text-secondary tabular-nums">
                  {formatScore(avg)}
                </span>
                <GradeBadge grade={gradeFromScore(avg)} size="sm" />
              </>
            ) : (
              <span className="text-xs text-text-muted">—</span>
            )}
          </div>
        ))}
      </div>
    </button>
  );
}
