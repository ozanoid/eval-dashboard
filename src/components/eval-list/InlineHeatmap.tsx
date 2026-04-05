import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useCriteriaHeatmapData } from "@/hooks/useCriteriaHeatmapData";
import { getCriterionScoreColor } from "@/lib/constants";
import type { AgentRegistryEntry } from "@/lib/types";

interface InlineHeatmapProps {
  systemGroup: string;
  agents: AgentRegistryEntry[];
}

export function InlineHeatmap({ systemGroup, agents }: InlineHeatmapProps) {
  const groupAgents = agents.filter((a) => a.system_group === systemGroup);
  const [expanded, setExpanded] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const activeAgentKey = selectedAgent ?? groupAgents[0]?.agent_key;
  const activeAgent = groupAgents.find((a) => a.agent_key === activeAgentKey) ?? null;

  const { data: heatmapData, isLoading } = useCriteriaHeatmapData(activeAgent);

  const criteriaColumns = useMemo(() => {
    if (!heatmapData) return [];
    const set = new Set<string>();
    for (const row of heatmapData) {
      for (const key of Object.keys(row.scores)) {
        set.add(key);
      }
    }
    return Array.from(set);
  }, [heatmapData]);

  if (groupAgents.length === 0) return null;

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-bg-card-hover transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
        )}
        <span className="text-sm font-semibold text-text-primary flex-1">
          Criteria Heatmap
        </span>
        <div className="flex items-center gap-2">
          {[
            { color: "var(--color-grade-a)", label: "8+" },
            { color: "var(--color-grade-b)", label: "6-7" },
            { color: "var(--color-grade-c)", label: "4-5" },
            { color: "var(--color-grade-d)", label: "0-3" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-0.5">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: item.color, opacity: 0.7 }}
              />
              <span className="text-[9px] text-text-muted font-mono">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border-subtle">
          {/* Agent selector */}
          <div className="px-5 py-2.5 border-b border-border-subtle/50 flex items-center gap-2">
            <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-[0.08em]">
              Agent
            </span>
            <select
              value={activeAgentKey ?? ""}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="h-7 px-2 rounded-md bg-bg-elevated border border-border-subtle text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            >
              {groupAgents.map((a) => (
                <option key={a.agent_key} value={a.agent_key}>
                  {a.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Matrix */}
          {isLoading ? (
            <div className="px-5 py-8 text-center text-sm text-text-muted">
              Loading...
            </div>
          ) : !heatmapData || heatmapData.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-text-muted">
              No heatmap data for this agent
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle/50">
                    <th className="sticky left-0 bg-bg-card z-10 px-4 py-2 text-left text-[9px] font-medium text-text-tertiary uppercase tracking-[0.06em] min-w-[100px]">
                      Date
                    </th>
                    {criteriaColumns.map((col) => (
                      <th key={col} className="px-1 py-2 text-center min-w-[44px]">
                        <span
                          className="text-[8px] text-text-muted font-medium uppercase tracking-[0.02em] block max-w-[44px] truncate"
                          title={col.replace(/_/g, " ")}
                        >
                          {col.replace(/_/g, " ").slice(0, 10)}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right text-[9px] font-medium text-text-tertiary uppercase tracking-[0.06em] min-w-[44px]">
                      Avg
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row) => {
                    const values = criteriaColumns.map((col) => row.scores[col] ?? null);
                    const validValues = values.filter((v): v is number => v !== null);
                    const avg =
                      validValues.length > 0
                        ? validValues.reduce((s, v) => s + v, 0) / validValues.length
                        : null;

                    return (
                      <tr
                        key={row.date}
                        className="border-b border-border-subtle/30 hover:bg-bg-card-hover transition-colors"
                      >
                        <td className="sticky left-0 bg-bg-card z-10 px-4 py-1.5 text-[11px] text-text-secondary font-mono tabular-nums">
                          {row.date}
                        </td>
                        {criteriaColumns.map((col) => {
                          const score = row.scores[col] ?? null;
                          return (
                            <td key={col} className="px-1 py-1.5 text-center">
                              {score !== null ? (
                                <div
                                  className="mx-auto w-9 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold"
                                  style={{
                                    backgroundColor: getCriterionScoreColor(score),
                                    opacity: 0.2 + (score / 10) * 0.6,
                                    color: "white",
                                  }}
                                  title={`${col.replace(/_/g, " ")}: ${score}/10`}
                                >
                                  {score.toFixed(1)}
                                </div>
                              ) : (
                                <div className="mx-auto w-9 h-6 rounded bg-bg-page" />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 text-right text-[11px] font-mono font-bold tabular-nums text-text-primary">
                          {avg !== null ? avg.toFixed(1) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
