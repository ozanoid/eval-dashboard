import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useChartAnnotations } from "@/hooks/useChartAnnotations";
import { cn } from "@/lib/utils";
import type { DailyScore, ChartAnnotation } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Plus, X, MessageSquare, Trash2 } from "lucide-react";

const ANNOTATION_COLORS: Record<ChartAnnotation["annotation_type"], string> = {
  info: "var(--color-accent-primary)",
  milestone: "var(--color-grade-a)",
  regression: "var(--color-grade-d)",
  deployment: "var(--color-accent-purple, #a78bfa)",
};

const ANNOTATION_LABELS: Record<ChartAnnotation["annotation_type"], string> = {
  info: "Info",
  milestone: "Milestone",
  regression: "Regression",
  deployment: "Deployment",
};

function useDailyScores() {
  return useQuery({
    queryKey: ["daily-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_scores")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return data as DailyScore[];
    },
  });
}

interface AnnotationFormProps {
  systemGroup: string;
  onSubmit: (data: {
    system_group: string;
    date: string;
    annotation_text: string;
    annotation_type: ChartAnnotation["annotation_type"];
  }) => Promise<void>;
  onCancel: () => void;
}

function AnnotationForm({ systemGroup, onSubmit, onCancel }: AnnotationFormProps) {
  const [date, setDate] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState<ChartAnnotation["annotation_type"]>("info");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !text.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        system_group: systemGroup,
        date,
        annotation_text: text.trim(),
        annotation_type: type,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3 bg-bg-elevated rounded-lg border border-border-subtle">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="px-2.5 py-1.5 bg-bg-card border border-border-subtle rounded-md text-xs text-text-primary focus:outline-none focus:border-accent-primary/50 transition-all"
        />
      </div>
      <div className="flex flex-col gap-1 flex-1">
        <label className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Note</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What happened?"
          required
          className="px-2.5 py-1.5 bg-bg-card border border-border-subtle rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 transition-all"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ChartAnnotation["annotation_type"])}
          className="px-2.5 py-1.5 bg-bg-card border border-border-subtle rounded-md text-xs text-text-secondary cursor-pointer focus:outline-none focus:border-accent-primary/50 transition-all"
        >
          {(Object.keys(ANNOTATION_LABELS) as ChartAnnotation["annotation_type"][]).map((t) => (
            <option key={t} value={t}>{ANNOTATION_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={saving || !date || !text.trim()}
        className="px-3 py-1.5 bg-accent-primary text-white text-xs font-semibold rounded-md hover:bg-accent-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? "..." : "Add"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </form>
  );
}

interface DailyScoreChartProps {
  activeSystem: string | null;
}

export function DailyScoreChart({ activeSystem }: DailyScoreChartProps) {
  const { data: scores } = useDailyScores();
  const { agents, systemGroups } = useAgentRegistry();
  const { annotations, addAnnotation, deleteAnnotation } = useChartAnnotations(activeSystem);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [showAnnotationList, setShowAnnotationList] = useState(false);

  // Filter agents by active system
  const visibleAgentKeys = useMemo(() => {
    if (!activeSystem) return agents.map((a) => a.agent_key);
    const group = systemGroups.find((g) => g.group_key === activeSystem);
    return group ? group.agents.map((a) => a.agent_key) : agents.map((a) => a.agent_key);
  }, [activeSystem, agents, systemGroups]);

  // Filter scores by visible agents
  const filteredScores = useMemo(() => {
    if (!scores) return [];
    return scores.filter((s) => visibleAgentKeys.includes(s.agent_key));
  }, [scores, visibleAgentKeys]);

  if (!scores || scores.length === 0) {
    return (
      <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Daily Score Trends
        </h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center mb-4 text-text-tertiary">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13h2l3-8 4 16 3-8h6" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary">No score data yet</p>
          <p className="text-xs text-text-muted mt-1">Scores will appear here as evals accumulate.</p>
        </div>
      </div>
    );
  }

  // Pivot data for chart
  const dateMap = new Map<string, Record<string, number>>();
  for (const s of filteredScores) {
    const existing = dateMap.get(s.date) ?? {};
    existing[s.agent_key] = s.avg_score;
    dateMap.set(s.date, existing);
  }

  const chartData = Array.from(dateMap.entries()).map(([date, vals]) => ({
    date: date.slice(5), // MM-DD format
    fullDate: date,
    ...vals,
  }));

  // Map annotations to MM-DD for ReferenceLine matching
  const annotationsByDate = new Map<string, ChartAnnotation[]>();
  for (const ann of annotations) {
    const key = ann.date.slice(5);
    const arr = annotationsByDate.get(key) ?? [];
    arr.push(ann);
    annotationsByDate.set(key, arr);
  }

  function toggleAgent(key: string) {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-text-primary">
          Daily Score Trends
          {activeSystem && (
            <span className="ml-2 text-xs font-normal text-text-tertiary">
              — {systemGroups.find((g) => g.group_key === activeSystem)?.display_name}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1.5">
          {annotations.length > 0 && (
            <button
              onClick={() => setShowAnnotationList(!showAnnotationList)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                showAnnotationList
                  ? "bg-accent-primary/15 text-accent-primary"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-bg-elevated"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {annotations.length}
            </button>
          )}
          {activeSystem && (
            <button
              onClick={() => { setShowForm(!showForm); setShowAnnotationList(false); }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                showForm
                  ? "bg-accent-primary/15 text-accent-primary"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-bg-elevated"
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Note
            </button>
          )}
        </div>
      </div>

      {/* Add annotation form */}
      {showForm && activeSystem && (
        <div className="mb-4">
          <AnnotationForm
            systemGroup={activeSystem}
            onSubmit={async (data) => {
              await addAnnotation(data);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Annotation list */}
      {showAnnotationList && annotations.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {annotations.map((ann) => (
            <div
              key={ann.id}
              className="flex items-center gap-2 px-3 py-2 bg-bg-elevated rounded-lg border border-border-subtle text-xs"
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: ANNOTATION_COLORS[ann.annotation_type] }}
              />
              <span className="text-text-muted font-mono">{ann.date}</span>
              <span className="text-text-secondary flex-1 truncate">{ann.annotation_text}</span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  color: ANNOTATION_COLORS[ann.annotation_type],
                  backgroundColor: `color-mix(in srgb, ${ANNOTATION_COLORS[ann.annotation_type]} 15%, transparent)`,
                }}
              >
                {ANNOTATION_LABELS[ann.annotation_type]}
              </span>
              <button
                onClick={() => deleteAnnotation(ann.id)}
                className="p-1 text-text-muted hover:text-grade-d transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Legend */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {visibleAgentKeys.map((key) => {
          const agent = agents.find((a) => a.agent_key === key);
          const isHidden = hiddenKeys.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleAgent(key)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                isHidden
                  ? "opacity-40 hover:opacity-60"
                  : "opacity-100 hover:bg-bg-elevated"
              )}
            >
              <div
                className="w-2.5 h-2.5 rounded-full transition-opacity"
                style={{ backgroundColor: agent?.color ?? "#888" }}
              />
              <span className="text-text-secondary">{agent?.display_name ?? key}</span>
            </button>
          );
        })}

        {/* Annotation type legend */}
        {annotations.length > 0 && (
          <>
            <div className="w-px h-4 bg-border-subtle mx-1" />
            {(Object.entries(ANNOTATION_COLORS) as [ChartAnnotation["annotation_type"], string][])
              .filter(([type]) => annotations.some((a) => a.annotation_type === type))
              .map(([type, color]) => (
                <span key={type} className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-tertiary">
                  <svg width="14" height="10" className="flex-shrink-0">
                    <line x1="0" y1="5" x2="14" y2="5" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
                  </svg>
                  {ANNOTATION_LABELS[type]}
                </span>
              ))}
          </>
        )}
      </div>

      {/* Chart */}
      <div role="img" aria-label="Daily score trends line chart showing agent performance over time">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
            stroke="rgba(255,255,255,0.06)"
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
            stroke="rgba(255,255,255,0.06)"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-default)",
              borderRadius: "10px",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              color: "var(--color-text-primary)",
            }}
            labelStyle={{ color: "var(--color-text-tertiary)", marginBottom: 4 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const dateAnnotations = annotationsByDate.get(label as string);
              return (
                <div
                  style={{
                    backgroundColor: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border-default)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <p style={{ color: "var(--color-text-tertiary)", marginBottom: 6 }}>{label}</p>
                  {payload.map((entry) => (
                    <p key={entry.dataKey as string} style={{ color: entry.color, marginBottom: 2 }}>
                      {entry.name}: {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
                    </p>
                  ))}
                  {dateAnnotations && dateAnnotations.length > 0 && (
                    <>
                      <div style={{ borderTop: "1px solid var(--color-border-subtle)", margin: "6px 0" }} />
                      {dateAnnotations.map((ann) => (
                        <p
                          key={ann.id}
                          style={{
                            color: ANNOTATION_COLORS[ann.annotation_type],
                            fontSize: "11px",
                            fontFamily: "var(--font-sans)",
                            marginBottom: 2,
                          }}
                        >
                          {ann.annotation_text}
                        </p>
                      ))}
                    </>
                  )}
                </div>
              );
            }}
          />

          {/* Annotation reference lines */}
          {annotations.map((ann) => (
            <ReferenceLine
              key={ann.id}
              x={ann.date.slice(5)}
              stroke={ANNOTATION_COLORS[ann.annotation_type]}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              strokeOpacity={0.7}
            />
          ))}

          {visibleAgentKeys.map((key) => {
            const agent = agents.find((a) => a.agent_key === key);
            const isHidden = hiddenKeys.has(key);
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={agent?.display_name ?? key}
                stroke={agent?.color ?? "#888"}
                strokeWidth={isHidden ? 0 : 2}
                strokeOpacity={isHidden ? 0 : 1}
                dot={false}
                activeDot={isHidden ? false : { r: 4, strokeWidth: 0 }}
                hide={isHidden}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
