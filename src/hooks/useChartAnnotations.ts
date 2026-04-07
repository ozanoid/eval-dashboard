import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ChartAnnotation } from "@/lib/types";

export function useChartAnnotations(systemGroup: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chart-annotations", systemGroup],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_annotations")
        .select("*")
        .eq("system_group", systemGroup!)
        .order("date", { ascending: true });
      if (error) throw error;
      return data as ChartAnnotation[];
    },
    enabled: !!systemGroup,
  });

  async function addAnnotation(annotation: {
    system_group: string;
    date: string;
    annotation_text: string;
    annotation_type: ChartAnnotation["annotation_type"];
  }) {
    const { error } = await supabase
      .from("chart_annotations")
      .insert(annotation);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["chart-annotations", systemGroup] });
  }

  async function deleteAnnotation(id: string) {
    const { error } = await supabase
      .from("chart_annotations")
      .delete()
      .eq("id", id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["chart-annotations", systemGroup] });
  }

  return {
    annotations: query.data ?? [],
    isLoading: query.isLoading,
    addAnnotation,
    deleteAnnotation,
  };
}
