import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AgentRegistryEntry, EvalReport } from "@/lib/types";

/**
 * Fetches the last N overall scores per grouping key for a system group.
 * Groups by brand_name when available, otherwise falls back to keyword
 * (e.g. page_url for PDP systems).
 * Returns a Map<groupKey, scores[]> where scores are ordered oldest→newest.
 */
export function useBrandScoreHistory(
  systemGroup: string,
  agents: AgentRegistryEntry[],
  limit = 5
) {
  const groupAgents = agents.filter((a) => a.system_group === systemGroup);

  return useQuery({
    queryKey: ["brand-score-history", systemGroup],
    queryFn: async () => {
      if (groupAgents.length === 0) return new Map<string, number[]>();

      // Deduplicate tables
      const uniqueTables = Array.from(
        new Map(groupAgents.map((a) => [a.table_name, a])).values()
      );

      // Fetch rows from all agent tables
      const allRows: Array<{
        id: string;
        created_at: string;
        brand_name: string | null;
        report: EvalReport | null;
      }> = [];

      await Promise.all(
        uniqueTables.map(async (agent) => {
          const hasBrandCol = agent.table_name.includes("content_brief")
            || agent.table_name.includes("pdp")
            || agent.table_name.includes("citation_readiness");
          const cols = hasBrandCol
            ? `id, created_at, brand_name, ${agent.eval_report_column}`
            : `id, created_at, ${agent.eval_report_column}`;
          const { data: rows } = await supabase
            .from(agent.table_name)
            .select(cols)
            .order("created_at", { ascending: true });

          if (!rows) return;

          for (const row of rows) {
            const r = row as unknown as Record<string, unknown>;
            allRows.push({
              id: r.id as string,
              created_at: r.created_at as string,
              brand_name: (r.brand_name as string) ?? null,
              report: r[agent.eval_report_column] as EvalReport | null,
            });
          }
        })
      );

      // Deduplicate: for each eval ID, compute average score across all available agents
      // and determine a grouping key (brand_name or page_url)
      const evalMap = new Map<
        string,
        { created_at: string; groupKey: string | null; scores: number[] }
      >();

      for (const row of allRows) {
        if (!row.report?.overall?.weighted_total) continue;

        const existing = evalMap.get(row.id);
        if (existing) {
          existing.scores.push(row.report.overall.weighted_total);
          // Prefer a groupKey from any source
          if (!existing.groupKey) {
            existing.groupKey = deriveGroupKey(row.brand_name, row.report);
          }
        } else {
          evalMap.set(row.id, {
            created_at: row.created_at,
            groupKey: deriveGroupKey(row.brand_name, row.report),
            scores: [row.report.overall.weighted_total],
          });
        }
      }

      // Build the brand/keyword → score[] map
      const groupMap = new Map<string, number[]>();

      // Sort by created_at ascending for correct ordering
      const sortedEvals = Array.from(evalMap.values()).sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      for (const eval_ of sortedEvals) {
        const key = eval_.groupKey;
        if (!key) continue;

        const avg =
          eval_.scores.reduce((s, v) => s + v, 0) / eval_.scores.length;
        const scores = groupMap.get(key) ?? [];
        scores.push(avg);
        groupMap.set(key, scores);
      }

      // Keep only last N scores per group
      for (const [key, scores] of groupMap) {
        if (scores.length > limit) {
          groupMap.set(key, scores.slice(-limit));
        }
      }

      return groupMap;
    },
    enabled: groupAgents.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Derives the grouping key from available metadata.
 * Priority: brand_name (table) → brand_name (meta) → product_name_output → page_url
 */
/**
 * Derives the grouping key from available metadata.
 * For PDP: groups by page_url (owned URL) so same-product evals are tracked together.
 * For other systems: groups by brand_name.
 */
function deriveGroupKey(
  tableBrandName: string | null,
  report: EvalReport | null
): string | null {
  const meta = report?.eval_metadata;

  // PDP-specific: URL-based grouping takes priority when available
  if (meta?.page_url) return meta.page_url as string;
  if (meta?.own_page_url) return meta.own_page_url as string;

  // Standard: table brand_name → metadata brand_name → target_prompt
  if (tableBrandName) return tableBrandName;
  if (meta?.brand_name) return meta.brand_name as string;
  if (meta?.target_prompt) return meta.target_prompt as string;

  return null;
}
