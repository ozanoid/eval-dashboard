import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ExternalLink } from "lucide-react";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import {
  useSuggestionFrequency,
  type SuggestionFrequencyItem,
} from "@/hooks/useSuggestionFrequency";
import { useCartStore } from "@/stores/cartStore";
import { generateSuggestionHash } from "@/lib/utils";

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

  if (!data || data.topSuggestions.length === 0) return null;

  // Filter out fully-applied suggestions
  const filteredSuggestions = data.topSuggestions
    .map((item) => {
      const unapplied = item.occurrences.filter((occ) => {
        const hash = generateSuggestionHash(
          occ.evalId,
          occ.suggestion.affected_criterion,
          occ.suggestion.prompt_patch.rule
        );
        return !appliedHashes.has(hash);
      });
      return { ...item, occurrences: unapplied, count: unapplied.length };
    })
    .filter((item) => item.count > 0);

  if (filteredSuggestions.length === 0) return null;

  return (
    <>
      <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-1">
          Most Common Suggestions
        </h2>
        <p className="text-xs text-text-tertiary mb-5">
          Recurring unapplied suggestions across {data.totalEvals} evals in{" "}
          {systemName}
        </p>

        <div className="space-y-3">
          {filteredSuggestions.map((item, i) => (
            <button
              key={item.criterion}
              onClick={() => setSelectedItem(item)}
              className="w-full text-left flex items-start gap-3 p-3 rounded-lg bg-bg-elevated hover:bg-bg-card-hover transition-colors cursor-pointer group"
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
              <span className="text-lg font-mono font-bold text-text-muted tabular-nums min-w-[24px]">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-accent-primary font-medium group-hover:underline">
                    {item.criterion}
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
                </div>
                <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
                  {item.latestSuggestion.suggestion}
                </p>
                <p className="text-[10px] text-text-muted mt-1">
                  via {item.agentDisplayName}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-sm font-mono font-bold text-accent-primary">
                  {item.count}/{data.totalEvals}
                </span>
                <p className="text-[10px] text-text-muted">evals</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <SuggestionDetailModal
          item={selectedItem}
          systemGroup={systemGroup}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}

function SuggestionDetailModal({
  item,
  systemGroup,
  onClose,
}: {
  item: SuggestionFrequencyItem;
  systemGroup: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg-elevated border border-border-default rounded-xl max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              {item.criterion.replace(/_/g, " ")}
            </h2>
            <p className="text-[10px] text-text-muted mt-0.5">
              {item.occurrences.length} unapplied occurrence
              {item.occurrences.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {item.occurrences.map((occ, i) => (
            <button
              key={`${occ.evalId}-${i}`}
              onClick={() => {
                onClose();
                navigate(`/evals/${systemGroup}/${occ.evalId}`);
              }}
              className="w-full text-left p-3 rounded-lg bg-bg-card border border-border-subtle hover:border-accent-primary/30 hover:bg-bg-card-hover transition-all group"
              style={{
                borderLeft: `3px solid ${
                  occ.suggestion.priority === "high"
                    ? "var(--color-accent-danger)"
                    : occ.suggestion.priority === "medium"
                    ? "var(--color-accent-warning)"
                    : "var(--color-text-tertiary)"
                }`,
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      occ.suggestion.priority === "high"
                        ? "bg-grade-d/12 text-grade-d"
                        : occ.suggestion.priority === "medium"
                        ? "bg-grade-c/12 text-grade-c"
                        : "bg-grade-b/12 text-grade-b"
                    }`}
                  >
                    {occ.suggestion.priority}
                  </span>
                  <span className="text-xs font-mono text-text-tertiary">
                    {occ.suggestion.expected_score_impact}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    via {occ.agentDisplayName}
                  </span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {occ.suggestion.suggestion}
              </p>
              <p className="text-[10px] font-mono text-text-muted mt-1.5">
                eval: {occ.evalId.slice(0, 16)}...
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
