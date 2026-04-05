import { EvalCard } from "./EvalCard";
import type { EvalListItem } from "@/hooks/useEvals";

interface EvalGridProps {
  evals: EvalListItem[];
  systemGroup: string;
  focusedIndex?: number;
  scoreHistoryMap?: Map<string, number[]>;
}

export function EvalGrid({ evals, systemGroup, focusedIndex = -1, scoreHistoryMap }: EvalGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
      {evals.map((ev, i) => (
        <EvalCard
          key={ev.id}
          eval={ev}
          systemGroup={systemGroup}
          isFocused={i === focusedIndex}
          scoreHistory={ev.brand_name ? scoreHistoryMap?.get(ev.brand_name) : undefined}
        />
      ))}
    </div>
  );
}
