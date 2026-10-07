import React, { useState } from "react";
import ReactECharts from "echarts-for-react";
import { 
  TrendingUp, 
  ShieldCheck, 
  Sliders, 
  Layers, 
  Info, 
  Award,
  ChevronRight,
  Activity,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  Gauge
} from "lucide-react";
import { ForecastResponse, fetchForecast } from "../api";

interface PredictTabProps {
  forecast: ForecastResponse | null;
  lang: "vi" | "en";
}

export const PredictTab: React.FC<PredictTabProps> = ({ forecast, lang }) => {
  const [showScenarios, setShowScenarios] = useState(false);
  const [selectedHorizon, setSelectedHorizon] = useState<4 | 8 | 24>(8);
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState<number | null>(null);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(forecast);
  const [loadingForecast, setLoadingForecast] = useState<boolean>(false);

  React.useEffect(() => {
    if (selectedHorizon === 8 && forecast && !forecastData) {
      setForecastData(forecast);
      return;
    }
    setLoadingForecast(true);
    fetchForecast(selectedHorizon)
      .then((res) => setForecastData(res))
      .catch((err) => console.error("Error fetching forecast:", err))
      .finally(() => setLoadingForecast(false));
  }, [selectedHorizon]);

  const t = {
    vi: {
      chartTitle: "DỰ BÁO TẢI XÁC SUẤT VÀ NĂNG LỰC HIỆU DỤNG (15 PHÚT / BƯỚC)",
      q50Label: "Dự báo trung tâm (q50)",
      bandLabel: "Khoảng bất định [q10, q90]",
      capLabel: "Năng lực hiệu dụng",
      backtestTitle: "BẢNG ĐỐI CHỨNG BACKTEST (ĐÁNH GIÁ TRÊN TẬP DỮ LIỆU KIỂM THỬ GIỮ RIÊNG)",
      scenariosTitle: "CÁC QUỸ ĐẠO KỊCH BẢN TƯƠNG LAI (BLOCK BOOTSTRAP PHẦN DƯ)",
      wapeBadge: "Độ chính xác vượt trội:",
      conformalTitle: "Hiệu chỉnh bất định Conformal (CQR / ACI)",
      conformalDesc: "Dải q10-q90 được hiệu chuẩn trực tiếp trên tập kiểm định để bảo đảm độ bao phủ thực tế sát 80% (không gây cảm giác chắc chắn giả).",
      horizonFilter: "Tầm nhìn dự báo:",
      peakLoadLabel: "Tải đỉnh dự kiến",
      overloadAlert: "Khung giờ vượt tải",
      safeMargin: "Biên an toàn trung bình",
      wapeGain: "Cải thiện WAPE",
    },
    en: {
      chartTitle: "PROBABILISTIC WORKLOAD FORECAST VS EFFECTIVE CAPACITY (15-MIN BUCKETS)",
      q50Label: "Median Forecast (q50)",
      bandLabel: "Uncertainty Band [q10, q90]",
      capLabel: "Effective Capacity",
      backtestTitle: "RIGOROUS BACKTEST BENCHMARK (EVALUATED ON HELD-OUT TEST SLICE)",
      scenariosTitle: "FUTURE TRAJECTORY SCENARIOS (BLOCK BOOTSTRAP RESIDUALS)",
      wapeBadge: "WAPE Improvement:",
      conformalTitle: "Conformal Uncertainty Calibration (CQR / ACI)",
      conformalDesc: "q10-q90 intervals are calibrated on validation slices to guarantee ~80% empirical finite-sample coverage without false certainty.",
      horizonFilter: "Forecast Horizon:",
      peakLoadLabel: "Peak Workload",
      overloadAlert: "Overloaded Slots",
      safeMargin: "Avg Safety Margin",
      wapeGain: "WAPE Improvement",
    },
  }[lang];

  const activeForecast = forecastData || forecast;

  if (!activeForecast && loadingForecast) {
    return (
      <div className="control-panel p-12 text-center text-slate-400">
        <Activity className="w-8 h-8 mx-auto mb-3 animate-spin text-[#ff6b00]" />
        <span>Đang tải dữ liệu dự báo xác suất tầm nhìn {selectedHorizon} giờ...</span>
      </div>
    );
  }

  if (!activeForecast) {
    return (
      <div className="control-panel p-12 text-center text-slate-400">
        <Activity className="w-8 h-8 mx-auto mb-3 animate-spin text-[#ff6b00]" />
        <span>Đang tải dữ liệu dự báo xác suất...</span>
      </div>
    );
  }

  // Use full timeline returned by the backend for the selected horizon
  const filteredTimeline = activeForecast.timeline;

  const times = filteredTimeline.map((p) => p.bucket_start.slice(11, 16));
  const q10 = filteredTimeline.map((p) => p.q10);
  const q50 = filteredTimeline.map((p) => p.q50);
  const q90 = filteredTimeline.map((p) => p.q90);
  const capacity = filteredTimeline.map((p) => p.capacity);

  // Peak metrics
  const peakVal = Math.max(...q50);
  const overloadedSlots = filteredTimeline.filter((p) => p.is_risk || p.q50 > p.capacity).length;
  const avgMargin = filteredTimeline.reduce((acc, p) => acc + (p.capacity - p.q50), 0) / (filteredTimeline.length || 1);

  // ECharts Option for Forecast & Uncertainty
  const chartOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(18, 26, 44, 0.95)",
      borderColor: "#2f436d",
      borderWidth: 1,
      padding: [12, 14],
      textStyle: { color: "#f8fafc", fontSize: 12 },
      formatter: (params: any) => {
        if (!params || params.length === 0) return "";
        const timeStr = params[0].axisValue;
        const idx = times.indexOf(timeStr);
        const item = filteredTimeline[idx] || {};
        const q10Val = q10[idx];
        const q50Val = q50[idx];
        const q90Val = q90[idx];
        const capVal = capacity[idx];
        const isOver = q50Val > capVal;
        const ratio = capVal > 0 ? (q50Val / capVal) * 100 : 0;

        return `
          <div style="font-family: monospace; border-bottom: 1px solid #2d3e5e; padding-bottom: 6px; margin-bottom: 6px;">
            <b style="color: #ffffff; font-size: 13px;">Khung giờ: ${timeStr}</b>
            <span style="float: right; color: ${isOver ? '#f43f5e' : '#10b981'}; font-weight: bold;">
              ${isOver ? '⚠️ VƯỢT TẢI' : '✓ AN TOÀN'} (${ratio.toFixed(0)}%)
            </span>
          </div>
          <div style="line-height: 1.7; font-size: 11px;">
            <div style="color: #ff8f3d;">● <b>Dự báo trung tâm (q50):</b> ${q50Val.toFixed(1)} phút chuẩn</div>
            <div style="color: #94a3b8;">● <b>Dải bất định 80% [q10, q90]:</b> [${q10Val.toFixed(1)} - ${q90Val.toFixed(1)}] phút</div>
            <div style="color: #34d399;">● <b>Năng lực hiệu dụng:</b> ${capVal.toFixed(1)} phút hữu dụng</div>
            <div style="color: ${isOver ? '#fb7185' : '#a7f3d0'};">● <b>Chênh lệch dư/thiếu:</b> ${(capVal - q50Val).toFixed(1)} phút</div>
          </div>
        `;
      },
    },
    legend: {
      data: [t.q50Label, t.capLabel, "Khoảng tin cậy 80% [q10 - q90]"],
      textStyle: { color: "#94a3b8", fontSize: 11 },
      top: 0,
      icon: "roundRect",
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: times,
      axisLine: { lineStyle: { color: "#253452" } },
      axisLabel: { color: "#94a3b8", fontSize: 11 },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      name: "Phút chuẩn (Standard Minutes)",
      nameTextStyle: { color: "#64748b", fontSize: 11, padding: [0, 0, 4, 0] },
      axisLine: { lineStyle: { color: "#253452" } },
      splitLine: { lineStyle: { color: "#141e33", type: "dashed" } },
      axisLabel: { color: "#94a3b8", fontSize: 11 },
    },
    series: [
      // Base for lower bound q10
      {
        name: "Cận dưới q10",
        type: "line",
        data: q10,
        lineStyle: { opacity: 0 },
        stack: "confidence-band",
        symbol: "none",
      },
      // Shaded area [q10, q90]
      {
        name: "Khoảng tin cậy 80% [q10 - q90]",
        type: "line",
        data: q90.map((val, idx) => Math.max(0, val - q10[idx])),
        lineStyle: { opacity: 0 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(255, 107, 0, 0.32)" },
              { offset: 1, color: "rgba(255, 107, 0, 0.04)" },
            ],
          },
        },
        stack: "confidence-band",
        symbol: "none",
      },
      // Median Forecast q50
      {
        name: t.q50Label,
        type: "line",
        data: q50,
        smooth: true,
        lineStyle: { color: "#ff6b00", width: 3 },
        itemStyle: { color: "#ff6b00" },
        markPoint: {
          data: [
            { type: "max", name: "Đỉnh tải", symbolSize: 45, itemStyle: { color: "#e11d48" } },
          ],
        },
      },
      // Effective Capacity curve
      {
        name: t.capLabel,
        type: "line",
        step: "middle",
        data: capacity,
        lineStyle: { color: "#10b981", width: 2.5, type: "dashed" },
        itemStyle: { color: "#10b981" },
      },
    ],
  };

  const bt = activeForecast.backtest;

  return (
    <div className="space-y-6">
      {/* 4 Key Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="control-panel p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{t.peakLoadLabel}</span>
            <Gauge className="w-4 h-4 text-[#ff6b00]" />
          </div>
          <div className="text-xl font-extrabold text-white">
            {peakVal.toFixed(1)} <span className="text-xs font-normal text-slate-400">phút</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Đỉnh điểm lúc: <span className="text-slate-200 font-mono">{times[q50.indexOf(peakVal)] || "-"}</span>
          </div>
        </div>

        <div className="control-panel p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{t.overloadAlert}</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-400">
            {overloadedSlots} <span className="text-xs font-normal text-slate-400">/ {filteredTimeline.length} khung</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tỷ lệ quá tải: <span className="text-amber-300 font-bold">{((overloadedSlots / filteredTimeline.length) * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="control-panel p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{t.safeMargin}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-xl font-extrabold ${avgMargin >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {avgMargin >= 0 ? `+${avgMargin.toFixed(1)}` : avgMargin.toFixed(1)} <span className="text-xs font-normal text-slate-400">phút</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Khả năng bù đắp tải trung bình
          </div>
        </div>

        <div className="control-panel p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{t.wapeGain}</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400">
            +{bt?.wape_improvement_pct}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            So với kế hoạch Baseline
          </div>
        </div>
      </div>

      {/* Main Chart Panel */}
      <div className="control-panel p-5.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#ff6b00]"></span>
              <span>{t.chartTitle}</span>
            </h2>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Thời điểm quyết định: <span className="font-mono text-slate-200">{activeForecast.as_of}</span> · {filteredTimeline.length} khung thời gian hiển thị
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Horizon Filter Pill Group */}
            <div className="flex items-center bg-[#101726] p-1 rounded-lg border border-[#23314d]">
              <span className="text-[11px] text-slate-400 px-2 font-medium hidden md:inline">{t.horizonFilter}</span>
              {([4, 8, 24] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => setSelectedHorizon(h)}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold transition cursor-pointer ${
                    selectedHorizon === h
                      ? "bg-[#ff6b00] text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowScenarios(!showScenarios)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center space-x-1.5 ${
                showScenarios
                  ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                  : "bg-[#141d30] border-[#293a5a] text-slate-300 hover:border-slate-500"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showScenarios ? "Ẩn kịch bản" : "Xem 20 kịch bản stochastic"}</span>
            </button>
          </div>
        </div>

        {/* EChart */}
        <div className="h-84 w-full">
          <ReactECharts option={chartOption} style={{ height: "100%", width: "100%" }} />
        </div>

        {/* Footer annotation */}
        <div className="mt-3 pt-3 border-t border-[#1c2842] flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className="w-3.5 h-1 bg-[#ff6b00] rounded-xs"></span>
              <span>Đường cam: Dự báo phân vị q50</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3.5 h-2.5 bg-[#ff6b00]/25 rounded-xs border border-[#ff6b00]/40"></span>
              <span>Vùng cam mờ: Dải bất định [q10, q90] (80%)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#10b981]"></span>
              <span>Đường xanh đứt: Năng lực hiệu dụng</span>
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400 bg-[#0e1524] px-2.5 py-1 rounded border border-[#23314d]">
            data: SYN-s42 · model: LightGBM-Quantile + CQR
          </div>
        </div>
      </div>

      {/* Scenarios Visualizer if expanded */}
      {showScenarios && (
        <div className="control-panel p-5.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>{t.scenariosTitle}</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Block length: 4 buckets (1 hour)</span>
          </div>
          
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Sinh 20 kịch bản tương lai bằng kỹ thuật block bootstrap phần dư liên tiếp (4 buckets = 1 giờ). Kỹ thuật này giữ nguyên tương quan nối tiếp giữa các khung giờ cao điểm và mối phụ thuộc chéo thay vì chỉ lấy mẫu ngẫu nhiên độc lập từng điểm.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 text-xs">
            {activeForecast.scenarios.slice(0, 15).map((sc, idx) => {
              const maxVal = Math.max(...sc);
              const sumVal = sc.reduce((a, b) => a + b, 0);
              const isSelected = selectedScenarioIdx === idx;
              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedScenarioIdx(isSelected ? null : idx)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    isSelected 
                      ? "bg-indigo-950/60 border-indigo-500 shadow-sm shadow-indigo-500/20" 
                      : "bg-[#141d30] border-[#263756] hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                    <span>Kịch bản #{idx + 1}</span>
                    {isSelected && <span className="text-indigo-400 font-bold">Đã chọn</span>}
                  </div>
                  <div className="font-extrabold text-white text-base">
                    {sumVal.toFixed(0)} <span className="text-[10px] text-slate-400 font-normal">phút</span>
                  </div>
                  <div className="text-[11px] text-amber-400 mt-1 flex items-center justify-between">
                    <span>Đỉnh tải:</span>
                    <span className="font-mono font-bold">{maxVal.toFixed(0)}p</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rigorous Backtest Benchmark Table (Scientific Proof for Judges) */}
      <div className="control-panel p-5.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <Award className="w-4 h-4 text-[#ff6b00]" />
              <span>{t.backtestTitle}</span>
            </h3>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Khoảng thời gian test độc lập: <span className="font-mono text-slate-200">{bt?.test_period}</span> ({bt?.n_test_buckets} buckets, 14 ngày lịch sử giữ riêng)
            </div>
          </div>

          {/* Improvement Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-600/70 text-emerald-300 text-xs font-bold shadow-md shadow-emerald-900/20">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t.wapeBadge} +{bt?.wape_improvement_pct}% vs Baseline Kế hoạch</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#23314d]">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#23314d] text-slate-300 bg-[#141c2e]">
                <th className="py-3 px-3.5 font-bold">Mô hình đối chứng</th>
                <th className="py-3 px-3 font-semibold">WAPE (%)</th>
                <th className="py-3 px-3 font-semibold">MAE (phút)</th>
                <th className="py-3 px-3 font-semibold">Độ lệch Bias</th>
                <th className="py-3 px-3 font-semibold">Độ bao phủ [q10, q90]</th>
                <th className="py-3 px-3 font-semibold">Độ rộng dải (phút)</th>
                <th className="py-3 px-3 font-semibold">Pinball Loss (q50)</th>
                <th className="py-3 px-3 font-semibold">Đánh giá vai trò</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2a44] bg-[#0f1626]/80">
              {/* Row 1: Baseline */}
              <tr className="hover:bg-[#18233a]/60 text-slate-300 transition">
                <td className="py-3 px-3.5 font-medium">
                  <div className="text-white font-semibold">Seasonal Naive (Kế hoạch SX)</div>
                  <div className="text-[10px] text-slate-400">Baseline bắt buộc theo đề cương cuộc thi</div>
                </td>
                <td className="py-3 px-3 font-mono">{(bt?.baseline?.wape * 100).toFixed(1)}%</td>
                <td className="py-3 px-3 font-mono">{bt?.baseline?.mae}</td>
                <td className="py-3 px-3 font-mono">{bt?.baseline?.bias > 0 ? `+${bt?.baseline?.bias}` : bt?.baseline?.bias}</td>
                <td className="py-3 px-3 font-mono">{(bt?.baseline?.coverage * 100).toFixed(1)}%</td>
                <td className="py-3 px-3 font-mono">{bt?.baseline?.interval_width}</td>
                <td className="py-3 px-3 font-mono">{bt?.baseline?.pinball_50}</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                    Đối chứng chuẩn
                  </span>
                </td>
              </tr>

              {/* Row 2: LightGBM Raw */}
              <tr className="hover:bg-[#18233a]/60 text-slate-300 transition">
                <td className="py-3 px-3.5 font-medium">
                  <div className="text-white font-semibold">LightGBM Quantile (Thô)</div>
                  <div className="text-[10px] text-slate-400">Đặc trưng ca kíp & độ trễ phân vị</div>
                </td>
                <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                  {(bt?.lightgbm_raw?.wape * 100).toFixed(1)}%
                </td>
                <td className="py-3 px-3 font-mono text-emerald-400">{bt?.lightgbm_raw?.mae}</td>
                <td className="py-3 px-3 font-mono">{bt?.lightgbm_raw?.bias}</td>
                <td className="py-3 px-3 font-mono">{(bt?.lightgbm_raw?.coverage * 100).toFixed(1)}%</td>
                <td className="py-3 px-3 font-mono">{bt?.lightgbm_raw?.interval_width}</td>
                <td className="py-3 px-3 font-mono text-emerald-400">{bt?.lightgbm_raw?.pinball_50}</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 font-medium">
                    Mô hình lõi
                  </span>
                </td>
              </tr>

              {/* Row 3: Conformal Calibrated */}
              <tr className="hover:bg-[#18233a]/60 text-slate-300 bg-amber-950/20 transition">
                <td className="py-3 px-3.5 font-medium">
                  <div className="text-white font-bold flex items-center space-x-1.5">
                    <span>LightGBM + Conformal Calibrated</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-[10px] text-amber-400/90">Hiệu chuẩn dải bao phủ hữu hạn mẫu</div>
                </td>
                <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                  {(bt?.lightgbm_calibrated?.wape * 100).toFixed(1)}%
                </td>
                <td className="py-3 px-3 font-mono text-emerald-400">{bt?.lightgbm_calibrated?.mae}</td>
                <td className="py-3 px-3 font-mono">{bt?.lightgbm_calibrated?.bias}</td>
                <td className="py-3 px-3 font-mono font-bold text-amber-400">
                  {(bt?.lightgbm_calibrated?.coverage * 100).toFixed(1)}%
                  <span className="text-[10px] text-slate-400 font-normal ml-1">(Mục tiêu 80%)</span>
                </td>
                <td className="py-3 px-3 font-mono">{bt?.lightgbm_calibrated?.interval_width}</td>
                <td className="py-3 px-3 font-mono text-emerald-400">{bt?.lightgbm_calibrated?.pinball_50}</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 font-extrabold shadow-xs">
                    Khuyến nghị chọn ★
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Explainability Callout */}
        <div className="mt-4 p-4 rounded-xl bg-[#141d30]/90 border border-[#2b3c5e] text-xs text-slate-300 space-y-1.5">
          <div className="font-bold text-[#ff8f3d] flex items-center space-x-2">
            <Info className="w-4 h-4" />
            <span>{t.conformalTitle}</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {t.conformalDesc} Độ bù hiệu chuẩn tính được: <span className="text-white font-mono font-bold">{bt?.conformal_summary?.calibrated_offset} phút</span>. Giúp người điều hành tự tin không đánh giá thấp rủi ro thiếu hụt vật tư trong giờ cao điểm của ca kíp.
          </p>
        </div>
      </div>
    </div>
  );
};
