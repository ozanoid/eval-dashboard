import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X, ExternalLink, CheckCircle, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import {
  useSuggestionFrequency,
  type SuggestionFrequencyItem,
  type SuggestionOccurrence,
} from "@/hooks/useSuggestionFrequency";
import { useCartStore } from "@/stores/cartStore";
import { generateSuggestionHash, formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

function titleCase(snakeStr: string): string {
  return snakeStr
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function frequencyColor(ratio: number): string {
  if (ratio >= 0.8) return "var(--color-grade-d)";
  if (ratio >= 0.5) return "var(--color-accent-warning)";
  return "var(--color-grade-c)";
}

interface CommonSuggestionsProps {
  systemGroup: string;
}

export function CommonSuggestions({ systemGroup }: CommonSuggestionsProps) {
  const { agents, systemGroups } = useAgentRegistry();
  const systemName =
    systemGroups.find((g) => g.group_key === systemGroup)?.display_name ?? "";
  const { data } = useSuggestionFrequency(systemGroup, agents);
  const appliedHashes = useCartStore((s) => s.appliedHashes);
  const [selectedItem, setSelectedItem] = useState<SuggestionFrequencyItem | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;

  // Count total unique criteria (before filtering) and resolved count
  const { filteredSuggestions, resolvedCount, totalCriteriaCount } = useMemo(() => {
    if (!data) return { filteredSuggestions: [], resolvedCount: 0, totalCriteriaCount: 0 };

    const totalCriteriaCount = data.topSuggestions.length;
    let resolvedCount = 0;

    const filtered = data.topSuggestions
      .map((item) => {
        const unapplied = item.occurrences.filter((occ) => {
          const hash = generateSuggestionHash(
            occ.evalId,
            occ.suggestion.affected_criterion,
            occ.suggestion.prompt_patch.rule
          );
          return !appliedHashes.has(hash);
        });
        if (unapplied.length === 0) resolvedCount++;
        return { ...item, occurrences: unapplied, count: unapplied.length };
      })
      .filter((item) => item.count > 0);

    return { filteredSuggestions: filtered, resolvedCount, totalCriteriaCount };
  }, [data, appliedHashes]);

  if (!data || data.topSuggestions.length === 0) return null;

  return (
    <>
      <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Most Common Suggestions
            </h2>
            <p className="text-xs text-text-tertiary mt-0.5">
              Recurring issues across {data.totalEvals} evals in {systemName}
            </p>
          </div>
          {resolvedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-success/10 text-accent-success text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              {resolvedCount} of {totalCriteriaCount} resolved
            </div>
          )}
        </div>

        {filteredSuggestions.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle className="w-8 h-8 text-accent-success mb-2" />
            <p className="text-sm text-text-secondary font-medium">All top issues resolved</p>
            <p className="text-xs text-text-muted mt-1">Great work — all recurring suggestions have been applied.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {filteredSuggestions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((item, i) => {
                const globalIndex = page * PAGE_SIZE + i;
                const ratio = item.count / data.totalEvals;
                const pct = Math.round(ratio * 100);
                const color = frequencyColor(ratio);

                // Unique agents for this criterion
                const uniqueAgents = Array.from(
                  new Set(item.occurrences.map((o) => o.agentDisplayName))
                );

                return (
                  <button
                    key={item.criterion}
                    onClick={() => setSelectedItem(item)}
                    className="w-full text-left p-4 rounded-xl bg-bg-elevated hover:bg-bg-card-hover transition-colors cursor-pointer group border border-transparent hover:border-border-default"
                    style={{
                      borderLeft: `3px solid ${
                        item.latestSuggestion.priority === "high"
                          ? "var(--color-accent-danger)"
                          : item.latestSuggestion.priority === "medium"
                          ? "var(--color-accent-warning)"
                          : "var(--color-text-tertiary)"
                      }`,
                    }}
                  >
                    {/* Top row: rank + criterion name + badges */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-sm font-mono font-bold text-text-muted tabular-nums w-5 text-center flex-shrink-0">
                        {globalIndex + 1}
                      </span>
                      <span className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                        {titleCase(item.criterion)}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          item.latestSuggestion.priority === "high"
                            ? "bg-grade-d/12 text-grade-d"
                            : item.latestSuggestion.priority === "medium"
                            ? "bg-grade-c/12 text-grade-c"
                            : "bg-grade-b/12 text-grade-b"
                        }`}
                      >
                        {item.latestSuggestion.priority}
                      </span>
                      {item.latestSuggestion.expected_score_impact && (
                        <span className="text-[10px] font-mono text-accent-success bg-accent-success/10 px-1.5 py-0.5 rounded font-medium">
                          {item.latestSuggestion.expected_score_impact}
                        </span>
                      )}
                    </div>

                    {/* Suggestion text */}
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 ml-[30px] mb-3">
                      {item.latestSuggestion.suggestion}
                    </p>

                    {/* Bottom row: agents + frequency bar */}
                    <div className="flex items-center gap-3 ml-[30px]">
                      {/* Agent info */}
                      <span className="text-[10px] text-text-muted flex-shrink-0">
                        via {uniqueAgents[0]}
                        {uniqueAgents.length > 1 && (
                          <span className="text-accent-primary ml-1">
                            +{uniqueAgents.length - 1} more
                          </span>
                        )}
                      </span>

                      {/* Frequency bar */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="flex-1 rounded-full overflow-hidden"
                          style={{ height: 4, backgroundColor: "var(--color-bg-page)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                        <span
                          className="text-[11px] font-mono font-bold tabular-nums flex-shrink-0"
                          style={{ color }}
                        >
                          {pct}%
                        </span>
                        <span className="text-[10px] text-text-muted tabular-nums flex-shrink-0">
                          ({item.count}/{data.totalEvals})
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {filteredSuggestions.length > PAGE_SIZE && (
              <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-border-subtle">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-30 disabled:cursor-default"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-text-tertiary tabular-nums font-mono">
                  {page + 1} / {Math.ceil(filteredSuggestions.length / PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(Math.ceil(filteredSuggestions.length / PAGE_SIZE) - 1, p + 1))}
                  disabled={page >= Math.ceil(filteredSuggestions.length / PAGE_SIZE) - 1}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-30 disabled:cursor-default"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <SuggestionDetailModal
          item={selectedItem}
          systemGroup={systemGroup}
          totalEvals={data.totalEvals}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}

function SuggestionDetailModal({
  item,
  systemGroup,
  totalEvals,
  onClose,
}: {
  item: SuggestionFrequencyItem;
  systemGroup: string;
  totalEvals: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { markApplied } = useCartStore();

  async function handleApplyAll() {
    const rows = item.occurrences.map((occ) => ({
      eval_id: occ.evalId,
      agent_key: occ.agentKey,
      suggestion_hash: generateSuggestionHash(
        occ.evalId,
        occ.suggestion.affected_criterion,
        occ.suggestion.prompt_patch.rule
      ),
      suggestion_data: occ.suggestion,
    }));
    await supabase.from("suggestion_applications").upsert(rows, { onConflict: "suggestion_hash" });
    markApplied(rows.map((r) => r.suggestion_hash));
    onClose();
  }

  const ratio = item.count / totalEvals;
  const pct = Math.round(ratio * 100);
  const color = frequencyColor(ratio);

  // Group by agent
  const agentGroups = new Map<string, SuggestionOccurrence[]>();
  for (const occ of item.occurrences) {
    const list = agentGroups.get(occ.agentDisplayName) ?? [];
    list.push(occ);
    agentGroups.set(occ.agentDisplayName, list);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg-elevated border border-border-default rounded-xl max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-text-primary">
              {titleCase(item.criterion)}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                item.latestSuggestion.priority === "high"
                  ? "bg-grade-d/12 text-grade-d"
                  : item.latestSuggestion.priority === "medium"
                  ? "bg-grade-c/12 text-grade-c"
                  : "bg-grade-b/12 text-grade-b"
              }`}
            >
              {item.latestSuggestion.priority}
            </span>
            {item.latestSuggestion.expected_score_impact && (
              <span className="text-[10px] font-mono text-accent-success bg-accent-success/10 px-1.5 py-0.5 rounded font-medium">
                {item.latestSuggestion.expected_score_impact}
              </span>
            )}
            <span className="text-[10px] text-text-muted">
              {item.occurrences.length} unapplied across {Array.from(agentGroups.keys()).length} agent{agentGroups.size !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Frequency bar */}
          <div className="flex items-center gap-2">
            <div
              className="flex-1 rounded-full overflow-hidden"
              style={{ height: 4, backgroundColor: "var(--color-bg-page)" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color }}>
              {pct}%
            </span>
            <span className="text-[10px] text-text-muted tabular-nums">
              ({item.count}/{totalEvals})
            </span>
          </div>
        </div>

        {/* Occurrence list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {Array.from(agentGroups.entries()).map(([agentName, occs]) => (
            <div key={agentName}>
              {agentGroups.size > 1 && (
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium mb-1.5 mt-2 first:mt-0">
                  {agentName}
                </p>
              )}
              {occs.map((occ, i) => (
                <button
                  key={`${occ.evalId}-${i}`}
                  onClick={() => {
                    onClose();
                    navigate(`/evals/${systemGroup}/${occ.evalId}`);
                  }}
                  className="w-full text-left p-3 rounded-lg bg-bg-card border border-border-subtle hover:border-accent-primary/30 hover:bg-bg-card-hover transition-all group mb-1.5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-primary">
                        {occ.brandName ?? occ.evalId.slice(0, 12) + "..."}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {occ.createdAt ? formatDate(occ.createdAt) : ""}
                      </span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                    {occ.suggestion.suggestion}
                  </p>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-subtle flex-shrink-0 flex items-center justify-end gap-2">
          <button
            onClick={handleApplyAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-success/15 text-accent-success text-xs font-semibold hover:bg-accent-success/25 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Mark All as Applied ({item.occurrences.length})
          </button>
        </div>
      </div>
    </div>
  );
}
