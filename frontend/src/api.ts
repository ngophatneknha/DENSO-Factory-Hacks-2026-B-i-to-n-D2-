/**
 * API client connecting the React Control Room to FastAPI backend.
 */

export interface SystemStatus {
  status: string;
  system: string;
  competition: string;
  active_dataset: string;
  now: string;
  mode: string;
  readiness: string;
}

export interface ForecastPoint {
  bucket_start: string;
  hour: number;
  minute: number;
  shift_id: string;
  q10: number;
  q50: number;
  q90: number;
  capacity: number;
  capacity_picking: number;
  capacity_loading: number;
  capacity_transport: number;
  overload_ratio: number;
  is_risk: boolean;
}

export interface BacktestMetrics {
  mae: number;
  wape: number;
  bias: number;
  coverage: number;
  interval_width: number;
  pinball_50: number;
}

export interface BacktestReport {
  test_period: string;
  n_test_buckets: number;
  baseline: BacktestMetrics;
  lightgbm_raw: BacktestMetrics;
  lightgbm_calibrated: BacktestMetrics;
  wape_improvement_pct: number;
  conformal_summary: {
    target_coverage: number;
    calibrated_offset: number;
    cal_coverage: number;
  };
}

export interface ForecastResponse {
  as_of: string;
  horizon_hours: number;
  timeline: ForecastPoint[];
  scenarios: number[][];
  backtest: BacktestReport;
}

export interface AlertItem {
  alert_id: string;
  stage: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  affected_requests: number;
  timestamp: string;
  status: string;
  source: string;
}

export interface BottleneckStage {
  stage: string;
  stage_name: string;
  utilization: number;
  utilization_rank: number;
  late_min_reduced: number;
  loss_saved_vnd: number;
  intervention_cost_vnd: number;
  net_saving_vnd: number;
  roi_ratio: number;
  impact_rank: number;
}

export interface BottleneckResponse {
  base_kpi: {
    late_minutes: number;
    late_rate: number;
    throughput: number;
    lead_p50: number;
    lead_p90: number;
  };
  stages: BottleneckStage[];
  rank_conflict: boolean;
  insight: string;
}

export interface ActionEvaluation {
  action_id: string;
  name: string;
  description?: string;
  action_type: string;
  is_feasible: boolean;
  infeasibility_reason?: string;
  cost_vnd: number;
  expected_loss_vnd: number;
  cvar90_loss_vnd: number;
  risk_score: number;
  avg_late_minutes: number;
  avg_late_rate: number;
  avg_throughput: number;
  is_pareto: boolean;
  scenario_losses?: number[];
}

export interface RecommendationResponse {
  lambda_risk: number;
  n_scenarios: number;
  evaluations: ActionEvaluation[];
  recommendation_statement: string;
  best_action_id: string | null;
}

export interface GanttTrip {
  tugger_id: string;
  depart: number;
  return: number;
  duration: number;
  orders_count: number;
}

export interface OrderSample {
  request_id: string;
  line_id: string;
  item_group: string;
  due_min: number;
  pick_end: number | null;
  load_end: number | null;
  delivered: number | null;
  status: "ON_TIME" | "LATE";
  late_min: number;
  picker_id: string;
  tugger_id: string;
}

export interface PlaybackSnapshot {
  t: number;
  picking_queue: number;
  loading_queue: number;
  transport_queue: number;
  delivered_cum: number;
  active_tuggers: string[];
}

export interface CustomSimResponse {
  kpis: {
    n_due: number;
    n_late: number;
    late_rate: number;
    late_minutes: number;
    lead_p50: number;
    lead_p90: number;
    throughput: number;
    max_queue: Record<string, number>;
    utilization: Record<string, number>;
    trips: number;
  };
  logic_errors: string[];
  queue_timeline: Array<{
    t: number;
    picking: number;
    loading: number;
    transport: number;
  }>;
  trips_count: number;
  trips_gantt?: GanttTrip[];
  order_sample?: OrderSample[];
  playback_snapshots?: PlaybackSnapshot[];
}

export interface QualityProfile {
  readiness: string;
  readiness_label: string;
  mode: string;
  n_requests: number;
  n_events: number;
  n_resources: number;
  n_calendar_shifts: number;
  n_plan_entries: number;
  issues_count: number;
  issues: Array<{ table: string; code: string; message: string }>;
}

export interface BrowseTableResponse {
  table: string;
  total_rows: number;
  page: number;
  page_size: number;
  columns: string[];
  rows: Record<string, any>[];
}

export interface DispatchSheetAction {
  time: string;
  stage: string;
  action: string;
}

export interface DispatchSheetResponse {
  facility: string;
  sheet_id: string;
  shift: string;
  effective_date: string;
  supervisor: string;
  approved_by: string;
  directive_title: string;
  summary: string;
  action_steps: DispatchSheetAction[];
  kpi_targets: Record<string, string>;
}

const API_BASE = "/api";

export async function fetchHealth(): Promise<SystemStatus> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchCurrentData(): Promise<any> {
  const res = await fetch(`${API_BASE}/data/current`);
  return res.json();
}

export async function fetchForecast(horizonHours = 8): Promise<ForecastResponse> {
  const res = await fetch(`${API_BASE}/predict/forecast?horizon_hours=${horizonHours}`);
  return res.json();
}

export async function fetchAlerts(): Promise<{ total_alerts: number; alerts: AlertItem[] }> {
  const res = await fetch(`${API_BASE}/detect/alerts`);
  return res.json();
}

export async function fetchBottlenecks(): Promise<BottleneckResponse> {
  const res = await fetch(`${API_BASE}/detect/bottlenecks`);
  return res.json();
}

export async function evaluateRecommendations(params: {
  lambda_risk: number;
  n_scenarios: number;
  demand_multiplier: number;
}): Promise<RecommendationResponse> {
  const res = await fetch(`${API_BASE}/recommend/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function runCustomSim(params: {
  priority: string;
  tugger_cycle_min: number;
  extra_pickers: number;
  extra_loaders: number;
  extra_tuggers: number;
  demand_surge_pct: number;
  seed: number;
}): Promise<CustomSimResponse> {
  const res = await fetch(`${API_BASE}/simulate/custom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function recordDecision(payload: {
  action_id: string;
  action_name: string;
  decision_status: string;
  operator_name: string;
  notes?: string;
  expected_saving_vnd?: number;
  cost_vnd?: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/decisions/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchDecisions(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/decisions/history`);
  return res.json();
}

export async function fetchAuditLogs(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/audit/logs`);
  return res.json();
}

export async function triggerGenerate(seed = 42, historyDays = 84): Promise<any> {
  const res = await fetch(`${API_BASE}/data/generate?seed=${seed}&history_days=${historyDays}`, {
    method: "POST",
  });
  return res.json();
}

export async function uploadDataset(file: File): Promise<any> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/data/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Upload thất bại");
  }
  return res.json();
}

export async function browseTable(
  table = "requests",
  page = 1,
  pageSize = 25,
  search = ""
): Promise<BrowseTableResponse> {
  const res = await fetch(
    `${API_BASE}/data/browse?table=${table}&page=${page}&page_size=${pageSize}&search=${encodeURIComponent(search)}`
  );
  if (!res.ok) {
    throw new Error("Không thể tải bảng dữ liệu");
  }
  return res.json();
}

export async function fetchDispatchSheet(): Promise<DispatchSheetResponse> {
  const res = await fetch(`${API_BASE}/reports/dispatch-sheet`);
  return res.json();
}

export interface RcaBreakdownItem {
  factor: string;
  pct: number;
  color: string;
  desc: string;
}

export interface CausalNode {
  id: string;
  label: string;
  type: string;
}

export interface CausalEdge {
  from: string;
  to: string;
  weight: number;
}

export interface RcaResponse {
  stage: string;
  bottleneck_probability: number;
  expected_start: string;
  expected_duration: string;
  primary_cause: string;
  attribution_breakdown: RcaBreakdownItem[];
  causal_graph: {
    nodes: CausalNode[];
    edges: CausalEdge[];
  };
}

export interface StrategicPlan {
  plan_id: string;
  name: string;
  theme: string;
  badge_color: string;
  action_summary: string;
  cost_vnd: number;
  delay_minutes: number;
  sla_pct: number;
  co2_kg: number;
  deltas: {
    delay_pct: number;
    cost_pct: number;
    sla_pct: number;
    co2_pct: number;
  };
  score: number;
  parameters: {
    priority: string;
    tugger_cycle_min: number;
    extra_loaders: number;
    reassigned_workers: number;
    extra_tuggers: number;
  };
}

export interface MultiPlansResponse {
  weights: Record<string, number>;
  plans: StrategicPlan[];
  recommended_plan_id: string;
  summary: string;
}

export interface CounterfactualResponse {
  target_sla: number;
  achievable: boolean;
  minimal_intervention: string;
  resource_increments: {
    extra_loaders: number;
    tugger_cycle_min: number;
    extra_cost_vnd: number;
  };
  confidence_pct: number;
}

export interface AblationBenchmark {
  stage: string;
  description: string;
  wape: number;
  f1_bottleneck: number;
  delay_reduction_pct: number;
  sla_pct: number;
  cost_delta_pct: number;
  co2_delta_pct: number;
  latency_sec: number;
}

export interface CopilotChatResponse {
  intent: string;
  answer: string;
  is_safe: boolean;
  data?: any;
  constraint_violations?: string[];
  suggested_actions?: string[];
}

export interface IncidentReplayPhase {
  phase_id: number;
  name: string;
  timestamp: string;
  status_color: string;
  kpis: {
    health_score: number;
    dock_queue: number;
    fleet_util: string;
    sla: string;
  };
  event: string;
  dock_state: string;
  active_tuggers: string[];
}

export interface IncidentReplayResponse {
  scenario_name: string;
  horizon: string;
  phases: IncidentReplayPhase[];
}

export async function fetchRootCauseAnalysis(stage = "loading"): Promise<RcaResponse> {
  const res = await fetch(`${API_BASE}/detect/rca?stage=${stage}&utilization=88.5&demand_surge_pct=30.0`);
  return res.json();
}

export async function fetchMultiObjectivePlans(params?: {
  alpha?: number;
  beta?: number;
  gamma?: number;
  delta?: number;
  demand_multiplier?: number;
}): Promise<MultiPlansResponse> {
  const res = await fetch(`${API_BASE}/recommend/multi-plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      alpha: params?.alpha ?? 0.25,
      beta: params?.beta ?? 0.4,
      gamma: params?.gamma ?? 0.15,
      delta: params?.delta ?? 0.2,
      demand_multiplier: params?.demand_multiplier ?? 1.3,
    }),
  });
  return res.json();
}

export async function fetchCounterfactual(targetSla = 95.0): Promise<CounterfactualResponse> {
  const res = await fetch(`${API_BASE}/recommend/counterfactual?target_sla=${targetSla}`);
  return res.json();
}

export async function fetchAblationBenchmarks(): Promise<AblationBenchmark[]> {
  const res = await fetch(`${API_BASE}/recommend/ablation`);
  return res.json();
}

export async function askLogisticsCopilot(query: string, targetSla = 95.0): Promise<CopilotChatResponse> {
  const res = await fetch(`${API_BASE}/copilot/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, target_sla: targetSla }),
  });
  return res.json();
}

export async function fetchIncidentReplay(): Promise<IncidentReplayResponse> {
  const res = await fetch(`${API_BASE}/scenarios/replay`);
  return res.json();
}
