import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Tag, X } from "lucide-react";
import { EvalCardSkeleton } from "@/components/shared/Skeleton";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useEvals } from "@/hooks/useEvals";
import type { EvalListItem } from "@/hooks/useEvals";
import { usePromptVersions, resolveVersion } from "@/hooks/usePromptVersions";
import { EvalGrid } from "@/components/eval-list/EvalGrid";
import { FilterBar, type SortOption, type ReviewedFilter, type GroupByOption } from "@/components/eval-list/FilterBar";
import { useReviewedStore } from "@/stores/reviewedStore";
import { EmptyState } from "@/components/shared/EmptyState";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useNotificationStore } from "@/stores/notificationStore";
import { InlineHeatmap } from "@/components/eval-list/InlineHeatmap";
import { DailyScoreChart } from "@/components/dashboard/DailyScoreChart";
import { CommonSuggestions } from "@/components/dashboard/CommonSuggestions";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { VersionScorecard } from "@/components/dashboard/VersionScorecard";
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
  const { versions, addVersion } = usePromptVersions(systemGroup ?? "");
  const { data: rawEvals, isLoading } = useEvals(systemGroup ?? "", agents);

  // Resolve versions after both evals and versions have loaded
  const evals = useMemo(() => {
    if (!rawEvals) return undefined;
    if (versions.length === 0) return rawEvals;
    return rawEvals.map((ev) => ({
      ...ev,
      version: resolveVersion(ev.created_at, versions),
    }));
  }, [rawEvals, versions]);
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
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [evalPage, setEvalPage] = useState(0);
  const EVALS_PER_PAGE = 10;
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Version creation form
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");
  const [versionDesc, setVersionDesc] = useState("");
  const [versionSaving, setVersionSaving] = useState(false);

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
    if (groupBy !== "none") return filtered; // no pagination in grouped mode
    return filtered.slice(evalPage * EVALS_PER_PAGE, evalPage * EVALS_PER_PAGE + EVALS_PER_PAGE);
  }, [filtered, evalPage, groupBy]);

  // Generic grouping
  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<string, EvalListItem[]>();
    for (const ev of filtered) {
      let key: string;
      switch (groupBy) {
        case "brand": key = ev.brand_name ?? "Unknown"; break;
        case "keyword": key = ev.keyword ?? "No keyword"; break;
        case "version": key = ev.version ?? "unversioned"; break;
      }
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [filtered, groupBy]);

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

  async function handleCreateVersion() {
    if (!versionLabel.trim() || !systemGroup) return;
    // Check duplicate
    if (versions.some((v) => v.version_label === versionLabel.trim())) return;
    setVersionSaving(true);
    try {
      await addVersion({
        system_group: systemGroup,
        version_label: versionLabel.trim(),
        starts_from_date: new Date().toISOString(),
        description: versionDesc.trim() || undefined,
      });
      setVersionLabel("");
      setVersionDesc("");
      setShowVersionForm(false);
    } finally {
      setVersionSaving(false);
    }
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
            {versions.length > 0 && (
              <span className="ml-2 text-accent-primary">
                {versions[0].version_label}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* New Version button */}
          <button
            onClick={() => setShowVersionForm(!showVersionForm)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              showVersionForm
                ? "bg-accent-primary/15 text-accent-primary"
                : "text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-default"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            New Version
          </button>

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

      {/* Version creation form */}
      {showVersionForm && (
        <div className="flex items-end gap-2 p-3 bg-bg-card border border-border-subtle rounded-xl">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Label</label>
            <input
              type="text"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="v4"
              className="w-24 px-2.5 py-1.5 bg-bg-elevated border border-border-subtle rounded-md text-xs text-text-primary font-mono focus:outline-none focus:border-accent-primary/50 transition-all"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Description (optional)</label>
            <input
              type="text"
              value={versionDesc}
              onChange={(e) => setVersionDesc(e.target.value)}
              placeholder="What changed in the prompt?"
              className="px-2.5 py-1.5 bg-bg-elevated border border-border-subtle rounded-md text-xs text-text-primary focus:outline-none focus:border-accent-primary/50 transition-all"
            />
          </div>
          <button
            onClick={handleCreateVersion}
            disabled={versionSaving || !versionLabel.trim() || versions.some((v) => v.version_label === versionLabel.trim())}
            className="px-3 py-1.5 bg-accent-primary text-white text-xs font-semibold rounded-md hover:bg-accent-primary/90 disabled:opacity-50 transition-colors"
          >
            {versionSaving ? "..." : "Create"}
          </button>
          <button
            onClick={() => setShowVersionForm(false)}
            className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Inline Criteria Heatmap */}
      <InlineHeatmap systemGroup={systemGroup ?? ""} agents={agents} />

      {/* Daily Score Trends */}
      <DailyScoreChart activeSystem={systemGroup ?? null} />

      {/* Version Performance */}
      {evals && <VersionScorecard evals={evals} versions={versions} />}

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
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
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
      ) : groupBy !== "none" && groups ? (
        <div className="space-y-8">
          {Array.from(groups.entries()).map(([key, groupEvals]) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-text-primary">{key}</h3>
                <span className="text-[10px] font-mono text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
                  {groupEvals.length}
                </span>
              </div>
              <EvalGrid
                evals={groupEvals}
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
