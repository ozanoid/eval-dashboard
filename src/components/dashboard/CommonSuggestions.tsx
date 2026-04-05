import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useSuggestionFrequency } from "@/hooks/useSuggestionFrequency";

interface CommonSuggestionsProps {
  activeSystem: string | null;
}

export function CommonSuggestions({ activeSystem }: CommonSuggestionsProps) {
  const { agents, systemGroups } = useAgentRegistry();

  if (!activeSystem) {
    return null;
  }

  return (
    <CommonSuggestionsList
      systemGroup={activeSystem}
      agents={agents}
      systemName={
        systemGroups.find((g) => g.group_key === activeSystem)?.display_name ??
        ""
      }
    />
  );
}

function CommonSuggestionsList({
  systemGroup,
  agents,
  systemName,
}: {
  systemGroup: string;
  agents: ReturnType<typeof useAgentRegistry>["agents"];
  systemName: string;
}) {
  const navigate = useNavigate();
  const { data } = useSuggestionFrequency(systemGroup, agents);

  if (!data || data.topSuggestions.length === 0) return null;

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-1">
        Most Common Suggestions
      </h2>
      <p className="text-xs text-text-tertiary mb-5">
        Recurring suggestions across {data.totalEvals} evals in {systemName}
      </p>

      <div className="space-y-3">
        {data.topSuggestions.map((item, i) => (
          <button
            key={item.criterion}
            onClick={() => {
              // Navigate to the first eval that has this suggestion
              const evalId = item.evalIds[0];
              if (evalId) {
                navigate(`/evals/${systemGroup}/${evalId}`);
              }
            }}
            className="w-full text-left flex items-start gap-3 p-3 rounded-lg bg-bg-elevated hover:bg-bg-card-hover transition-colors cursor-pointer group"
            style={{
              borderLeft: `3px solid ${
                item.latestSuggestion.priority === "high"
                  ? "var(--color-accent-danger)"
                  : item.latestSuggestion.priority === "medium"
                  ? "var(--color-accent-warning)"
                  : "var(--color-text-tertiary)"
              }`,
            }}
          >
            <span className="text-lg font-mono font-bold text-text-muted tabular-nums min-w-[24px]">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-accent-primary font-medium group-hover:underline">
                  {item.criterion}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    item.latestSuggestion.priority === "high"
                      ? "bg-grade-d/12 text-grade-d"
                      : item.latestSuggestion.priority === "medium"
                      ? "bg-grade-c/12 text-grade-c"
                      : "bg-grade-b/12 text-grade-b"
                  }`}
                >
                  {item.latestSuggestion.priority}
                </span>
                <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
                {item.latestSuggestion.suggestion}
              </p>
              <p className="text-[10px] text-text-muted mt-1">
                via {item.agentDisplayName} · {item.evalIds.length} eval{item.evalIds.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <span className="text-sm font-mono font-bold text-accent-primary">
                {item.count}/{item.totalEvals}
              </span>
              <p className="text-[10px] text-text-muted">evals</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
