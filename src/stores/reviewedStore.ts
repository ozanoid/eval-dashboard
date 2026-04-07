import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ReviewedState {
  reviewedIds: Set<string>;
  toggleReviewed: (evalId: string) => void;
  isReviewed: (evalId: string) => boolean;
}

export const useReviewedStore = create<ReviewedState>()(
  persist(
    (set, get) => ({
      reviewedIds: new Set<string>(),

      toggleReviewed: (evalId) =>
        set((state) => {
          const next = new Set(state.reviewedIds);
          if (next.has(evalId)) {
            next.delete(evalId);
          } else {
            next.add(evalId);
          }
          return { reviewedIds: next };
        }),

      isReviewed: (evalId) => get().reviewedIds.has(evalId),
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
