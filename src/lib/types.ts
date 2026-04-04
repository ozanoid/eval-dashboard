// ============================================
// Agent Registry
// ============================================

export interface AgentRegistryEntry {
  id: string;
  agent_key: string;
  display_name: string;
  color: string;
  icon: string;
  system_group: string;
  system_display_name: string;
  table_name: string;
  eval_report_column: string;
  input_column: string | null;
  output_column: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// ============================================
// Eval Report (shared structure across agents)
// ============================================

export interface PromptPatch {
  rule: string;
  action: "add_rule" | "modify_rule" | "add_example";
  target_section: string;
  current_behavior: string;
}

export interface ImprovementSuggestion {
  priority: "high" | "medium" | "low";
  suggestion: string;
  prompt_patch: PromptPatch;
  affected_criterion: string;
  expected_score_impact: string;
}

export interface InputOutputMapping {
  fidelity: string;
  input_element: string;
  output_element: string;
}

export interface CriteriaScore {
  label: string;
  score: number;
  weight: number;
  criterion: string;
  justification: string;
  weighted_score: number;
  reference_module: string;
  negative_evidence: string[];
  positive_evidence: string[];
  input_output_mapping: InputOutputMapping;
}

export interface EvalOverall {
  grade: string;
  grade_label: string;
  top_strengths: string[];
  top_weaknesses: string[];
  weighted_total: number;
  improvement_suggestions: ImprovementSuggestion[];
}

export interface EvalReport {
  overall: EvalOverall;
  eval_metadata: Record<string, unknown>;
  criteria_scores: CriteriaScore[];
}

// ============================================
// Normalized Eval Data (per agent)
// ============================================

export interface AgentEvalData {
  agent_key: string;
  display_name: string;
  color: string;
  icon: string;
  system_group: string;
  eval_report: EvalReport;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | string | null;
}

export interface NormalizedEvalRun {
  id: string;
  created_at: string;
  brand_name: string | null;
  keyword: string | null;
  agents: AgentEvalData[];
  overall_avg: number;
}

// ============================================
// Dashboard & Charts
// ============================================

export interface DailyScore {
  id: string;
  date: string;
  agent_key: string;
  avg_score: number;
  eval_count: number;
}

export interface ChartAnnotation {
  id: string;
  date: string;
  annotation_text: string;
  annotation_type: "info" | "milestone" | "regression" | "deployment";
  created_at: string;
}

// ============================================
// Suggestion Cart
// ============================================

export interface CartItem {
  suggestion_hash: string;
  eval_id: string;
  agent_key: string;
  agent_display_name: string;
  suggestion: ImprovementSuggestion;
}

export interface SuggestionApplication {
  id: string;
  eval_id: string;
  agent_key: string;
  suggestion_hash: string;
  suggestion_data: ImprovementSuggestion;
  batch_id: string | null;
  applied_at: string;
}

// ============================================
// Eval Completion
// ============================================

export interface EvalCompletionStatus {
  id: string;
  eval_id: string;
  agent_key: string;
  is_completed: boolean;
  completed_at: string | null;
}

// ============================================
// System Groups (derived from agent_registry)
// ============================================

export interface SystemGroup {
  group_key: string;
  display_name: string;
  agents: AgentRegistryEntry[];
}
