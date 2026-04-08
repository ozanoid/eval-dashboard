import { useMemo } from "react";
import type { EvalListItem } from "@/hooks/useEvals";
import type { PromptVersion } from "@/hooks/usePromptVersions";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { formatScore, gradeFromScore } from "@/lib/utils";

interface VersionScorecardProps {
  evals: EvalListItem[];
  versions: PromptVersion[];
}

interface VersionStats {
  version: string;
  evalCount: number;
  agentAvgs: Map<string, { avg: number; displayName: string; color: string }>;
  overallAvg: number;
}

export function VersionScorecard({ evals, versions }: VersionScorecardProps) {
  const { versionStats, agentKeys } = useMemo(() => {
    if (versions.length < 2 || evals.length === 0)
      return { versionStats: [], agentKeys: [] };

    // Group evals by version
    const byVersion = new Map<string, EvalListItem[]>();
    for (const ev of evals) {
      const list = byVersion.get(ev.version) ?? [];
      list.push(ev);
      byVersion.set(ev.version, list);
    }

    // Collect all agent keys (ordered by first appearance)
    const agentKeySet = new Map<string, { displayName: string; color: string }>();
    for (const ev of evals) {
      for (const a of ev.agents) {
        if (!agentKeySet.has(a.agent_key)) {
          agentKeySet.set(a.agent_key, { displayName: a.display_name, color: a.color });
        }
      }
    }
    const agentKeys = Array.from(agentKeySet.entries()).map(([key, meta]) => ({
      key,
      ...meta,
    }));

    // Compute stats per version (sorted DESC — newest first, matching versions order)
    const sortedVersionLabels = versions.map((v) => v.version_label);
    const stats: VersionStats[] = [];

    for (const label of sortedVersionLabels) {
      const group = byVersion.get(label);
      if (!group || group.length === 0) continue;

      const agentAvgs = new Map<string, { avg: number; displayName: string; color: string }>();
      for (const { key, displayName, color } of agentKeys) {
        const scores: number[] = [];
        for (const ev of group) {
          const agentData = ev.agents.find((a) => a.agent_key === key);
          if (agentData) scores.push(agentData.weighted_total);
        }
        const avg = scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
        if (scores.length > 0) {
          agentAvgs.set(key, { avg, displayName, color });
        }
      }

      const overallAvg =
        group.reduce((s, ev) => s + ev.overall_avg, 0) / group.length;

      stats.push({
        version: label,
        evalCount: group.length,
        agentAvgs,
        overallAvg,
      });
    }

    return { versionStats: stats, agentKeys };
  }, [evals, versions]);

  if (versionStats.length < 2) return null;

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border-subtle">
        <h2 className="text-lg font-semibold text-text-primary">
          Version Performance
        </h2>
        <p className="text-xs text-text-tertiary mt-0.5">
          Average scores per prompt version across {versionStats.reduce((s, v) => s + v.evalCount, 0)} evals
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left text-[10px] text-text-tertiary uppercase tracking-wider font-medium px-6 py-3">
                Version
              </th>
              {agentKeys.map(({ key, displayName, color }) => (
                <th key={key} className="text-center text-[10px] text-text-tertiary uppercase tracking-wider font-medium px-4 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    {displayName.split(" ")[0]}
                  </div>
                </th>
              ))}
              <th className="text-center text-[10px] text-text-tertiary uppercase tracking-wider font-medium px-6 py-3">
                Overall
              </th>
            </tr>
          </thead>
          <tbody>
            {versionStats.map((vs, i) => {
              const prevStats = i < versionStats.length - 1 ? versionStats[i + 1] : null;
              const isBaseline = i === versionStats.length - 1;

              return (
                <tr key={vs.version} className="border-b border-border-subtle last:border-b-0 hover:bg-bg-card-hover transition-colors">
                  {/* Version label */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-text-primary">
                        {vs.version}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted bg-bg-elevated px-1.5 py-0.5 rounded">
                        {vs.evalCount}
                      </span>
                    </div>
                  </td>

                  {/* Agent scores */}
                  {agentKeys.map(({ key }) => {
                    const data = vs.agentAvgs.get(key);
                    const prevData = prevStats?.agentAvgs.get(key);
                    const delta = data && prevData ? data.avg - prevData.avg : null;

                    return (
                      <td key={key} className="px-4 py-4 text-center">
                        {data ? (
                          <div>
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="text-sm font-mono font-bold text-text-primary tabular-nums">
                                {formatScore(data.avg)}
                              </span>
                              <GradeBadge grade={gradeFromScore(data.avg)} size="sm" />
                            </div>
                            <div className="mt-1">
                              {isBaseline ? (
                                <span className="text-[10px] text-text-muted">baseline</span>
                              ) : delta !== null && delta !== 0 ? (
                                <span
                                  className="text-[10px] font-mono font-bold tabular-nums"
                                  style={{ color: delta > 0 ? "var(--color-grade-a)" : "var(--color-grade-d)" }}
                                >
                                  {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-text-muted">—</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-text-muted">—</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Overall */}
                  <td className="px-6 py-4 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-sm font-mono font-extrabold text-text-primary tabular-nums">
                          {formatScore(vs.overallAvg)}
                        </span>
                        <GradeBadge grade={gradeFromScore(vs.overallAvg)} size="sm" />
                      </div>
                      <div className="mt-1">
                        {isBaseline ? (
                          <span className="text-[10px] text-text-muted">baseline</span>
                        ) : prevStats ? (
                          (() => {
                            const d = vs.overallAvg - prevStats.overallAvg;
                            return d !== 0 ? (
                              <span
                                className="text-[10px] font-mono font-bold tabular-nums"
                                style={{ color: d > 0 ? "var(--color-grade-a)" : "var(--color-grade-d)" }}
                              >
                                {d > 0 ? "+" : ""}{d.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-text-muted">—</span>
                            );
                          })()
                        ) : (
                          <span className="text-[10px] text-text-muted">—</span>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
