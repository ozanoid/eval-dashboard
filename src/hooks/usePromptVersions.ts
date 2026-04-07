import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface PromptVersion {
  id: string;
  system_group: string;
  version_label: string;
  starts_from_eval_id: string | null;
  starts_from_date: string;
  description: string | null;
  created_at: string;
}

export function usePromptVersions(systemGroup: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["prompt-versions", systemGroup],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_versions")
        .select("*")
        .eq("system_group", systemGroup)
        .order("starts_from_date", { ascending: false });
      if (error) throw error;
      return data as PromptVersion[];
    },
    enabled: !!systemGroup,
    staleTime: 5 * 60 * 1000,
  });

  async function addVersion(data: {
    system_group: string;
    version_label: string;
    starts_from_date: string;
    description?: string;
  }) {
    const { error } = await supabase.from("prompt_versions").insert(data);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["prompt-versions", systemGroup] });
    queryClient.invalidateQueries({ queryKey: ["evals", systemGroup] });
  }

  return {
    versions: query.data ?? [],
    isLoading: query.isLoading,
    addVersion,
  };
}

/**
 * Pure function: resolves which version an eval belongs to.
 * Versions must be sorted DESC by starts_from_date.
 */
export function resolveVersion(
  evalCreatedAt: string,
  versions: PromptVersion[]
): string {
  const evalDate = new Date(evalCreatedAt).getTime();
  for (const v of versions) {
    if (evalDate >= new Date(v.starts_from_date).getTime()) {
      return v.version_label;
    }
  }
  return "unversioned";
}
