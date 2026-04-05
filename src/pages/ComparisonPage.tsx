import { useState, useMemo, useRef, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, Loader2 } from "lucide-react";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useEvalDetail } from "@/hooks/useEvalDetail";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { ScoreBar } from "@/components/shared/ScoreBar";
import { formatDate, formatScore } from "@/lib/utils";
import type { AgentEvalData, NormalizedEvalRun } from "@/lib/types";
import { getCriterionScoreColor } from "@/lib/constants";

export function ComparisonPage() {
  const { systemGroup } = useParams<{ systemGroup: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const leftId = searchParams.get("left");
  const rightId = searchParams.get("right");

  const { agents, systemGroups } = useAgentRegistry();
  const groupName =
    systemGroups.find((g) => g.group_key === systemGroup)?.display_name ?? "";

  const { data: leftEval, isLoading: leftLoading } = useEvalDetail(
    leftId ?? undefined,
    agents,
    systemGroup
  );
  const { data: rightEval, isLoading: rightLoading } = useEvalDetail(
    rightId ?? undefined,
    agents,
    systemGroup
  );

  const [activeAgentKey, setActiveAgentKey] = useState<string | null>(null);

  // Synchronized scrolling
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);

  const handleScroll = useCallback((source: "left" | "right") => {
    if (scrollingRef.current) return;
    scrollingRef.current = true;
    requestAnimationFrame(() => {
      const from = source === "left" ? leftRef.current : rightRef.current;
      const to = source === "left" ? rightRef.current : leftRef.current;
      if (from && to) {
        to.scrollTop = from.scrollTop;
      }
      scrollingRef.current = false;
    });
  }, []);

  const isLoading = leftLoading || rightLoading;

  // Available agents (union of both evals)
  const availableAgents = useMemo(() => {
    const keys = new Set<string>();
    const agentMap = new Map<string, { key: string; name: string }>();
    for (const eval_ of [leftEval, rightEval]) {
      if (!eval_) continue;
      for (const a of eval_.agents) {
        if (!keys.has(a.agent_key)) {
          keys.add(a.agent_key);
          agentMap.set(a.agent_key, { key: a.agent_key, name: a.display_name });
        }
      }
    }
    return Array.from(agentMap.values());
  }, [leftEval, rightEval]);

  const currentAgentKey = activeAgentKey ?? availableAgents[0]?.key;

  const leftAgent = leftEval?.agents.find((a) => a.agent_key === currentAgentKey);
  const rightAgent = rightEval?.agents.find((a) => a.agent_key === currentAgentKey);

  // Swap function
  function handleSwap() {
    setSearchParams({ left: rightId ?? "", right: leftId ?? "" });
  }

  if (!leftId || !rightId) {
    return (
      <div className="p-10">
        <p className="text-text-secondary text-sm">
          Select two evals to compare from the eval list page.
        </p>
        <Link
          to={`/evals/${systemGroup}`}
          className="text-accent-primary text-sm mt-2 inline-block hover:underline"
        >
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-5 pb-4 border-b border-border-default bg-bg-sidebar flex-shrink-0">
        <Link
          to={`/evals/${systemGroup}`}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to {groupName}
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            Comparison
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSwap}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-default transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Swap
            </button>
            {/* Agent selector */}
            {availableAgents.length > 1 && (
              <select
                value={currentAgentKey ?? ""}
                onChange={(e) => setActiveAgentKey(e.target.value)}
                className="h-8 px-3 rounded-lg bg-bg-elevated border border-border-subtle text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              >
                {availableAgents.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel */}
          <div
            ref={leftRef}
            onScroll={() => handleScroll("left")}
            className="flex-1 overflow-y-auto border-r border-border-default"
          >
            <ComparisonPanel
              eval_={leftEval}
              agent={leftAgent}
              otherAgent={rightAgent}
              label="LEFT"
            />
          </div>

          {/* Right Panel */}
          <div
            ref={rightRef}
            onScroll={() => handleScroll("right")}
            className="flex-1 overflow-y-auto"
          >
            <ComparisonPanel
              eval_={rightEval}
              agent={rightAgent}
              otherAgent={leftAgent}
              label="RIGHT"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ComparisonPanel({
  eval_,
  agent,
  otherAgent,
  label,
}: {
  eval_: NormalizedEvalRun | null | undefined;
  agent: AgentEvalData | undefined;
  otherAgent: AgentEvalData | undefined;
  label: string;
}) {
  if (!eval_ || !agent) {
    return (
      <div className="p-8 text-center text-sm text-text-muted">
        Eval not found
      </div>
    );
  }

  const { overall } = agent.eval_report;
  const otherOverall = otherAgent?.eval_report?.overall;
  const scoreDelta = otherOverall
    ? overall.weighted_total - otherOverall.weighted_total
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.08em] bg-bg-elevated px-2 py-0.5 rounded">
            {label}
          </span>
          <span className="text-xs text-text-muted">{formatDate(eval_.created_at)}</span>
        </div>
        <h2 className="text-lg font-bold text-text-primary">
          {eval_.brand_name ?? "Unknown"}
        </h2>
        {eval_.keyword && (
          <p className="text-sm text-text-secondary">{eval_.keyword}</p>
        )}
      </div>

      {/* Score Overview */}
      <div className="flex items-baseline gap-3">
        <span className="text-[2rem] font-mono font-extrabold text-text-primary tabular-nums tracking-tight leading-none">
          {formatScore(overall.weighted_total)}
        </span>
        <GradeBadge grade={overall.grade} size="lg" />
        {scoreDelta !== null && scoreDelta !== 0 && (
          <ScoreDelta value={scoreDelta} />
        )}
      </div>
      <ScoreBar score={overall.weighted_total} height={6} />

      {/* Criteria */}
      <div>
        <h3 className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.08em] mb-3">
          Criteria ({agent.eval_report.criteria_scores.length})
        </h3>
        <div className="space-y-2">
          {agent.eval_report.criteria_scores.map((c: { criterion: string; label: string; score: number }) => {
            const otherScore = otherAgent?.eval_report?.criteria_scores?.find(
              (oc: { criterion: string }) => oc.criterion === c.criterion
            );
            const delta = otherScore ? c.score - otherScore.score : null;

            return (
              <div
                key={c.criterion}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-bg-elevated"
              >
                <span className="text-xs text-text-secondary flex-1 min-w-0 truncate">
                  {c.label}
                </span>
                <div
                  className="w-16 rounded-full overflow-hidden flex-shrink-0"
                  style={{ height: 4, backgroundColor: "var(--color-bg-page)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(c.score / 10) * 100}%`,
                      backgroundColor: getCriterionScoreColor(c.score),
                    }}
                  />
                </div>
                <span
                  className="text-sm font-mono font-bold tabular-nums min-w-[36px] text-right"
                  style={{ color: getCriterionScoreColor(c.score) }}
                >
                  {c.score}
                </span>
                {delta !== null && delta !== 0 && (
                  <div className="min-w-[44px] text-right">
                    <ScoreDelta value={delta} small />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScoreDelta({ value, small }: { value: number; small?: boolean }) {
  const positive = value > 0;
  const color = positive
    ? "var(--color-grade-a)"
    : "var(--color-grade-d)";

  return (
    <span
      className={`font-mono font-bold tabular-nums ${
        small ? "text-[11px]" : "text-sm"
      }`}
      style={{ color }}
    >
      {positive ? "+" : ""}
      {value.toFixed(1)}
    </span>
  );
}
