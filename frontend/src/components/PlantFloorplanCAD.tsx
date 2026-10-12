import React, { useState } from "react";
import { 
  Warehouse, 
  PackageOpen, 
  Anchor, 
  Truck, 
  Factory, 
  AlertTriangle, 
  Zap,
  Radio,
  Eye,
  Sliders,
  ShieldCheck,
  Flame,
  Play,
  Pause,
  Timer,
  Cpu,
  GitBranch,
  CheckCircle2,
  ArrowRight,
  Layers
} from "lucide-react";

interface PlantFloorplanCADProps {
  selectedStation: string;
  onSelectStation: (stationId: string) => void;
  dockQueueCount: number;
  activeTuggers: string[];
  lang: "vi" | "en";
}

type TwinScenarioMode = "baseline" | "disruption" | "mitigated";
type ViewMode = "floorplan2d" | "concept2d" | "zones";

export const PlantFloorplanCAD: React.FC<PlantFloorplanCADProps> = ({
  selectedStation,
  onSelectStation,
  dockQueueCount,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("floorplan2d");
  const [scenarioMode, setScenarioMode] = useState<TwinScenarioMode>("baseline");
  const [isAnimated, setIsAnimated] = useState<boolean>(true);

  const effectiveQueue =
    scenarioMode === "mitigated"
      ? 2
      : scenarioMode === "disruption"
      ? Math.max(18, dockQueueCount + 9)
      : Math.max(8, dockQueueCount);

  const cycleTimeMin =
    scenarioMode === "mitigated" ? 15 : scenarioMode === "disruption" ? 28 : 20;

  const animDuration1 =
    scenarioMode === "mitigated" ? "11s" : scenarioMode === "disruption" ? "22s" : "16s";
  const animDuration2 =
    scenarioMode === "mitigated" ? "12s" : scenarioMode === "disruption" ? "24s" : "17s";

  const lineConfigs = [
    {
      id: "L1",
      name: "DÂY CHUYỀN LẮP RÁP 1 (LINE 1)",
      product: "Cụm Kim Phun Nhiên Liệu",
      takt: "54s",
      bufferMin: scenarioMode === "mitigated" ? 26 : scenarioMode === "disruption" ? 5 : 11,
      andon: scenarioMode === "mitigated" ? "NORMAL" : scenarioMode === "disruption" ? "STOP_RISK" : "WARNING",
      badge: scenarioMode === "mitigated" ? "EDD ỔN ĐỊNH" : scenarioMode === "disruption" ? "NGUY CƠ DỪNG!" : "TẢI +30% S1",
      y: 78,
    },
    {
      id: "L2",
      name: "DÂY CHUYỀN LẮP RÁP 2 (LINE 2)",
      product: "Cụm Bơm Cao Áp Common-Rail",
      takt: "58s",
      bufferMin: scenarioMode === "mitigated" ? 28 : scenarioMode === "disruption" ? 7 : 13,
      andon: scenarioMode === "mitigated" ? "NORMAL" : scenarioMode === "disruption" ? "STOP_RISK" : "WARNING",
      badge: scenarioMode === "mitigated" ? "EDD ỔN ĐỊNH" : scenarioMode === "disruption" ? "CẠN KANBAN!" : "TẢI +30% S1",
      y: 192,
    },
    {
      id: "L3",
      name: "DÂY CHUYỀN LẮP RÁP 3 (LINE 3)",
      product: "Cụm Cảm Biến Oxy & ECU",
      takt: "65s",
      bufferMin: scenarioMode === "mitigated" ? 34 : scenarioMode === "disruption" ? 14 : 25,
      andon: scenarioMode === "disruption" ? "WARNING" : "NORMAL",
      badge: "CHUẨN JIT",
      y: 306,
    },
    {
      id: "L4",
      name: "DÂY CHUYỀN LẮP RÁP 4 (LINE 4)",
      product: "Cụm Mô-tơ Quạt Làm Mát",
      takt: "65s",
      bufferMin: scenarioMode === "mitigated" ? 36 : scenarioMode === "disruption" ? 18 : 28,
      andon: "NORMAL",
      badge: "CHUẨN JIT",
      y: 420,
    },
  ];

  // Unobstructed dedicated Milk-run loop roadway coordinates around the central aisle (x=615..685)
  const milkRunLoopPath =
    "M 615 140 L 675 140 L 675 495 L 615 495 Z";

  return (
    <div className="rounded-2xl border border-[#233554] bg-[#070c16] overflow-hidden shadow-2xl relative">
      {/* Top Header Bar */}
      <div className="px-5 py-3.5 bg-[#0d1525] border-b border-[#1c2a44] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#ff6b00]/15 border border-[#ff6b00]/40 text-[#ff8f3d] font-mono text-[10px] font-extrabold tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>DENSO PLANT DIGITAL TWIN 2D</span>
          </div>
          <span className="text-xs font-black text-white uppercase tracking-wider">
            MÔ HÌNH 2D NHÀ MÁY & KIẾN TRÚC Ý TƯỞNG ĐIỀU ĐỘ THÔNG MINH (CA S1: 06:00 – 14:00)
          </span>
        </div>

        <div className="flex items-center space-x-2.5 text-xs">
          {viewMode === "floorplan2d" && (
            <button
              onClick={() => setIsAnimated(!isAnimated)}
              className="px-2.5 py-1 rounded-lg bg-[#060a12] border border-[#1b273d] text-slate-300 hover:text-white flex items-center space-x-1.5 text-[11px] font-bold cursor-pointer transition"
            >
              {isAnimated ? <Pause className="w-3 h-3 text-emerald-400" /> : <Play className="w-3 h-3 text-amber-400" />}
              <span>{isAnimated ? "Chuyển động: BẬT" : "Tạm dừng"}</span>
            </button>
          )}

          {/* 3-Mode View Switcher */}
          <div className="flex items-center bg-[#060a12] p-1 rounded-lg border border-[#1d2b45]">
            <button
              onClick={() => setViewMode("floorplan2d")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                viewMode === "floorplan2d"
                  ? "bg-[#ff6b00] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>1. Mặt bằng 2D Nhà máy</span>
            </button>
            <button
              onClick={() => setViewMode("concept2d")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                viewMode === "concept2d"
                  ? "bg-[#ff6b00] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2. Mô hình Ý tưởng 2D</span>
            </button>
            <button
              onClick={() => setViewMode("zones")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                viewMode === "zones"
                  ? "bg-[#ff6b00] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>3. Thẻ Trạm</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stress-Test Scenario Selector Bar */}
      <div className="px-5 py-2.5 bg-[#0a101d] border-b border-[#19263e] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-[11px] text-slate-300 font-semibold">
          <Zap className="w-3.5 h-3.5 text-[#ff8f3d]" />
          <span>Kịch bản vận hành tương tác (Bấm để xem phản ứng trên sơ đồ 2D):</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setScenarioMode("baseline")}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center space-x-1.5 ${
              scenarioMode === "baseline"
                ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm"
                : "bg-[#0f172a] border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Kịch bản 1: Hiện trạng Ca S1 (+30% L1/L2, Bảo trì TG3)</span>
          </button>

          <button
            onClick={() => setScenarioMode("disruption")}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center space-x-1.5 ${
              scenarioMode === "disruption"
                ? "bg-rose-500/25 border-rose-500 text-rose-200 shadow-sm"
                : "bg-[#0f172a] border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Kịch bản 2: Sự cố Khẩn cấp (+60% Surge & Hỏng TG2)</span>
          </button>

          <button
            onClick={() => setScenarioMode("mitigated")}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center space-x-1.5 ${
              scenarioMode === "mitigated"
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm"
                : "bg-[#0f172a] border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kịch bản 3: Bật Đối sách Plan B (EDD + Mở Dock 3 + TG4)</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          VIEW 1: DETAILED 2D ARCHITECTURAL FACTORY FLOORPLAN
         ===================================================================== */}
      {viewMode === "floorplan2d" && (
        <div className="p-4 sm:p-5 relative select-none bg-[#0b111e]">
          <div className="w-full bg-[#e8edf3] rounded-xl border-2 border-[#64748b] relative overflow-hidden shadow-lg">
            <svg
              viewBox="0 0 1200 560"
              className="w-full h-auto block"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Clean Light Industrial Epoxy Concrete Expansion Joint Grid */}
                <pattern id="epoxyFloorGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <rect width="40" height="40" fill="#eef2f6" />
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#dbe2ea" strokeWidth="1" />
                </pattern>
                {/* 5S Industrial Black-Yellow Hazard Stripe */}
                <pattern id="hazardStripe5S" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="7" height="14" fill="#f59e0b" />
                  <rect x="7" width="7" height="14" fill="#1e293b" />
                </pattern>
              </defs>

              {/* Base Factory Epoxy Floor */}
              <rect width="1200" height="560" fill="url(#epoxyFloorGrid)" />

              {/* Top Architectural Engineering Header Bar (Dark Slate Technical Header) */}
              <g>
                <rect x="0" y="0" width="1200" height="34" fill="#1e293b" />
                <line x1="0" y1="34" x2="1200" y2="34" stroke="#f59e0b" strokeWidth="2" />
                <text x="115" y="21" fill="#f8fafc" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  ZONE A: KHO SUPERMARKET
                </text>
                <text x="320" y="21" fill="#f8fafc" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  ZONE B: SOẠN HÀNG KITTING
                </text>
                <text x="508" y="21" fill="#fde047" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  ZONE C: CẦU BỐC DOCKS
                </text>
                <text x="645" y="21" fill="#fde047" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  TUYẾN AGV
                </text>
                <text x="945" y="21" fill="#f8fafc" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  ZONE D: 4 DÂY CHUYỀN LẮP RÁP CHÍNH L1 – L4 (KANBAN & CONVEYOR)
                </text>
              </g>

              {/* ===============================================================
                  ZONE A: SUPERMARKET WAREHOUSE (x=20..210, y=46..514)
                 =============================================================== */}
              <g
                onClick={() => onSelectStation("supermarket")}
                className="cursor-pointer"
              >
                {/* 5S Floor Boundary & Concrete Pad */}
                <rect
                  x="20"
                  y="46"
                  width="190"
                  height="468"
                  rx="8"
                  fill="#f8fafc"
                  stroke={selectedStation === "supermarket" ? "#d7000f" : "#64748b"}
                  strokeWidth={selectedStation === "supermarket" ? "3" : "2"}
                />
                {/* 5S Yellow Corner Markings */}
                <rect x="20" y="46" width="190" height="32" rx="6" fill="#334155" />
                <circle cx="36" cy="62" r="4.5" fill="#22c55e" />
                <text x="48" y="66" fill="#ffffff" fontSize="11" fontWeight="bold">1. KHO SUPERMARKET</text>

                {/* 5 High-Bay Steel Storage Racks (Standard Steel & Blue Kanban Polyboxes) */}
                {[0, 1, 2, 3, 4].map((rIdx) => {
                  const ry = 94 + rIdx * 38;
                  return (
                    <g key={rIdx} transform={`translate(34, ${ry})`}>
                      {/* Heavy-Duty Steel Rack Frame */}
                      <rect x="0" y="0" width="162" height="26" rx="3" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
                      <rect x="0" y="0" width="40" height="26" rx="2" fill="#cbd5e1" />
                      <text x="20" y="16" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        KỆ A{rIdx + 1}
                      </text>
                      {/* Uniform Industrial Kanban Polyboxes (Standard Industrial Blue & Slate) */}
                      {[0, 1, 2, 3, 4, 5, 6].map((bIdx) => (
                        <rect
                          key={bIdx}
                          x={45 + bIdx * 16}
                          y="4"
                          width="12"
                          height="18"
                          rx="1.5"
                          fill={(rIdx + bIdx) % 3 === 0 ? "#475569" : "#2563eb"}
                          stroke="#ffffff"
                          strokeWidth="0.5"
                        />
                      ))}
                    </g>
                  );
                })}

                {/* Automated GTP (Goods-to-Person) Shuttle Bay & Counterbalance Forklift FK-01 */}
                <g transform="translate(34, 286)">
                  <rect x="0" y="0" width="162" height="46" rx="4" fill="#ecfeff" stroke="#0891b2" strokeWidth="1.5" />
                  <rect x="0" y="0" width="162" height="15" rx="3" fill="#0891b2" />
                  <text x="81" y="11" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    TRẠM KỆ TỰ ĐỘNG GTP-01 & XE NÂNG FK-01
                  </text>
                  {/* GTP Shuttle Carrier */}
                  <rect x="6" y="20" width="68" height="20" rx="3" fill="#cffafe" stroke="#0e7490" strokeWidth="1.2" />
                  <text x="40" y="33" fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    GTP: 145 bin/h
                  </text>
                  {/* Forklift FK-01 Top-down Icon */}
                  <g transform="translate(82, 19)">
                    <rect x="0" y="1" width="52" height="20" rx="3" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
                    <text x="26" y="14" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                      FK-01 (Pallet)
                    </text>
                    {/* Forklift Tines */}
                    <line x1="52" y1="6" x2="66" y2="6" stroke="#334155" strokeWidth="2.5" />
                    <line x1="52" y1="16" x2="66" y2="16" stroke="#334155" strokeWidth="2.5" />
                    <rect x="60" y="3" width="12" height="16" rx="1" fill="#b45309" stroke="#78350f" strokeWidth="1" />
                  </g>
                </g>

                {/* e-Kanban Digital Scanner Gate */}
                <rect x="34" y="340" width="162" height="28" rx="4" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="4 2" />
                <text x="115" y="358" fill="#1e40af" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  CỔNG QUÉT e-KANBAN RFID
                </text>

                {/* Maintenance & Battery Workshop Bay (5S Safety Bay) */}
                <g transform="translate(32, 382)">
                  <rect x="0" y="0" width="166" height="118" rx="6" fill="#fffbeb" stroke="#d97706" strokeWidth="2" />
                  <rect x="2" y="2" width="162" height="10" fill="url(#hazardStripe5S)" />
                  <text x="10" y="28" fill="#92400e" fontSize="10" fontWeight="bold">
                    XƯỞNG BẢO TRÌ & SẠC AGV
                  </text>
                  <text x="10" y="43" fill="#475569" fontSize="9" fontFamily="monospace" fontWeight="bold">
                    Ca bảo dưỡng: 10:00 – 12:00
                  </text>

                  {/* Top-down 2D Drawing of Parked Tugger Train TG-03 */}
                  <g transform="translate(14, 54)">
                    <rect x="-4" y="2" width="134" height="34" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeDasharray="3 2" />
                    {/* Tractor Cab (Industrial Safety Amber) */}
                    <rect x="0" y="6" width="38" height="26" rx="4" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
                    <text x="19" y="22" fill="#ffffff" fontSize="8.5" fontWeight="bold" textAnchor="middle">TG-03</text>
                    {/* Tow Hitch */}
                    <line x1="38" y1="19" x2="48" y2="19" stroke="#334155" strokeWidth="2.5" />
                    {/* Steel Trailer 1 */}
                    <rect x="48" y="8" width="34" height="22" rx="2" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
                    {/* Steel Trailer 2 */}
                    <line x1="82" y1="19" x2="90" y2="19" stroke="#334155" strokeWidth="2.5" />
                    <rect x="90" y="8" width="34" height="22" rx="2" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
                  </g>
                  <text x="10" y="108" fill="#b45309" fontSize="8.5" fontWeight="bold">
                    ● Đang thay bình điện định kỳ
                  </text>
                </g>
              </g>

              {/* Material Flow Arrows Zone A -> Zone B */}
              {[135, 225, 315, 405].map((ay, idx) => (
                <g key={idx}>
                  <line x1="210" y1={ay} x2="232" y2={ay} stroke="#475569" strokeWidth="2" strokeDasharray="3 2" />
                  <polygon points={`232,${ay - 4} 240,${ay} 232,${ay + 4}`} fill="#475569" />
                </g>
              ))}

              {/* ===============================================================
                  ZONE B: PICKING & KITTING CELLS (x=240..400, y=46..514)
                 =============================================================== */}
              <g
                onClick={() => onSelectStation("picking")}
                className="cursor-pointer"
              >
                <rect
                  x="240"
                  y="46"
                  width="160"
                  height="468"
                  rx="8"
                  fill="#f8fafc"
                  stroke={selectedStation === "picking" ? "#d7000f" : "#64748b"}
                  strokeWidth={selectedStation === "picking" ? "3" : "2"}
                />
                <rect x="240" y="46" width="160" height="32" rx="6" fill="#334155" />
                <circle cx="256" cy="62" r="4.5" fill="#22c55e" />
                <text x="268" y="66" fill="#ffffff" fontSize="11" fontWeight="bold">2. SOẠN HÀNG (PICKING)</text>

                {/* 4 Ergonomic U-Shaped Aluminum/Steel Kitting Workstations */}
                {[0, 1, 2, 3].map((pIdx) => {
                  const py = 94 + pIdx * 96;
                  const isReassigned = pIdx === 3 && scenarioMode === "mitigated";
                  return (
                    <g key={pIdx} transform={`translate(252, ${py})`}>
                      <rect
                        x="0"
                        y="0"
                        width="136"
                        height="82"
                        rx="6"
                        fill={isReassigned ? "#ecfdf5" : "#ffffff"}
                        stroke={isReassigned ? "#16a34a" : "#94a3b8"}
                        strokeWidth="1.5"
                      />
                      {/* Workstation Header */}
                      <text x="10" y="18" fill="#0f172a" fontSize="10" fontWeight="bold" fontFamily="monospace">
                        TRẠM PK-0{pIdx + 1}
                      </text>
                      <text
                        x="126"
                        y="18"
                        fill={isReassigned ? "#15803d" : "#334155"}
                        fontSize="8.5"
                        fontWeight="bold"
                        textAnchor="end"
                      >
                        {isReassigned ? "→ SANG DOCK 3" : `NV-0${pIdx + 1}`}
                      </text>

                      {/* U-Shaped Steel Workbench */}
                      <rect x="12" y="28" width="70" height="10" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
                      <rect x="12" y="28" width="10" height="38" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
                      <rect x="12" y="56" width="70" height="10" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />

                      {/* Worker Operator Hardhat Avatar */}
                      {!isReassigned && (
                        <g transform="translate(48, 47)">
                          <circle cx="0" cy="0" r="8.5" fill="#1e40af" stroke="#ffffff" strokeWidth="1.5" />
                          <text x="0" y="3" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                            P{pIdx + 1}
                          </text>
                        </g>
                      )}

                      {/* Steel Kitting Cart on Right of Cell */}
                      <rect x="92" y="28" width="32" height="38" rx="3" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
                      <rect x="97" y="33" width="9" height="12" rx="1" fill="#2563eb" />
                      <rect x="110" y="33" width="9" height="12" rx="1" fill="#475569" />
                      <rect x="97" y="49" width="9" height="12" rx="1" fill="#2563eb" />
                    </g>
                  );
                })}

                <rect x="252" y="482" width="136" height="22" rx="4" fill="#e2e8f0" />
                <text x="320" y="496" fill="#0f172a" fontSize="9" fontWeight="bold" textAnchor="middle">
                  Quy tắc: {scenarioMode === "mitigated" ? "EDD (Ưu tiên giờ cần)" : "FIFO Truyền thống"}
                </text>
              </g>

              {/* Steel Roller Conveyors from Picking -> Loading Docks */}
              {[135, 230, 325].map((cy, idx) => (
                <g key={idx}>
                  <rect x="400" y={cy - 6} width="26" height="12" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
                  <line x1="406" y1={cy - 6} x2="406" y2={cy + 6} stroke="#64748b" strokeWidth="1.5" />
                  <line x1="413" y1={cy - 6} x2="413" y2={cy + 6} stroke="#64748b" strokeWidth="1.5" />
                  <line x1="420" y1={cy - 6} x2="420" y2={cy + 6} stroke="#64748b" strokeWidth="1.5" />
                </g>
              ))}

              {/* ===============================================================
                  ZONE C: LOADING DOCKS & STAGING LANES (x=426..590, y=46..514)
                 =============================================================== */}
              <g
                onClick={() => onSelectStation("loading")}
                className="cursor-pointer"
              >
                <rect
                  x="426"
                  y="46"
                  width="164"
                  height="468"
                  rx="8"
                  fill="#f8fafc"
                  stroke={
                    selectedStation === "loading"
                      ? "#d7000f"
                      : scenarioMode === "mitigated"
                      ? "#16a34a"
                      : "#dc2626"
                  }
                  strokeWidth="2.5"
                />
                <rect
                  x="426"
                  y="46"
                  width="164"
                  height="32"
                  rx="6"
                  fill={scenarioMode === "mitigated" ? "#334155" : "#991b1b"}
                />
                <circle
                  cx="442"
                  cy="62"
                  r="4.5"
                  fill={scenarioMode === "mitigated" ? "#22c55e" : "#fca5a5"}
                />
                <text x="454" y="66" fill="#ffffff" fontSize="11" fontWeight="bold">3. CẦU BỐC (DOCKS)</text>

                {/* DOCK 1 (DK-01 - NORMAL OPERATION) */}
                <g transform="translate(438, 92)">
                  <rect x="0" y="0" width="140" height="112" rx="6" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
                  <text x="10" y="20" fill="#0f172a" fontSize="10.5" fontWeight="bold">CỔNG DOCK 1 (DK-01)</text>
                  <text x="10" y="35" fill="#15803d" fontSize="9" fontWeight="bold">● Hoạt động · Loader L1</text>

                  {/* 5S Staging Lane Grid inside DK-01 */}
                  <rect x="10" y="45" width="120" height="54" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                  {[0, 1, 2, 3].map((b) => (
                    <rect key={b} x={18 + b * 22} y="56" width="16" height="32" rx="2" fill="#334155" stroke="#ffffff" strokeWidth="1" />
                  ))}
                  {/* Dock Door Threshold */}
                  <rect x="136" y="40" width="4" height="62" fill="#16a34a" />
                </g>

                {/* DOCK 2 (DK-02 - MAIN BOTTLENECK HOTSPOT) */}
                <g transform="translate(438, 220)">
                  <rect
                    x="0"
                    y="0"
                    width="140"
                    height="128"
                    rx="6"
                    fill={scenarioMode === "mitigated" ? "#ffffff" : "#fef2f2"}
                    stroke={scenarioMode === "mitigated" ? "#16a34a" : "#dc2626"}
                    strokeWidth="2"
                  />
                  <text x="10" y="20" fill="#0f172a" fontSize="10.5" fontWeight="bold">CỔNG DOCK 2 (DK-02)</text>
                  <text
                    x="10"
                    y="36"
                    fill={scenarioMode === "mitigated" ? "#15803d" : "#dc2626"}
                    fontSize="9.5"
                    fontWeight="bold"
                  >
                    {scenarioMode === "mitigated"
                      ? `● Đã giải tỏa (${effectiveQueue} đơn)`
                      : `▲ NGHẼN: ${effectiveQueue} đơn chờ!`}
                  </text>

                  {/* Visual Kanban Pallet Queue Box Grid */}
                  <rect x="10" y="46" width="120" height="68" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                  {Array.from({ length: Math.min(12, effectiveQueue) }).map((_, i) => {
                    const col = i % 6;
                    const row = Math.floor(i / 6);
                    return (
                      <rect
                        key={i}
                        x={16 + col * 18}
                        y={53 + row * 28}
                        width="14"
                        height="22"
                        rx="2"
                        fill={
                          scenarioMode === "mitigated"
                            ? "#334155"
                            : i >= 6
                            ? "#dc2626"
                            : "#d97706"
                        }
                      />
                    );
                  })}
                  <rect x="136" y="42" width="4" height="74" fill={scenarioMode === "mitigated" ? "#16a34a" : "#dc2626"} />
                </g>

                {/* DOCK 3 (DK-03 - STANDBY / CROSS-TRAINED EXPANSION) */}
                <g transform="translate(438, 364)">
                  <rect
                    x="0"
                    y="0"
                    width="140"
                    height="112"
                    rx="6"
                    fill={scenarioMode === "mitigated" ? "#f0fdf4" : "#e2e8f0"}
                    stroke={scenarioMode === "mitigated" ? "#16a34a" : "#94a3b8"}
                    strokeWidth="1.5"
                  />
                  <text x="10" y="20" fill="#0f172a" fontSize="10.5" fontWeight="bold">CỔNG DOCK 3 (DK-03)</text>
                  <text
                    x="10"
                    y="36"
                    fill={scenarioMode === "mitigated" ? "#15803d" : "#475569"}
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {scenarioMode === "mitigated"
                      ? "● MỞ CỔNG (NV-04 Bốc hàng)"
                      : "○ Đóng (Thiếu nhân sự bốc)"}
                  </text>

                  <rect x="10" y="46" width="120" height="52" rx="4" fill="#f8fafc" stroke="#cbd5e1" />
                  {scenarioMode === "mitigated" ? (
                    [0, 1, 2].map((b) => (
                      <rect key={b} x={18 + b * 24} y="56" width="16" height="32" rx="2" fill="#334155" />
                    ))
                  ) : (
                    <text x="70" y="76" fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="middle">
                      Chưa kích hoạt
                    </text>
                  )}
                </g>
              </g>

              {/* ===============================================================
                   DEDICATED MILK-RUN ROADWAY CORRIDOR (ASPHALT AGV AISLE x=602..688)
                 =============================================================== */}
              <g>
                {/* Dark Gray Asphalt AGV Roadway Surface contrasting against Light Floor */}
                <rect
                  x="602"
                  y="46"
                  width="86"
                  height="468"
                  rx="12"
                  fill="#334155"
                  stroke="#eab308"
                  strokeWidth="2.5"
                />
                {/* Center Traffic Island */}
                <rect
                  x="631"
                  y="165"
                  width="28"
                  height="305"
                  rx="6"
                  fill="#475569"
                  stroke="#facc15"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />

                {/* 5S Yellow Guide Path Loop */}
                <path
                  d={milkRunLoopPath}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />

                {/* Roadway Header */}
                <text x="645" y="70" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  LÀN MILK-RUN
                </text>
                <text x="645" y="84" fill="#fde047" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  Chu kỳ: {cycleTimeMin}p
                </text>

                {/* 4 Line Drop-off Station Markers along East Lane */}
                {lineConfigs.map((ln, idx) => (
                  <g key={idx} transform={`translate(686, ${ln.y + 30})`}>
                    <rect x="0" y="-12" width="22" height="24" rx="3" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
                    <text x="11" y="3" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                      S{idx + 1}
                    </text>
                  </g>
                ))}

                {/* Animated Multi-Car Tugger Train 1 (TG-01: DENSO Red Tractor + 2 Steel Trailers) */}
                {isAnimated ? (
                  <g>
                    <animateMotion dur={animDuration1} repeatCount="indefinite" path={milkRunLoopPath} />
                    <rect x="-15" y="-22" width="30" height="20" rx="4" fill="#d7000f" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="0" y="-9" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">TG1</text>
                    <rect x="-12" y="2" width="24" height="16" rx="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
                    <rect x="-12" y="21" width="24" height="16" rx="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
                  </g>
                ) : (
                  <g transform="translate(675, 210)">
                    <rect x="-15" y="-22" width="30" height="20" rx="4" fill="#d7000f" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="0" y="-9" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">TG1</text>
                    <rect x="-12" y="2" width="24" height="16" rx="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
                  </g>
                )}

                {/* Animated Multi-Car Tugger Train 2 (TG-02: Industrial Blue Tractor + 2 Steel Trailers) */}
                {scenarioMode !== "disruption" ? (
                  isAnimated ? (
                    <g>
                      <animateMotion dur={animDuration2} begin="-7s" repeatCount="indefinite" path={milkRunLoopPath} />
                      <rect x="-15" y="-22" width="30" height="20" rx="4" fill="#1d4ed8" stroke="#ffffff" strokeWidth="1.5" />
                      <text x="0" y="-9" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">TG2</text>
                      <rect x="-12" y="2" width="24" height="16" rx="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
                      <rect x="-12" y="21" width="24" height="16" rx="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
                    </g>
                  ) : (
                    <g transform="translate(615, 360)">
                      <rect x="-15" y="-22" width="30" height="20" rx="4" fill="#1d4ed8" stroke="#ffffff" strokeWidth="1.5" />
                      <text x="0" y="-9" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">TG2</text>
                    </g>
                  )
                ) : (
                  /* Broken TG2 with hazard alert during Disruption Mode */
                  <g transform="translate(675, 290)">
                    <rect x="-18" y="-14" width="36" height="28" rx="5" fill="#dc2626" stroke="#ffffff" strokeWidth="2" />
                    <text x="0" y="4" fill="#ffffff" fontSize="8.5" fontWeight="bold" textAnchor="middle">TG2!</text>
                  </g>
                )}

                {/* Spare Tugger Train TG-04 (Active in Plan B Mitigated Mode) */}
                {scenarioMode === "mitigated" && isAnimated && (
                  <g>
                    <animateMotion dur="10s" begin="-3.5s" repeatCount="indefinite" path={milkRunLoopPath} />
                    <rect x="-15" y="-22" width="30" height="20" rx="4" fill="#15803d" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="0" y="-9" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">TG4★</text>
                    <rect x="-12" y="2" width="24" height="16" rx="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
                  </g>
                )}

                {/* Autonomous Mobile Robot AMR-01 (Express Bin Delivery GTP -> Lines) */}
                {isAnimated ? (
                  <g>
                    <animateMotion dur="9s" begin="-2.2s" repeatCount="indefinite" path={milkRunLoopPath} />
                    <circle cx="0" cy="0" r="14" fill="#06b6d4" fillOpacity="0.22" stroke="#06b6d4" strokeWidth="1" strokeDasharray="2 2" />
                    <rect x="-13" y="-9" width="26" height="18" rx="5" fill="#0891b2" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="0" y="3" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">AMR1</text>
                  </g>
                ) : (
                  <g transform="translate(645, 165)">
                    <rect x="-13" y="-9" width="26" height="18" rx="5" fill="#0891b2" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="0" y="3" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">AMR1</text>
                  </g>
                )}

                {/* Heavy Pallet Forklift FK-02 at Dock / Line 2 Corridor */}
                <g transform="translate(604, 468)">
                  <rect x="0" y="0" width="48" height="20" rx="3" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.2" />
                  <text x="24" y="13" fill="#0f172a" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">FK-02</text>
                  <line x1="48" y1="5" x2="58" y2="5" stroke="#fde047" strokeWidth="2" />
                  <line x1="48" y1="15" x2="58" y2="15" stroke="#fde047" strokeWidth="2" />
                </g>
              </g>

              {/* ===============================================================
                  ZONE D: 4 PRODUCTION CONVEYOR ASSEMBLY LINES (x=712..1180)
                 =============================================================== */}
              <g
                onClick={() => onSelectStation("lines")}
                className="cursor-pointer"
              >
                {lineConfigs.map((ln) => {
                  const isRed = ln.andon === "STOP_RISK";
                  const isAmber = ln.andon === "WARNING";
                  const borderCol = isRed ? "#dc2626" : isAmber ? "#d97706" : "#64748b";
                  const badgeBg = isRed ? "#dc2626" : isAmber ? "#d97706" : "#15803d";

                  return (
                    <g key={ln.id} transform={`translate(712, ${ln.y})`}>
                      {/* Clean White/Light Gray Assembly Line Cell Enclosure */}
                      <rect
                        x="0"
                        y="0"
                        width="468"
                        height="98"
                        rx="8"
                        fill="#ffffff"
                        stroke={borderCol}
                        strokeWidth="2"
                      />
                      {/* Top Header Strip of Assembly Line */}
                      <rect x="0" y="0" width="468" height="32" rx="6" fill="#f1f5f9" />

                      {/* Andon Indicator Light */}
                      <circle
                        cx="18"
                        cy="16"
                        r="5.5"
                        fill={isRed ? "#dc2626" : isAmber ? "#d97706" : "#16a34a"}
                      />
                      <text x="30" y="20" fill="#0f172a" fontSize="11" fontWeight="bold">
                        {ln.name}
                      </text>
                      <text x="230" y="20" fill="#475569" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                        ({ln.product})
                      </text>

                      {/* Andon Status Badge */}
                      <rect x="368" y="6" width="88" height="20" rx="4" fill={badgeBg} />
                      <text x="412" y="19.5" fill="#ffffff" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                        {ln.badge}
                      </text>

                      {/* Left Side: Line-Side Kanban Buffer Rack (Kệ phôi đầu chuyền) */}
                      <rect x="12" y="38" width="82" height="52" rx="4" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
                      <text x="53" y="51" fill="#475569" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                        ĐỆM ĐẦU CHUYỀN
                      </text>
                      <text
                        x="53"
                        y="68"
                        fill={ln.bufferMin < 10 ? "#dc2626" : "#0f172a"}
                        fontSize="11.5"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {ln.bufferMin} phút
                      </text>
                      <text x="53" y="82" fill="#64748b" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                        Takt: {ln.takt}/cụm
                      </text>

                      {/* Center & Right: Industrial Steel Conveyor Belt & 5 Workstations (WS1..WS5) */}
                      <rect x="106" y="50" width="346" height="26" rx="4" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
                      {[0, 1, 2, 3, 4].map((ws) => (
                        <g key={ws} transform={`translate(${122 + ws * 66}, 38)`}>
                          {/* Top & Bottom Operator / Robot Stations along Belt */}
                          <rect x="8" y="0" width="28" height="9" rx="2" fill="#64748b" />
                          <rect x="8" y="41" width="28" height="9" rx="2" fill="#64748b" />
                          {/* Workpiece / Assembly Unit on Belt */}
                          <rect
                            x="11"
                            y="16"
                            width="22"
                            height="18"
                            rx="2.5"
                            fill={isRed ? "#dc2626" : "#1e293b"}
                            stroke="#ffffff"
                            strokeWidth="1"
                          />
                          <text x="22" y="28" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                            WS{ws + 1}
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })}
              </g>

              {/* Bottom JIS/ISO Engineering Drawing Title Strip */}
              <g transform="translate(20, 522)">
                <rect x="0" y="0" width="1160" height="28" rx="5" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
                <text x="14" y="18" fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                  <tspan fill="#d7000f">TIÊU CHUẨN MẶT BẰNG 5S DENSO:</tspan> Kho Supermarket (A1–A5) → Soạn Hàng Kitting (PK1–4) → Cầu Bốc (DK1–3) → Đường Xe Kéo AGV → 4 Chuyền Lắp Ráp (L1–L4)
                </text>
                <text x="1145" y="18" fill="#334155" fontSize="9.5" fontWeight="bold" fontFamily="monospace" textAnchor="end">
                  SCALE: 1:250 · JIS CAD REV 4.2
                </text>
              </g>
            </svg>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 2: 2D CONCEPTUAL ARCHITECTURE & CLOSED-LOOP IDEA MODEL
         ===================================================================== */}
      {viewMode === "concept2d" && (
        <div className="p-5 bg-[#0b111e] space-y-5">
          <div className="p-4 rounded-xl bg-[#111a2e] border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-600">
                CONCEPTUAL ARCHITECTURE · MÔ HÌNH Ý TƯỞNG CỐT LÕI BÀI TOÁN D2
              </span>
              <h3 className="text-sm font-black text-white mt-1">
                MÔ HÌNH 2D KIẾN TRÚC BẢN SAO SỐ KHÉP KÍN: TẦNG AI ĐIỀU ĐỘ ↔ TẦNG NHÀ MÁY VẬT LÝ (CYBER-PHYSICAL LOOP)
              </h3>
            </div>
            <span className="text-xs text-slate-300 font-mono font-bold">
              Predict → Detect → Simulate → Recommend → Dispatch
            </span>
          </div>

          {/* 2D Cyber-Physical Concept Blueprint Diagram (Clean Light Technical Drawing SVG) */}
          <div className="w-full bg-[#eef2f6] rounded-xl border-2 border-[#64748b] overflow-hidden shadow-lg">
            <svg viewBox="0 0 1160 320" className="w-full h-auto block" preserveAspectRatio="xMidYMid meet">
              <defs>
                <pattern id="conceptLightGrid" width="28" height="28" patternUnits="userSpaceOnUse">
                  <rect width="28" height="28" fill="#eef2f6" />
                  <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#dbe2ea" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="1160" height="320" fill="url(#conceptLightGrid)" />

              {/* TOP PLANE: DIGITAL TWIN & AI DECISION INTELLIGENCE LAYER */}
              <rect x="20" y="16" width="1120" height="122" rx="8" fill="#ffffff" stroke="#475569" strokeWidth="2" />
              <rect x="20" y="16" width="1120" height="26" rx="6" fill="#1e293b" />
              <text x="36" y="33" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">
                TẦNG 1 (CYBER LAYER): BỘ NÃO BẢN SAO SỐ & TRÍ TUỆ QUYẾT ĐỊNH AI (DIGITAL TWIN CONTROL PLANE)
              </text>

              {[
                { x: 36, title: "1. PREDICT", sub: "LightGBM + CQR", kpi: "Dự báo q10/q50/q90", col: "#1e293b" },
                { x: 256, title: "2. DETECT", sub: "Causal DAG + Do(X)", kpi: "Tìm gốc nghẽn Dock", col: "#d7000f" },
                { x: 476, title: "3. SIMULATE", sub: "SimPy 4 DES Engine", kpi: "Mô phỏng 15p/bước", col: "#1e293b" },
                { x: 696, title: "4. RECOMMEND", sub: "Pareto & CVaR90", kpi: "Tối ưu Chi phí & SLA", col: "#15803d" },
                { x: 916, title: "5. DISPATCH", sub: "SCADA + Audit Log", kpi: "Phát lệnh Plan B", col: "#1e293b" },
              ].map((b, idx) => (
                <g key={idx} transform={`translate(${b.x}, 50)`}>
                  <rect x="0" y="0" width="196" height="74" rx="6" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
                  <rect x="0" y="0" width="196" height="22" rx="5" fill={b.col} />
                  <text x="12" y="15" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">{b.title}</text>
                  <text x="12" y="41" fill="#0f172a" fontSize="10.5" fontWeight="bold">{b.sub}</text>
                  <text x="12" y="59" fill="#475569" fontSize="9.5" fontWeight="bold">{b.kpi}</text>
                  {idx < 4 && (
                    <g>
                      <line x1="196" y1="37" x2="220" y2="37" stroke="#334155" strokeWidth="2" />
                      <polygon points="214,33 220,37 214,41" fill="#334155" />
                    </g>
                  )}
                </g>
              ))}

              {/* MIDDLE FEEDBACK BRIDGES: UPLINK (SENSORS) & DOWNLINK (ACTUATION) */}
              <g>
                {/* Left Uplink: Physical Sensors -> AI Brain */}
                <path d="M 134 190 L 134 140" stroke="#1e293b" strokeWidth="2.5" strokeDasharray="4 3" />
                <polygon points="129,145 134,138 139,145" fill="#1e293b" />
                <rect x="148" y="150" width="340" height="24" rx="4" fill="#ffffff" stroke="#475569" strokeWidth="1.5" />
                <text x="318" y="166" fill="#0f172a" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  ▲ UPLINK TELEMETRY: Quét RFID + PLC Dock + GPS Xe kéo
                </text>

                {/* Right Downlink: AI Dispatch -> Physical Shopfloor */}
                <path d="M 1014 138 L 1014 188" stroke="#15803d" strokeWidth="2.5" strokeDasharray="4 3" />
                <polygon points="1009,183 1014,190 1019,183" fill="#15803d" />
                <rect x="640" y="150" width="360" height="24" rx="4" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" />
                <text x="820" y="166" fill="#15803d" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  ▼ DOWNLINK ACTION: Mở Cổng Dock 3 + Đổi luật EDD + Xe TG-04
                </text>
              </g>

              {/* BOTTOM PLANE: PHYSICAL FACTORY SHOPFLOOR LAYER */}
              <rect x="20" y="188" width="1120" height="118" rx="8" fill="#ffffff" stroke="#64748b" strokeWidth="2" />
              <rect x="20" y="188" width="1120" height="26" rx="6" fill="#334155" />
              <text x="36" y="205" fill="#fde047" fontSize="10" fontWeight="bold" fontFamily="monospace">
                TẦNG 2 (PHYSICAL LAYER): HIỆN TRƯỜNG NHÀ MÁY VẬT LÝ DENSO (5 TRẠM IN-PLANT LOGISTICS)
              </text>

              {[
                { x: 36, name: "TRẠM 1: SUPERMARKET", detail: "5 Dãy kệ A1–A5 & Cổng RFID", badge: "Tồn kho 100%" },
                { x: 256, name: "TRẠM 2: SOẠN HÀNG", detail: "4 Bàn Kitting chữ U (PK1–4)", badge: scenarioMode === "mitigated" ? "Luật EDD (3 người)" : "Luật FIFO (4 người)" },
                { x: 476, name: "TRẠM 3: CẦU BỐC DOCK", detail: "3 Cổng bốc dỡ DK1 – DK3", badge: scenarioMode === "mitigated" ? "Mở DK3 (Thông suốt)" : "Nghẽn DK2 (8 đơn)" },
                { x: 696, name: "TRẠM 4: TÀU KÉO AGV", detail: "Tuyến vòng lặp Milk-Run", badge: scenarioMode === "mitigated" ? "TG1 + TG2 + TG4" : "TG3 Bảo trì 10–12h" },
                { x: 916, name: "TRẠM 5: 4 CHUYỀN LẮP", detail: "Băng chuyền L1–L4 (WS1–5)", badge: scenarioMode === "mitigated" ? "SLA 98.8% (An toàn)" : "L1/L2 Tăng tải +30%" },
              ].map((st, idx) => (
                <g key={idx} transform={`translate(${st.x}, 222)`}>
                  <rect x="0" y="0" width="196" height="70" rx="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
                  <text x="12" y="20" fill="#0f172a" fontSize="10" fontWeight="bold">{st.name}</text>
                  <text x="12" y="38" fill="#475569" fontSize="9.5" fontWeight="bold">{st.detail}</text>
                  <text
                    x="12"
                    y="56"
                    fill={idx === 2 && scenarioMode !== "mitigated" ? "#dc2626" : "#15803d"}
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {st.badge}
                  </text>
                  {idx < 4 && (
                    <g>
                      <line x1="196" y1="35" x2="220" y2="35" stroke="#64748b" strokeWidth="2" />
                      <polygon points="214,31 220,35 214,39" fill="#64748b" />
                    </g>
                  )}
                </g>
              ))}
            </svg>
          </div>

          {/* 2D Visual Concept Diagram (5-Stage Pipeline + Physical Twin Feedback Loop) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5 relative">
            {[
              {
                step: "TẦNG 1 · PREDICT",
                title: "Dự Báo Tải & Năng Lực",
                tech: "LightGBM Quantile + CQR",
                desc: "Dự báo nhu cầu cấp phôi (q10, q50, q90) từng 15 phút và tính năng lực hiệu dụng khi TG-03 bảo dưỡng.",
                metric: "WAPE: 11.4% · Phủ: 81.2%",
                color: "cyan",
                tab: "predict",
              },
              {
                step: "TẦNG 2 · DETECT",
                title: "Phát Hiện & Nhân Quả",
                tech: "Causal DAG & Do-Calculus",
                desc: "Phát hiện nghịch lý: Xe kéo bận 94% nhưng Cầu bốc hàng (Loading Dock) mới là nút thắt cổ chai thực sự.",
                metric: "Dock ROI: 4.8x (#1)",
                color: "rose",
                tab: "detect",
              },
              {
                step: "TẦNG 3 · SIMULATE",
                title: "Mô Phỏng Bản Sao Số",
                tech: "SimPy 4 Discrete-Event",
                desc: "Chạy mô phỏng sự kiện rời rạc kiểm chứng hàng đợi, chu kỳ xe kéo và truy vết từng đơn hàng Kanban.",
                metric: "Conservation: 100% PASS",
                color: "amber",
                tab: "simulate",
              },
              {
                step: "TẦNG 4 · RECOMMEND",
                title: "Tối Ưu Hóa Đa Mục Tiêu",
                tech: "Pareto & CVaR90 Optimizer",
                desc: "Cân bằng 4 mục tiêu: Chi phí, SLA, Rủi ro đuôi CVaR và CO₂. Đề xuất Plan B (EDD + NV-04 + TG-04).",
                metric: "SLA: 98.8% · +186M đ/ca",
                color: "emerald",
                tab: "recommend",
              },
              {
                step: "TẦNG 5 · DISPATCH",
                title: "Phát Lệnh & Kiểm Toán",
                tech: "SCADA Directive & SQLite",
                desc: "Phê duyệt quyết định của Trưởng ca, xuất Lệnh Điều Phối Điện Tử và ghi sổ cái kiểm toán bất biến.",
                metric: "Chuẩn IATF 16949",
                color: "indigo",
                tab: "audit",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-[#0d1628] border border-[#223556] flex flex-col justify-between relative group hover:border-[#ff6b00] transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-[#16243d] text-[#ff8f3d]">
                      {item.step}
                    </span>
                    <span className="text-xs font-black text-slate-500 font-mono">0{i + 1}</span>
                  </div>
                  <div className="text-sm font-extrabold text-white mb-1">{item.title}</div>
                  <div className="text-[11px] font-mono text-cyan-400 font-bold mb-2">{item.tech}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-[#1b2b46] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-emerald-400 font-bold">{item.metric}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition" />
                </div>
              </div>
            ))}
          </div>

          {/* Closed-Loop Physical Feedback Diagram */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#0e192d] via-[#13223d] to-[#0e192d] border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white uppercase">
                  Vòng phản hồi Thời gian thực (Closed-Loop Physical Feedback)
                </div>
                <div className="text-slate-300 mt-0.5">
                  Dữ liệu thực tế từ Cổng RFID Supermarket, PLC Cầu bốc hàng và GPS Xe kéo liên tục cập nhật lại trạng thái đầu vào cho mô hình dự báo mỗi 15 phút.
                </div>
              </div>
            </div>
            <button
              onClick={() => setViewMode("floorplan2d")}
              className="px-4 py-2 rounded-lg bg-[#ff6b00] hover:bg-[#e66000] text-white font-bold shrink-0 cursor-pointer transition"
            >
              Quay lại Mặt bằng Nhà máy 2D
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 3: QUICK ZONE CARDS
         ===================================================================== */}
      {viewMode === "zones" && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { id: "supermarket", icon: Warehouse, name: "Supermarket SMKT-A", status: "Bình thường", color: "emerald", detail: "5 Dãy kệ A1-A5 · Tồn 100%" },
            { id: "picking", icon: PackageOpen, name: "Picking PK1-4", status: scenarioMode === "mitigated" ? "EDD 74%" : "Bận 59%", color: "emerald", detail: scenarioMode === "mitigated" ? "3 Pickers (NV-04 sang Dock)" : "4 Bàn Kitting chữ U" },
            { id: "loading", icon: Anchor, name: "Loading Docks", status: scenarioMode === "mitigated" ? "Thông suốt" : "Nghẽn ROI 4.8x", color: scenarioMode === "mitigated" ? "emerald" : "rose", detail: `3 Cửa · ${effectiveQueue} đơn chờ` },
            { id: "transport", icon: Truck, name: "Xe Kéo Milk-run", status: `Chu kỳ ${cycleTimeMin}m`, color: scenarioMode === "mitigated" ? "emerald" : "amber", detail: scenarioMode === "mitigated" ? "TG1, TG2, TG4 chạy" : "TG3 bảo trì 10:00-12:00" },
            { id: "lines", icon: Factory, name: "4 Chuyền L1-L4", status: scenarioMode === "mitigated" ? "SLA 98.8%" : "L1/L2 +30%", color: scenarioMode === "mitigated" ? "emerald" : "amber", detail: "5 Trạm WS1-5 / chuyền" },
          ].map((z) => {
            const Icon = z.icon;
            const isSel = selectedStation === z.id;
            return (
              <div
                key={z.id}
                onClick={() => onSelectStation(z.id)}
                className={`p-3.5 rounded-xl border transition cursor-pointer ${
                  isSel
                    ? "bg-[#18253f] border-[#ff6b00] ring-1 ring-[#ff6b00]/40 shadow-lg"
                    : "bg-[#0c1424] border-[#1d2c47] hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-[#141f36] text-[#ff8f3d]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${
                    z.color === "rose" ? "bg-rose-950 text-rose-300 border border-rose-800" :
                    z.color === "amber" ? "bg-amber-950 text-amber-300 border border-amber-800" :
                    "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  }`}>
                    {z.status}
                  </span>
                </div>
                <div className="text-xs font-bold text-white truncate">{z.name}</div>
                <div className="text-[11px] text-slate-400 mt-1">{z.detail}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
