import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AgentRegistryEntry, EvalReport } from "@/lib/types";

/**
 * Fetches the last N overall scores per brand for a system group.
 * Returns a Map<brandName, scores[]> where scores are ordered oldest→newest.
 * Single query to primary table, grouped in JS — no N+1.
 */
export function useBrandScoreHistory(
  systemGroup: string,
  agents: AgentRegistryEntry[],
  limit = 5
) {
  const groupAgents = agents.filter((a) => a.system_group === systemGroup);
  const primaryAgent =
    groupAgents.find((a) => a.table_name.includes("content_brief")) ??
    groupAgents[0];

  return useQuery({
    queryKey: ["brand-score-history", systemGroup],
    queryFn: async () => {
      if (!primaryAgent) return new Map<string, number[]>();

      const { data: rows } = await supabase
        .from(primaryAgent.table_name)
        .select(`id, created_at, brand_name, ${primaryAgent.eval_report_column}`)
        .order("created_at", { ascending: true });

      if (!rows) return new Map<string, number[]>();

      // Group by brand_name
      const brandMap = new Map<string, number[]>();

      for (const row of rows) {
        const brand = (row as unknown as Record<string, unknown>).brand_name as string | null;
        if (!brand) continue;

        const report = (row as unknown as Record<string, unknown>)[
          primaryAgent.eval_report_column
        ] as EvalReport | null;
        if (!report?.overall?.weighted_total) continue;

        const scores = brandMap.get(brand) ?? [];
        scores.push(report.overall.weighted_total);
        brandMap.set(brand, scores);
      }

      // Keep only last N scores per brand
      for (const [brand, scores] of brandMap) {
        if (scores.length > limit) {
          brandMap.set(brand, scores.slice(-limit));
        }
      }

      return brandMap;
    },
    enabled: groupAgents.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
