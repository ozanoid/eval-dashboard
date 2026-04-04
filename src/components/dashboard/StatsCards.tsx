import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useEvals } from "@/hooks/useEvals";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { formatScore } from "@/lib/utils";
import type { AgentRegistryEntry, SystemGroup } from "@/lib/types";

export function StatsCards() {
  const { agents, systemGroups } = useAgentRegistry();

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 min-w-max stagger-children">
        {systemGroups.map((group) => (
          <SystemGroupCards key={group.group_key} group={group} allAgents={agents} />
        ))}
      </div>
    </div>
  );
}

function SystemGroupCards({
  group,
  allAgents,
}: {
  group: SystemGroup;
  allAgents: AgentRegistryEntry[];
}) {
  const { data: evals } = useEvals(group.group_key, allAgents);
  const latestEval = evals?.[0];

  return (
    <>
      {group.agents.map((agent) => {
        const agentData = latestEval?.agents.find(
          (a) => a.agent_key === agent.agent_key
        );
        const score = agentData?.weighted_total ?? 0;
        const grade = agentData ? agentData.grade : "—";

        return (
          <div
            key={agent.agent_key}
            className="bg-bg-card border border-border-subtle rounded-xl px-4 py-4 min-w-[160px] flex-shrink-0 hover-lift animate-fade-in-up"
          >
            <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.05em] mb-3">
              {agent.display_name}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-[2rem] font-mono font-extrabold text-text-primary tabular-nums tracking-tight leading-none">
                {score > 0 ? formatScore(score) : "—"}
              </span>
              {grade !== "—" && <GradeBadge grade={grade} size="sm" />}
            </div>
            <p className="text-[10px] text-text-muted mt-2">Latest score</p>
          </div>
        );
      })}
    </>
  );
}
