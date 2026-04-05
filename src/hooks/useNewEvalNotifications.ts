import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AgentRegistryEntry } from "@/lib/types";
import { useNotificationStore } from "@/stores/notificationStore";

/**
 * Polls for new evals since last seen timestamp.
 * Uses a 30-second refetch interval.
 */
export function useNewEvalNotifications(agents: AgentRegistryEntry[]) {
  const { lastSeen, setNewCount } = useNotificationStore();

  // Get unique system groups with their primary agent
  const systemPrimaries = new Map<string, AgentRegistryEntry>();
  for (const agent of agents) {
    if (!systemPrimaries.has(agent.system_group)) {
      const groupAgents = agents.filter(
        (a) => a.system_group === agent.system_group
      );
      const primary =
        groupAgents.find((a) => a.table_name.includes("content_brief")) ??
        groupAgents[0];
      systemPrimaries.set(agent.system_group, primary);
    }
  }

  const { data: counts } = useQuery({
    queryKey: [
      "new-eval-notifications",
      Object.keys(lastSeen).join(","),
      Array.from(systemPrimaries.keys()).join(","),
    ],
    queryFn: async () => {
      const results: Record<string, number> = {};

      for (const [systemGroup, primaryAgent] of systemPrimaries) {
        const since = lastSeen[systemGroup] ?? "1970-01-01T00:00:00Z";

        const { count } = await supabase
          .from(primaryAgent.table_name)
          .select("id", { count: "exact", head: true })
          .gt("created_at", since);

        results[systemGroup] = count ?? 0;
      }

      return results;
    },
    enabled: systemPrimaries.size > 0,
    refetchInterval: 30_000,
  });

  // Update notification store when counts change
  useEffect(() => {
    if (!counts) return;
    for (const [systemGroup, count] of Object.entries(counts)) {
      setNewCount(systemGroup, count);
    }
  }, [counts, setNewCount]);
}
