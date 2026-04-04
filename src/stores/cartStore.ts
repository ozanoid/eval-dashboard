import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, ImprovementSuggestion } from "@/lib/types";
import { generateSuggestionHash } from "@/lib/utils";

interface CartState {
  items: CartItem[];
  appliedHashes: Set<string>;
  addItem: (
    evalId: string,
    agentKey: string,
    agentDisplayName: string,
    suggestion: ImprovementSuggestion
  ) => void;
  removeItem: (hash: string) => void;
  clearCart: () => void;
  isInCart: (hash: string) => boolean;
  isApplied: (hash: string) => boolean;
  markApplied: (hashes: string[]) => void;
  loadAppliedFromDb: (hashes: string[]) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      appliedHashes: new Set<string>(),

      addItem: (evalId, agentKey, agentDisplayName, suggestion) => {
        const hash = generateSuggestionHash(
          evalId,
          suggestion.affected_criterion,
          suggestion.prompt_patch.rule
        );
        if (get().isInCart(hash) || get().isApplied(hash)) return;
        set((state) => ({
          items: [
            ...state.items,
            {
              suggestion_hash: hash,
              eval_id: evalId,
              agent_key: agentKey,
              agent_display_name: agentDisplayName,
              suggestion,
            },
          ],
        }));
      },

      removeItem: (hash) =>
        set((state) => ({
          items: state.items.filter((i) => i.suggestion_hash !== hash),
        })),

      clearCart: () => set({ items: [] }),

      isInCart: (hash) => get().items.some((i) => i.suggestion_hash === hash),

      isApplied: (hash) => get().appliedHashes.has(hash),

      markApplied: (hashes) =>
        set((state) => {
          const newApplied = new Set(state.appliedHashes);
          hashes.forEach((h) => newApplied.add(h));
          return {
            appliedHashes: newApplied,
            items: state.items.filter(
              (i) => !hashes.includes(i.suggestion_hash)
            ),
          };
        }),

      loadAppliedFromDb: (hashes) =>
        set(() => ({ appliedHashes: new Set(hashes) })),
    }),
    {
      name: "eval-cart",
      partialize: (state) => ({
        items: state.items,
        appliedHashes: Array.from(state.appliedHashes),
      }),
      merge: (persisted: unknown, current) => {
        const p = persisted as { items?: CartItem[]; appliedHashes?: string[] } | undefined;
        return {
          ...current,
          items: p?.items ?? [],
          appliedHashes: new Set(p?.appliedHashes ?? []),
        };
      },
    }
  )
);
