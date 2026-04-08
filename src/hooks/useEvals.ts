import { useQuery } from "@tanstack/react-query";
import type { AgentRegistryEntry, EvalReport } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import type { PromptVersion } from "./usePromptVersions";
import { resolveVersion } from "./usePromptVersions";

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

export function useEvals(systemGroup: string, agents: AgentRegistryEntry[], promptVersions?: PromptVersion[]) {
  return useQuery({
    queryKey: ["evals", systemGroup],
    queryFn: async () => {
      const groupAgents = agents.filter((a) => a.system_group === systemGroup);
      if (groupAgents.length === 0) return [];

      // Find the content brief table for brand_name, or use first agent
      const briefAgent = groupAgents.find((a) =>
        a.table_name.includes("content_brief")
      );
      const primaryAgent = briefAgent ?? groupAgents[0];

      // Fetch ALL data from ALL agent tables in parallel (no N+1)
      const allAgentData = await Promise.all(
        groupAgents.map(async (agent) => {
          const { data } = await supabase
            .from(agent.table_name)
            .select(`id, created_at, ${agent.eval_report_column}${agent === primaryAgent && agent.table_name.includes("content_brief") ? ", brand_name" : ""}`)
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

      // Get all eval IDs from primary agent (ordered by created_at DESC)
      const primaryData = agentDataMap.get(primaryAgent.agent_key);
      if (!primaryData) return [];

      const evalItems: EvalListItem[] = [];

      for (const [evalId, primaryRow] of primaryData.rows) {
        const agentScores = groupAgents
          .map((agent) => {
            const agentEntry = agentDataMap.get(agent.agent_key);
            if (!agentEntry) return null;

            const row = agentEntry.rows.get(evalId);
            if (!row) return null;

            const report = row[agent.eval_report_column] as EvalReport | null;
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

        // Extract metadata
        let brandName: string | null = (primaryRow.brand_name as string) ?? null;
        let keyword: string | null = null;
        const createdAt = primaryRow.created_at as string;

        if (briefAgent) {
          const report = primaryRow[briefAgent.eval_report_column] as EvalReport | null;
          if (report?.eval_metadata) {
            const meta = report.eval_metadata;
            keyword = (meta.target_prompt as string) ?? (meta.primary_keyword as string) ?? null;
          }
        }

        evalItems.push({
          id: evalId,
          created_at: createdAt,
          brand_name: brandName,
          keyword,
          version: resolveVersion(createdAt, promptVersions ?? []),
          agents: agentScores,
          overall_avg: Math.round(overallAvg * 10) / 10,
        });
      }

      return evalItems;
    },
    enabled: agents.length > 0,
  });
}
