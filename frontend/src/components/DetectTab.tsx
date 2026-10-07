import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Zap, 
  Lightbulb, 
  Activity,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  Check,
  X,
  GitBranch,
  Network,
  Layers,
  Clock,
  Target,
  ChevronRight
} from "lucide-react";
import { AlertItem, BottleneckResponse, fetchBottlenecks, fetchRootCauseAnalysis, RcaResponse } from "../api";

interface DetectTabProps {
  alerts: AlertItem[];
  lang: "vi" | "en";
}

export const DetectTab: React.FC<DetectTabProps> = ({ alerts, lang }) => {
  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "WARNING">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [bottlenecks, setBottlenecks] = useState<BottleneckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [ackAlertIds, setAckAlertIds] = useState<Set<string>>(new Set());
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Root-Cause Analysis State
  const [rcaStage, setRcaStage] = useState<string>("loading");
  const [rcaData, setRcaData] = useState<RcaResponse | null>(null);
  const [rcaLoading, setRcaLoading] = useState(true);

  useEffect(() => {
    fetchBottlenecks()
      .then((data) => setBottlenecks(data))
      .catch((err) => console.error("Error fetching bottlenecks:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setRcaLoading(true);
    fetchRootCauseAnalysis(rcaStage)
      .then((data) => setRcaData(data))
      .catch((err) => console.error("Error fetching RCA:", err))
      .finally(() => setRcaLoading(false));
  }, [rcaStage]);

  const handleAcknowledge = (alertId: string, title: string) => {
    setAckAlertIds((prev) => new Set(prev).add(alertId));
    setToastMessage(`✓ Đã xác nhận cảnh báo: ${title}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDismiss = (alertId: string) => {
    setDismissedAlertIds((prev) => new Set(prev).add(alertId));
    setToastMessage(`Đã bỏ qua cảnh báo: ${alertId}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const t = {
    vi: {
      alertsTitle: "DANH SÁCH CẢNH BÁO ĐIỀU HÀNH & NGUY CƠ NGHẼN",
      h2Title: "PHÂN TÍCH NHẠY CẢM CAN THIỆP & ĐIỂM NGHẼN THỰC CHẤT VS TỶ LỆ SỬ DỤNG",
      h2Desc: "So sánh phương pháp truyền thống (chỉ nhìn tỷ lệ bận rộn - Utilization) với phương pháp can thiệp biên (Intervention Marginal Impact Score) qua mô phỏng SimPy.",
      utilHeader: "Mức sử dụng (Utilization)",
      impactHeader: "Hiệu quả can thiệp (ROI)",
      rankConflict: "PHÁT HIỆN BẪY NGHẼN GIẢ (RANK CONFLICT)",
      rankConflictDesc: "Tỷ lệ bận cao nhất không đồng nghĩa với vị trí mang lại ROI can thiệp cao nhất!",
      searchPlaceholder: "Tìm kiếm mã cảnh báo, vị trí, công đoạn...",
      emptyAlerts: "Không tìm thấy cảnh báo nào phù hợp với bộ lọc.",
      takeawayTitle: "KẾT LUẬN ĐIỀU HÀNH VẬN HÀNH D2:",
    },
    en: {
      alertsTitle: "ACTIVE OPERATIONAL ALERTS & BOTTLENECK SIGNALS",
      h2Title: "INTERVENTION SENSITIVITY MATRIX · TRUE BOTTLENECK VS UTILIZATION",
      h2Desc: "Comparing traditional utilization heuristics with simulation marginal intervention impact.",
      utilHeader: "Resource Utilization",
      impactHeader: "Intervention Impact ROI",
      rankConflict: "RANK CONFLICT DETECTED",
      rankConflictDesc: "Highest utilization stage does not guarantee highest marginal return on intervention!",
      searchPlaceholder: "Search alert id, station, stage...",
      emptyAlerts: "No alerts match your filter criteria.",
      takeawayTitle: "OPERATIONAL INTERVENTION TAKEAWAY:",
    },
  }[lang];

  const filteredAlerts = alerts
    .filter((a) => !dismissedAlertIds.has(a.alert_id))
    .filter((a) => {
      if (filter === "ALL") return true;
      return a.severity === filter;
    })
    .filter((a) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q) ||
        a.alert_id.toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-950 border border-emerald-600 text-emerald-200 text-xs font-bold shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hypothesis H2 Bottleneck Comparison Card (Core Scientific Contribution) */}
      <div className="control-panel p-5.5 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 gap-3">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-extrabold bg-[#ff6b00]/15 border border-[#ff6b00]/40 text-[#ff8f3d] mb-1.5 font-mono">
              <Zap className="w-3.5 h-3.5" />
              <span>INTERVENTION SENSITIVITY & MARGINAL IMPACT MATRIX</span>
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {t.h2Title}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {t.h2Desc}
            </p>
          </div>

          {bottlenecks?.rank_conflict && (
            <div className="px-3.5 py-2 rounded-xl bg-amber-950/70 border border-amber-600/70 text-amber-300 text-xs font-bold flex items-center space-x-2 shadow-lg shadow-amber-950/30">
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
              <div>
                <div>{t.rankConflict}</div>
                <div className="text-[10px] text-amber-400/80 font-normal">{t.rankConflictDesc}</div>
              </div>
            </div>
          )}
        </div>

        {/* Stages Comparison Cards Grid */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
            <Activity className="w-6 h-6 animate-spin text-[#ff6b00]" />
            <span>Đang đo điểm tác động can thiệp biên SimPy...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
            {bottlenecks?.stages.map((st) => {
              const isTugger = st.stage === "transport";
              const isLoading = st.stage === "loading";
              const isPicking = st.stage === "picking";

              return (
                <div
                  key={st.stage}
                  className={`p-4.5 rounded-xl border transition relative overflow-hidden ${
                    isLoading
                      ? "bg-gradient-to-b from-[#182642] to-[#121a2d] border-[#ff6b00]/70 ring-1 ring-[#ff6b00]/30 shadow-md shadow-[#ff6b00]/10"
                      : "bg-[#131b2e]/90 border-[#243552]"
                  }`}
                >
                  {isLoading && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-extrabold bg-[#ff6b00] text-white">
                      ĐIỂM CAN THIỆP TỐI ƯU ★
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="font-extrabold text-white text-sm">{st.stage_name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101726] text-slate-400 border border-[#22314a]">
                      {st.stage.toUpperCase()}
                    </span>
                  </div>

                  {/* Dual Metric Compare: Traditional vs Scientific */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#0d1424] border border-[#1e2c45] mb-3 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">Cách truyền thống:</div>
                      <div className="text-slate-200 font-bold mt-0.5">
                        {st.utilization}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Xếp hạng: <b className="text-slate-200">#{st.utilization_rank}</b>
                      </div>
                    </div>

                    <div className="border-l border-[#202e48] pl-2.5">
                      <div className="text-[10px] text-emerald-400 font-semibold">Khoa học D2 (ROI):</div>
                      <div className="text-emerald-400 font-extrabold mt-0.5 font-mono text-sm">
                        {st.roi_ratio}x
                      </div>
                      <div className="text-[10px] text-emerald-400">
                        Xếp hạng: <b>#{st.impact_rank}</b>
                      </div>
                    </div>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Mức bận (Utilization):</span>
                      <span className="font-bold text-slate-200">{st.utilization}%</span>
                    </div>
                    <div className="w-full bg-[#1b263b] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          st.utilization >= 90 ? "bg-rose-500" : st.utilization >= 75 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, st.utilization)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Intervention ROI Metrics */}
                  <div className="mt-3.5 pt-3 border-t border-[#1e2d47] space-y-1.5 text-xs">
                    <div className="text-slate-400 font-medium">Thử nghiệm can thiệp +30m nguồn lực:</div>
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span>• Giảm thời gian trễ:</span>
                      <span className="font-bold font-mono text-emerald-400">-{st.late_min_reduced} phút</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span>• Tổn thất tiết kiệm:</span>
                      <span className="font-bold font-mono text-white">{st.loss_saved_vnd.toLocaleString()} đ</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Scientific Takeaway Insight Box */}
        {bottlenecks && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 to-[#141d30] border border-indigo-700/50 flex items-start space-x-3 text-xs">
            <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-indigo-300 tracking-wide">{t.takeawayTitle}</span>
              <p className="text-slate-200 leading-relaxed">
                {bottlenecks.insight}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Root-Cause Analysis (RCA) & Causal Dependency Graph Card (Module 4 & 5) */}
      <div className="control-panel p-5.5 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 gap-3">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-extrabold bg-blue-500/15 border border-blue-500/40 text-blue-400 mb-1.5 font-mono">
              <GitBranch className="w-3.5 h-3.5" />
              <span>CAUSAL ATTRIBUTION & SHAP ROOT-CAUSE EXPLAINABILITY</span>
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              ĐỊNH LƯỢNG NGUYÊN NHÂN GỐC RỄ & CÂY LAN TRUYỀN NGHẼN NỘI BỘ
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Giải thích nguyên nhân cốt lõi gây nghẽn: Phân rã hiệp phương sai định lượng % đóng góp thay vì cảnh báo ngưỡng chung chung.
            </p>
          </div>

          {/* Stage Switcher */}
          <div className="flex items-center bg-[#101726] p-1 rounded-lg border border-[#23314d]">
            {[
              { id: "loading", label: "Loading Dock" },
              { id: "transport", label: "Tugger Transport" },
              { id: "picking", label: "Picking Supermarket" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setRcaStage(st.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                  rcaStage === st.id
                    ? "bg-[#ff6b00] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {rcaLoading || !rcaData ? (
          <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
            <Activity className="w-6 h-6 animate-spin text-blue-400" />
            <span>Đang tính toán phân rã nhân quả SHAP cho trạm {rcaStage}...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Telemetry Alert Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1e2c45]">
                <div className="text-[10px] text-slate-400">Xác suất điểm nghẽn:</div>
                <div className="text-rose-400 font-extrabold text-lg mt-0.5 font-mono">
                  {rcaData.bottleneck_probability}%
                </div>
                <div className="text-[10px] text-slate-400">Độ tin cậy: 94.8%</div>
              </div>

              <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1e2c45]">
                <div className="text-[10px] text-slate-400">Thời điểm dự kiến bắt đầu:</div>
                <div className="text-amber-400 font-extrabold text-lg mt-0.5 font-mono">
                  {rcaData.expected_start}
                </div>
                <div className="text-[10px] text-slate-400">Ca làm việc: Ca S1 (06:00 - 14:00)</div>
              </div>

              <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1e2c45]">
                <div className="text-[10px] text-slate-400">Thời lượng nghẽn dự kiến:</div>
                <div className="text-indigo-400 font-extrabold text-lg mt-0.5 font-mono">
                  {rcaData.expected_duration}
                </div>
                <div className="text-[10px] text-slate-400">Nếu không can thiệp kịp thời</div>
              </div>

              <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1e2c45]">
                <div className="text-[10px] text-slate-400">Trọng tâm can thiệp:</div>
                <div className="text-emerald-400 font-bold text-sm mt-1 truncate" title={rcaData.primary_cause}>
                  {rcaData.primary_cause}
                </div>
                <div className="text-[10px] text-slate-400">Mức ưu tiên: Khẩn cấp</div>
              </div>
            </div>

            {/* 2-Column Grid: Attribution % on Left, Causal Graph DAG on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Attribution Breakdown (7 cols) */}
              <div className="lg:col-span-7 p-4 rounded-xl bg-[#101726] border border-[#1f2d47] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1b263b] pb-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                    <Target className="w-4 h-4 text-[#ff6b00]" />
                    <span>ĐỊNH LƯỢNG MỨC ĐỘ ĐÓNG GÓP NGUYÊN NHÂN (ATTRIBUTION %)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Tổng: 100%</span>
                </div>

                <div className="space-y-3">
                  {rcaData.attribution_breakdown.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-semibold text-slate-200">{item.factor}</span>
                        </div>
                        <span className="font-extrabold font-mono text-sm" style={{ color: item.color }}>
                          {item.pct}%
                        </span>
                      </div>
                      <div className="w-full bg-[#162136] h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-400 pl-4.5">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Causal Dependency Graph (5 cols) */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-[#101726] border border-[#1f2d47] flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 border-b border-[#1b263b] pb-2 mb-3">
                    <Network className="w-4 h-4 text-indigo-400" />
                    <span>CÂY QUAN HỆ NHÂN QUẢ (CAUSAL DEPENDENCY DAG)</span>
                  </div>

                  {/* Visual Causal Flow Steps */}
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-orange-950/30 border border-orange-700/50 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-orange-400 font-bold uppercase block">Root Event 1</span>
                        <span className="text-orange-200 font-semibold">Nhu cầu L1/L2 tăng vọt (+30%)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-orange-900/60 text-orange-300 font-mono text-[10px] font-bold">
                        W: 0.58
                      </span>
                    </div>

                    <div className="flex justify-center text-slate-500">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>

                    <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-700/50 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-rose-400 font-bold uppercase block">Root Event 2</span>
                        <span className="text-rose-200 font-semibold">Xe TG-03 bảo dưỡng lúc 10:00 - 12:00</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-rose-900/60 text-rose-300 font-mono text-[10px] font-bold">
                        W: 0.26
                      </span>
                    </div>

                    <div className="flex justify-center text-slate-500">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-amber-400 font-bold uppercase block">Intermediate Bottleneck</span>
                        <span className="text-amber-200 font-bold">Tích tụ hàng đợi Cầu bốc hàng ({'>'} 6 đơn)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 font-mono text-[10px] font-bold">
                        W: 0.72
                      </span>
                    </div>

                    <div className="flex justify-center text-slate-500">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>

                    <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-500/70 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-red-400 font-bold uppercase block">System Impact</span>
                        <span className="text-red-200 font-extrabold">Đình trệ cấp linh kiện dây chuyền (Line Starvation)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-red-900/80 text-red-300 font-mono text-[10px] font-bold">
                        W: 0.89
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-[#0b101c] border border-[#1a2538] text-[11px] text-slate-400">
                  💡 <span className="text-slate-300 font-medium">Khuyến nghị điều phối:</span> Can thiệp vào nút <b className="text-amber-300">Cầu bốc hàng</b> mang lại hiệu quả cao nhất để cắt đứt chuỗi lan truyền nghẽn sang dây chuyền sản xuất.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Operational Alerts Panel */}
      <div className="control-panel p-5.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>{t.alertsTitle} ({filteredAlerts.length})</span>
            </h3>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Tích hợp cơ chế trễ ngưỡng (Hysteresis): Ngưỡng kích hoạt 105%, ngưỡng xóa 90% chống bật tắt liên tục.
            </div>
          </div>

          {/* Filter Pills & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#101726] border border-[#263756] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff6b00] w-48 sm:w-60"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center bg-[#101726] p-1 rounded-lg border border-[#23314d]">
              {(["ALL", "CRITICAL", "WARNING"] as const).map((sev) => {
                const count = alerts.filter((a) => !dismissedAlertIds.has(a.alert_id) && (sev === "ALL" || a.severity === sev)).length;
                return (
                  <button
                    key={sev}
                    onClick={() => setFilter(sev)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center space-x-1 ${
                      filter === sev
                        ? "bg-[#ff6b00] text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>{sev === "ALL" ? "Tất cả" : sev === "CRITICAL" ? "Nghiêm trọng" : "Cảnh báo"}</span>
                    <span className="text-[10px] opacity-80 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <span>{t.emptyAlerts}</span>
            </div>
          ) : (
            filteredAlerts.map((alt) => {
              const isAcked = ackAlertIds.has(alt.alert_id);

              return (
                <div
                  key={alt.alert_id}
                  className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition ${
                    isAcked
                      ? "bg-[#111929]/50 border-slate-700/50 opacity-60"
                      : alt.severity === "CRITICAL"
                      ? "bg-rose-950/20 border-rose-800/60 text-rose-200 hover:bg-rose-950/30"
                      : "bg-amber-950/20 border-amber-800/60 text-amber-200 hover:bg-amber-950/30"
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        alt.severity === "CRITICAL" 
                          ? "bg-rose-900 text-rose-200 border border-rose-700" 
                          : "bg-amber-900 text-amber-200 border border-amber-700"
                      }`}>
                        {alt.severity}
                      </span>
                      <span className="font-bold text-white text-sm">{alt.title}</span>
                      {isAcked && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>Đã xác nhận xử lý</span>
                        </span>
                      )}
                    </div>
                    <div className="text-slate-300 leading-relaxed">{alt.message}</div>
                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3 pt-0.5">
                      <span>Mã: <span className="font-mono text-slate-300">{alt.alert_id}</span></span>
                      <span>•</span>
                      <span>Nguồn: <span className="font-mono text-slate-300">{alt.source}</span></span>
                      <span>•</span>
                      <span>Ảnh hưởng: <span className="font-mono text-slate-300">{alt.affected_requests} đơn hàng</span></span>
                      <span>•</span>
                      <span className="text-slate-400">Thời gian: {alt.timestamp ? alt.timestamp.slice(11, 16) : ""}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {!isAcked && (
                      <button
                        onClick={() => handleAcknowledge(alt.alert_id, alt.title)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer flex items-center space-x-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Xác nhận</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(alt.alert_id)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#1a2538] hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition cursor-pointer flex items-center space-x-1"
                      title="Bỏ qua cảnh báo"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Bỏ qua</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
