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
): Promise<(AgentEvalData & { created_at: string }) | null> {
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
    (r): r is AgentEvalData & { created_at: string } =>
      r !== null && r.eval_report !== null
  );

  if (validResults.length === 0) return null;

  const overallAvg =
    validResults.reduce((sum, a) => sum + a.eval_report.overall.weighted_total, 0) /
    validResults.length;

  // Extract brand_name and keyword from content brief or first available
  let brandName: string | null = null;
  let keyword: string | null = null;
  let createdAt = validResults[0].created_at;

  for (const agent of validResults) {
    const meta = agent.eval_report.eval_metadata;
    if (meta.brand_name) brandName = meta.brand_name as string;
    if (meta.target_prompt) keyword = meta.target_prompt as string;
    if (meta.query) keyword = meta.query as string;
    if (meta.primary_keyword) keyword ??= meta.primary_keyword as string;
  }

  // Strip created_at from agent data before returning
  const validAgents: AgentEvalData[] = validResults.map(
    ({ created_at: _ca, ...rest }) => rest
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
 * Fetches all eval IDs from the first agent's table (they share IDs)
 */
export async function fetchEvalIds(
  agents: AgentRegistryEntry[]
): Promise<Array<{ id: string; created_at: string; brand_name?: string }>> {
  if (agents.length === 0) return [];

  // Use the content brief table if available (has brand_name), otherwise first agent
  const briefAgent = agents.find((a) => a.table_name.includes("content_brief"));
  const primaryAgent = briefAgent ?? agents[0];

  const selectFields = ["id", "created_at"];
  if (primaryAgent.table_name.includes("content_brief")) {
    selectFields.push("brand_name");
  }

  const { data, error } = await supabase
    .from(primaryAgent.table_name)
    .select(selectFields.join(","))
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as Array<{ id: string; created_at: string; brand_name?: string }>;
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
