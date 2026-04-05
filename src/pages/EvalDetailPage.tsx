import { useState, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ThumbsUp,
  AlertTriangle,
  CheckCircle,
  ArrowUpDown,
  Weight,
} from "lucide-react";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useEvalDetail } from "@/hooks/useEvalDetail";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSuggestionFrequency } from "@/hooks/useSuggestionFrequency";
import { AgentTabs } from "@/components/eval-detail/AgentTabs";
import { CriteriaCard } from "@/components/eval-detail/CriteriaCard";
import { JsonTreeViewer } from "@/components/eval-detail/JsonTreeViewer";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { ScoreBar } from "@/components/shared/ScoreBar";
import { formatDate, formatScore } from "@/lib/utils";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { exportPdf } from "@/lib/exporters";
import type { AgentEvalData, ImprovementSuggestion } from "@/lib/types";

export function EvalDetailPage() {
  const { systemGroup, evalId } = useParams<{
    systemGroup: string;
    evalId: string;
  }>();
  const { agents, systemGroups } = useAgentRegistry();
  const { data: evalRun, isLoading } = useEvalDetail(evalId, agents, systemGroup);
  const { data: frequencyData } = useSuggestionFrequency(systemGroup ?? "", agents);
  const groupName = systemGroups.find((g) => g.group_key === systemGroup)?.display_name ?? "Evals";

  const [activeAgentKey, setActiveAgentKey] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [inputHighlight, setInputHighlight] = useState<string | undefined>();
  const [outputHighlight, setOutputHighlight] = useState<string | undefined>();
  const [sortByWeight, setSortByWeight] = useState(false);
  const [showWeightBar, setShowWeightBar] = useState(false);
  const centerPanelRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts for agent tab switching
  const detailShortcuts = useMemo(
    () => [
      {
        key: "Tab",
        handler: () => {
          if (!evalRun) return;
          const keys = evalRun.agents.map((a) => a.agent_key);
          const currentKey = activeAgentKey ?? keys[0];
          const currentIdx = keys.indexOf(currentKey);
          const nextIdx = (currentIdx + 1) % keys.length;
          setActiveAgentKey(keys[nextIdx]);
        },
        description: "Next agent tab",
        group: "Eval Detail",
      },
    ],
    [evalRun, activeAgentKey]
  );

  useKeyboardShortcuts(detailShortcuts);

  const activeAgent: AgentEvalData | undefined = useMemo(() => {
    if (!evalRun) return undefined;
    const key = activeAgentKey ?? evalRun.agents[0]?.agent_key;
    return evalRun.agents.find((a) => a.agent_key === key);
  }, [evalRun, activeAgentKey]);

  const suggestionMap = useMemo(() => {
    if (!activeAgent) return new Map<string, ImprovementSuggestion>();
    const map = new Map<string, ImprovementSuggestion>();
    for (const s of activeAgent.eval_report.overall.improvement_suggestions ?? []) {
      map.set(s.affected_criterion, s);
    }
    return map;
  }, [activeAgent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
      </div>
    );
  }

  if (!evalRun || !activeAgent) {
    return (
      <div className="p-10">
        <p className="text-text-secondary text-sm">Eval not found.</p>
        <Link to={`/evals/${systemGroup}`} className="text-accent-primary text-sm mt-2 inline-block hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  const { overall } = activeAgent.eval_report;

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

        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              {evalRun.brand_name ?? "Unknown Brand"}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm">
              {evalRun.keyword && (
                <>
                  <span className="text-text-secondary">{evalRun.keyword}</span>
                  <span className="text-text-muted">|</span>
                </>
              )}
              <span className="text-text-tertiary">{formatDate(evalRun.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {evalRun.agents.map((a) => (
              <div
                key={a.agent_key}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-bg-elevated border border-border-subtle"
              >
                <span className="text-[11px] text-text-tertiary font-medium">
                  {a.display_name.split(" ")[0]}
                </span>
                <GradeBadge grade={a.eval_report.overall.grade} size="sm" />
              </div>
            ))}
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-success/15 text-accent-success text-xs font-semibold hover:bg-accent-success/25 transition-colors">
              <CheckCircle className="w-3.5 h-3.5" />
              Mark Reviewed
            </button>
            <ExportMenu
              options={[
                {
                  label: "Export PDF",
                  onClick: async () => {
                    if (centerPanelRef.current) {
                      await exportPdf(
                        centerPanelRef.current,
                        `eval-${evalRun.brand_name ?? evalId}-${activeAgent.display_name}.pdf`
                      );
                    }
                  },
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Agent Tabs */}
      <div className="px-8 bg-bg-sidebar flex-shrink-0">
        <AgentTabs
          agents={evalRun.agents}
          activeKey={activeAgentKey ?? evalRun.agents[0]?.agent_key ?? ""}
          onSelect={(key) => {
            setActiveAgentKey(key);
            setInputHighlight(undefined);
            setOutputHighlight(undefined);
          }}
        />
      </div>

      {/* 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel — INPUT */}
        {leftOpen && (
          <div className="w-[280px] border-r border-border-default bg-bg-card flex-shrink-0 flex flex-col overflow-hidden">
            <JsonTreeViewer
              data={activeAgent.input_data}
              highlightPath={inputHighlight}
              label="Input Data"
              colorAccent="purple"
            />
          </div>
        )}

        {/* Center Panel — EVAL REPORT */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-border-default backdrop-blur-sm bg-bg-page/80 sticky top-0 z-10">
            <button
              onClick={() => setLeftOpen(!leftOpen)}
              className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-colors"
            >
              {leftOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <span className="text-[10px] text-text-muted flex-1 text-center font-medium uppercase tracking-[0.08em]">
              Eval Report
            </span>
            <button
              onClick={() => setRightOpen(!rightOpen)}
              className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-colors"
            >
              {rightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>

          <div ref={centerPanelRef} className="p-8 space-y-8">
            {/* Score Overview */}
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-[2.5rem] font-mono font-extrabold text-text-primary tracking-tight leading-none">
                  {formatScore(overall.weighted_total)}
                </span>
                <span className="text-lg text-text-muted font-light">/100</span>
              </div>
              <div className="flex items-center gap-2.5 mb-3">
                <GradeBadge grade={overall.grade} size="lg" />
                <span className="text-sm text-text-secondary italic">{overall.grade_label}</span>
              </div>
              <ScoreBar score={overall.weighted_total} height={6} />
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg-elevated rounded-xl p-5 border-t-2 border-grade-a">
                <div className="flex items-center gap-2 mb-3">
                  <ThumbsUp className="w-4 h-4 text-grade-a" />
                  <span className="text-xs font-semibold text-grade-a uppercase tracking-[0.05em]">
                    Strengths
                  </span>
                </div>
                <ul className="space-y-2">
                  {overall.top_strengths?.slice(0, 5).map((s, i) => (
                    <li key={i} className="text-sm text-text-secondary leading-relaxed flex gap-2">
                      <span className="text-grade-a mt-1">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-bg-elevated rounded-xl p-5 border-t-2 border-grade-d">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-grade-d" />
                  <span className="text-xs font-semibold text-grade-d uppercase tracking-[0.05em]">
                    Weaknesses
                  </span>
                </div>
                <ul className="space-y-2">
                  {overall.top_weaknesses?.slice(0, 5).map((w, i) => (
                    <li key={i} className="text-sm text-text-secondary leading-relaxed flex gap-2">
                      <span className="text-grade-d mt-1">•</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Criteria Breakdown */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">
                  Criteria Breakdown
                  <span className="ml-2 text-xs font-mono text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
                    {activeAgent.eval_report.criteria_scores.length}
                  </span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowWeightBar(!showWeightBar)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      showWeightBar
                        ? "bg-accent-purple/15 text-accent-purple"
                        : "text-text-tertiary hover:text-text-secondary hover:bg-bg-elevated"
                    }`}
                  >
                    <Weight className="w-3.5 h-3.5" />
                    Weights
                  </button>
                  <button
                    onClick={() => setSortByWeight(!sortByWeight)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      sortByWeight
                        ? "bg-accent-primary/15 text-accent-primary"
                        : "text-text-tertiary hover:text-text-secondary hover:bg-bg-elevated"
                    }`}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    By Weight
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {(() => {
                  const criteria = [...activeAgent.eval_report.criteria_scores];
                  if (sortByWeight) criteria.sort((a, b) => b.weight - a.weight);
                  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
                  return criteria.map((c) => (
                    <CriteriaCard
                      key={c.criterion}
                      criteria={c}
                      suggestion={suggestionMap.get(c.criterion)}
                      evalId={evalRun.id}
                      agentKey={activeAgent.agent_key}
                      agentDisplayName={activeAgent.display_name}
                      showWeightBar={showWeightBar}
                      totalWeight={totalWeight}
                      suggestionFrequency={frequencyData?.frequencyMap.get(c.criterion)}
                      onHighlightInput={(path) => {
                        setLeftOpen(true);
                        setInputHighlight(path);
                      }}
                      onHighlightOutput={(path) => {
                        setRightOpen(true);
                        setOutputHighlight(path);
                      }}
                    />
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel — OUTPUT */}
        {rightOpen && (
          <div className="w-[300px] border-l border-border-default bg-bg-card flex-shrink-0 flex flex-col overflow-hidden">
            <JsonTreeViewer
              data={activeAgent.output_data as Record<string, unknown> | string | null}
              highlightPath={outputHighlight}
              label="Output Data"
              colorAccent="blue"
            />
          </div>
        )}
      </div>
    </div>
  );
}
