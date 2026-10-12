import React, { useState, useEffect } from "react";
import { 
  Boxes, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Truck, 
  Layers, 
  Gauge, 
  Activity, 
  Warehouse, 
  PackageOpen, 
  Anchor, 
  Factory, 
  ChevronRight, 
  ShieldCheck, 
  Zap, 
  Users, 
  Timer, 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  ChevronDown,
  Leaf,
  HeartPulse,
  History,
  SkipForward,
  SkipBack
} from "lucide-react";
import { ForecastResponse, AlertItem, fetchIncidentReplay, IncidentReplayResponse } from "../api";
import { PlantFloorplanCAD } from "./PlantFloorplanCAD";

interface OverviewTabProps {
  forecast: ForecastResponse | null;
  alerts: AlertItem[];
  currentData: any;
  onNavigateTab: (tab: string) => void;
  lang: "vi" | "en";
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  forecast,
  alerts,
  currentData,
  onNavigateTab,
  lang,
}) => {
  const [selectedStation, setSelectedStation] = useState<string>("loading");
  const [showDrawer, setShowDrawer] = useState<boolean>(true);

  // Incident Replay Mode State (Blueprint #15)
  const [replayMode, setReplayMode] = useState<boolean>(false);
  const [replayPhaseIdx, setReplayPhaseIdx] = useState<number>(0);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [replayData, setReplayData] = useState<IncidentReplayResponse | null>(null);

  useEffect(() => {
    fetchIncidentReplay()
      .then((res) => setReplayData(res))
      .catch((err) => console.error("Error fetching replay:", err));
  }, []);

  useEffect(() => {
    if (!isReplaying || !replayData) return;
    const interval = setInterval(() => {
      setReplayPhaseIdx((prev) => {
        const next = (prev + 1) % replayData.phases.length;
        if (next === 0) setSelectedStation("supermarket");
        else if (next === 1) setSelectedStation("picking");
        else if (next === 2) setSelectedStation("loading");
        else if (next === 3) setSelectedStation("loading");
        else if (next === 4) setSelectedStation("transport");
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isReplaying, replayData]);

  const currentReplayPhase = replayMode ? replayData?.phases[replayPhaseIdx] : null;

  const t = {
    vi: {
      plannedWorkload: "Tổng tải dự báo",
      effectiveCapacity: "Năng lực hiệu dụng",
      maxRatio: "Tỷ lệ tải/năng lực đỉnh",
      wipItems: "Yêu cầu đang xử lý (WIP)",
      activeAlerts: "Cảnh báo đang mở",
      flowTitle: "SƠ ĐỒ 2D DIGITAL TWIN & ĐIỀU PHỐI TUYẾN CẤP HÀNG",
      flowDesc: "Trực quan hóa tức thời tình trạng máy móc, hàng đợi và di chuyển xe kéo từng phân xưởng",
      deepDiveTitle: "CHI TIẾT TRẠM & NGUỒN LỰC VẬN HÀNH (STATION DEEP-DIVE)",
      supermarket: "Kho Supermarket (SMKT-A)",
      picking: "Soạn hàng (Picking Bays)",
      loading: "Cầu bốc hàng (Loading Docks)",
      transport: "Đoàn xe Tugger Milk-run",
      lines: "4 Chuyền sản xuất (L1 - L4)",
      normal: "Bình thường",
      risk: "Nguy cơ nghẽn",
      critical: "Quá tải (98%)",
      seeAlerts: "Xem tất cả cảnh báo",
      exploreAction: "Khám phá đối sách can thiệp tối ưu",
      storylineBadge: "KỊCH BẢN VẬN HÀNH THỬ THÁCH (STORYLINE)",
    },
    en: {
      plannedWorkload: "Forecasted Workload",
      effectiveCapacity: "Effective Capacity",
      maxRatio: "Peak Load/Capacity",
      wipItems: "WIP in Progress",
      activeAlerts: "Active Alerts",
      flowTitle: "2D DIGITAL TWIN PLANT FLOORPLAN & LOGISTICS ROUTE",
      flowDesc: "Real-time visualization of queues, equipment status, and tugger milk-run loop",
      deepDiveTitle: "STATION DEEP-DIVE & TELEMETRY INSPECTION",
      supermarket: "Supermarket Storage (SMKT-A)",
      picking: "Picking Bays (PK1 - PK4)",
      loading: "Loading Docks (DK1 - DK3)",
      transport: "Tugger Milk-run Fleet",
      lines: "4 Assembly Lines (L1 - L4)",
      normal: "Normal",
      risk: "Risk",
      critical: "Overload (98%)",
      seeAlerts: "View all alerts",
      exploreAction: "Explore Recommended Actions",
      storylineBadge: "CHALLENGE SCENARIO (STORYLINE)",
    },
  }[lang];

  const totalWorkload = forecast?.timeline.reduce((acc, p) => acc + p.q50, 0) || 0;
  const totalCapacity = forecast?.timeline.reduce((acc, p) => acc + p.capacity, 0) || 0;
  const peakRatio = forecast?.timeline.reduce((max, p) => Math.max(max, p.overload_ratio), 0) || 0;
  const wipCount = currentData?.tables?.snapshot_wip_count || 19;

  // Dynamic Health Score computation (penalizes peak overload & active critical alerts)
  const criticalAlertsCount = alerts.filter(a => a.severity === "CRITICAL" || a.severity === "WARNING").length;
  const calculatedHealthScore = Math.max(
    45,
    Math.min(
      98,
      Math.round(
        100 - (peakRatio > 1.0 ? (peakRatio - 1.0) * 65 : 0) - (criticalAlertsCount * 6)
      )
    )
  );
  const liveHealthScore = currentReplayPhase ? currentReplayPhase.kpis.health_score : calculatedHealthScore;
  const healthColor = liveHealthScore >= 80 ? "#10b981" : liveHealthScore >= 60 ? "#f59e0b" : "#f43f5e";

  // Station Detail dictionary for deep-dive
  const stationDetails: Record<string, any> = {
    supermarket: {
      name: "Kho Supermarket & Hệ thống GTP (Goods-to-Person)",
      code: "ST-01",
      area: "Zone A - Nhà máy 1 (Hợp nhất WMS & GTP Log)",
      status: "STABLE",
      workers: [
        { id: "NV-01", name: "Nguyễn Văn An", role: "Thủ kho GTP", skill: "Vận hành trạm GTP & Barcode/RFID", shift: "Ca 1 (06:00 - 14:00)" },
        { id: "NV-02", name: "Trần Đình Bình", role: "Điều phối Kho", skill: "Đồng bộ tồn kho WMS / SAP", shift: "Ca 1 (06:00 - 14:00)" },
      ],
      queues: { waiting: 0, processing: 3, bufferCapacity: 250 },
      equipment: [
        { name: "Hệ thống GTP (Goods-to-Person) Shuttle", status: "145 khay/giờ (Ổn định)" },
        { name: "Kệ luân chuyển tự động SMKT-A", status: "Mức lấp đầy 82%" },
        { name: "Xe nâng Forklift FK-01 (Bổ sung Pallet)", status: "Hoạt động (Pin 88%)" },
      ],
      kpis: { speed: "2.1 phút/kiện", bufferHealth: "100% Khớp tồn kho", cycle: "12m xuất/lô" }
    },
    picking: {
      name: "Khu Soạn Hàng Kitting (Picking Bays PK1-4)",
      code: "ST-02",
      area: "Zone A - Supermarket Output (Hợp nhất Bảng Phân Ca & Kỹ Năng)",
      status: "OPTIMAL",
      workers: [
        { id: "NV-03", name: "Lê Hoàng Cường", role: "Picker", skill: "Soạn linh kiện BIN / Khay nhỏ", shift: "Ca 1 (06:00 - 14:00)" },
        { id: "NV-04", name: "Phạm Văn Dũng", role: "Picker (Đa kỹ năng)", skill: "Cross-trained: Hỗ trợ Cầu bốc Dock & GTP", shift: "Ca 1 (06:00 - 14:00)" },
        { id: "NV-05", name: "Vũ Hải Đăng", role: "Picker", skill: "Soạn linh kiện TROLLEY", shift: "Ca 1 (06:00 - 14:00)" },
        { id: "NV-06", name: "Hoàng Minh Giang", role: "Picker (Đa kỹ năng)", skill: "Cross-trained: Soạn PALLET & Vận hành cẩu", shift: "Ca 1 (06:00 - 14:00)" },
      ],
      queues: { waiting: 2, processing: 4, bufferCapacity: 40 },
      equipment: [
        { name: "Bàn Kitting PK-01 & PK-02 (Pick-to-Light)", status: "Hoạt động 100%" },
        { name: "Bàn Kitting PK-03 & PK-04 (Pick-to-Light)", status: "Hoạt động 100%" },
      ],
      kpis: { speed: "3.4 phút/đơn", bufferHealth: "94% Đúng nhịp Takt", cycle: "02 nhân sự đa năng sẵn sàng" }
    },
    loading: {
      name: "Cầu Bốc Hàng (Loading Docks DK1-3)",
      code: "ST-03",
      area: "Zone B - Staging Dock Area (Điểm nghẽn gốc phát hiện)",
      status: "BOTTLENECK_HOTSPOT",
      workers: [
        { id: "NV-07", name: "Bùi Trọng Hiếu", role: "Loader Dock 1", skill: "Vận hành bàn nâng & xếp xe kéo", shift: "Ca 1 (06:00 - 14:00)" },
        { id: "NV-08", name: "Đỗ Quốc Khánh", role: "Loader Dock 2", skill: "Bốc xếp xe kéo Milk-run & Forklift", shift: "Ca 1 (06:00 - 14:00)" },
      ],
      queues: { waiting: currentReplayPhase ? currentReplayPhase.kpis.dock_queue : 4, processing: 2, bufferCapacity: 12 },
      equipment: [
        { name: "Cầu bốc DK-01 & DK-02", status: "Quá tải 96% (Đang xếp dỡ)" },
        { name: "Cầu bốc DK-03", status: "Thiếu 01 Loader vận hành" },
        { name: "Xe nâng Forklift FK-02 (Hỗ trợ Pallet nặng)", status: "Đang chờ giải phóng làn DK-02" },
      ],
      kpis: { speed: "4.8 phút/chuyến", bufferHealth: "Cảnh báo nghẽn cổ chai", cycle: "ROI Can thiệp 4.8x" }
    },
    transport: {
      name: "Đoàn Xe Kéo Milk-run (Tugger) & Đội Xe Tự Hành AGV/AMR",
      code: "ST-04",
      area: "Tuyến vòng nội bộ SMKT -> L1 -> L2 -> L3 -> L4 -> SMKT",
      status: "WARNING",
      workers: [
        { id: "TX-01", name: "Ngô Quang Lâm", role: "Tài xế TG-01", skill: "Lái tàu kéo điện Mizusumashi", shift: "Ca 1 (06:00 - 14:00)" },
        { id: "TX-02", name: "Đặng Tiến Nam", role: "Tài xế TG-02", skill: "Lái tàu kéo điện & Giám sát AMR", shift: "Ca 1 (06:00 - 14:00)" },
      ],
      queues: { waiting: 1, processing: 2, bufferCapacity: 8 },
      equipment: [
        { name: "Tàu kéo TG-01 & Đội 06 xe AMR tự hành", status: "Đang chạy vòng 04 (Pin 82%)" },
        { name: "Tàu kéo TG-02", status: "Đang chờ bốc tại Dock 1 (Pin 75%)" },
        { name: "Tàu kéo TG-03", status: "Đang bảo dưỡng định kỳ 10:00 - 12:00" },
      ],
      kpis: { speed: "20 phút / vòng lặp", bufferHealth: "Công suất bận 94% (Do chờ Dock)", cycle: "8 đơn / chuyến xe" }
    },
    lines: {
      name: "4 Chuyền Lắp Ráp (L1 - L4) & Xe Nâng Forklift Cấp Phôi",
      code: "ST-05",
      area: "Xưởng Sản Xuất Chính (Hợp nhất Kế hoạch SX & BOM)",
      status: "DEMAND_SURGE",
      workers: [
        { id: "QL-01", name: "Trần Văn Phát", role: "Quản đốc Dây chuyền", skill: "Điều độ chuyền L1/L2 (+30%)", shift: "Ca 1 (06:00 - 14:00)" },
        { id: "QL-02", name: "Nguyễn Thị Quyên", role: "Tổ trưởng Lắp ráp", skill: "Giám sát nhịp Takt-time chuyền L3/L4", shift: "Ca 1 (06:00 - 14:00)" },
      ],
      queues: { waiting: 0, processing: 8, bufferCapacity: 120 },
      equipment: [
        { name: "Line 1 & Line 2 (L1 & L2)", status: "Tăng 30% sản lượng đổi mẫu xe" },
        { name: "Line 3 & Line 4 (L3 & L4)", status: "Hoạt động theo định mức 100%" },
        { name: "Xe nâng Forklift FK-03 (Cấp kiện Pallet L1/L2)", status: "Hoạt động 92% công suất" },
      ],
      kpis: { speed: "385 đơn vị/giờ", bufferHealth: "Đệm tối thiểu 20 phút", cycle: "0 Sự cố dừng chuyền" }
    }
  };

  const currStation = stationDetails[selectedStation] || stationDetails.loading;

  return (
    <div className="space-y-6">
      {/* MISSION CONTROL HEALTH & SUSTAINABILITY BANNER */}
      <div className="control-panel p-5 bg-gradient-to-r from-[#121c32] via-[#0f172a] to-[#121d33] border border-[#233554] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Logistics Health Score */}
          <div className="flex items-center space-x-4">
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="#1c2840" strokeWidth="6" fill="transparent" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke={healthColor}
                  strokeWidth="6"
                  strokeDasharray="175.9"
                  strokeDashoffset={175.9 * (1 - liveHealthScore / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-base font-black text-white font-mono">
                  {liveHealthScore}
                </span>
                <span className="text-[8px] text-slate-400 -mt-1 font-bold">SCORE</span>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <HeartPulse className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  CHỈ SỐ SỨC KHỎE HỆ THỐNG (LOGISTICS HEALTH SCORE)
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {liveHealthScore >= 80 ? (
                  <>Trạng thái: <b className="text-emerald-400">Vận hành Ổn định</b> (Hệ thống trong hạn mức tải an toàn)</>
                ) : liveHealthScore >= 60 ? (
                  <>Trạng thái: <b className="text-amber-400">Cảnh báo Nguy cơ Nghẽn</b> (Tải đỉnh {(peakRatio * 100).toFixed(0)}%, {criticalAlertsCount} cảnh báo)</>
                ) : (
                  <>Trạng thái: <b className="text-rose-400">Nguy cơ Quá tải Cao ({(peakRatio * 100).toFixed(0)}%)</b> (Khuyến nghị kích hoạt đối sách can thiệp)</>
                )}
              </div>
              <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                <span>Throughput: <b className="text-slate-200 font-mono">{currentReplayPhase ? "94%" : liveHealthScore >= 80 ? "95%" : "82%"}</b></span>
                <span>•</span>
                <span>SLA Bảo đảm: <b className="text-emerald-400 font-mono">{currentReplayPhase?.kpis.sla || (liveHealthScore >= 80 ? "98.4%" : "86.2%")}</b></span>
                <span>•</span>
                <span>Tugger Fleet: <b className="text-cyan-400 font-mono">{currentReplayPhase?.kpis.fleet_util || (liveHealthScore >= 80 ? "74%" : "95% (Tải cao)")}</b></span>
              </div>
            </div>
          </div>

          {/* Sustainability & Eco Carbon Footprint Tracker */}
          <div className="p-3.5 rounded-xl bg-[#0c1424] border border-[#1e2f4d] flex items-center space-x-4">
            <div className="p-2.5 rounded-lg bg-teal-950/60 border border-teal-700/50 text-teal-400">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">
                GREEN LOGISTICS & SUSTAINABILITY
              </div>
              <div className="text-sm font-black text-white mt-0.5 font-mono">
                18.5 kg CO₂e <span className="text-xs font-normal text-slate-400">/ ca sản xuất</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Phương án Cắt giảm: <b className="text-teal-300 font-mono">-7.0% (Plan C)</b> · Km rỗng: <b className="text-slate-300 font-mono">0.8 km</b>
              </div>
            </div>
          </div>

          {/* Replay Mode Toggle Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setReplayMode(!replayMode)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center space-x-2 border shadow-lg ${
                replayMode
                  ? "bg-[#ff6b00] border-[#ff8f3d] text-white shadow-[#ff6b00]/30"
                  : "bg-[#162238] hover:bg-[#20304f] border-[#293d63] text-slate-200"
              }`}
            >
              <History className="w-4 h-4" />
              <span>{replayMode ? "Đóng Replay Mode" : "Chế độ Replay Sự cố (08:00 - 20:00)"}</span>
            </button>
          </div>
        </div>

        {/* 5-PHASE INCIDENT REPLAY MODE CONTROLLER (Module 15) */}
        {replayMode && replayData && (
          <div className="mt-4 pt-4 border-t border-[#1e2f4d] space-y-3 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <span className="w-2 h-2 rounded-full bg-[#ff6b00] animate-ping"></span>
                <span>TUA LẠI SỰ CỐ ĐIỀU PHỐI (5-PHASE INCIDENT REPLAY): {replayData.scenario_name}</span>
              </div>

              {/* Controls: Play/Pause, Steps */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setReplayPhaseIdx((prev) => Math.max(0, prev - 1))}
                  disabled={replayPhaseIdx === 0}
                  className="p-1.5 rounded-lg bg-[#141e33] hover:bg-[#1f2d4a] text-slate-300 disabled:opacity-40 cursor-pointer"
                  title="Giai đoạn trước"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsReplaying(!isReplaying)}
                  className="px-3 py-1.5 rounded-lg bg-[#ff6b00] hover:bg-[#ff7b1a] text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  {isReplaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isReplaying ? "Tạm dừng" : "Tự động phát"}</span>
                </button>

                <button
                  onClick={() => setReplayPhaseIdx((prev) => Math.min(replayData.phases.length - 1, prev + 1))}
                  disabled={replayPhaseIdx === replayData.phases.length - 1}
                  className="p-1.5 rounded-lg bg-[#141e33] hover:bg-[#1f2d4a] text-slate-300 disabled:opacity-40 cursor-pointer"
                  title="Giai đoạn tiếp theo"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => { setReplayPhaseIdx(0); setIsReplaying(false); }}
                  className="p-1.5 rounded-lg bg-[#141e33] hover:bg-[#1f2d4a] text-slate-300 cursor-pointer"
                  title="Đặt lại về ban đầu"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 5 Phase Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              {replayData.phases.map((ph, idx) => {
                const isActive = idx === replayPhaseIdx;
                return (
                  <button
                    key={ph.phase_id}
                    onClick={() => {
                      setReplayPhaseIdx(idx);
                      if (idx === 0) setSelectedStation("supermarket");
                      else if (idx === 1) setSelectedStation("picking");
                      else if (idx === 2) setSelectedStation("loading");
                      else if (idx === 3) setSelectedStation("loading");
                      else if (idx === 4) setSelectedStation("transport");
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isActive
                        ? "bg-[#1c2944] border-[#ff6b00] ring-1 ring-[#ff6b00]/40 text-white shadow-md"
                        : "bg-[#0f1728] border-[#1d2b45] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span className="font-bold text-[#ff8f3d]">{ph.timestamp}</span>
                      <span className={`px-1.5 py-0.2 rounded font-extrabold ${
                        ph.status_color === "emerald" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" :
                        ph.status_color === "rose" ? "bg-rose-950 text-rose-300 border border-rose-800" :
                        ph.status_color === "blue" ? "bg-blue-950 text-blue-300 border border-blue-800" :
                        "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}>
                        Phase {ph.phase_id}
                      </span>
                    </div>
                    <div className="font-semibold truncate text-[11px]">{ph.name.slice(3)}</div>
                  </button>
                );
              })}
            </div>

            {/* Current Phase Narration Strip */}
            {currentReplayPhase && (
              <div className="p-3 rounded-xl bg-[#0b1220] border border-[#1d2d48] flex items-center justify-between text-xs gap-3">
                <div className="flex items-center space-x-2 text-slate-200">
                  <Sparkles className="w-4 h-4 text-[#ff6b00] shrink-0" />
                  <span><b>Diễn biến sự kiện ({currentReplayPhase.timestamp}):</b> {currentReplayPhase.event}</span>
                </div>
                <div className="shrink-0 font-mono text-[11px] text-slate-400 flex items-center space-x-3">
                  <span>Hàng đợi Dock: <b className="text-amber-400">{currentReplayPhase.kpis.dock_queue} đơn</b></span>
                  <span>•</span>
                  <span>Xe hoạt động: <b className="text-cyan-400">{currentReplayPhase.active_tuggers.join(", ")}</b></span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top 5 High-Impact KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1 */}
        <div className="control-panel p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span className="font-semibold text-slate-300">{t.plannedWorkload}</span>
            <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-700/50 text-indigo-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {totalWorkload.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span className="text-xs text-slate-400 font-normal ml-1">phút chuẩn</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Ca S1 (8 giờ)</span>
            <span className="font-mono text-indigo-300 font-bold">32 khung 15m</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="control-panel p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span className="font-semibold text-slate-300">{t.effectiveCapacity}</span>
            <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight">
            {totalCapacity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span className="text-xs text-emerald-500/80 font-normal ml-1">phút hữu dụng</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Hiệu dụng thực tế</span>
            <span className="font-bold text-emerald-400">90.0% (Trừ nghỉ ca)</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="control-panel p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span className="font-semibold text-slate-300">{t.maxRatio}</span>
            <div className="p-1.5 rounded-lg bg-orange-950/60 border border-orange-700/50 text-[#ff6b00]">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black tracking-tight ${peakRatio >= 1.0 ? "text-[#ff6b00]" : "text-white"}`}>
            {(peakRatio * 100).toFixed(0)}%
            <span className="text-xs font-normal text-slate-400 ml-1">đỉnh</span>
          </div>
          <div className="mt-2.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                peakRatio >= 1.0 ? "bg-[#ff6b00]" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, peakRatio * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="control-panel p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span className="font-semibold text-slate-300">{t.wipItems}</span>
            <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-700/50 text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-400 tracking-tight font-mono">
            {wipCount}
            <span className="text-xs text-slate-400 font-normal ml-1">đơn đệm</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Snapshot ban đầu</span>
            <span className="text-cyan-300 font-bold">06:00 sẵn sàng</span>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="control-panel p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span className="font-semibold text-slate-300">{t.activeAlerts}</span>
            <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-700/50 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 tracking-tight">
            {alerts.length}
            <span className="text-xs text-slate-400 font-normal ml-1">tín hiệu</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Nghiêm trọng</span>
            <span className="font-bold text-rose-400 font-mono">
              {alerts.filter((a) => a.severity === "CRITICAL").length} tín hiệu
            </span>
          </div>
        </div>
      </div>

      {/* TRỤ CỘT 1 (SLIDE 17 & 23): SINGLE SOURCE OF TRUTH — HỢP NHẤT 5 NGUỒN DỮ LIỆU & EXCEL PHÂN TÁN */}
      <div className="control-panel p-5 border border-cyan-500/30 bg-gradient-to-r from-[#0e182a] via-[#0c1424] to-[#0e192d]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-3.5 gap-2">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 mb-1 font-mono">
              <Warehouse className="w-3.5 h-3.5" />
              <span>TRỤ CỘT 1 · HIỂN THỊ HÓA: WHAT IS HAPPENING NOW? (SLIDE 17 & 23)</span>
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              SINGLE SOURCE OF TRUTH — HỢP NHẤT 5 NGUỒN EXCEL/HỆ THỐNG PHÂN TÁN TRÊN MẶT BẰNG NỘI KHU
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Xóa bỏ tình trạng tra cứu thủ công trên 5 file Excel rời rạc. Nhấp vào từng thực thể bên dưới để định vị trực tiếp trên Sơ đồ 2D CAD và xem thông số thiết bị/nhân sự.
            </p>
          </div>
          <div className="shrink-0 flex items-center space-x-2 text-[11px] font-mono bg-[#09101d] px-3 py-1.5 rounded-lg border border-[#1e3050] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đồng bộ 5/5 nguồn · Chu kỳ 15s</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Entity 1: Warehouse & GTP */}
          <div
            onClick={() => { setSelectedStation("supermarket"); setShowDrawer(true); }}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              selectedStation === "supermarket"
                ? "bg-[#172642] border-cyan-400 ring-1 ring-cyan-400/40"
                : "bg-[#0d1526] border-[#1f304d] hover:border-slate-500"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white">1. Kho & GTP</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                82% Sức chứa
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-medium">Goods-to-Person: 145 khay/h</div>
            <div className="text-[10px] text-slate-400 mt-1 border-t border-[#1b2942] pt-1">
              Thay thế: <i>Excel Tồn kho & Phiếu xuất</i>
            </div>
          </div>

          {/* Entity 2: Manpower & Cross-skill */}
          <div
            onClick={() => { setSelectedStation("picking"); setShowDrawer(true); }}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              selectedStation === "picking"
                ? "bg-[#172642] border-cyan-400 ring-1 ring-cyan-400/40"
                : "bg-[#0d1526] border-[#1f304d] hover:border-slate-500"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white">2. Nhân lực Kitting</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                15/18 Nhân sự
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-medium">02 Picker có kỹ năng chéo Dock</div>
            <div className="text-[10px] text-slate-400 mt-1 border-t border-[#1b2942] pt-1">
              Thay thế: <i>Excel Điểm danh & Bảng phân ca</i>
            </div>
          </div>

          {/* Entity 3: Receiving/Shipping Docks */}
          <div
            onClick={() => { setSelectedStation("loading"); setShowDrawer(true); }}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              selectedStation === "loading"
                ? "bg-[#172642] border-[#ff6b00] ring-1 ring-[#ff6b00]/40"
                : "bg-[#0d1526] border-rose-800/60 hover:border-rose-500"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white">3. Cổng Cầu bốc Dock</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                Tải 96% (Nghẽn)
              </span>
            </div>
            <div className="text-[11px] text-amber-300 font-medium">DK1–2 bận · DK3 thiếu 1 Loader</div>
            <div className="text-[10px] text-slate-400 mt-1 border-t border-[#1b2942] pt-1">
              Thay thế: <i>Sổ ghi chép điều độ Cổng bốc</i>
            </div>
          </div>

          {/* Entity 4: AGV / AMR / Tugger Fleet */}
          <div
            onClick={() => { setSelectedStation("transport"); setShowDrawer(true); }}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              selectedStation === "transport"
                ? "bg-[#172642] border-cyan-400 ring-1 ring-cyan-400/40"
                : "bg-[#0d1526] border-amber-800/60 hover:border-amber-500"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white">4. AGV / AMR & Tàu kéo</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                TG-03 Bảo trì
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-medium">2 Tàu kéo + 6 AMR chạy (Pin 80%)</div>
            <div className="text-[10px] text-slate-400 mt-1 border-t border-[#1b2942] pt-1">
              Thay thế: <i>Excel Lịch tàu kéo & Log bảo trì</i>
            </div>
          </div>

          {/* Entity 5: Forklift & Assembly Lines */}
          <div
            onClick={() => { setSelectedStation("lines"); setShowDrawer(true); }}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              selectedStation === "lines"
                ? "bg-[#172642] border-cyan-400 ring-1 ring-cyan-400/40"
                : "bg-[#0d1526] border-[#1f304d] hover:border-slate-500"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white">5. Forklift & 4 Chuyền</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                L1/L2 +30%
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-medium">02 Xe nâng FK · Đệm chuẩn 45p</div>
            <div className="text-[10px] text-slate-400 mt-1 border-t border-[#1b2942] pt-1">
              Thay thế: <i>Excel Kế hoạch SX & Định mức BOM</i>
            </div>
          </div>
        </div>

        {/* INTERACTIVE CROSS-SHEET MATHEMATICAL LINEAGE TRACE (5 EXCEL FILES -> BOTTLENECK) */}
        <div className="mt-3.5 p-3.5 rounded-xl bg-[#080f1d] border border-cyan-900/60 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50 font-mono text-[10px] font-extrabold">
                LIÊN KẾT TOÁN HỌC 5 FILE EXCEL GỐC (CROSS-SHEET LINEAGE)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Đang soi nút: <b className="text-amber-300 uppercase">{currStation.code} · {currStation.name}</b>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-200 bg-[#0d172a] p-2 rounded-lg border border-[#1c2e4a]">
              <span className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/40">
                [File 1: Plan L1/L2 +30% (280 sp/h)]
              </span>
              <span className="text-slate-500">×</span>
              <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/40">
                [File 2: BOM (A:Bin / B:Box / C:Pallet)]
              </span>
              <span className="text-slate-500">→</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/40">
                [File 3: Tồn GTP & Kitting (36.8p tải/15p)]
              </span>
              <span className="text-slate-500">vs.</span>
              <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/40">
                [File 4: Ca S1 chỉ có 02 Loader Dock (27.0p)]
              </span>
              <span className="text-slate-500">+</span>
              <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-700/40">
                [File 5: TG-03 Bảo trì 10:00–12:00 (-33% xe)]
              </span>
              <span className="text-slate-500">⇒</span>
              <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-black">
                NGHẼN CẦU BỐC DOCK (134%) & CẠN ĐỆM L1/L2
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-2">
            <a
              href="/api/data/template"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#13223a] hover:bg-[#1b3050] border border-cyan-600/40 text-cyan-300 text-[11px] font-bold transition cursor-pointer"
            >
              📥 Tải Bộ 5 Sheet Excel Mẫu (.xlsx)
            </a>
            <button
              onClick={() => onNavigateTab("simulate")}
              className="px-3 py-1.5 rounded-lg bg-[#ff6b00] hover:bg-[#e66000] text-white text-[11px] font-bold transition cursor-pointer"
            >
              ⚡ Chạy Mô phỏng Kép Đối chứng →
            </button>
          </div>
        </div>
      </div>

      {/* 2D Digital Twin Supply Flow Schematic Map (CAD Blueprint) */}
      <PlantFloorplanCAD
        selectedStation={selectedStation}
        onSelectStation={(st) => {
          setSelectedStation(st);
          setShowDrawer(true);
        }}
        dockQueueCount={currentReplayPhase ? currentReplayPhase.kpis.dock_queue : 4}
        activeTuggers={currentReplayPhase ? currentReplayPhase.active_tuggers : ["TG1", "TG2"]}
        lang={lang}
      />

      {/* Station Deep-Dive Drawer */}
      {showDrawer && currStation && (
        <div className="control-panel p-5 rounded-xl border border-[#2b3d61] bg-[#0c1322] relative animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#1f2d47] gap-2">
            <div className="flex items-center space-x-2.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-[#ff6b00] text-white">
                {currStation.code}
              </span>
              <span className="font-extrabold text-white text-sm">{currStation.name}</span>
              <span className="text-xs text-slate-400">({currStation.area})</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Chi tiết trạm đang chọn</span>
              <button 
                onClick={() => setShowDrawer(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Đóng bảng chi tiết"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3 text-xs">
            {/* Workers & Skill Roster */}
            <div className="p-3.5 rounded-lg bg-[#111929] border border-[#1e2a42]">
              <div className="flex items-center space-x-2 text-slate-200 font-bold mb-2.5">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Nhân Sự & Kỹ Năng Phân Bổ:</span>
              </div>
              <div className="space-y-2">
                {currStation.workers.map((w: any) => (
                  <div key={w.id} className="p-2 rounded bg-[#0d1424] border border-[#1a253a] flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-white flex items-center space-x-1.5">
                        <span>{w.name}</span>
                        <span className="text-[10px] font-mono text-cyan-300">({w.id})</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{w.skill}</div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                      {w.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Machinery & Equipment Telemetry */}
            <div className="p-3.5 rounded-lg bg-[#111929] border border-[#1e2a42]">
              <div className="flex items-center space-x-2 text-slate-200 font-bold mb-2.5">
                <Gauge className="w-4 h-4 text-emerald-400" />
                <span>Thiết Bị & Máy Móc Vận Hành:</span>
              </div>
              <div className="space-y-2">
                {currStation.equipment.map((eq: any, idx: number) => (
                  <div key={idx} className="p-2 rounded bg-[#0d1424] border border-[#1a253a] flex items-center justify-between">
                    <span className="text-slate-300">{eq.name}</span>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">{eq.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Queue Length & Real-time Buffer KPIs */}
            <div className="p-3.5 rounded-lg bg-[#111929] border border-[#1e2a42] flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-slate-200 font-bold mb-2.5">
                  <Activity className="w-4 h-4 text-[#ff6b00]" />
                  <span>Hàng Đợi & Nhịp Độ Trạm:</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-[#1c2944] pb-1">
                    <span className="text-slate-400">Đang chờ xử lý:</span>
                    <span className="font-mono font-bold text-amber-400">{currStation.queues.waiting} đơn hàng</span>
                  </div>
                  <div className="flex justify-between border-b border-[#1c2944] pb-1">
                    <span className="text-slate-400">Tốc độ hoàn tất:</span>
                    <span className="font-bold text-emerald-400">{currStation.kpis.speed}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#1c2944] pb-1">
                    <span className="text-slate-400">Trạng thái đệm:</span>
                    <span className="font-bold text-cyan-300">{currStation.kpis.bufferHealth}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab("simulate")}
                className="mt-3 w-full py-1.5 px-3 rounded-lg bg-[#ff6b00] hover:bg-[#ff7b1a] text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-[#ff6b00]/30"
              >
                <span>Mô phỏng thử nghiệm What-if trạm này</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Storyline Callout & Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storyline Callout Card */}
        <div className="control-panel p-5 relative overflow-hidden bg-gradient-to-br from-[#1b1464]/30 via-[#12192c] to-[#12192c] border-[#313f63]">
          <div className="flex items-center space-x-2 text-xs font-extrabold text-[#ff6b00] uppercase tracking-wider mb-2.5">
            <Zap className="w-4 h-4 text-[#ff6b00]" />
            <span>{t.storylineBadge}</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {currentData?.meta?.storyline ||
              "Ca S2 kế hoạch sản xuất tăng 30% trên Line 1 & Line 2 (chương trình chuyển đổi mẫu xe mới), đồng thời xe Tugger TG3 bảo dưỡng định kỳ từ 13:00 - 16:00."}
          </p>

          <div className="mt-4 pt-3.5 border-t border-[#23314f] flex items-center justify-between text-xs">
            <span className="text-slate-400">Trạng thái mô hình SimPy:</span>
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Khớp logic 100% (0 lỗi)</span>
            </span>
          </div>

          <button
            onClick={() => onNavigateTab("recommend")}
            className="mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#e60012] to-[#ff6b00] hover:from-[#f01426] hover:to-[#ff7b1a] text-white text-xs font-black transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-[#ff6b00]/25"
          >
            <span>{t.exploreAction}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Live Operational Alerts Feed */}
        <div className="control-panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Cảnh báo điều hành thời gian thực ({alerts.length})</span>
            </h3>
            <button
              onClick={() => onNavigateTab("detect")}
              className="text-xs font-semibold text-[#ff8f3d] hover:text-[#ffa866] transition flex items-center space-x-1 cursor-pointer"
            >
              <span>{t.seeAlerts}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="text-xs text-slate-400 py-8 text-center flex flex-col items-center justify-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span>Không có cảnh báo bất thường trong khung thời gian này. Luồng vận hành thông suốt.</span>
              </div>
            ) : (
              alerts.map((alt) => (
                <div
                  key={alt.alert_id}
                  className={`p-3.5 rounded-xl border text-xs flex items-start justify-between transition ${
                    alt.severity === "CRITICAL"
                      ? "bg-rose-950/25 border-rose-800/60 text-rose-200 hover:bg-rose-950/40"
                      : "bg-amber-950/25 border-amber-800/60 text-amber-200 hover:bg-amber-950/40"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${alt.severity === "CRITICAL" ? "bg-rose-500 animate-pulse" : "bg-amber-500"}`}></span>
                      <span className="text-white text-xs">{alt.title}</span>
                    </div>
                    <div className="text-slate-300 text-[11px] leading-relaxed">{alt.message}</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 text-slate-300 shrink-0 ml-3 border border-slate-700">
                    {alt.timestamp ? alt.timestamp.slice(11, 16) : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
