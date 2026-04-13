import type {
  AgentRegistryEntry,
  AgentEvalData,
  NormalizedEvalRun,
  EvalReport,
  SystemGroup,
} from "./types";
import { supabase } from "./supabase";

/**
 * Fetches raw data for a single agent from its table
 */
async function fetchAgentData(
  agent: AgentRegistryEntry,
  evalId: string
): Promise<(AgentEvalData & { created_at: string; table_brand_name?: string }) | null> {
  const { data, error } = await supabase
    .from(agent.table_name)
    .select("*")
    .eq("id", evalId)
    .single();

  if (error || !data) return null;

  const evalReport = data[agent.eval_report_column] as EvalReport;
  const inputData = agent.input_column ? data[agent.input_column] : null;
  const outputData = agent.output_column ? data[agent.output_column] : null;

  return {
    agent_key: agent.agent_key,
    display_name: agent.display_name,
    color: agent.color,
    icon: agent.icon,
    system_group: agent.system_group,
    eval_report: evalReport,
    input_data: inputData as Record<string, unknown> | null,
    output_data: outputData,
    created_at: data.created_at as string,
    table_brand_name: (data.brand_name as string) ?? undefined,
  };
}

/**
 * Fetches and normalizes a complete eval run across all agents
 */
export async function fetchEvalRun(
  evalId: string,
  agents: AgentRegistryEntry[]
): Promise<NormalizedEvalRun | null> {
  const results = await Promise.all(
    agents.map((agent) => fetchAgentData(agent, evalId))
  );

  const validResults = results.filter(
    (r): r is AgentEvalData & { created_at: string; table_brand_name?: string } =>
      r !== null && r.eval_report !== null
  );

  if (validResults.length === 0) return null;

  const overallAvg =
    validResults.reduce((sum, a) => sum + a.eval_report.overall.weighted_total, 0) /
    validResults.length;

  // brand_name: from table column across all agent tables
  let brandName: string | null = null;
  let keyword: string | null = null;
  let createdAt = validResults[0].created_at;

  // Fetch brand_name from table columns
  for (const agent of agents) {
    if (brandName) break;
    const { data } = await supabase
      .from(agent.table_name)
      .select("brand_name")
      .eq("id", evalId)
      .single();
    if (data && (data as Record<string, unknown>).brand_name) {
      brandName = (data as Record<string, unknown>).brand_name as string;
    }
  }

  // keyword: from eval_metadata
  for (const agent of validResults) {
    if (keyword) break;
    const meta = agent.eval_report.eval_metadata;
    keyword =
      (meta.target_prompt as string) ??
      (meta.query as string) ??
      (meta.primary_keyword as string) ??
      (meta.page_url as string) ??
      (meta.own_page_url as string) ??
      null;
  }

  // Strip internal fields from agent data before returning
  const validAgents: AgentEvalData[] = validResults.map(
    ({ created_at: _ca, table_brand_name: _bn, ...rest }) => rest
  );

  return {
    id: evalId,
    created_at: createdAt,
    brand_name: brandName,
    keyword,
    agents: validAgents,
    overall_avg: Math.round(overallAvg * 10) / 10,
  };
}

/**
 * Fetches all eval IDs across all agent tables in the system group.
 * Merges and deduplicates by ID, keeping the earliest created_at and
 * any brand_name found.
 */
export async function fetchEvalIds(
  agents: AgentRegistryEntry[]
): Promise<Array<{ id: string; created_at: string; brand_name?: string }>> {
  if (agents.length === 0) return [];

  // Deduplicate tables (multiple agents may share the same table)
  const uniqueTables = Array.from(
    new Map(agents.map((a) => [a.table_name, a])).values()
  );

  // Fetch IDs from all agent tables in parallel
  const allResults = await Promise.all(
    uniqueTables.map(async (agent) => {
      const hasBrandName =
        agent.table_name.includes("content_brief") ||
        agent.table_name.includes("pdp");
      const selectFields = hasBrandName
        ? "id,created_at,brand_name"
        : "id,created_at";

      const { data, error } = await supabase
        .from(agent.table_name)
        .select(selectFields)
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data as Array<{ id: string; created_at: string; brand_name?: string }>;
    })
  );

  // Merge and deduplicate by ID
  const idMap = new Map<string, { id: string; created_at: string; brand_name?: string }>();

  for (const rows of allResults) {
    for (const row of rows) {
      const existing = idMap.get(row.id);
      if (!existing) {
        idMap.set(row.id, row);
      } else {
        // Keep the earliest created_at and any brand_name found
        if (row.created_at < existing.created_at) {
          existing.created_at = row.created_at;
        }
        if (row.brand_name && !existing.brand_name) {
          existing.brand_name = row.brand_name;
        }
      }
    }
  }

  // Sort by created_at descending
  return Array.from(idMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Groups agents by system_group
 */
export function groupAgentsBySystem(
  agents: AgentRegistryEntry[]
): SystemGroup[] {
  const groups = new Map<string, SystemGroup>();

  for (const agent of agents) {
    const existing = groups.get(agent.system_group);
    if (existing) {
      existing.agents.push(agent);
    } else {
      groups.set(agent.system_group, {
        group_key: agent.system_group,
        display_name: agent.system_display_name,
        agents: [agent],
      });
    }
  }

  return Array.from(groups.values());
}
