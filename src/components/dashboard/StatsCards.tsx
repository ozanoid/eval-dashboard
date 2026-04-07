import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useEvals } from "@/hooks/useEvals";
import { supabase } from "@/lib/supabase";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { formatScore, gradeFromScore } from "@/lib/utils";
import { StatsCardSkeleton } from "@/components/shared/Skeleton";
import type { AgentRegistryEntry, SystemGroup, DailyScore } from "@/lib/types";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from "recharts";

export function StatsCards() {
  const { agents, systemGroups, isLoading } = useAgentRegistry();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((i) => <StatsCardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
      {systemGroups.map((group) => (
        <SystemCard key={group.group_key} group={group} allAgents={agents} />
      ))}
    </div>
  );
}

function useSystemDailyScores(agentKeys: string[]) {
  return useQuery({
    queryKey: ["system-daily-scores", agentKeys.join(",")],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_scores")
        .select("*")
        .in("agent_key", agentKeys)
        .order("date", { ascending: true });

      if (!data) return [];

      // Group by date, average across agents
      const dateMap = new Map<string, number[]>();
      for (const row of data as DailyScore[]) {
        const scores = dateMap.get(row.date) ?? [];
        scores.push(row.avg_score);
        dateMap.set(row.date, scores);
      }

      return Array.from(dateMap.entries()).map(([date, scores]) => ({
        date,
        avg: scores.reduce((s, v) => s + v, 0) / scores.length,
      }));
    },
    enabled: agentKeys.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

function SystemCard({
  group,
  allAgents,
}: {
  group: SystemGroup;
  allAgents: AgentRegistryEntry[];
}) {
  const { data: evals } = useEvals(group.group_key, allAgents);
  const agentKeys = group.agents.map((a) => a.agent_key);
  const { data: dailyScores } = useSystemDailyScores(agentKeys);

  const agentAvgs = group.agents.map((agent) => {
    const scores: number[] = [];
    for (const ev of evals ?? []) {
      const agentData = ev.agents.find((a) => a.agent_key === agent.agent_key);
      if (agentData) scores.push(agentData.weighted_total);
    }
    const avg =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
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
    <Link
      to={`/evals/${group.group_key}`}
      className="bg-bg-card border border-border-subtle rounded-xl p-5 hover-lift animate-fade-in-up transition-all hover:border-border-default block group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
          {group.display_name}
        </h3>
        <span className="text-[10px] text-text-muted font-mono">
          {evalCount} eval{evalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Score + mini chart */}
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-[2rem] font-mono font-extrabold text-text-primary tabular-nums tracking-tight leading-none">
              {systemAvg > 0 ? formatScore(systemAvg) : "—"}
            </span>
            {systemGrade !== "—" && <GradeBadge grade={systemGrade} size="sm" />}
          </div>
          <span className="text-[10px] text-text-muted">avg score</span>
        </div>

        {/* Mini trend chart */}
        {dailyScores && dailyScores.length >= 2 && (
          <div className="w-[120px] h-[40px] flex-shrink-0" role="img" aria-label={`Score trend for ${group.display_name}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyScores}>
                <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="var(--color-accent-primary)"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Agent breakdown */}
      <div className="space-y-2 pt-3 border-t border-border-subtle">
        {agentAvgs.map(({ agent, avg, count }) => (
          <div key={agent.agent_key} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: agent.color }}
            />
            <span className="text-xs text-text-tertiary flex-1 truncate">
              {agent.display_name}
            </span>
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
    </Link>
  );
}
