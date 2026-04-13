import { useQuery } from "@tanstack/react-query";
import type { AgentRegistryEntry, EvalReport } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export interface EvalListItem {
  id: string;
  created_at: string;
  brand_name: string | null;
  keyword: string | null;
  version: string;
  agents: Array<{
    agent_key: string;
    display_name: string;
    color: string;
    grade: string;
    weighted_total: number;
  }>;
  overall_avg: number;
}

export function useEvals(systemGroup: string, agents: AgentRegistryEntry[]) {
  return useQuery({
    queryKey: ["evals", systemGroup],
    queryFn: async () => {
      const groupAgents = agents.filter((a) => a.system_group === systemGroup);
      if (groupAgents.length === 0) return [];

      // Fetch ALL data from ALL agent tables in parallel (no N+1)
      const allAgentData = await Promise.all(
        groupAgents.map(async (agent) => {
          const { data } = await supabase
            .from(agent.table_name)
            .select(`id, created_at, brand_name, ${agent.eval_report_column}`)
            .order("created_at", { ascending: false });

          if (!data) return { agent, rows: new Map<string, Record<string, unknown>>() };

          const rowMap = new Map<string, Record<string, unknown>>();
          for (const row of data) {
            rowMap.set((row as unknown as Record<string, unknown>).id as string, row as unknown as Record<string, unknown>);
          }
          return { agent, rows: rowMap };
        })
      );

      // Build a map of agent_key -> { agent, rowMap }
      const agentDataMap = new Map<string, { agent: AgentRegistryEntry; rows: Map<string, Record<string, unknown>> }>();
      for (const { agent, rows } of allAgentData) {
        agentDataMap.set(agent.agent_key, { agent, rows });
      }

      // Merge eval IDs from ALL agent tables (not just primary)
      const idMap = new Map<string, { id: string; created_at: string; brand_name: string | null }>();
      for (const { rows } of allAgentData) {
        for (const [id, row] of rows) {
          const existing = idMap.get(id);
          const rowBrand = (row.brand_name as string) ?? null;
          const rowCreatedAt = row.created_at as string;
          if (!existing) {
            idMap.set(id, { id, created_at: rowCreatedAt, brand_name: rowBrand });
          } else {
            if (rowCreatedAt < existing.created_at) existing.created_at = rowCreatedAt;
            if (rowBrand && !existing.brand_name) existing.brand_name = rowBrand;
          }
        }
      }

      // Sort by created_at descending
      const mergedRows = Array.from(idMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const evalItems: EvalListItem[] = [];

      for (const row of mergedRows) {
        const agentScores = groupAgents
          .map((agent) => {
            const agentEntry = agentDataMap.get(agent.agent_key);
            if (!agentEntry) return null;

            const agentRow = agentEntry.rows.get(row.id);
            if (!agentRow) return null;

            const report = agentRow[agent.eval_report_column] as EvalReport | null;
            if (!report?.overall) return null;

            return {
              agent_key: agent.agent_key,
              display_name: agent.display_name,
              color: agent.color,
              grade: report.overall.grade,
              weighted_total: report.overall.weighted_total,
            };
          })
          .filter((a) => a !== null);

        const overallAvg =
          agentScores.length > 0
            ? agentScores.reduce((s, a) => s + a.weighted_total, 0) / agentScores.length
            : 0;

        // keyword from eval_metadata (use pre-fetched data, no extra queries)
        let keyword: string | null = null;
        for (const agent of groupAgents) {
          if (keyword) break;
          const agentEntry = agentDataMap.get(agent.agent_key);
          const agentRow = agentEntry?.rows.get(row.id);
          if (!agentRow) continue;

          const report = agentRow[agent.eval_report_column] as EvalReport | null;
          if (report?.eval_metadata) {
            const meta = report.eval_metadata;
            keyword =
              (meta.target_prompt as string) ??
              (meta.query as string) ??
              (meta.primary_keyword as string) ??
              (meta.page_url as string) ??
              (meta.own_page_url as string) ??
              null;
          }
        }

        evalItems.push({
          id: row.id,
          created_at: row.created_at,
          brand_name: row.brand_name,
          keyword,
          version: "", // resolved in EvalListPage via useMemo
          agents: agentScores,
          overall_avg: Math.round(overallAvg * 10) / 10,
        });
      }

      return evalItems;
    },
    enabled: agents.length > 0,
  });
}
