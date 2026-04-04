export const GRADE_CONFIG: Record<string, { color: string; bg: string }> = {
  "A+": { color: "var(--color-grade-a)", bg: "rgba(34, 197, 94, 0.12)" },
  A: { color: "var(--color-grade-a)", bg: "rgba(34, 197, 94, 0.12)" },
  "A-": { color: "var(--color-grade-a)", bg: "rgba(34, 197, 94, 0.12)" },
  "B+": { color: "var(--color-grade-b)", bg: "rgba(59, 130, 246, 0.12)" },
  B: { color: "var(--color-grade-b)", bg: "rgba(59, 130, 246, 0.12)" },
  "B-": { color: "var(--color-grade-b)", bg: "rgba(59, 130, 246, 0.12)" },
  "C+": { color: "var(--color-grade-c)", bg: "rgba(234, 179, 8, 0.12)" },
  C: { color: "var(--color-grade-c)", bg: "rgba(234, 179, 8, 0.12)" },
  "C-": { color: "var(--color-grade-c)", bg: "rgba(234, 179, 8, 0.12)" },
  "D+": { color: "var(--color-grade-d)", bg: "rgba(239, 68, 68, 0.12)" },
  D: { color: "var(--color-grade-d)", bg: "rgba(239, 68, 68, 0.12)" },
  "D-": { color: "var(--color-grade-d)", bg: "rgba(239, 68, 68, 0.12)" },
  F: { color: "var(--color-grade-d)", bg: "rgba(239, 68, 68, 0.12)" },
};

export function getGradeConfig(grade: string) {
  return GRADE_CONFIG[grade] ?? GRADE_CONFIG["C"];
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "var(--color-grade-a)";
  if (score >= 60) return "var(--color-grade-b)";
  if (score >= 40) return "var(--color-grade-c)";
  return "var(--color-grade-d)";
}

export function getCriterionScoreColor(score: number): string {
  if (score >= 8) return "var(--color-grade-a)";
  if (score >= 6) return "var(--color-grade-b)";
  if (score >= 4) return "var(--color-grade-c)";
  return "var(--color-grade-d)";
}

export const FIDELITY_CONFIG: Record<string, { color: string; bg: string }> = {
  perfect: { color: "var(--color-grade-a)", bg: "rgba(34, 197, 94, 0.10)" },
  high: { color: "var(--color-grade-a)", bg: "rgba(34, 197, 94, 0.10)" },
  "medium-high": { color: "var(--color-grade-b)", bg: "rgba(59, 130, 246, 0.10)" },
  medium: { color: "var(--color-grade-c)", bg: "rgba(234, 179, 8, 0.10)" },
  low: { color: "var(--color-grade-d)", bg: "rgba(239, 68, 68, 0.10)" },
  poor: { color: "var(--color-grade-d)", bg: "rgba(239, 68, 68, 0.10)" },
};

export function getFidelityConfig(fidelity: string) {
  const key = fidelity.toLowerCase().split(" ")[0];
  return FIDELITY_CONFIG[key] ?? FIDELITY_CONFIG["medium"];
}

// Agent color map for consistent colors across all pages
export const AGENT_COLORS: Record<string, string> = {
  new_serp_agent: "var(--color-agent-serp)",
  new_citation_agent: "var(--color-agent-citation)",
  new_content_brief: "var(--color-agent-brief)",
  faq_generation: "var(--color-agent-faq-gen)",
  faq_quality: "var(--color-agent-faq-qual)",
};
