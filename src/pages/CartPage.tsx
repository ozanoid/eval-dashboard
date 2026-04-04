import { useState } from "react";
import { ShoppingCart, Download, Trash2, CheckCircle } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { CartItem } from "@/components/cart/CartItem";
import { EmptyState } from "@/components/shared/EmptyState";
import { generateTxtExport, downloadFile } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export function CartPage() {
  const { items, clearCart, markApplied } = useCartStore();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const group = grouped.get(item.agent_display_name) ?? [];
    group.push(item);
    grouped.set(item.agent_display_name, group);
  }

  async function handleApplyAll() {
    if (items.length === 0) return;
    setApplying(true);
    try {
      const batchId = crypto.randomUUID();
      const evalId = items[0].eval_id;
      const txt = generateTxtExport(items, evalId);
      downloadFile(txt, `suggestions-${batchId.slice(0, 8)}.txt`);
      const rows = items.map((item) => ({
        eval_id: item.eval_id,
        agent_key: item.agent_key,
        suggestion_hash: item.suggestion_hash,
        suggestion_data: item.suggestion,
        batch_id: batchId,
      }));
      await supabase.from("suggestion_applications").insert(rows);
      markApplied(items.map((i) => i.suggestion_hash));
      setApplied(true);
    } catch (err) {
      console.error("Failed to apply suggestions:", err);
    } finally {
      setApplying(false);
    }
  }

  if (applied) {
    return (
      <div className="p-8 max-w-4xl">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-grade-a/12 flex items-center justify-center mb-4">
            <CheckCircle className="w-7 h-7 text-grade-a" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Suggestions Applied!</h2>
          <p className="text-sm text-text-secondary max-w-sm">
            All suggestions have been exported and marked as applied. The TXT file has been downloaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Suggestion Cart</h1>
          <p className="text-sm text-text-tertiary mt-1">
            {items.length} suggestion{items.length !== 1 ? "s" : ""} ready to apply
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={clearCart}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-text-secondary hover:text-grade-d border border-border-subtle rounded-lg hover:border-grade-d/30 transition-colors font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
            <button
              onClick={handleApplyAll}
              disabled={applying}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent-primary rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> {applying ? "Applying..." : "Apply & Export"}
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          description="Add improvement suggestions from eval detail pages to build a batch for application."
          icon={<ShoppingCart className="w-6 h-6" />}
        />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([agentName, agentItems]) => (
            <div key={agentName}>
              <h3 className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.08em] mb-3">
                {agentName} ({agentItems.length})
              </h3>
              <div className="space-y-3">
                {agentItems.map((item) => (
                  <CartItem key={item.suggestion_hash} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
