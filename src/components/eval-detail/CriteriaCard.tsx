import { useState } from "react";
import { ChevronDown, ChevronRight, ShoppingCart, Check, CheckCircle, Download } from "lucide-react";
import type { CriteriaScore, ImprovementSuggestion } from "@/lib/types";
import { getCriterionScoreColor, getFidelityConfig } from "@/lib/constants";
import { useCartStore } from "@/stores/cartStore";
import { generateSuggestionHash, formatScore, downloadFile } from "@/lib/utils";
import { DiffView } from "@/components/shared/DiffView";

interface CriteriaCardProps {
  criteria: CriteriaScore;
  suggestion?: ImprovementSuggestion;
  evalId: string;
  agentKey: string;
  agentDisplayName: string;
  showWeightBar?: boolean;
  totalWeight?: number;
  suggestionFrequency?: number;
  onHighlightInput?: (path: string) => void;
  onHighlightOutput?: (path: string) => void;
}

export function CriteriaCard({
  criteria,
  suggestion,
  evalId,
  agentKey,
  agentDisplayName,
  showWeightBar,
  totalWeight,
  suggestionFrequency,
  onHighlightInput,
  onHighlightOutput,
}: CriteriaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [directApplying, setDirectApplying] = useState(false);
  const scoreColor = getCriterionScoreColor(criteria.score);
  const fidelityConfig = getFidelityConfig(
    criteria.input_output_mapping?.fidelity ?? "medium"
  );
  const pct = (criteria.score / 10) * 100;

  const { addItem, isInCart, isApplied } = useCartStore();
  const suggestionHash = suggestion
    ? generateSuggestionHash(evalId, suggestion.affected_criterion, suggestion.prompt_patch.rule)
    : null;
  const inCart = suggestionHash ? isInCart(suggestionHash) : false;
  const applied = suggestionHash ? isApplied(suggestionHash) : false;

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden hover:border-border-default transition-colors">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-bg-card-hover transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
        )}

        <span className="text-sm font-medium text-text-primary flex-1 min-w-0 truncate">
          {criteria.label}
        </span>

        <span className="text-[10px] px-2 py-0.5 rounded bg-bg-elevated text-text-muted font-mono flex-shrink-0">
          w:{criteria.weight}
        </span>

        {/* Progress bar — 6px minimum */}
        <div
          className="w-24 rounded-full overflow-hidden flex-shrink-0"
          style={{ height: 6, backgroundColor: "var(--color-bg-page)" }}
        >
          <div
            className="h-full rounded-full animate-progress-fill"
            style={{ width: `${pct}%`, backgroundColor: scoreColor }}
          />
        </div>

        {/* Score — font-mono bold */}
        <span
          className="text-base font-mono font-bold tabular-nums min-w-[44px] text-right flex-shrink-0"
          style={{ color: scoreColor }}
        >
          {criteria.score}/10
        </span>

        {/* Contribution pts */}
        {showWeightBar && (
          <span className="text-[10px] font-mono text-text-muted tabular-nums min-w-[48px] text-right flex-shrink-0">
            {formatScore(criteria.weighted_score)} pts
          </span>
        )}
      </button>

      {/* Weight contribution bar */}
      {showWeightBar && totalWeight !== undefined && totalWeight > 0 && (
        <div className="px-5 pb-2 flex items-center gap-2">
          <div
            className="flex-1 rounded-full overflow-hidden"
            style={{ height: 4, backgroundColor: "var(--color-bg-page)" }}
          >
            <div
              className="h-full rounded-full animate-progress-fill"
              style={{
                width: `${(criteria.weight / totalWeight) * 100}%`,
                backgroundColor: "var(--color-accent-purple)",
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-text-muted tabular-nums">
            {((criteria.weight / totalWeight) * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 pt-4 space-y-4 border-t border-border-subtle">
          <p className="text-sm text-text-secondary leading-relaxed">
            {criteria.justification}
          </p>

          {/* Reference chips + fidelity */}
          <div className="flex items-center gap-2 flex-wrap">
            {criteria.input_output_mapping?.input_element && onHighlightInput && (
              <button
                onClick={() => onHighlightInput(criteria.input_output_mapping.input_element)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-agent-serp/15 text-agent-serp font-medium hover:bg-agent-serp/25 transition-colors"
              >
                <span className="opacity-60">→</span>
                INPUT: {criteria.input_output_mapping.input_element}
              </button>
            )}
            {criteria.input_output_mapping?.output_element && onHighlightOutput && (
              <button
                onClick={() => onHighlightOutput(criteria.input_output_mapping.output_element)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent-purple/15 text-accent-purple font-medium hover:bg-accent-purple/25 transition-colors"
              >
                <span className="opacity-60">←</span>
                OUTPUT: {criteria.input_output_mapping.output_element}
              </button>
            )}
            {criteria.input_output_mapping?.fidelity && (
              <span
                className="text-[10px] px-2.5 py-1 rounded-lg font-medium"
                style={{ color: fidelityConfig.color, backgroundColor: fidelityConfig.bg }}
              >
                {criteria.input_output_mapping.fidelity} fidelity
              </span>
            )}
          </div>

          {/* Evidence pills */}
          {(criteria.positive_evidence?.length > 0 || criteria.negative_evidence?.length > 0) && (
            <div className="flex items-center gap-2">
              {criteria.positive_evidence?.length > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-grade-a/12 text-grade-a font-medium">
                  + {criteria.positive_evidence.length} positive
                </span>
              )}
              {criteria.negative_evidence?.length > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-grade-d/12 text-grade-d font-medium">
                  {criteria.negative_evidence.length} negative
                </span>
              )}
            </div>
          )}

          {/* Evidence detail */}
          {(criteria.positive_evidence?.length > 0 || criteria.negative_evidence?.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {criteria.positive_evidence?.length > 0 && (
                <ul className="space-y-2">
                  {criteria.positive_evidence.map((ev, i) => (
                    <li key={i} className="text-xs text-text-secondary leading-relaxed pl-3 border-l-2 border-grade-a/25">
                      {ev}
                    </li>
                  ))}
                </ul>
              )}
              {criteria.negative_evidence?.length > 0 && (
                <ul className="space-y-2">
                  {criteria.negative_evidence.map((ev, i) => (
                    <li key={i} className="text-xs text-text-secondary leading-relaxed pl-3 border-l-2 border-grade-d/25">
                      {ev}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Export JSON button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                const exportData = {
                  eval_id: evalId,
                  agent_key: agentKey,
                  agent_display_name: agentDisplayName,
                  criteria: {
                    ...criteria,
                    ...(suggestion ? { suggestion } : {}),
                  },
                };
                const json = JSON.stringify(exportData, null, 2);
                downloadFile(json, `criteria-${criteria.criterion}-${evalId.slice(0, 8)}.json`);
              }}
              className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-elevated transition-colors font-medium"
            >
              <Download className="w-3 h-3" />
              Export JSON
            </button>
          </div>

          {/* Suggestion */}
          {suggestion && (
            <div
              className="p-4 rounded-xl bg-bg-elevated"
              style={{
                borderLeft: `3px solid ${
                  suggestion.priority === "high"
                    ? "var(--color-accent-danger)"
                    : suggestion.priority === "medium"
                    ? "var(--color-accent-warning)"
                    : "var(--color-text-tertiary)"
                }`,
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                      suggestion.priority === "high"
                        ? "bg-grade-d/12 text-grade-d"
                        : suggestion.priority === "medium"
                        ? "bg-grade-c/12 text-grade-c"
                        : "bg-grade-b/12 text-grade-b"
                    }`}
                  >
                    {suggestion.priority}
                  </span>
                  <span className="text-xs font-mono text-text-tertiary">
                    {suggestion.expected_score_impact}
                  </span>
                  {suggestionFrequency !== undefined && suggestionFrequency > 1 && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary">
                      ×{suggestionFrequency}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {!applied && !inCart && (
                    <button
                      onClick={() => {
                        if (!directApplying) {
                          setDirectApplying(true);
                          const { markApplied } = useCartStore.getState();
                          markApplied([suggestionHash!]);
                          setDirectApplying(false);
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium text-text-secondary hover:text-grade-a hover:bg-grade-a/8 border border-border-subtle transition-all"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Applied
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (!inCart && !applied) {
                        addItem(evalId, agentKey, agentDisplayName, suggestion);
                      }
                    }}
                    disabled={inCart || applied}
                    className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-semibold transition-all ${
                      applied
                        ? "bg-grade-a/12 text-grade-a cursor-default"
                        : inCart
                        ? "bg-accent-primary/12 text-accent-primary cursor-default"
                        : "bg-accent-primary text-white hover:bg-accent-primary/90 shadow-sm"
                    }`}
                  >
                    {applied ? (
                      <><Check className="w-3.5 h-3.5" /> Applied</>
                    ) : inCart ? (
                      <><Check className="w-3.5 h-3.5" /> In Cart</>
                    ) : (
                      <><ShoppingCart className="w-3.5 h-3.5" /> Add to Cart</>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {suggestion.suggestion}
              </p>

              {/* Diff view for modify_rule actions */}
              {suggestion.prompt_patch.action === "modify_rule" &&
                suggestion.prompt_patch.current_behavior &&
                suggestion.prompt_patch.rule && (
                  <div className="mt-3">
                    <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.05em] mb-1.5 block">
                      Rule Diff
                    </span>
                    <DiffView
                      oldText={suggestion.prompt_patch.current_behavior}
                      newText={suggestion.prompt_patch.rule}
                    />
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
