import { EvalCard } from "./EvalCard";
import type { EvalListItem } from "@/hooks/useEvals";

interface EvalGridProps {
  evals: EvalListItem[];
  systemGroup: string;
}

export function EvalGrid({ evals, systemGroup }: EvalGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
      {evals.map((ev) => (
        <EvalCard key={ev.id} eval={ev} systemGroup={systemGroup} />
      ))}
    </div>
  );
}
