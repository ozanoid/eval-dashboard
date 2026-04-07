import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EvalCardSkeleton } from "@/components/shared/Skeleton";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useEvals } from "@/hooks/useEvals";
import type { EvalListItem } from "@/hooks/useEvals";
import { EvalGrid } from "@/components/eval-list/EvalGrid";
import { FilterBar, type SortOption, type ReviewedFilter } from "@/components/eval-list/FilterBar";
import { useReviewedStore } from "@/stores/reviewedStore";
import { EmptyState } from "@/components/shared/EmptyState";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
// useBrandScoreHistory removed — sparkline data derived from useEvals overall_avg
import { useNotificationStore } from "@/stores/notificationStore";
import { InlineHeatmap } from "@/components/eval-list/InlineHeatmap";
import { DailyScoreChart } from "@/components/dashboard/DailyScoreChart";
import { CommonSuggestions } from "@/components/dashboard/CommonSuggestions";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { exportCsv } from "@/lib/exporters";

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
  // Derive sparkline from overall_avg (same value shown on cards)
  const scoreHistoryMap = useMemo(() => {
    if (!evals) return undefined;
    const sorted = [...evals].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const map = new Map<string, number[]>();
    for (const ev of sorted) {
      if (!ev.brand_name) continue;
      const scores = map.get(ev.brand_name) ?? [];
      scores.push(ev.overall_avg);
      map.set(ev.brand_name, scores);
    }
    for (const [brand, scores] of map) {
      if (scores.length > 5) map.set(brand, scores.slice(-5));
    }
    return map;
  }, [evals]);
  const markSeen = useNotificationStore((s) => s.markSeen);

  // Mark evals as seen when visiting the list page
  useState(() => {
    if (systemGroup) markSeen(systemGroup);
  });

  const { reviewedIds, isReviewed } = useReviewedStore();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("date_desc");
  const [reviewedFilter, setReviewedFilter] = useState<ReviewedFilter>("unreviewed");
  const [groupByBrand, setGroupByBrand] = useState(false);
  const [evalPage, setEvalPage] = useState(0);
  const EVALS_PER_PAGE = 10;
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const reviewedCount = useMemo(() => {
    if (!evals) return 0;
    return evals.filter((ev) => isReviewed(ev.id)).length;
  }, [evals, reviewedIds, isReviewed]);

  const filtered = useMemo(() => {
    if (!evals) return [];
    let result = evals;

    // Apply reviewed filter
    if (reviewedFilter === "unreviewed") {
      result = result.filter((ev) => !isReviewed(ev.id));
    } else if (reviewedFilter === "reviewed") {
      result = result.filter((ev) => isReviewed(ev.id));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (ev) => ev.brand_name?.toLowerCase().includes(q) || ev.keyword?.toLowerCase().includes(q)
      );
    }
    return sortEvals(result, sort);
  }, [evals, search, sort, reviewedFilter, reviewedIds, isReviewed]);

  // Reset page when filters change
  const filterKey = `${search}-${sort}-${reviewedFilter}-${reviewedIds.size}`;
  useMemo(() => { setEvalPage(0); }, [filterKey]);

  const totalPages = Math.ceil(filtered.length / EVALS_PER_PAGE);
  const paged = useMemo(() => {
    if (groupByBrand) return filtered; // no pagination in grouped mode
    return filtered.slice(evalPage * EVALS_PER_PAGE, evalPage * EVALS_PER_PAGE + EVALS_PER_PAGE);
  }, [filtered, evalPage, groupByBrand]);

  // Brand groups for grouped view
  const brandGroups = useMemo(() => {
    if (!groupByBrand) return null;
    const groups = new Map<string, EvalListItem[]>();
    for (const ev of filtered) {
      const brand = ev.brand_name ?? "Unknown";
      const list = groups.get(brand) ?? [];
      list.push(ev);
      groups.set(brand, list);
    }
    return groups;
  }, [filtered, groupByBrand]);

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

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      } else {
        const first = next.values().next().value!;
        next.delete(first);
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {group?.display_name ?? "Evals"}
          </h1>
          <p className="text-sm text-text-tertiary mt-1">
            {evals?.length ?? 0} evaluations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size === 2 && (
            <button
              onClick={() => {
                const ids = Array.from(selectedIds);
                navigate(`/compare/${systemGroup}?left=${ids[0]}&right=${ids[1]}`);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-accent-primary rounded-lg hover:bg-accent-primary/90 transition-colors shadow-sm"
            >
              Compare ({selectedIds.size})
            </button>
          )}
          {selectedIds.size > 0 && selectedIds.size < 2 && (
            <span className="text-xs text-text-muted px-3 py-2">
              Select 1 more to compare
            </span>
          )}
          {evals && evals.length > 0 && (
            <ExportMenu
              options={[
                {
                  label: "Export CSV",
                  onClick: () => exportCsv(evals, systemGroup ?? ""),
                },
              ]}
            />
          )}
        </div>
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
          reviewedFilter={reviewedFilter}
          onReviewedFilterChange={setReviewedFilter}
          reviewedCount={reviewedCount}
          groupByBrand={groupByBrand}
          onGroupByBrandChange={setGroupByBrand}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <EvalCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            search
              ? "No matching evals"
              : reviewedFilter === "reviewed"
              ? "No reviewed evals"
              : reviewedFilter === "unreviewed" && reviewedCount > 0
              ? "All evals reviewed"
              : "No evals yet"
          }
          description={
            search
              ? "Try adjusting your search query."
              : reviewedFilter === "reviewed"
              ? "Mark evals as reviewed from the detail page."
              : reviewedFilter === "unreviewed" && reviewedCount > 0
              ? "Switch to 'Reviewed' or 'All' to see them."
              : "Eval runs for this system will appear here once data is available."
          }
        />
      ) : groupByBrand && brandGroups ? (
        <div className="space-y-8">
          {Array.from(brandGroups.entries()).map(([brand, brandEvals]) => (
            <div key={brand}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-text-primary">{brand}</h3>
                <span className="text-[10px] font-mono text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
                  {brandEvals.length}
                </span>
              </div>
              <EvalGrid
                evals={brandEvals}
                systemGroup={systemGroup ?? ""}
                focusedIndex={-1}
                scoreHistoryMap={scoreHistoryMap}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
              />
            </div>
          ))}
        </div>
      ) : (
        <>
          <EvalGrid
            evals={paged}
            systemGroup={systemGroup ?? ""}
            focusedIndex={focusedIndex}
            scoreHistoryMap={scoreHistoryMap}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setEvalPage((p) => Math.max(0, p - 1))}
                disabled={evalPage === 0}
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-30 disabled:cursor-default"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-text-tertiary tabular-nums font-mono">
                {evalPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setEvalPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={evalPage >= totalPages - 1}
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-30 disabled:cursor-default"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
