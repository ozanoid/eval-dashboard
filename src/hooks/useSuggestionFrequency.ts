import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AgentRegistryEntry, EvalReport, ImprovementSuggestion } from "@/lib/types";

export interface SuggestionFrequencyItem {
  criterion: string;
  count: number;
  totalEvals: number;
  latestSuggestion: ImprovementSuggestion;
  agentKey: string;
  agentDisplayName: string;
  evalIds: string[];
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
      const criterionLatest = new Map<
        string,
        { suggestion: ImprovementSuggestion; agentKey: string; agentDisplayName: string }
      >();

      // Track which eval IDs have a suggestion for each criterion
      const criterionEvalSets = new Map<string, Set<string>>();

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

          for (const suggestion of report.overall.improvement_suggestions) {
            const key = suggestion.affected_criterion;

            const evalSet = criterionEvalSets.get(key) ?? new Set();
            evalSet.add(evalId);
            criterionEvalSets.set(key, evalSet);

            criterionLatest.set(key, {
              suggestion,
              agentKey: agent.agent_key,
              agentDisplayName: agent.display_name,
            });
          }
        }
      }

      // Build frequency map (criterion → number of unique evals)
      const frequencyMap = new Map<string, number>();
      for (const [key, evalSet] of criterionEvalSets) {
        frequencyMap.set(key, evalSet.size);
      }

      // Build top suggestions sorted by frequency
      const topSuggestions: SuggestionFrequencyItem[] = [];
      for (const [criterion, count] of frequencyMap) {
        const latest = criterionLatest.get(criterion);
        if (!latest) continue;
        topSuggestions.push({
          criterion,
          count,
          totalEvals,
          latestSuggestion: latest.suggestion,
          agentKey: latest.agentKey,
          agentDisplayName: latest.agentDisplayName,
          evalIds: Array.from(criterionEvalSets.get(criterion) ?? []),
        });
      }
      topSuggestions.sort((a, b) => b.count - a.count);

      return { frequencyMap, topSuggestions: topSuggestions.slice(0, 5), totalEvals };
    },
    enabled: groupAgents.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
