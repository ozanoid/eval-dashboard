import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AgentRegistryEntry } from "@/lib/types";
import { groupAgentsBySystem } from "@/lib/normalizers";

export function useAgentRegistry() {
  const query = useQuery({
    queryKey: ["agent-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_registry")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as AgentRegistryEntry[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const systemGroups = query.data ? groupAgentsBySystem(query.data) : [];

  return {
    agents: query.data ?? [],
    systemGroups,
    isLoading: query.isLoading,
    error: query.error,
  };
}
