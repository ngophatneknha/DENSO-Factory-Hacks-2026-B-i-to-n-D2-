import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { 
  CheckCircle2, 
  XCircle, 
  Sliders, 
  ShieldAlert, 
  Award, 
  TrendingDown, 
  Sparkles, 
  ArrowRight, 
  Info, 
  Check, 
  FileCheck, 
  Zap, 
  Gauge, 
  CornerDownRight, 
  Printer, 
  FileText, 
  Calendar, 
  Building, 
  UserCheck,
  Leaf,
  DollarSign,
  Clock,
  Target,
  BarChart3,
  Flame,
  Scale
} from "lucide-react";
import { 
  RecommendationResponse, 
  evaluateRecommendations, 
  recordDecision, 
  fetchDispatchSheet, 
  DispatchSheetResponse,
  fetchMultiObjectivePlans,
  fetchCounterfactual,
  fetchAblationBenchmarks,
  MultiPlansResponse,
  StrategicPlan,
  CounterfactualResponse,
  AblationBenchmark
} from "../api";

interface RecommendTabProps {
  lang: "vi" | "en";
}

export const RecommendTab: React.FC<RecommendTabProps> = ({ lang }) => {
  const [lambdaRisk, setLambdaRisk] = useState(0.25);
  const [demandMultiplier, setDemandMultiplier] = useState(1.0);
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);
  const [approvedActionId, setApprovedActionId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [showDispatchSheet, setShowDispatchSheet] = useState<boolean>(false);
  const [dispatchSheet, setDispatchSheet] = useState<DispatchSheetResponse | null>(null);

  // Multi-Objective Strategic Plans State (4 Plans)
  const [multiPlans, setMultiPlans] = useState<MultiPlansResponse | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("PLAN_C");

  // Counterfactual State
  const [targetSla, setTargetSla] = useState<number>(95.0);
  const [counterfactual, setCounterfactual] = useState<CounterfactualResponse | null>(null);

  // Ablation Benchmark State
  const [ablationData, setAblationData] = useState<AblationBenchmark[] | null>(null);

  const fetchRecs = (l: number, d: number) => {
    setLoading(true);
    evaluateRecommendations({ lambda_risk: l, n_scenarios: 12, demand_multiplier: d })
      .then((res) => {
        setData(res);
        if (res.best_action_id) {
          setSelectedActionId(res.best_action_id);
        }
      })
      .catch((err) => console.error("Error evaluating recommendations:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecs(lambdaRisk, demandMultiplier);
    fetchDispatchSheet()
      .then((res) => setDispatchSheet(res))
      .catch((err) => console.error("Error fetching dispatch sheet:", err));

    fetchMultiObjectivePlans({ demand_multiplier: demandMultiplier })
      .then((res) => setMultiPlans(res))
      .catch((err) => console.error("Error fetching multi plans:", err));

    fetchAblationBenchmarks()
      .then((res) => setAblationData(res))
      .catch((err) => console.error("Error fetching ablation:", err));
  }, [lambdaRisk, demandMultiplier]);

  useEffect(() => {
    fetchCounterfactual(targetSla)
      .then((res) => setCounterfactual(res))
      .catch((err) => console.error("Error fetching counterfactual:", err));
  }, [targetSla]);

  const handleApprove = async (actionId: string, actionName: string, cost: number, expectedLoss: number) => {
    try {
      await recordDecision({
        action_id: actionId,
        action_name: actionName,
        decision_status: "APPROVED",
        operator_name: "Trưởng ca Logistics (Control Room)",
        cost_vnd: cost,
        expected_saving_vnd: expectedLoss,
        notes: `Phê duyệt điều phối trực tiếp từ Control Room (λ=${lambdaRisk}, tải=${demandMultiplier}x).`,
      });
      setApprovedActionId(actionId);
      setDecisionSuccess(`✓ ĐÃ PHÊ DUYỆT THÀNH CÔNG: "${actionName}" - Lệnh điều động đã được lưu vào sổ cái kiểm toán.`);
      setTimeout(() => setDecisionSuccess(null), 5000);
    } catch (err) {
      console.error("Decision recording error:", err);
    }
  };

  const handlePrintSheet = () => {
    window.print();
  };

  const t = {
    vi: {
      title: "ĐỀ XUẤT ĐỐI SÁCH VÀ TỐI ƯU CÓ XÉT RỦI RO ĐUÔI (CVAR90 & PARETO)",
      lambdaSlider: "Mức coi trọng rủi ro đuôi xấu (λ):",
      statementTitle: "LỆNH KHUYẾN NGHỊ ĐIỀU HÀNH TỐI ƯU (EXECUTIVE DIRECTIVE)",
      approveBtn: "Phê duyệt & Ban hành đối sách",
      paretoTitle: "KHÔNG GIAN ĐÁNH ĐỔI PARETO (TỔN THẤT KỲ VỌNG E[L] VS RỦI RO ĐUÔI CVAR90)",
      actionsTableTitle: "BẢNG ĐÁNH GIÁ VÀ XẾP HẠNG CÁC PHƯƠNG ÁN CAN THIỆP HỢP LỆ",
      objectiveFormula: "Hàm mục tiêu: Risk Score = E[L] + λ · CVaR90[L]",
      sheetBtn: "Xem Phiếu Lệnh Điều Phối Ca Kíp",
    },
    en: {
      title: "TAIL RISK MITIGATION & PARETO RECOMMENDATIONS",
      lambdaSlider: "Tail Risk Aversion (λ):",
      statementTitle: "EXECUTIVE OPERATIONAL DIRECTIVE",
      approveBtn: "Approve & Issue Directive",
      paretoTitle: "PARETO TRADEOFF SPACE (EXPECTED LOSS E[L] VS TAIL RISK CVAR90)",
      actionsTableTitle: "CANDIDATE ACTION EVALUATION & FEASIBILITY RANKING",
      objectiveFormula: "Objective: Risk Score = E[L] + λ · CVaR90[L]",
      sheetBtn: "View Official Shift Dispatch Order",
    },
  }[lang];

  // ECharts Scatter Plot for Pareto frontier
  const feasibleActs = data?.evaluations.filter((e) => e.is_feasible) || [];
  const scatterData = feasibleActs.map((act) => [
    act.expected_loss_vnd,
    act.cvar90_loss_vnd,
    act.name,
    act.is_pareto,
    act.cost_vnd,
    act.action_id,
  ]);

  const paretoChartOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(18, 26, 44, 0.95)",
      borderColor: "#2f436d",
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: "#f8fafc", fontSize: 12 },
      formatter: (params: any) => {
        const d = params.value;
        return `
          <div style="font-weight: bold; color: #ffffff; font-size: 13px; margin-bottom: 4px;">${d[2]}</div>
          <div style="line-height: 1.6; font-size: 11px;">
            <div style="color: #94a3b8;">● Tổn thất kỳ vọng E[L]: <b style="color: #ffffff;">${d[0].toLocaleString()} đ</b></div>
            <div style="color: #ff8f3d;">● Rủi ro đuôi xấu CVaR90: <b style="color: #fb923c;">${d[1].toLocaleString()} đ</b></div>
            <div style="color: #a78bfa;">● Chi phí can thiệp: <b>${d[4].toLocaleString()} đ</b></div>
            <div style="margin-top: 4px; font-weight: bold; color: ${d[3] ? '#34d399' : '#94a3b8'};">
              ${d[3] ? '★ Thuộc tập tối ưu Pareto' : 'Bị trội (Dominated)'}
            </div>
            <div style="color: #38bdf8; font-size: 10px; margin-top: 2px;">(Nhấp chuột để chọn phương án này)</div>
          </div>
        `;
      },
    },
    grid: {
      left: "4%",
      right: "6%",
      bottom: "8%",
      top: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      name: "Tổn thất kỳ vọng E[L] (VND)",
      nameLocation: "middle",
      nameGap: 30,
      nameTextStyle: { color: "#64748b", fontSize: 11 },
      axisLine: { lineStyle: { color: "#253452" } },
      splitLine: { lineStyle: { color: "#141e33", type: "dashed" } },
      axisLabel: { color: "#94a3b8", fontSize: 11, formatter: (v: number) => `${(v / 1e6).toFixed(1)}M` },
    },
    yAxis: {
      type: "value",
      name: "Rủi ro đuôi xấu CVaR90 (VND)",
      nameTextStyle: { color: "#64748b", fontSize: 11, padding: [0, 0, 4, 0] },
      axisLine: { lineStyle: { color: "#253452" } },
      splitLine: { lineStyle: { color: "#141e33", type: "dashed" } },
      axisLabel: { color: "#94a3b8", fontSize: 11, formatter: (v: number) => `${(v / 1e6).toFixed(1)}M` },
    },
    series: [
      {
        type: "scatter",
        symbolSize: (dataItem: any) => (dataItem[5] === selectedActionId ? 28 : 20),
        data: scatterData,
        itemStyle: {
          color: (params: any) => {
            if (params.value[5] === selectedActionId) return "#ff6b00";
            return params.value[3] ? "#10b981" : "#475569";
          },
          borderColor: "#ffffff",
          borderWidth: 2,
          shadowBlur: 10,
          shadowColor: (params: any) => (params.value[3] ? "rgba(16, 185, 129, 0.4)" : "rgba(0,0,0,0)"),
        },
      },
    ],
  };

  const onChartClick = (params: any) => {
    if (params && params.value && params.value[5]) {
      setSelectedActionId(params.value[5]);
    }
  };

  const bestAction = feasibleActs.find((a) => a.action_id === (selectedActionId || data?.best_action_id)) || feasibleActs[0];
  const isCurrentlyApproved = approvedActionId === bestAction?.action_id;

  const currentStrategicPlan = multiPlans?.plans.find((p) => p.plan_id === selectedPlanId) || multiPlans?.plans[0];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {decisionSuccess && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-200 text-xs font-bold shadow-2xl flex items-center space-x-2.5 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{decisionSuccess}</span>
        </div>
      )}

      {/* Top Controls: Lambda Risk Slider & Scenario Multiplier */}
      <div className="control-panel p-5.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <Award className="w-4 h-4 text-[#ff6b00]" />
              <span>{t.title}</span>
            </h2>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Tối ưu hóa đa mục tiêu: min J = α·C_cost + β·C_delay + γ·C_CO2 + δ·C_SLA (CVaR90 Conditional Value-at-Risk).
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDispatchSheet(!showDispatchSheet)}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer flex items-center space-x-1.5 border border-indigo-400/40 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showDispatchSheet ? "Ẩn Phiếu Lệnh" : t.sheetBtn}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Risk Weight Slider */}
          <div className="bg-[#101726] p-4 rounded-xl border border-[#23314d]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-200 font-semibold">{t.lambdaSlider}</span>
              <span className="font-mono font-bold text-[#ff8f3d] text-sm">λ = {lambdaRisk.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={lambdaRisk}
              onChange={(e) => setLambdaRisk(Number(e.target.value))}
              className="w-full accent-[#ff6b00] cursor-pointer"
            />

            {/* Lambda Quick Pills */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1c2a44] text-[10px]">
              <button
                onClick={() => setLambdaRisk(0.0)}
                className={`px-2 py-0.5 rounded cursor-pointer transition ${lambdaRisk === 0.0 ? 'bg-[#ff6b00] text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                λ=0.0 (Tiết kiệm TB)
              </button>
              <button
                onClick={() => setLambdaRisk(0.25)}
                className={`px-2 py-0.5 rounded cursor-pointer transition ${lambdaRisk === 0.25 ? 'bg-[#ff6b00] text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                λ=0.25 (Chuẩn khuyến nghị)
              </button>
              <button
                onClick={() => setLambdaRisk(0.75)}
                className={`px-2 py-0.5 rounded cursor-pointer transition ${lambdaRisk === 0.75 ? 'bg-[#ff6b00] text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                λ=0.75 (Phòng vệ cao)
              </button>
            </div>
          </div>

          {/* Demand Surge Multiplier */}
          <div className="bg-[#101726] p-4 rounded-xl border border-[#23314d]">
            <label className="text-slate-200 font-semibold block mb-1.5">Kịch bản phụ tải kiểm tra ứng phó:</label>
            <select
              value={demandMultiplier}
              onChange={(e) => setDemandMultiplier(Number(e.target.value))}
              className="w-full bg-[#141d30] border border-[#2d3f61] rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-[#ff6b00]"
            >
              <option value={1.0}>1.0x - Bình thường (Kế hoạch sản xuất hiện tại)</option>
              <option value={1.2}>1.2x - Quá tải +20%</option>
              <option value={1.3}>1.3x - Storyline Đề Bài DENSO (+30% Line 1 & Line 2)</option>
              <option value={1.4}>1.4x - Tải trọng tăng +40% (Stress test)</option>
            </select>
            <div className="text-[11px] text-slate-400 mt-2">
              Hệ thống đánh giá trên 12 kịch bản ngẫu nhiên SimPy cho mỗi phương án can thiệp.
            </div>
          </div>
        </div>
      </div>

      {/* Official Printable Dispatch Order Sheet Modal / Expander */}
      {showDispatchSheet && dispatchSheet && (
        <div className="control-panel p-6 border-2 border-indigo-500/80 bg-[#0e1628] animate-in fade-in duration-200 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#233554] gap-2">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wide">
                <Building className="w-4 h-4" />
                <span>{dispatchSheet.facility}</span>
              </div>
              <h2 className="text-sm font-black text-white mt-1">
                {dispatchSheet.directive_title}
              </h2>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Mã lệnh: {dispatchSheet.sheet_id} · {dispatchSheet.shift} · Ngày: {dispatchSheet.effective_date}
              </div>
            </div>

            <button
              onClick={handlePrintSheet}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Lệnh Điều Phối</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141e33] border border-[#27395c] text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-[#ff8f3d]">Tóm lược quyết định: </span>
            {dispatchSheet.summary}
          </div>

          {/* Action Steps Schedule */}
          <div className="space-y-2">
            <div className="font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#ff6b00]" />
              <span>Lịch trình Triển khai Hành động trong Ca:</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#23314d]">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#23314d] text-slate-300 bg-[#162136]">
                    <th className="py-2.5 px-3 font-bold w-24">Thời điểm</th>
                    <th className="py-2.5 px-3 font-semibold w-48">Phân xưởng / Trạm</th>
                    <th className="py-2.5 px-3 font-semibold">Nội dung chỉ đạo thực hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2a44] bg-[#0f1626]/80">
                  {dispatchSheet.action_steps.map((st, idx) => (
                    <tr key={idx} className="hover:bg-[#18233a]/60 text-slate-300">
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-300">{st.time}</td>
                      <td className="py-2.5 px-3 font-semibold text-white">{st.stage}</td>
                      <td className="py-2.5 px-3 text-slate-300">{st.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Target SLA & Signature */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-[#233554] text-xs text-slate-400 gap-3">
            <div className="flex items-center space-x-4">
              <span>Mục tiêu Late Rate: <b className="text-emerald-400">{dispatchSheet.kpi_targets.max_late_rate}</b></span>
              <span>Hàng đợi Dock tối đa: <b className="text-amber-400">{dispatchSheet.kpi_targets.dock_queue_limit}</b></span>
            </div>

            <div className="flex items-center space-x-2 text-slate-300">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Phê duyệt bởi: <b>{dispatchSheet.approved_by}</b></span>
            </div>
          </div>
        </div>
      )}

      {/* 4 STRATEGIC PLANS SHOWCASE (Module 7, 8 & 9) */}
      <div className="control-panel p-5.5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-extrabold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 mb-1.5">
              <Scale className="w-3.5 h-3.5" />
              <span>MODULE 7, 8 & 9: MULTI-STRATEGY ACTION SUITE (HỆ THỐNG ĐA PHƯƠNG ÁN)</span>
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              LỰA CHỌN 4 CHIẾN LƯỢC ĐIỀU PHỐI ĐA MỤC TIÊU (COST · DELAY · SLA · CO2)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hệ thống cung cấp danh mục đối sách rõ ràng thay vì một phương án đơn lẻ, giúp người điều hành chủ động ra quyết định theo bối cảnh ca kíp.
            </p>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {multiPlans?.plans.map((p) => {
            const isSelected = p.plan_id === selectedPlanId;
            const isRec = p.plan_id === "PLAN_C";

            return (
              <div
                key={p.plan_id}
                onClick={() => setSelectedPlanId(p.plan_id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? "bg-gradient-to-b from-[#182642] to-[#11192a] border-[#ff6b00] ring-2 ring-[#ff6b00]/40 shadow-lg shadow-[#ff6b00]/10"
                    : "bg-[#111929]/80 border-[#22314d] hover:border-slate-500 hover:bg-[#152033]"
                }`}
              >
                {isRec && (
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[9px] font-black bg-[#ff6b00] text-white shadow-sm">
                    KHUYẾN NGHỊ ★
                  </div>
                )}

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    {p.plan_id === "PLAN_A" && <DollarSign className="w-4 h-4 text-cyan-400" />}
                    {p.plan_id === "PLAN_B" && <Flame className="w-4 h-4 text-rose-400" />}
                    {p.plan_id === "PLAN_C" && <Award className="w-4 h-4 text-emerald-400" />}
                    {p.plan_id === "PLAN_D" && <Leaf className="w-4 h-4 text-teal-400" />}
                    <span className="font-extrabold text-white text-xs">{p.name}</span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                    {p.action_summary}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-[#1e2a44] text-xs">
                  {/* Delta KPI Chips */}
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                    <div className="p-1.5 rounded bg-[#0d1424] border border-[#1b263b]">
                      <div className="text-[9px] text-slate-400 font-sans">Thời gian trễ:</div>
                      <div className="font-bold text-emerald-400">{p.deltas.delay_pct}%</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#0d1424] border border-[#1b263b]">
                      <div className="text-[9px] text-slate-400 font-sans">SLA Đạt:</div>
                      <div className="font-bold text-white">{p.sla_pct}%</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#0d1424] border border-[#1b263b]">
                      <div className="text-[9px] text-slate-400 font-sans">Chi phí thêm:</div>
                      <div className="font-bold text-slate-200">
                        {p.cost_vnd > 0 ? `+${p.cost_vnd.toLocaleString()} đ` : "0 đ"}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-[#0d1424] border border-[#1b263b]">
                      <div className="text-[9px] text-slate-400 font-sans">Phát thải CO₂:</div>
                      <div className={`font-bold ${p.deltas.co2_pct <= 0 ? 'text-teal-400' : 'text-amber-400'}`}>
                        {p.deltas.co2_pct > 0 ? `+${p.deltas.co2_pct}%` : `${p.deltas.co2_pct}%`}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApprove(p.plan_id, p.name, p.cost_vnd, p.cost_vnd * 3);
                    }}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                      approvedActionId === p.plan_id
                        ? "bg-emerald-700 text-white"
                        : isSelected
                        ? "bg-[#ff6b00] hover:bg-[#ff7b1a] text-white shadow-md"
                        : "bg-[#1d293f] hover:bg-[#283857] text-slate-200"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{approvedActionId === p.plan_id ? "Đã phê duyệt" : "Phê duyệt phương án này"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COUNTERFACTUAL RECOMMENDATION CARD (Module 10) */}
      <div className="control-panel p-5.5 relative overflow-hidden bg-gradient-to-r from-[#111a2e] to-[#0f1728]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-extrabold bg-indigo-500/15 border border-indigo-500/40 text-indigo-400 mb-1.5">
              <Target className="w-3.5 h-3.5" />
              <span>MODULE 10: COUNTERFACTUAL RECOMMENDATION SOLVER</span>
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              TRUY VẤN ĐẢO NGƯỢC: CẦN THAY ĐỔI TỐI THIỂU ĐIỀU GÌ ĐỂ SLA ≥ {targetSla}%?
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hệ thống giải bài toán ngược: Thay vì dự báo hậu quả, tính toán cấu hình nguồn lực tối thiểu (Minimal Intervention) để đạt chỉ tiêu cam kết.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-[#0c1322] px-4 py-2 rounded-xl border border-[#1e2d47]">
            <span className="text-xs text-slate-300 font-semibold">Chỉ tiêu SLA:</span>
            <input
              type="range"
              min="85"
              max="99"
              step="1"
              value={targetSla}
              onChange={(e) => setTargetSla(Number(e.target.value))}
              className="w-32 accent-indigo-400 cursor-pointer"
            />
            <span className="font-mono font-black text-indigo-300 text-sm">{targetSla}%</span>
          </div>
        </div>

        {counterfactual && (
          <div className="p-4.5 rounded-xl bg-[#0b111e] border border-indigo-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-700">
                  CAN THIỆP TỐI THIỂU
                </span>
                <span className="text-xs font-bold text-white">{counterfactual.minimal_intervention}</span>
              </div>
              <div className="text-xs text-slate-300 flex flex-wrap items-center gap-4 pt-1">
                <span>Nhân lực Dock: <b className="text-emerald-400">+{counterfactual.resource_increments.extra_loaders} loader</b></span>
                <span>•</span>
                <span>Chu kỳ xe Tugger: <b className="text-cyan-400">{counterfactual.resource_increments.tugger_cycle_min} phút/chuyến</b></span>
                <span>•</span>
                <span>Chi phí phụ trội: <b className="text-amber-400">{counterfactual.resource_increments.extra_cost_vnd.toLocaleString()} đ</b></span>
              </div>
            </div>

            <div className="shrink-0 p-3 rounded-lg bg-[#111929] border border-[#202e48] text-right font-mono text-xs">
              <div className="text-[10px] text-slate-400 font-sans">Độ tin cậy mô hình:</div>
              <div className="text-indigo-400 font-black text-base">{counterfactual.confidence_pct}%</div>
            </div>
          </div>
        )}
      </div>

      {/* SCIENTIFIC ABLATION BENCHMARK TABLE (Module 20 & 21) */}
      <div className="control-panel p-5.5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-extrabold bg-purple-500/15 border border-purple-500/40 text-purple-400 mb-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>MODULE 20: SCIENTIFIC ABLATION BENCHMARK (5 MATURITY STAGES)</span>
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              BẢNG ĐỐI SÁCH ABLATION NGHIÊN CỨU KHOA HỌC: CHỨNG MINH TÍNH VƯỢT TRỘI CỦA HỆ THỐNG
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              So sánh khách quan 5 tầng công nghệ: Truyền thống → Chỉ dự báo → Dự báo + Mô phỏng → Đề xuất tối ưu → Toàn diện Closed-loop.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#23314d]">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#23314d] text-slate-300 bg-[#141e33]">
                <th className="py-2.5 px-3 font-bold w-48">Tầng kiến trúc (Stage)</th>
                <th className="py-2.5 px-3 font-semibold">Mô tả giải pháp</th>
                <th className="py-2.5 px-2.5 font-semibold text-center font-mono">WAPE (%)</th>
                <th className="py-2.5 px-2.5 font-semibold text-center font-mono">Bottleneck F1</th>
                <th className="py-2.5 px-2.5 font-semibold text-center font-mono">Giảm trễ (%)</th>
                <th className="py-2.5 px-2.5 font-semibold text-center font-mono">SLA (%)</th>
                <th className="py-2.5 px-2.5 font-semibold text-center font-mono">Δ CO₂ (%)</th>
                <th className="py-2.5 px-2.5 font-semibold text-center font-mono">Độ trễ AI (s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2a44] bg-[#0f1626]/80">
              {ablationData?.map((st, idx) => {
                const isProposed = idx >= 3;
                return (
                  <tr
                    key={idx}
                    className={`transition ${
                      isProposed ? "bg-[#17253f]/70 font-semibold text-white" : "hover:bg-[#18233a]/60 text-slate-300"
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-white flex items-center space-x-1.5">
                      <span>{st.stage}</span>
                      {idx === 4 && <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-600 text-white font-extrabold">Proposed</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 text-[11px]">{st.description}</td>
                    <td className="py-2.5 px-2.5 text-center font-mono text-cyan-300">{st.wape}%</td>
                    <td className="py-2.5 px-2.5 text-center font-mono text-amber-300">{st.f1_bottleneck}</td>
                    <td className="py-2.5 px-2.5 text-center font-mono text-emerald-400">{st.delay_reduction_pct}%</td>
                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-white">{st.sla_pct}%</td>
                    <td className="py-2.5 px-2.5 text-center font-mono text-teal-300">{st.co2_delta_pct}%</td>
                    <td className="py-2.5 px-2.5 text-center font-mono text-slate-400">{st.latency_sec}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommended Directive Banner */}
      {bestAction && (
        <div className="control-panel p-5.5 border-l-4 border-l-[#ff6b00] bg-gradient-to-r from-[#17243c] to-[#12192a]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#233352] gap-2">
            <div>
              <span className="text-[10px] font-extrabold tracking-wider text-[#ff8f3d] uppercase">
                {t.statementTitle}
              </span>
              <h2 className="text-base font-extrabold text-white mt-0.5">
                {data?.recommendation_statement}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#ff6b00]/20 text-[#ff8f3d] border border-[#ff6b00]/40">
                Action: {bestAction.action_id}
              </span>
            </div>
          </div>

          {/* Action Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
            <div className="flex items-start space-x-2">
              <CornerDownRight className="w-4 h-4 text-[#ff6b00] shrink-0 mt-0.5" />
              <div>
                <div className="text-slate-400 text-[11px]">Quy tắc điều độ:</div>
                <div className="text-white font-bold">{bestAction.action_id.includes("EDD") || bestAction.action_id.includes("COMBINED") ? "Chuyển sang EDD (Ưu tiên hạn chót gấp)" : "Duy trì FIFO"}</div>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <CornerDownRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-slate-400 text-[11px]">Điều động nhân sự:</div>
                <div className="text-white font-bold">{bestAction.action_id.includes("REASSIGN") || bestAction.action_id.includes("COMBINED") ? "Chuyển 1 Picker sang Loading Dock" : "Giữ nguyên nhân sự"}</div>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <CornerDownRight className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-slate-400 text-[11px]">Tần suất Tugger:</div>
                <div className="text-white font-bold">{bestAction.action_id.includes("CYCLE") || bestAction.action_id.includes("COMBINED") ? "Rút ngắn còn 15 phút / chuyến" : "20 phút / chuyến"}</div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#233352] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-300">
              <div>Phương án: <b className="text-white font-mono">{bestAction.name}</b></div>
              <span>•</span>
              <div>Chi phí can thiệp: <b className="text-emerald-400 font-mono">{bestAction.cost_vnd.toLocaleString()} đ</b></div>
              <span>•</span>
              <div>Tổn thất trung bình: <b className="text-cyan-400 font-mono">{bestAction.expected_loss_vnd.toLocaleString()} đ</b></div>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => handleApprove(bestAction.action_id, bestAction.name, bestAction.cost_vnd, bestAction.expected_loss_vnd)}
                disabled={isCurrentlyApproved}
                className={`px-5 py-2.5 rounded-xl text-white font-extrabold text-xs transition flex items-center space-x-2 cursor-pointer shadow-lg ${
                  isCurrentlyApproved
                    ? "bg-emerald-700 opacity-90 cursor-default"
                    : "bg-[#ff6b00] hover:bg-[#ff7b1a] shadow-[#ff6b00]/30"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isCurrentlyApproved ? "Đã ghi nhận lệnh điều động" : t.approveBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pareto Scatter Chart */}
      <div className="control-panel p-5.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>{t.paretoTitle}</span>
            </h3>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Các điểm xanh lá là tập phương án không bị trội (Pareto-optimal). Điểm viền cam là phương án đang được chọn.
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800">
            {feasibleActs.filter((a) => a.is_pareto).length} Phương án tối ưu Pareto
          </span>
        </div>

        <div className="h-76 w-full">
          <ReactECharts 
            option={paretoChartOption} 
            onEvents={{ click: onChartClick }}
            style={{ height: "100%", width: "100%" }} 
          />
        </div>
      </div>

      {/* Candidate Actions Evaluation Table */}
      <div className="control-panel p-5.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
          {t.actionsTableTitle}
        </h3>

        <div className="overflow-x-auto rounded-xl border border-[#22314d]">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#23314d] text-slate-400 bg-[#101726]">
                <th className="py-3 px-3.5 font-bold">Mã</th>
                <th className="py-3 px-3.5 font-bold">Tên giải pháp can thiệp</th>
                <th className="py-3 px-3 font-bold">Chi phí (đ)</th>
                <th className="py-3 px-3 font-bold">Tổn thất E[L]</th>
                <th className="py-3 px-3 font-bold text-amber-400">Rủi ro CVaR90</th>
                <th className="py-3 px-3 font-bold text-white">Risk Score</th>
                <th className="py-3 px-3 font-bold">Trễ TB</th>
                <th className="py-3 px-3 font-bold">Khả thi</th>
                <th className="py-3 px-3.5 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18233a] bg-[#0c1220]/60">
              {data?.evaluations.map((act) => {
                const isSelected = act.action_id === (selectedActionId || data.best_action_id);

                return (
                  <tr
                    key={act.action_id}
                    onClick={() => act.is_feasible && setSelectedActionId(act.action_id)}
                    className={`transition cursor-pointer ${
                      isSelected
                        ? "bg-[#ff6b00]/15 font-medium border-l-2 border-l-[#ff6b00]"
                        : "hover:bg-[#18233a]/60 text-slate-300"
                    }`}
                  >
                    <td className="py-3 px-3.5 font-mono text-slate-400">{act.action_id}</td>
                    <td className="py-3 px-3.5">
                      <div className="text-white font-medium flex items-center space-x-2">
                        <span>{act.name}</span>
                        {act.action_id === data.best_action_id && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#ff6b00] text-white font-extrabold">
                            KHUYẾN NGHỊ ★
                          </span>
                        )}
                        {act.is_pareto && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Pareto
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {act.cost_vnd > 0 ? `${act.cost_vnd.toLocaleString()} đ` : "0 đ"}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {act.is_feasible ? `${act.expected_loss_vnd?.toLocaleString()} đ` : "-"}
                    </td>
                    <td className="py-3 px-3 font-mono text-amber-400">
                      {act.is_feasible ? `${act.cvar90_loss_vnd?.toLocaleString()} đ` : "-"}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {act.is_feasible ? `${act.risk_score?.toLocaleString()} đ` : "-"}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {act.is_feasible ? `${act.avg_late_minutes}m` : "-"}
                    </td>
                    <td className="py-3 px-3">
                      {act.is_feasible ? (
                        <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Khả thi</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center space-x-1" title={act.infeasibility_reason}>
                          <XCircle className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[130px]">Vi phạm: {act.infeasibility_reason}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      {act.is_feasible && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(act.action_id, act.name, act.cost_vnd, act.expected_loss_vnd);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            approvedActionId === act.action_id
                              ? "bg-emerald-700 text-white"
                              : "bg-[#1f2d47] hover:bg-[#ff6b00] hover:text-white text-slate-200"
                          }`}
                        >
                          {approvedActionId === act.action_id ? "Đã duyệt" : "Phê duyệt"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
