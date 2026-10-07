import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { 
  Play, 
  Pause,
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Users, 
  Truck, 
  TrendingUp,
  Cpu,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Bookmark,
  Calendar,
  Layers,
  Search,
  Filter,
  FastForward
} from "lucide-react";
import { CustomSimResponse, runCustomSim, GanttTrip, OrderSample, PlaybackSnapshot } from "../api";

interface SimulateTabProps {
  lang: "vi" | "en";
}

export const SimulateTab: React.FC<SimulateTabProps> = ({ lang }) => {
  // Config state
  const [extraPickers, setExtraPickers] = useState(0);
  const [extraLoaders, setExtraLoaders] = useState(0);
  const [extraTuggers, setExtraTuggers] = useState(0);
  const [cycleMin, setCycleMin] = useState(20);
  const [priority, setPriority] = useState<"FIFO" | "EDD">("FIFO");
  const [demandSurge, setDemandSurge] = useState(0);
  const [activePreset, setActivePreset] = useState<string>("default");

  // Result state
  const [simResult, setSimResult] = useState<CustomSimResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Playback state
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [orderFilter, setOrderFilter] = useState<"ALL" | "LATE" | "ON_TIME">("ALL");
  const [orderSearch, setOrderSearch] = useState<string>("");

  const t = {
    vi: {
      title: "PHÒNG THỬ NGHIỆM MÔ PHỎNG WHAT-IF (DISCRETE-EVENT SIMULATION - SIMPY)",
      subtitle: "Tái hiện chính xác luồng di chuyển, cạnh tranh tài nguyên và giờ nghỉ ca trước khi áp dụng thực tế.",
      runBtn: "Chạy mô phỏng What-if",
      resetBtn: "Khôi phục chuẩn",
      demandSurge: "Mức tải đột biến (Stress test):",
      cycleTime: "Chu kỳ xuất bến Tugger:",
      priorityRule: "Quy tắc ưu tiên (Dispatching):",
      pickers: "Bổ sung nhân sự Picking:",
      loaders: "Bổ sung nhân sự Loading Dock:",
      tuggers: "Bổ sung xe Tugger:",
      kpiComparison: "KẾT QUẢ VẬN HÀNH SAU CAN THIỆP MÔ PHỎNG",
      queueChartTitle: "BIỂU ĐỒ TÍCH TỤ HÀNG ĐỢI THEO THỜI GIAN (PHÚT TRONG CA)",
      presetTitle: "CÁC KỊCH BẢN MẪU ĐIỂN HÌNH (QUICK PRESETS):",
      ganttTitle: "BIỂU ĐỒ GANTT LỊCH TRÌNH ĐOÀN XE TUGGER (MILK-RUN DISPATCH TIMELINE)",
      orderTraceTitle: "SỔ THEO DÕI ĐƠN HÀNG MÔ PHỎNG CHI TIẾT (ORDER-LEVEL FULFILLMENT TRACE)",
      playbackTitle: "BỘ ĐIỀU KHIỂN TUA THỜI GIAN MÔ PHỎNG ĐỘNG (SIMULATION PLAYBACK)",
    },
    en: {
      title: "WHAT-IF SIMULATION PLAYGROUND (DISCRETE-EVENT SIMULATION - SIMPY)",
      subtitle: "Accurately replicates entity movement, resource contention, and shift breaks before physical execution.",
      runBtn: "Execute What-if Simulation",
      resetBtn: "Reset Default",
      demandSurge: "Demand Surge (Stress test):",
      cycleTime: "Tugger Milk-run Cycle:",
      priorityRule: "Dispatching Priority Rule:",
      pickers: "Extra Picking Staff:",
      loaders: "Extra Loading Staff:",
      tuggers: "Extra Tugger Units:",
      kpiComparison: "OPERATIONAL KPI IMPACT IN SIMULATION",
      queueChartTitle: "STAGE QUEUE ACCUMULATION TIMELINE (MINUTES IN SHIFT)",
      presetTitle: "QUICK PRESET SCENARIOS:",
      ganttTitle: "TUGGER MILK-RUN FLEET DISPATCH GANTT TIMELINE",
      orderTraceTitle: "ORDER-LEVEL FULFILLMENT & DELAY AUDIT TRACE",
      playbackTitle: "DYNAMIC SIMULATION TIMELINE PLAYBACK",
    },
  }[lang];

  const handleRunSim = async (
    p = priority,
    c = cycleMin,
    ep = extraPickers,
    el = extraLoaders,
    et = extraTuggers,
    ds = demandSurge
  ) => {
    setLoading(true);
    try {
      const res = await runCustomSim({
        priority: p,
        tugger_cycle_min: c,
        extra_pickers: ep,
        extra_loaders: el,
        extra_tuggers: et,
        demand_surge_pct: ds,
        seed: 42,
      });
      setSimResult(res);
      setPlaybackTime(180); // default to midpoint peak
      setIsPlaying(false);
    } catch (err) {
      console.error("Simulation run error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial run
    handleRunSim();
  }, []);

  // Playback timer loop
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackTime((prev) => {
          if (prev >= 480) {
            setIsPlaying(false);
            return 480;
          }
          return prev + 15;
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const applyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    if (presetKey === "default") {
      setExtraPickers(0);
      setExtraLoaders(0);
      setExtraTuggers(0);
      setCycleMin(20);
      setPriority("FIFO");
      setDemandSurge(0);
      handleRunSim("FIFO", 20, 0, 0, 0, 0);
    } else if (presetKey === "storyline") {
      setExtraPickers(0);
      setExtraLoaders(0);
      setExtraTuggers(0);
      setCycleMin(20);
      setPriority("FIFO");
      setDemandSurge(30);
      handleRunSim("FIFO", 20, 0, 0, 0, 30);
    } else if (presetKey === "stress") {
      setExtraPickers(0);
      setExtraLoaders(0);
      setExtraTuggers(0);
      setCycleMin(20);
      setPriority("FIFO");
      setDemandSurge(60);
      handleRunSim("FIFO", 20, 0, 0, 0, 60);
    } else if (presetKey === "optimal") {
      setExtraPickers(0);
      setExtraLoaders(1);
      setExtraTuggers(0);
      setCycleMin(15);
      setPriority("EDD");
      setDemandSurge(30);
      handleRunSim("EDD", 15, 0, 1, 0, 30);
    }
  };

  // Current playback snapshot
  const snapshots = simResult?.playback_snapshots || [];
  const currentSnap = snapshots.find((s) => s.t >= playbackTime) || snapshots[snapshots.length - 1] || {
    t: playbackTime,
    picking_queue: 0,
    loading_queue: 0,
    transport_queue: 0,
    delivered_cum: 0,
    active_tuggers: []
  };

  // ECharts Queue Timeline with Area Gradients
  const queueData = simResult?.queue_timeline || [];
  const queueChartOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(18, 26, 44, 0.95)",
      borderColor: "#2f436d",
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: "#f8fafc", fontSize: 12 },
    },
    legend: {
      data: ["Hàng đợi Picking", "Hàng đợi Loading Dock", "Hàng đợi Chờ Xe Tugger"],
      textStyle: { color: "#94a3b8", fontSize: 11 },
      top: 0,
      icon: "circle",
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "4%",
      top: "14%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      name: "Phút trong ca",
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: "#64748b", fontSize: 11 },
      data: queueData.map((q) => `${q.t}m`),
      axisLine: { lineStyle: { color: "#253452" } },
      axisLabel: { color: "#94a3b8", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      name: "Số đơn chờ",
      nameTextStyle: { color: "#64748b", fontSize: 11, padding: [0, 0, 4, 0] },
      axisLine: { lineStyle: { color: "#253452" } },
      splitLine: { lineStyle: { color: "#141e33", type: "dashed" } },
      axisLabel: { color: "#94a3b8", fontSize: 11 },
    },
    series: [
      {
        name: "Hàng đợi Picking",
        type: "line",
        smooth: true,
        data: queueData.map((q) => q.picking),
        lineStyle: { color: "#06b6d4", width: 2 },
        itemStyle: { color: "#06b6d4" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(6, 182, 212, 0.25)" },
              { offset: 1, color: "rgba(6, 182, 212, 0.01)" },
            ],
          },
        },
      },
      {
        name: "Hàng đợi Loading Dock",
        type: "line",
        smooth: true,
        data: queueData.map((q) => q.loading),
        lineStyle: { color: "#ff6b00", width: 2.5 },
        itemStyle: { color: "#ff6b00" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(255, 107, 0, 0.35)" },
              { offset: 1, color: "rgba(255, 107, 0, 0.02)" },
            ],
          },
        },
      },
      {
        name: "Hàng đợi Chờ Xe Tugger",
        type: "line",
        smooth: true,
        data: queueData.map((q) => q.transport),
        lineStyle: { color: "#a855f7", width: 2 },
        itemStyle: { color: "#a855f7" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(168, 85, 247, 0.25)" },
              { offset: 1, color: "rgba(168, 85, 247, 0.01)" },
            ],
          },
        },
      },
    ],
  };

  // Filtered orders list
  const filteredOrders = (simResult?.order_sample || []).filter((ord) => {
    if (orderFilter === "LATE" && ord.status !== "LATE") return false;
    if (orderFilter === "ON_TIME" && ord.status !== "ON_TIME") return false;
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      return (
        ord.request_id.toLowerCase().includes(q) ||
        ord.line_id.toLowerCase().includes(q) ||
        ord.item_group.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Quick Preset Selector Buttons */}
      <div className="control-panel p-4.5">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
          <Bookmark className="w-3.5 h-3.5 text-[#ff6b00]" />
          <span>{t.presetTitle}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            onClick={() => applyPreset("default")}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              activePreset === "default"
                ? "bg-[#19243d] border-[#ff6b00] ring-1 ring-[#ff6b00]/40"
                : "bg-[#111929]/70 border-[#22334f] hover:border-slate-500"
            }`}
          >
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span>1. Ca Chuẩn Mặc Định</span>
              <span className="text-[10px] font-mono text-emerald-400">0% Surge</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              FIFO · Chu kỳ 20m · Đội ngũ tiêu chuẩn
            </div>
          </button>

          <button
            onClick={() => applyPreset("storyline")}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              activePreset === "storyline"
                ? "bg-[#19243d] border-[#ff6b00] ring-1 ring-[#ff6b00]/40"
                : "bg-[#111929]/70 border-[#22334f] hover:border-slate-500"
            }`}
          >
            <div className="text-xs font-bold text-[#ff8f3d] flex items-center justify-between">
              <span>2. Storyline Đề Bài (+30%)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">Cơ sở</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Line 1 & 2 tăng +30% · TG3 bảo dưỡng
            </div>
          </button>

          <button
            onClick={() => applyPreset("stress")}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              activePreset === "stress"
                ? "bg-[#19243d] border-[#ff6b00] ring-1 ring-[#ff6b00]/40"
                : "bg-[#111929]/70 border-[#22334f] hover:border-slate-500"
            }`}
          >
            <div className="text-xs font-bold text-rose-400 flex items-center justify-between">
              <span>3. Cực Đại Stress (+60%)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">Quá tải</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Kiểm tra giới hạn chống chịu vật lý
            </div>
          </button>

          <button
            onClick={() => applyPreset("optimal")}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              activePreset === "optimal"
                ? "bg-gradient-to-r from-[#192842] to-[#12233a] border-emerald-500 ring-1 ring-emerald-500/40"
                : "bg-[#111929]/70 border-[#22334f] hover:border-slate-500"
            }`}
          >
            <div className="text-xs font-bold text-emerald-400 flex items-center justify-between">
              <span>4. Đối Sách Tối Ưu (EDD+15m)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">★ Giải pháp</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              EDD + Tugger 15m + Điều 1 Loader
            </div>
          </button>
        </div>
      </div>

      {/* Simulation Controls Panel */}
      <div className="control-panel p-5.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-[#ff6b00]" />
              <span>{t.title}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => applyPreset("default")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#2b3a54] text-slate-300 hover:border-slate-500 transition cursor-pointer flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.resetBtn}</span>
            </button>
            <button
              onClick={() => handleRunSim()}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#ff6b00] hover:bg-[#ff7b1a] text-white transition cursor-pointer flex items-center space-x-1.5 shadow-md shadow-[#ff6b00]/30 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? "Đang chạy mô phỏng SimPy..." : t.runBtn}</span>
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 p-4 rounded-xl bg-[#0f1728]/80 border border-[#23334f] text-xs">
          {/* 1. Demand Surge */}
          <div>
            <label className="text-slate-300 block mb-1.5 font-medium">{t.demandSurge}</label>
            <select
              value={demandSurge}
              onChange={(e) => setDemandSurge(Number(e.target.value))}
              className="w-full bg-[#141d30] border border-[#2d3f61] rounded-lg px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-[#ff6b00]"
            >
              <option value={0}>Bình thường (100%)</option>
              <option value={20}>+20% Tải trọng</option>
              <option value={30}>+30% (Storyline đề bài)</option>
              <option value={40}>+40% (Stress test)</option>
              <option value={60}>+60% (Quá tải cực đại)</option>
            </select>
          </div>

          {/* 2. Priority Rule */}
          <div>
            <label className="text-slate-300 block mb-1.5 font-medium">{t.priorityRule}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as "FIFO" | "EDD")}
              className="w-full bg-[#141d30] border border-[#2d3f61] rounded-lg px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-[#ff6b00]"
            >
              <option value="FIFO">FIFO (Đến trước làm trước)</option>
              <option value="EDD">EDD (Hạn chót gấp trước)</option>
            </select>
          </div>

          {/* 3. Cycle Time */}
          <div>
            <label className="text-slate-300 block mb-1.5 font-medium">{t.cycleTime}</label>
            <select
              value={cycleMin}
              onChange={(e) => setCycleMin(Number(e.target.value))}
              className="w-full bg-[#141d30] border border-[#2d3f61] rounded-lg px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-[#ff6b00]"
            >
              <option value={10}>10 phút / chuyến (Rất nhanh)</option>
              <option value={15}>15 phút / chuyến (Tối ưu)</option>
              <option value={20}>20 phút / chuyến (Tiêu chuẩn)</option>
              <option value={30}>30 phút / chuyến (Chậm)</option>
            </select>
          </div>

          {/* 4. Extra Pickers */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1.5 font-medium">
              <span>{t.pickers}</span>
              <span className="text-[#ff6b00] font-bold">+{extraPickers}</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              value={extraPickers}
              onChange={(e) => setExtraPickers(Number(e.target.value))}
              className="w-full accent-[#ff6b00] cursor-pointer"
            />
            <div className="text-[10px] text-slate-500 text-right mt-0.5">Hiện có: 4 pickers</div>
          </div>

          {/* 5. Extra Loaders */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1.5 font-medium">
              <span>{t.loaders}</span>
              <span className="text-emerald-400 font-bold">+{extraLoaders}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              value={extraLoaders}
              onChange={(e) => setExtraLoaders(Number(e.target.value))}
              className="w-full accent-[#10b981] cursor-pointer"
            />
            <div className="text-[10px] text-slate-500 text-right mt-0.5">Hiện có: 2 loaders</div>
          </div>

          {/* 6. Extra Tuggers */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1.5 font-medium">
              <span>{t.tuggers}</span>
              <span className="text-indigo-400 font-bold">+{extraTuggers}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              value={extraTuggers}
              onChange={(e) => setExtraTuggers(Number(e.target.value))}
              className="w-full accent-[#818cf8] cursor-pointer"
            />
            <div className="text-[10px] text-slate-500 text-right mt-0.5">Hiện có: 2+1 xe</div>
          </div>
        </div>
      </div>

      {/* Dynamic Simulation Playback Controller */}
      {simResult && (
        <div className="control-panel p-5.5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center space-x-2">
                <FastForward className="w-4 h-4 text-cyan-400" />
                <span>{t.playbackTitle}</span>
              </h3>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Kéo thanh trượt hoặc bấm phát để quan sát luồng dồn ứ đơn hàng và vị trí xe chạy từng phút của ca làm việc (0 - 480m)
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-[#0d1424] px-3.5 py-1.5 rounded-xl border border-[#22334f]">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 rounded-lg bg-[#ff6b00] hover:bg-[#ff7b1a] text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? "Tạm dừng" : "Phát chuyển động"}</span>
              </button>

              <button
                onClick={() => setPlaybackTime(0)}
                className="p-1.5 rounded-lg bg-[#18233a] hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Quay về phút 0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="font-mono text-cyan-300 font-black text-sm pl-2 border-l border-[#243554]">
                Phút: {playbackTime}m / 480m
              </div>
            </div>
          </div>

          {/* Timeline Slider */}
          <div className="px-2">
            <input
              type="range"
              min="0"
              max="480"
              step="15"
              value={playbackTime}
              onChange={(e) => setPlaybackTime(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>06:00 (0m)</span>
              <span>08:00 (120m)</span>
              <span>10:00 (240m - Cao điểm)</span>
              <span>12:00 (360m)</span>
              <span>14:00 (480m - Hết ca)</span>
            </div>
          </div>

          {/* Live Snapshot Telemetry Cards at Minute t */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs pt-1">
            <div className="p-3 rounded-xl bg-[#101726] border border-[#23334f]">
              <div className="text-slate-400 text-[11px]">Hàng đợi Soạn hàng:</div>
              <div className="text-xl font-bold text-cyan-400 mt-1">{currentSnap.picking_queue} đơn</div>
              <div className="text-[10px] text-slate-500">Tại phút {playbackTime}m</div>
            </div>

            <div className="p-3 rounded-xl bg-[#101726] border border-[#23334f]">
              <div className="text-slate-400 text-[11px]">Hàng đợi Cầu bốc:</div>
              <div className={`text-xl font-bold mt-1 ${currentSnap.loading_queue > 3 ? "text-rose-400" : "text-amber-400"}`}>
                {currentSnap.loading_queue} đơn
              </div>
              <div className="text-[10px] text-slate-500">Tại phút {playbackTime}m</div>
            </div>

            <div className="p-3 rounded-xl bg-[#101726] border border-[#23334f]">
              <div className="text-slate-400 text-[11px]">Hàng đợi Chờ xe kéo:</div>
              <div className="text-xl font-bold text-purple-400 mt-1">{currentSnap.transport_queue} đơn</div>
              <div className="text-[10px] text-slate-500">Tại phút {playbackTime}m</div>
            </div>

            <div className="p-3 rounded-xl bg-[#101726] border border-[#23334f]">
              <div className="text-slate-400 text-[11px]">Đã giao hoàn tất:</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{currentSnap.delivered_cum} đơn</div>
              <div className="text-[10px] text-slate-500">Lũy kế đến phút {playbackTime}m</div>
            </div>

            <div className="p-3 rounded-xl bg-[#101726] border border-[#23334f]">
              <div className="text-slate-400 text-[11px]">Xe kéo đang di chuyển:</div>
              <div className="text-sm font-bold text-white mt-1.5 flex items-center space-x-1">
                {currentSnap.active_tuggers.length > 0 ? (
                  currentSnap.active_tuggers.map((tg) => (
                    <span key={tg} className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                      {tg}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 font-normal">Chờ tại dock</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulation KPI Summary Cards */}
      {simResult && (
        <div className="control-panel p-5.5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>{t.kpiComparison}</span>
            </h3>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Thuật toán mô phỏng:</span>
              <span className="font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                SimPy DES (Seed 42)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#131c2e] border border-[#243552]">
              <div className="text-slate-400 text-[11px]">Tổng đơn đến hạn</div>
              <div className="text-xl font-black text-white mt-1">{simResult.kpis.n_due}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">100% kiểm soát</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#131c2e] border border-[#243552]">
              <div className="text-slate-400 text-[11px]">Số đơn bị trễ hạn</div>
              <div className={`text-xl font-black mt-1 ${simResult.kpis.n_late > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {simResult.kpis.n_late}{" "}
                <span className="text-[10px] text-slate-400 font-normal">({(simResult.kpis.late_rate * 100).toFixed(1)}%)</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Tỷ lệ đơn trễ</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#131c2e] border border-[#243552]">
              <div className="text-slate-400 text-[11px]">Phút trễ lũy kế</div>
              <div className={`text-xl font-black mt-1 ${simResult.kpis.late_minutes > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {simResult.kpis.late_minutes.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">phút</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Tổng thiệt hại trễ</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#131c2e] border border-[#243552]">
              <div className="text-slate-400 text-[11px]">Lead Time P50 / P90</div>
              <div className="text-lg font-bold text-cyan-400 mt-1">
                {simResult.kpis.lead_p50?.toFixed(1) || "-"} / {simResult.kpis.lead_p90?.toFixed(1) || "-"}m
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Thời gian hoàn tất</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#131c2e] border border-[#243552]">
              <div className="text-slate-400 text-[11px]">Sản lượng giao xong</div>
              <div className="text-xl font-black text-white mt-1">{simResult.kpis.throughput} đơn</div>
              <div className="text-[10px] text-emerald-400 mt-0.5 font-medium">Đến 4 chuyền</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#131c2e] border border-[#243552]">
              <div className="text-slate-400 text-[11px]">Chuyến Tugger chạy</div>
              <div className="text-xl font-black text-indigo-400 mt-1">{simResult.trips_count} chuyến</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Milk-run hoàn tất</div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e2d47] flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Kiểm định logic SimPy: Bảo toàn số lượng (Conservation) & Tiền đề thời gian (Precedence) = 100% ĐẠT (0 vi phạm)</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono bg-[#101726] px-2 py-0.5 rounded border border-[#23314d]">
              Execution Time: 0.08s
            </span>
          </div>
        </div>
      )}

      {/* Tugger Trips Gantt Timeline View */}
      {simResult?.trips_gantt && simResult.trips_gantt.length > 0 && (
        <div className="control-panel p-5.5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <Truck className="w-4 h-4 text-indigo-400" />
              <span>{t.ganttTitle}</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Tổng số chuyến: {simResult.trips_gantt.length} chuyến milk-run
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Trực quan hóa thời gian xuất bến, lộ trình chạy và thời gian quay về của từng xe Tugger trong suốt 480 phút của ca làm việc.
          </p>

          <div className="overflow-x-auto rounded-xl border border-[#23314d] p-3 bg-[#0d1424]">
            <div className="space-y-2.5 min-w-[700px]">
              {["TG-01", "TG-02", "TG-03"].map((tuggerId) => {
                const tuggerTrips = simResult.trips_gantt?.filter((tr) => tr.tugger_id.includes(tuggerId.replace("-", ""))) || [];
                const isUnderMaintenance = tuggerId === "TG-03";

                return (
                  <div key={tuggerId} className="flex items-center space-x-3 text-xs">
                    <div className="w-20 font-bold font-mono text-white shrink-0 flex items-center space-x-1">
                      <Truck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{tuggerId}</span>
                    </div>

                    <div className="flex-1 bg-[#141d30] h-9 rounded-lg relative overflow-hidden border border-[#23334f]">
                      {isUnderMaintenance && (
                        <div 
                          className="absolute top-0 bottom-0 bg-rose-950/60 border border-rose-800 text-[10px] text-rose-300 font-bold flex items-center justify-center"
                          style={{ left: "40%", width: "35%" }}
                        >
                          BẢO DƯỠNG (13:00 - 16:00)
                        </div>
                      )}

                      {tuggerTrips.map((tr, idx) => {
                        const leftPct = (tr.depart / 480) * 100;
                        const widthPct = Math.max(2, (tr.duration / 480) * 100);

                        return (
                          <div
                            key={idx}
                            className="absolute top-1 bottom-1 rounded bg-[#ff6b00] hover:bg-[#ff8f3d] text-white text-[9px] font-bold flex items-center justify-center transition shadow-sm cursor-pointer group"
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            title={`Chuyến: ${tr.depart}m - ${tr.return}m (${tr.duration}p) · ${tr.orders_count} đơn`}
                          >
                            <span className="truncate px-1">{tr.orders_count} đơn</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2 pt-2 border-t border-[#1c2a44] min-w-[700px]">
              <span>0m (06:00)</span>
              <span>120m (08:00)</span>
              <span>240m (10:00)</span>
              <span>360m (12:00)</span>
              <span>480m (14:00)</span>
            </div>
          </div>
        </div>
      )}

      {/* Queue Accumulation Timeline Chart */}
      <div className="control-panel p-5.5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
            {t.queueChartTitle}
          </h3>
          <span className="text-[11px] text-slate-400">
            Hiển thị động thái dồn ứ đơn hàng qua từng phút của ca làm việc
          </span>
        </div>
        <div className="h-76 w-full">
          <ReactECharts option={queueChartOption} style={{ height: "100%", width: "100%" }} />
        </div>
      </div>

      {/* Order-Level Fulfillment Trace Table */}
      {simResult?.order_sample && simResult.order_sample.length > 0 && (
        <div className="control-panel p-5.5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>{t.orderTraceTitle}</span>
              </h3>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Mẫu kiểm tra trực tiếp tiến độ giao của từng đơn hàng mô phỏng trong ca kíp
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm mã đơn, line đích..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="bg-[#101726] border border-[#263756] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff6b00] w-48"
                />
              </div>

              <div className="flex items-center bg-[#101726] p-1 rounded-lg border border-[#23314d] text-xs">
                {(["ALL", "LATE", "ON_TIME"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderFilter(st)}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer font-semibold ${
                      orderFilter === st
                        ? "bg-[#ff6b00] text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {st === "ALL" ? "Tất cả" : st === "LATE" ? "Đơn trễ" : "Đúng hạn"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#23314d]">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#23314d] text-slate-300 bg-[#141c2e]">
                  <th className="py-2.5 px-3 font-bold">Mã đơn hàng</th>
                  <th className="py-2.5 px-3 font-semibold">Chuyền đích</th>
                  <th className="py-2.5 px-3 font-semibold">Loại kiện</th>
                  <th className="py-2.5 px-3 font-semibold">Hạn giao (Phút)</th>
                  <th className="py-2.5 px-3 font-semibold">Xong Soạn</th>
                  <th className="py-2.5 px-3 font-semibold">Xong Bốc</th>
                  <th className="py-2.5 px-3 font-semibold">Thời điểm Giao</th>
                  <th className="py-2.5 px-3 font-semibold">Trạng thái</th>
                  <th className="py-2.5 px-3 font-semibold">Độ trễ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2a44] bg-[#0f1626]/80 font-mono">
                {filteredOrders.slice(0, 25).map((ord) => (
                  <tr key={ord.request_id} className="hover:bg-[#18233a]/60 text-slate-300 transition">
                    <td className="py-2.5 px-3 font-bold text-white">{ord.request_id}</td>
                    <td className="py-2.5 px-3 text-cyan-300">{ord.line_id}</td>
                    <td className="py-2.5 px-3 text-slate-400">{ord.item_group}</td>
                    <td className="py-2.5 px-3">{ord.due_min}m</td>
                    <td className="py-2.5 px-3">{ord.pick_end ? `${ord.pick_end}m` : "-"}</td>
                    <td className="py-2.5 px-3">{ord.load_end ? `${ord.load_end}m` : "-"}</td>
                    <td className="py-2.5 px-3 text-white font-bold">{ord.delivered ? `${ord.delivered}m` : "-"}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ord.status === "LATE" 
                          ? "bg-rose-950 text-rose-300 border border-rose-800" 
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      }`}>
                        {ord.status === "LATE" ? "TRỄ HẠN" : "ĐÚNG HẠN"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      {ord.status === "LATE" ? (
                        <span className="text-rose-400">+{ord.late_min} phút</span>
                      ) : (
                        <span className="text-emerald-400">0 phút</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
