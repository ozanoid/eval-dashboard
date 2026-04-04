import { useQuery } from "@tanstack/react-query";
import type { AgentRegistryEntry } from "@/lib/types";
import { fetchEvalRun } from "@/lib/normalizers";

export function useEvalDetail(
  evalId: string | undefined,
  agents: AgentRegistryEntry[],
  systemGroup?: string
) {
  return useQuery({
    queryKey: ["eval-detail", evalId, systemGroup],
    queryFn: async () => {
      if (!evalId) return null;
      const filteredAgents = systemGroup
        ? agents.filter((a) => a.system_group === systemGroup)
        : agents;
      return fetchEvalRun(evalId, filteredAgents);
    },
    enabled: !!evalId && agents.length > 0,
  });
}
