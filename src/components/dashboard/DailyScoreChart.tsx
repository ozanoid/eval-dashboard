import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import type { DailyScore } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

export function DailyScoreChart() {
  const { data: scores } = useDailyScores();
  const { agents } = useAgentRegistry();

  if (!scores || scores.length === 0) {
    return (
      <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Daily Score Trends
        </h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center mb-4 text-text-tertiary">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13h2l3-8 4 16 3-8h6" /></svg>
          </div>
          <p className="text-sm text-text-secondary">No score data yet</p>
          <p className="text-xs text-text-muted mt-1">Scores will appear here as evals accumulate.</p>
        </div>
      </div>
    );
  }

  // Pivot: group by date, each agent is a column
  const dateMap = new Map<string, Record<string, number>>();
  for (const s of scores) {
    const existing = dateMap.get(s.date) ?? {};
    existing[s.agent_key] = s.avg_score;
    dateMap.set(s.date, existing);
  }

  const chartData = Array.from(dateMap.entries()).map(([date, vals]) => ({
    date,
    ...vals,
  }));

  const agentKeys = [...new Set(scores.map((s) => s.agent_key))];

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-4">
        Daily Score Trends
      </h2>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
            stroke="var(--color-border-subtle)"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
            stroke="var(--color-border-subtle)"
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
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", fontFamily: "var(--font-sans)", color: "var(--color-text-secondary)" }}
          />
          {agentKeys.map((key) => {
            const agent = agents.find((a) => a.agent_key === key);
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={agent?.display_name ?? key}
                stroke={agent?.color ?? "#888"}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
