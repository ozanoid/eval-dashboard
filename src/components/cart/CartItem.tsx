import { Trash2 } from "lucide-react";
import type { CartItem as CartItemType } from "@/lib/types";
import { useCartStore } from "@/stores/cartStore";

interface CartItemProps {
  item: CartItemType;
}

const PRIORITY_BORDER: Record<string, string> = {
  high: "var(--color-accent-danger)",
  medium: "var(--color-accent-warning)",
  low: "var(--color-text-tertiary)",
};

export function CartItem({ item }: CartItemProps) {
  const removeItem = useCartStore((s) => s.removeItem);
  const { suggestion } = item;

  return (
    <div
      className="bg-bg-card border border-border-subtle rounded-xl p-5"
      style={{ borderLeftWidth: 3, borderLeftColor: PRIORITY_BORDER[suggestion.priority] ?? PRIORITY_BORDER.low }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md flex-shrink-0 ${
              suggestion.priority === "high"
                ? "bg-grade-d/12 text-grade-d"
                : suggestion.priority === "medium"
                ? "bg-grade-c/12 text-grade-c"
                : "bg-grade-b/12 text-grade-b"
            }`}
          >
            {suggestion.priority}
          </span>
          <span className="text-xs text-text-tertiary truncate">{item.agent_display_name}</span>
        </div>
        <button
          onClick={() => removeItem(item.suggestion_hash)}
          className="p-1.5 rounded-lg text-text-muted hover:text-grade-d hover:bg-grade-d/8 transition-colors flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-sm text-text-primary mb-3 leading-relaxed">{suggestion.suggestion}</p>

      <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
        <span>Criterion: <span className="text-text-secondary">{suggestion.affected_criterion}</span></span>
        <span>Impact: <span className="text-grade-a font-mono font-medium">{suggestion.expected_score_impact}</span></span>
      </div>

      <div className="rounded-lg bg-bg-page font-mono text-xs overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border-subtle text-text-muted">
          <span><span className="text-accent-purple">Action:</span> {suggestion.prompt_patch.action}</span>
          <span><span className="text-accent-purple">Target:</span> {suggestion.prompt_patch.target_section}</span>
        </div>
        <div className="px-4 py-2.5 border-b border-border-subtle bg-grade-d/5">
          <span className="text-[10px] font-semibold text-grade-d uppercase tracking-[0.05em]">Current Behavior</span>
          <p className="text-text-secondary mt-0.5 leading-relaxed">
            {suggestion.prompt_patch.current_behavior.slice(0, 200)}
            {suggestion.prompt_patch.current_behavior.length > 200 && "..."}
          </p>
        </div>
        <div className="px-4 py-2.5 bg-grade-a/5">
          <span className="text-[10px] font-semibold text-grade-a uppercase tracking-[0.05em]">New Rule</span>
          <p className="text-text-secondary mt-0.5 leading-relaxed">
            {suggestion.prompt_patch.rule.slice(0, 200)}
            {suggestion.prompt_patch.rule.length > 200 && "..."}
          </p>
        </div>
      </div>
    </div>
  );
}
