import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";

interface ReviewedState {
  reviewedIds: Set<string>;
  toggleReviewed: (evalId: string) => void;
  isReviewed: (evalId: string) => boolean;
  loadFromDb: (ids: string[]) => void;
}

export const useReviewedStore = create<ReviewedState>()(
  persist(
    (set, get) => ({
      reviewedIds: new Set<string>(),

      toggleReviewed: (evalId) => {
        const wasReviewed = get().reviewedIds.has(evalId);

        set((state) => {
          const next = new Set(state.reviewedIds);
          if (wasReviewed) {
            next.delete(evalId);
          } else {
            next.add(evalId);
          }
          return { reviewedIds: next };
        });

        // Persist to DB
        if (wasReviewed) {
          supabase.from("eval_reviewed").delete().eq("eval_id", evalId).then();
        } else {
          supabase.from("eval_reviewed").upsert({ eval_id: evalId }, { onConflict: "eval_id" }).then();
        }
      },

      isReviewed: (evalId) => get().reviewedIds.has(evalId),

      loadFromDb: (ids) =>
        set(() => ({ reviewedIds: new Set(ids) })),
    }),
    {
      name: "eval-reviewed",
      partialize: (state) => ({
        reviewedIds: Array.from(state.reviewedIds),
      }),
      merge: (persisted: unknown, current) => {
        const p = persisted as { reviewedIds?: string[] } | undefined;
        return {
          ...current,
          reviewedIds: new Set(p?.reviewedIds ?? []),
        };
      },
    }
  )
);
