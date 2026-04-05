import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useEvals } from "@/hooks/useEvals";
import type { EvalListItem } from "@/hooks/useEvals";
import { EvalGrid } from "@/components/eval-list/EvalGrid";
import { FilterBar, type SortOption } from "@/components/eval-list/FilterBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useBrandScoreHistory } from "@/hooks/useBrandScoreHistory";
import { useNotificationStore } from "@/stores/notificationStore";
import { InlineHeatmap } from "@/components/eval-list/InlineHeatmap";
import { DailyScoreChart } from "@/components/dashboard/DailyScoreChart";
import { CommonSuggestions } from "@/components/dashboard/CommonSuggestions";

function sortEvals(evals: EvalListItem[], sort: SortOption): EvalListItem[] {
  return [...evals].sort((a, b) => {
    switch (sort) {
      case "date_desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "date_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "score_desc": return b.overall_avg - a.overall_avg;
      case "score_asc": return a.overall_avg - b.overall_avg;
      case "name_asc": return (a.brand_name ?? "").localeCompare(b.brand_name ?? "");
      case "name_desc": return (b.brand_name ?? "").localeCompare(a.brand_name ?? "");
    }
  });
}

export function EvalListPage() {
  const { systemGroup } = useParams<{ systemGroup: string }>();
  const navigate = useNavigate();
  const { agents, systemGroups } = useAgentRegistry();
  const group = systemGroups.find((g) => g.group_key === systemGroup);
  const { data: evals, isLoading } = useEvals(systemGroup ?? "", agents);
  const { data: scoreHistoryMap } = useBrandScoreHistory(systemGroup ?? "", agents);
  const markSeen = useNotificationStore((s) => s.markSeen);

  // Mark evals as seen when visiting the list page
  useState(() => {
    if (systemGroup) markSeen(systemGroup);
  });

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("date_desc");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const filtered = useMemo(() => {
    if (!evals) return [];
    let result = evals;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (ev) => ev.brand_name?.toLowerCase().includes(q) || ev.keyword?.toLowerCase().includes(q)
      );
    }
    return sortEvals(result, sort);
  }, [evals, search, sort]);

  const shortcuts = useMemo(
    () => [
      {
        key: "j",
        handler: () =>
          setFocusedIndex((prev) =>
            Math.min(prev + 1, filtered.length - 1)
          ),
        description: "Next eval card",
        group: "Navigation",
      },
      {
        key: "k",
        handler: () =>
          setFocusedIndex((prev) => Math.max(prev - 1, 0)),
        description: "Previous eval card",
        group: "Navigation",
      },
      {
        key: "Enter",
        handler: () => {
          if (focusedIndex >= 0 && focusedIndex < filtered.length) {
            navigate(`/evals/${systemGroup}/${filtered[focusedIndex].id}`);
          }
        },
        when: () => focusedIndex >= 0,
        description: "Open selected eval",
        group: "Navigation",
      },
    ],
    [filtered, focusedIndex, navigate, systemGroup]
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          {group?.display_name ?? "Evals"}
        </h1>
        <p className="text-sm text-text-tertiary mt-1">
          {evals?.length ?? 0} evaluations
        </p>
      </div>

      {/* Inline Criteria Heatmap */}
      <InlineHeatmap systemGroup={systemGroup ?? ""} agents={agents} />

      {/* Daily Score Trends */}
      <DailyScoreChart activeSystem={systemGroup ?? null} />

      {/* Most Common Suggestions */}
      <CommonSuggestions systemGroup={systemGroup ?? ""} />

      {/* Filter + Eval List */}
      <div>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          totalCount={evals?.length ?? 0}
          filteredCount={filtered.length}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? "No matching evals" : "No evals yet"}
          description={search ? "Try adjusting your search query." : "Eval runs for this system will appear here once data is available."}
        />
      ) : (
        <EvalGrid evals={filtered} systemGroup={systemGroup ?? ""} focusedIndex={focusedIndex} scoreHistoryMap={scoreHistoryMap} />
      )}
    </div>
  );
}
