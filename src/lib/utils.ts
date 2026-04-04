import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ImprovementSuggestion } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSuggestionHash(
  evalId: string,
  criterion: string,
  rule: string
): string {
  const input = `${evalId}:${criterion}:${rule.slice(0, 100)}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}

export function gradeFromScore(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 87) return "A-";
  if (score >= 83) return "B+";
  if (score >= 80) return "B";
  if (score >= 77) return "B-";
  if (score >= 73) return "C+";
  if (score >= 70) return "C";
  if (score >= 67) return "C-";
  if (score >= 63) return "D+";
  if (score >= 60) return "D";
  if (score >= 57) return "D-";
  return "F";
}

export function generateTxtExport(
  items: Array<{
    agent_display_name: string;
    suggestion: ImprovementSuggestion;
  }>,
  evalId: string
): string {
  const now = new Date().toISOString().split("T")[0];
  const grouped = new Map<string, typeof items>();

  for (const item of items) {
    const group = grouped.get(item.agent_display_name) ?? [];
    group.push(item);
    grouped.set(item.agent_display_name, group);
  }

  let txt = `===============================================\n`;
  txt += `EVAL IMPROVEMENT SUGGESTIONS - APPLIED BATCH\n`;
  txt += `Date: ${now}\n`;
  txt += `Eval ID: ${evalId}\n`;
  txt += `===============================================\n\n`;

  for (const [agent, suggestions] of grouped) {
    txt += `## ${agent.toUpperCase()} SUGGESTIONS\n\n`;
    for (const { suggestion: s } of suggestions) {
      txt += `### [${s.priority.toUpperCase()}] ${s.prompt_patch.target_section}\n`;
      txt += `Affected: ${s.affected_criterion} | Expected: ${s.expected_score_impact}\n`;
      txt += `Action: ${s.prompt_patch.action}\n`;
      txt += `Rule: ${s.prompt_patch.rule}\n`;
      txt += `Current Behavior: ${s.prompt_patch.current_behavior}\n\n`;
      txt += `---\n\n`;
    }
  }

  txt += `===============================================\n`;
  txt += `Total Suggestions Applied: ${items.length}\n`;
  txt += `===============================================\n`;

  return txt;
}

export function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
