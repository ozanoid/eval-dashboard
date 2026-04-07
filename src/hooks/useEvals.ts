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
    queryKey: ["evals", systemGroup, promptVersions?.length ?? 0],
    queryFn: async () => {
      const groupAgents = agents.filter((a) => a.system_group === systemGroup);
      if (groupAgents.length === 0) return [];

      // Find the content brief table for brand_name, or use first agent
      const briefAgent = groupAgents.find((a) =>
        a.table_name.includes("content_brief")
      );
      const primaryAgent = briefAgent ?? groupAgents[0];

      // Fetch IDs from primary table
      const { data: rows, error } = await supabase
        .from(primaryAgent.table_name)
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !rows) return [];

      // For each row, fetch eval reports from all agent tables
      const evalItems: EvalListItem[] = [];

      for (const row of rows) {
        const agentScores = await Promise.all(
          groupAgents.map(async (agent) => {
            if (agent.agent_key === primaryAgent.agent_key) {
              const report = row[agent.eval_report_column] as EvalReport | null;
              return report
                ? {
                    agent_key: agent.agent_key,
                    display_name: agent.display_name,
                    color: agent.color,
                    grade: report.overall.grade,
                    weighted_total: report.overall.weighted_total,
                  }
                : null;
            }

            const { data } = await supabase
              .from(agent.table_name)
              .select(agent.eval_report_column)
              .eq("id", row.id)
              .single();

            if (!data) return null;
            const report = (data as unknown as Record<string, unknown>)[agent.eval_report_column] as EvalReport | null;
            return report
              ? {
                  agent_key: agent.agent_key,
                  display_name: agent.display_name,
                  color: agent.color,
                  grade: report.overall.grade,
                  weighted_total: report.overall.weighted_total,
                }
              : null;
          })
        );

        const validAgents = agentScores.filter((a) => a !== null);
        const overallAvg =
          validAgents.length > 0
            ? validAgents.reduce((s, a) => s + a.weighted_total, 0) /
              validAgents.length
            : 0;

        // Extract metadata
        let brandName: string | null = row.brand_name ?? null;
        let keyword: string | null = null;

        if (briefAgent && row[briefAgent.eval_report_column]) {
          const meta = (row[briefAgent.eval_report_column] as EvalReport)
            .eval_metadata;
          keyword = (meta.target_prompt as string) ?? (meta.primary_keyword as string) ?? null;
        }

        evalItems.push({
          id: row.id,
          created_at: row.created_at,
          brand_name: brandName,
          keyword,
          version: resolveVersion(row.created_at, promptVersions ?? []),
          agents: validAgents,
          overall_avg: Math.round(overallAvg * 10) / 10,
        });
      }

      return evalItems;
    },
    enabled: agents.length > 0,
  });
}
