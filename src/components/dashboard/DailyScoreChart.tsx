import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { cn } from "@/lib/utils";
import type { DailyScore } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function useDailyScores() {
  return useQuery({
    queryKey: ["daily-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_scores")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return data as DailyScore[];
    },
  });
}

interface DailyScoreChartProps {
  activeSystem: string | null;
}

export function DailyScoreChart({ activeSystem }: DailyScoreChartProps) {
  const { data: scores } = useDailyScores();
  const { agents, systemGroups } = useAgentRegistry();
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  // Filter agents by active system
  const visibleAgentKeys = useMemo(() => {
    if (!activeSystem) return agents.map((a) => a.agent_key);
    const group = systemGroups.find((g) => g.group_key === activeSystem);
    return group ? group.agents.map((a) => a.agent_key) : agents.map((a) => a.agent_key);
  }, [activeSystem, agents, systemGroups]);

  // Filter scores by visible agents
  const filteredScores = useMemo(() => {
    if (!scores) return [];
    return scores.filter((s) => visibleAgentKeys.includes(s.agent_key));
  }, [scores, visibleAgentKeys]);

  if (!scores || scores.length === 0) {
    return (
      <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Daily Score Trends
        </h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center mb-4 text-text-tertiary">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13h2l3-8 4 16 3-8h6" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary">No score data yet</p>
          <p className="text-xs text-text-muted mt-1">Scores will appear here as evals accumulate.</p>
        </div>
      </div>
    );
  }

  // Pivot data for chart
  const dateMap = new Map<string, Record<string, number>>();
  for (const s of filteredScores) {
    const existing = dateMap.get(s.date) ?? {};
    existing[s.agent_key] = s.avg_score;
    dateMap.set(s.date, existing);
  }

  const chartData = Array.from(dateMap.entries()).map(([date, vals]) => ({
    date: date.slice(5), // MM-DD format
    ...vals,
  }));

  function toggleAgent(key: string) {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-text-primary">
          Daily Score Trends
          {activeSystem && (
            <span className="ml-2 text-xs font-normal text-text-tertiary">
              — {systemGroups.find((g) => g.group_key === activeSystem)?.display_name}
            </span>
          )}
        </h2>
      </div>

      {/* Interactive Legend */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {visibleAgentKeys.map((key) => {
          const agent = agents.find((a) => a.agent_key === key);
          const isHidden = hiddenKeys.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleAgent(key)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                isHidden
                  ? "opacity-40 hover:opacity-60"
                  : "opacity-100 hover:bg-bg-elevated"
              )}
            >
              <div
                className="w-2.5 h-2.5 rounded-full transition-opacity"
                style={{ backgroundColor: agent?.color ?? "#888" }}
              />
              <span className="text-text-secondary">{agent?.display_name ?? key}</span>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
            stroke="rgba(255,255,255,0.06)"
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
            stroke="rgba(255,255,255,0.06)"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-default)",
              borderRadius: "10px",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              color: "var(--color-text-primary)",
            }}
            labelStyle={{ color: "var(--color-text-tertiary)", marginBottom: 4 }}
          />
          {visibleAgentKeys.map((key) => {
            const agent = agents.find((a) => a.agent_key === key);
            const isHidden = hiddenKeys.has(key);
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={agent?.display_name ?? key}
                stroke={agent?.color ?? "#888"}
                strokeWidth={isHidden ? 0 : 2}
                strokeOpacity={isHidden ? 0 : 1}
                dot={false}
                activeDot={isHidden ? false : { r: 4, strokeWidth: 0 }}
                hide={isHidden}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
