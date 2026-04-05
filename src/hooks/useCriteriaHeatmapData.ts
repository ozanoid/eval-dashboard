import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AgentRegistryEntry, EvalReport } from "@/lib/types";

export interface HeatmapRow {
  date: string; // YYYY-MM-DD
  scores: Record<string, number>; // criterion → average score for that day
}

/**
 * Fetches all eval reports for a single agent and aggregates
 * criteria scores by date (daily averages).
 *
 * Row = date, Column = criterion, Cell = avg score that day.
 */
export function useCriteriaHeatmapData(agent: AgentRegistryEntry | null) {
  return useQuery({
    queryKey: ["criteria-heatmap", agent?.agent_key],
    queryFn: async (): Promise<HeatmapRow[]> => {
      if (!agent) return [];

      const { data: rows } = await supabase
        .from(agent.table_name)
        .select(`created_at, ${agent.eval_report_column}`)
        .order("created_at", { ascending: true });

      if (!rows) return [];

      // Group by date → criteria → scores[]
      const dateMap = new Map<
        string,
        Map<string, number[]>
      >();

      for (const row of rows) {
        const report = (row as unknown as Record<string, unknown>)[
          agent.eval_report_column
        ] as EvalReport | null;
        if (!report?.criteria_scores) continue;

        const date = new Date(
          (row as unknown as Record<string, unknown>).created_at as string
        )
          .toISOString()
          .split("T")[0];

        if (!dateMap.has(date)) {
          dateMap.set(date, new Map());
        }
        const criteriaMap = dateMap.get(date)!;

        for (const cs of report.criteria_scores) {
          const scores = criteriaMap.get(cs.criterion) ?? [];
          scores.push(cs.score);
          criteriaMap.set(cs.criterion, scores);
        }
      }

      // Convert to HeatmapRow[] with daily averages
      const result: HeatmapRow[] = [];
      for (const [date, criteriaMap] of dateMap) {
        const scores: Record<string, number> = {};
        for (const [criterion, values] of criteriaMap) {
          scores[criterion] =
            Math.round(
              (values.reduce((s, v) => s + v, 0) / values.length) * 10
            ) / 10;
        }
        result.push({ date, scores });
      }

      return result;
    },
    enabled: !!agent,
    staleTime: 5 * 60 * 1000,
  });
}
