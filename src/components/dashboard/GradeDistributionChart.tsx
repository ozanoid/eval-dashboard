import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { supabase } from "@/lib/supabase";
import type { EvalReport } from "@/lib/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface GradeDistributionChartProps {
  activeSystem: string | null;
}

const GRADE_BUCKETS = [
  { key: "A", label: "A range", grades: ["A+", "A", "A-"], color: "#22c55e" },
  { key: "B", label: "B range", grades: ["B+", "B", "B-"], color: "#3b82f6" },
  { key: "C", label: "C range", grades: ["C+", "C", "C-"], color: "#eab308" },
  { key: "D/F", label: "D/F range", grades: ["D+", "D", "D-", "F"], color: "#ef4444" },
];

function useGradeDistribution(activeSystem: string | null) {
  const { agents } = useAgentRegistry();

  const targetAgents = useMemo(() => {
    if (!activeSystem) return agents;
    return agents.filter((a) => a.system_group === activeSystem);
  }, [agents, activeSystem]);

  return useQuery({
    queryKey: ["grade-distribution", activeSystem, targetAgents.map((a) => a.agent_key).join(",")],
    queryFn: async () => {
      const gradeMap: Record<string, number> = {};

      for (const agent of targetAgents) {
        const { data: rows } = await supabase
          .from(agent.table_name)
          .select(agent.eval_report_column);

        if (!rows) continue;
        for (const row of rows) {
          const report = (row as unknown as Record<string, unknown>)[agent.eval_report_column] as EvalReport | null;
          if (report?.overall?.grade) {
            gradeMap[report.overall.grade] = (gradeMap[report.overall.grade] ?? 0) + 1;
          }
        }
      }

      return gradeMap;
    },
    enabled: targetAgents.length > 0,
  });
}

export function GradeDistributionChart({ activeSystem }: GradeDistributionChartProps) {
  const { systemGroups } = useAgentRegistry();
  const { data: gradeMap } = useGradeDistribution(activeSystem);

  const total = useMemo(
    () => (gradeMap ? Object.values(gradeMap).reduce((s, n) => s + n, 0) : 0),
    [gradeMap]
  );

  const data = useMemo(
    () =>
      GRADE_BUCKETS.map((bucket) => ({
        name: bucket.label,
        value: bucket.grades.reduce((sum, g) => sum + (gradeMap?.[g] ?? 0), 0),
        color: bucket.color,
      })).filter((d) => d.value > 0),
    [gradeMap]
  );

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-5">
        Grade Distribution
        {activeSystem && (
          <span className="ml-2 text-xs font-normal text-text-tertiary">
            — {systemGroups.find((g) => g.group_key === activeSystem)?.display_name}
          </span>
        )}
      </h2>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center mb-4 text-text-tertiary">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary">No grade data yet</p>
        </div>
      ) : (
        <div className="flex items-center gap-8">
          {/* Donut Chart */}
          <div className="relative w-[180px] h-[180px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.[0]) return null;
                    const d = payload[0].payload;
                    const pct = ((d.value / total) * 100).toFixed(0);
                    return (
                      <div className="bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-xs font-mono shadow-lg">
                        <span style={{ color: d.color }}>{d.name}</span>
                        <span className="text-text-secondary ml-2">
                          {d.value} ({pct}%)
                        </span>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-mono font-bold text-text-primary">{total}</span>
              <span className="text-[10px] text-text-muted">grades</span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-3 flex-1">
            {GRADE_BUCKETS.map((bucket) => {
              const count = bucket.grades.reduce((sum, g) => sum + (gradeMap?.[g] ?? 0), 0);
              const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
              return (
                <div key={bucket.key} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: bucket.color }}
                  />
                  <span className="text-xs text-text-secondary flex-1">{bucket.label}</span>
                  <span className="text-xs font-mono font-bold text-text-primary tabular-nums">
                    {count}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono tabular-nums w-8 text-right">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
