import { diffLines } from "diff";

interface DiffViewProps {
  oldText: string;
  newText: string;
}

export function DiffView({ oldText, newText }: DiffViewProps) {
  const changes = diffLines(oldText, newText);

  return (
    <div className="font-mono text-xs rounded-lg bg-bg-page p-3 overflow-x-auto space-y-0.5">
      {changes.map((change, i) => {
        const lines = change.value.replace(/\n$/, "").split("\n");
        return lines.map((line, j) => (
          <div
            key={`${i}-${j}`}
            className={
              change.added
                ? "text-grade-a bg-grade-a/8 border-l-2 border-grade-a pl-2 py-0.5 rounded-r"
                : change.removed
                ? "text-grade-d bg-grade-d/8 border-l-2 border-grade-d pl-2 py-0.5 rounded-r"
                : "text-text-secondary pl-3 py-0.5"
            }
          >
            <span className="opacity-50 mr-2 select-none">
              {change.added ? "+" : change.removed ? "−" : " "}
            </span>
            {line}
          </div>
        ));
      })}
    </div>
  );
}
