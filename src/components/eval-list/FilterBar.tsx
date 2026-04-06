import { Search, ArrowUpDown } from "lucide-react";

export type SortOption = "date_desc" | "date_asc" | "score_desc" | "score_asc" | "name_asc" | "name_desc";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  totalCount: number;
  filteredCount: number;
}

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "score_desc", label: "Highest score" },
  { value: "score_asc", label: "Lowest score" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
];

export function FilterBar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search by brand or keyword..."
          aria-label="Search evaluations"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20 transition-all"
        />
      </div>

      <div className="relative">
        <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
        <select
          value={sort}
          aria-label="Sort evaluations"
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="appearance-none pl-8 pr-8 py-2 bg-bg-card border border-border-subtle rounded-lg text-sm text-text-secondary cursor-pointer focus:outline-none focus:border-accent-primary/50 transition-all"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <span className="text-xs text-text-muted ml-auto tabular-nums">
        {filteredCount === totalCount
          ? `${totalCount} eval${totalCount !== 1 ? "s" : ""}`
          : `${filteredCount} of ${totalCount}`}
      </span>
    </div>
  );
}
