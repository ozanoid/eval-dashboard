import { downloadFile } from "./utils";
import type { EvalListItem } from "@/hooks/useEvals";

/**
 * CSV Export — all agent scores from eval list
 */
export function generateCsvExport(evals: EvalListItem[]): string {
  if (evals.length === 0) return "";

  // Collect all unique agent keys
  const agentKeys = new Set<string>();
  for (const ev of evals) {
    for (const agent of ev.agents) {
      agentKeys.add(agent.agent_key);
    }
  }
  const sortedKeys = Array.from(agentKeys);

  // Header
  const headers = [
    "eval_id",
    "brand_name",
    "keyword",
    "date",
    ...sortedKeys.flatMap((k) => [`${k}_score`, `${k}_grade`]),
    "overall_avg",
  ];

  const rows = evals.map((ev) => {
    const agentCols = sortedKeys.flatMap((key) => {
      const agent = ev.agents.find((a) => a.agent_key === key);
      return agent
        ? [agent.weighted_total.toFixed(1), agent.grade]
        : ["", ""];
    });

    return [
      ev.id,
      csvEscape(ev.brand_name ?? ""),
      csvEscape(ev.keyword ?? ""),
      ev.created_at.split("T")[0],
      ...agentCols,
      ev.overall_avg.toFixed(1),
    ];
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function exportCsv(evals: EvalListItem[], systemGroup: string) {
  const csv = generateCsvExport(evals);
  downloadFile(csv, `eval-scores-${systemGroup}-${new Date().toISOString().split("T")[0]}.csv`);
}

/**
 * PDF Export — capture eval detail center panel as PDF (lazy loaded)
 */
export async function exportPdf(
  element: HTMLElement,
  filename: string
) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    backgroundColor: "#0a0a0f",
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = 210; // A4 width mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF("p", "mm", "a4");
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= 297; // A4 height

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= 297;
  }

  pdf.save(filename);
}
