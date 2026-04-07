import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AgentRegistryEntry, EvalReport, ImprovementSuggestion } from "@/lib/types";

export interface SuggestionOccurrence {
  evalId: string;
  brandName: string | null;
  createdAt: string;
  suggestion: ImprovementSuggestion;
  agentKey: string;
  agentDisplayName: string;
}

export interface SuggestionFrequencyItem {
  criterion: string;
  count: number;
  totalEvals: number;
  latestSuggestion: ImprovementSuggestion;
  agentKey: string;
  agentDisplayName: string;
  evalIds: string[];
  occurrences: SuggestionOccurrence[];
}

/**
 * Analyzes suggestion frequency across all evals for a system group.
 * Groups by affected_criterion — same criterion appearing in multiple evals = systemic issue.
 */
export function useSuggestionFrequency(
  systemGroup: string,
  agents: AgentRegistryEntry[]
) {
  const groupAgents = agents.filter((a) => a.system_group === systemGroup);

  return useQuery({
    queryKey: ["suggestion-frequency", systemGroup],
    queryFn: async () => {
      if (groupAgents.length === 0)
        return { frequencyMap: new Map<string, number>(), topSuggestions: [], totalEvals: 0 };

      // Find primary table for eval count
      const primaryAgent =
        groupAgents.find((a) => a.table_name.includes("content_brief")) ??
        groupAgents[0];

      const { data: primaryRows } = await supabase
        .from(primaryAgent.table_name)
        .select("id");

      const totalEvals = primaryRows?.length ?? 0;

      // For each agent, fetch all eval reports and extract suggestions
      const criterionOccurrences = new Map<string, SuggestionOccurrence[]>();

      // Fetch brand_name from primary table for display
      const brandMap = new Map<string, { brandName: string | null; createdAt: string }>();
      const { data: brandRows } = await supabase
        .from(primaryAgent.table_name)
        .select("id, created_at, brand_name");
      if (brandRows) {
        for (const row of brandRows) {
          const r = row as unknown as Record<string, unknown>;
          brandMap.set(r.id as string, {
            brandName: (r.brand_name as string) ?? null,
            createdAt: r.created_at as string,
          });
        }
      }

      for (const agent of groupAgents) {
        const { data: rows } = await supabase
          .from(agent.table_name)
          .select(`id, ${agent.eval_report_column}`);

        if (!rows) continue;

        for (const row of rows) {
          const report = (row as unknown as Record<string, unknown>)[
            agent.eval_report_column
          ] as EvalReport | null;

          if (!report?.overall?.improvement_suggestions) continue;
          const evalId = (row as unknown as Record<string, unknown>).id as string;
          const meta = brandMap.get(evalId);

          for (const suggestion of report.overall.improvement_suggestions) {
            const key = suggestion.affected_criterion;
            const list = criterionOccurrences.get(key) ?? [];
            list.push({
              evalId,
              brandName: meta?.brandName ?? null,
              createdAt: meta?.createdAt ?? "",
              suggestion,
              agentKey: agent.agent_key,
              agentDisplayName: agent.display_name,
            });
            criterionOccurrences.set(key, list);
          }
        }
      }

      // Build frequency map (criterion → number of unique evals)
      const frequencyMap = new Map<string, number>();
      for (const [key, occurrences] of criterionOccurrences) {
        const uniqueEvals = new Set(occurrences.map((o) => o.evalId));
        frequencyMap.set(key, uniqueEvals.size);
      }

      // Build top suggestions sorted by frequency
      const topSuggestions: SuggestionFrequencyItem[] = [];
      for (const [criterion, count] of frequencyMap) {
        const occurrences = criterionOccurrences.get(criterion) ?? [];
        const latest = occurrences[occurrences.length - 1];
        if (!latest) continue;
        const uniqueEvalIds = Array.from(new Set(occurrences.map((o) => o.evalId)));
        topSuggestions.push({
          criterion,
          count,
          totalEvals,
          latestSuggestion: latest.suggestion,
          agentKey: latest.agentKey,
          agentDisplayName: latest.agentDisplayName,
          evalIds: uniqueEvalIds,
          occurrences,
        });
      }
      topSuggestions.sort((a, b) => b.count - a.count);

      return { frequencyMap, topSuggestions: topSuggestions.slice(0, 5), totalEvals };
    },
    enabled: groupAgents.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
