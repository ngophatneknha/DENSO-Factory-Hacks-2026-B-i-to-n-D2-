import React, { useState } from "react";
import { 
  Warehouse, 
  PackageOpen, 
  Anchor, 
  Truck, 
  Factory, 
  ChevronRight, 
  Gauge, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Zap,
  Radio,
  Eye,
  Sliders,
  Maximize2
} from "lucide-react";

interface PlantFloorplanCADProps {
  selectedStation: string;
  onSelectStation: (stationId: string) => void;
  dockQueueCount: number;
  activeTuggers: string[];
  lang: "vi" | "en";
}

export const PlantFloorplanCAD: React.FC<PlantFloorplanCADProps> = ({
  selectedStation,
  onSelectStation,
  dockQueueCount,
  activeTuggers,
  lang,
}) => {
  const [viewMode, setViewMode] = useState<"blueprint" | "zones">("blueprint");

  return (
    <div className="rounded-2xl border border-[#233554] bg-[#080d18] overflow-hidden shadow-2xl relative">
      {/* CAD Schematic Header */}
      <div className="px-5 py-3.5 bg-[#0e1626] border-b border-[#1c2a44] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#ff6b00]/15 border border-[#ff6b00]/40 text-[#ff8f3d] font-mono text-[10px] font-extrabold tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>DENSO PLANT 1 · DIGITAL TWIN FLOORPLAN</span>
          </div>
          <span className="text-xs font-black text-white uppercase tracking-wider hidden sm:inline">
            SƠ ĐỒ MẶT BẰNG NHÀ XƯỞNG & TUYẾN XE KÉO NỘI BỘ (CAD 2D)
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          {/* Status Legend */}
          <div className="hidden md:flex items-center space-x-3 bg-[#060a12] px-3 py-1 rounded-lg border border-[#1b273d] text-[11px] text-slate-300 font-medium">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Bình thường</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Áp lực</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>Nghẽn (Dock D2)</span>
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#070c16] p-1 rounded-lg border border-[#1d2b45]">
            <button
              onClick={() => setViewMode("blueprint")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                viewMode === "blueprint"
                  ? "bg-[#ff6b00] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Sơ đồ CAD</span>
            </button>
            <button
              onClick={() => setViewMode("zones")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                viewMode === "zones"
                  ? "bg-[#ff6b00] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Dạng thẻ trạm</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive CAD Blueprint Canvas */}
      {viewMode === "blueprint" ? (
        <div className="p-4 sm:p-6 relative select-none">
          {/* SVG Industrial Floorplan Container */}
          <div className="w-full aspect-[21/9] min-h-[360px] max-h-[480px] bg-[#060a14] rounded-xl border border-[#1a2842] relative overflow-hidden shadow-inner">
            {/* Architectural Grid Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              <defs>
                <pattern id="cadGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#253a60" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cadGrid)" />
            </svg>

            {/* SVG Interactive Elements */}
            <svg
              viewBox="0 0 1000 420"
              className="w-full h-full relative z-10"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Glowing Filter for Tugger Track */}
                <filter id="glowTrack" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff6b00" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#00f2fe" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#ff6b00" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* 1. ZONE: Supermarket SMKT-A */}
              <g
                onClick={() => onSelectStation("supermarket")}
                className="cursor-pointer group transition-all"
              >
                <rect
                  x="30"
                  y="40"
                  width="180"
                  height="340"
                  rx="12"
                  fill="#0c1424"
                  stroke={selectedStation === "supermarket" ? "#ff6b00" : "#1f304d"}
                  strokeWidth={selectedStation === "supermarket" ? "2.5" : "1.5"}
                  className="group-hover:stroke-cyan-400 transition"
                />
                {/* Internal Rack Lines */}
                <line x1="50" y1="100" x2="190" y2="100" stroke="#1d2e49" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="50" y1="160" x2="190" y2="160" stroke="#1d2e49" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="50" y1="220" x2="190" y2="220" stroke="#1d2e49" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="50" y1="280" x2="190" y2="280" stroke="#1d2e49" strokeWidth="2" strokeDasharray="4 4" />

                <circle cx="48" cy="71" r="4.5" fill="#10b981" />
                <text x="60" y="75" fill="#ffffff" fontSize="12" fontWeight="bold">KHO SUPERMARKET</text>
                <text x="60" y="92" fill="#64748b" fontSize="10" fontFamily="monospace">AREA: SMKT-A</text>

                {/* Storage Level Metric */}
                <rect x="50" y="325" width="140" height="6" rx="3" fill="#152033" />
                <rect x="50" y="325" width="140" height="6" rx="3" fill="#10b981" />
                <text x="50" y="348" fill="#94a3b8" fontSize="9">Tồn đệm: 100% (250 Bins)</text>
              </g>

              {/* Arrow Connector: Supermarket -> Picking */}
              <path d="M 210 200 L 250 200" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />

              {/* 2. ZONE: Picking Bays PK1-PK4 */}
              <g
                onClick={() => onSelectStation("picking")}
                className="cursor-pointer group transition-all"
              >
                <rect
                  x="245"
                  y="70"
                  width="170"
                  height="280"
                  rx="12"
                  fill="#0c1424"
                  stroke={selectedStation === "picking" ? "#ff6b00" : "#1f304d"}
                  strokeWidth={selectedStation === "picking" ? "2.5" : "1.5"}
                  className="group-hover:stroke-cyan-400 transition"
                />
                <circle cx="260" cy="101" r="4.5" fill="#10b981" />
                <text x="272" y="105" fill="#ffffff" fontSize="12" fontWeight="bold">SOẠN HÀNG (PICKING)</text>
                <text x="272" y="122" fill="#64748b" fontSize="10" fontFamily="monospace">4 BAYS: PK1 - PK4</text>

                {/* 4 Picking Bay Sub-cells */}
                {[0, 1, 2, 3].map((b) => (
                  <g key={b}>
                    <rect
                      x="265"
                      y={140 + b * 42}
                      width="130"
                      height="32"
                      rx="6"
                      fill="#121b2d"
                      stroke="#223352"
                    />
                    <text x="278" y={160 + b * 42} fill="#94a3b8" fontSize="10" fontFamily="monospace">
                      PK-0{b + 1}
                    </text>
                    <text x="350" y={160 + b * 42} fill="#38bdf8" fontSize="10" fontWeight="bold">
                      {b === 1 ? "NV-04 ★" : "Active"}
                    </text>
                  </g>
                ))}

                <text x="265" y="332" fill="#94a3b8" fontSize="9">Đang xử lý: 4 đơn · Chờ: 2</text>
              </g>

              {/* Arrow Connector: Picking -> Docks */}
              <path d="M 415 200 L 450 200" stroke="#ff6b00" strokeWidth="2" strokeDasharray="3 3" />

              {/* 3. ZONE: Loading Docks DK1-DK3 (HOTSPOT) */}
              <g
                onClick={() => onSelectStation("loading")}
                className="cursor-pointer group transition-all"
              >
                <rect
                  x="450"
                  y="50"
                  width="180"
                  height="320"
                  rx="12"
                  fill="#12192b"
                  stroke={selectedStation === "loading" ? "#ff6b00" : "#d97706"}
                  strokeWidth={selectedStation === "loading" ? "3" : "2"}
                  className="group-hover:stroke-[#ff6b00] transition"
                />
                <circle cx="468" cy="81" r="4.5" fill="#f59e0b" className="animate-ping" />
                <text x="480" y="85" fill="#ffffff" fontSize="12" fontWeight="bold">CẦU BỐC HÀNG (DOCKS)</text>
                <text x="480" y="102" fill="#ff8f3d" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  HOTSPOT: ROI 4.8x ★
                </text>

                {/* Dock 1, 2, 3 Roll-up Bays */}
                {/* Dock 1 */}
                <rect x="470" y="125" width="140" height="52" rx="8" fill="#172238" stroke="#2a3f63" />
                <text x="485" y="148" fill="#e2e8f0" fontSize="11" fontWeight="bold">DOCK 1 (DK-01)</text>
                <text x="485" y="165" fill="#10b981" fontSize="10">🟢 Đang bốc TG-02</text>

                {/* Dock 2 (Overloaded) */}
                <rect x="470" y="190" width="140" height="52" rx="8" fill="#24141d" stroke="#f43f5e" strokeWidth="1.5" />
                <text x="485" y="213" fill="#ffffff" fontSize="11" fontWeight="bold">DOCK 2 (DK-02)</text>
                <text x="485" y="230" fill="#f43f5e" fontSize="10" fontWeight="bold">
                  🔴 Hàng đợi: {dockQueueCount} đơn chờ!
                </text>

                {/* Dock 3 */}
                <rect x="470" y="255" width="140" height="52" rx="8" fill="#131b2a" stroke="#253550" />
                <text x="485" y="278" fill="#94a3b8" fontSize="11">DOCK 3 (DK-03)</text>
                <text x="485" y="295" fill="#64748b" fontSize="10">⚪ Thiếu người bốc</text>

                <text x="470" y="348" fill="#ff8f3d" fontSize="10" fontWeight="bold">
                  ⚡ Cần thêm 1 Loader từ PK!
                </text>
              </g>

              {/* 4. MILK-RUN RAILWAY TRACK LOOP (Physical Transport Guide-path) */}
              <g>
                {/* Main Loop Path */}
                <path
                  d="M 630 150 L 710 150 C 740 150 740 70 770 70 L 920 70 C 950 70 950 140 920 140 L 780 140 C 750 140 750 210 780 210 L 920 210 C 950 210 950 280 920 280 L 780 280 C 750 280 750 350 780 350 L 920 350 C 960 350 960 380 920 380 L 670 380 C 640 380 630 230 630 150"
                  fill="none"
                  stroke="url(#trackGrad)"
                  strokeWidth="3.5"
                  strokeDasharray="8 6"
                  filter="url(#glowTrack)"
                  className="animate-pulse"
                />

                {/* Moving Tugger Vehicle TG-01 Icon along Track */}
                <g transform="translate(820, 56)">
                  <rect x="-14" y="-12" width="28" height="24" rx="5" fill="#ff6b00" stroke="#ffffff" strokeWidth="1.5" />
                  <text x="0" y="4" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">TG1</text>
                  <circle cx="18" cy="0" r="4" fill="#38bdf8" />
                  <line x1="14" y1="0" x2="18" y2="0" stroke="#38bdf8" strokeWidth="2" />
                </g>

                {/* Moving Tugger Vehicle TG-02 Icon along Track */}
                <g transform="translate(850, 196)">
                  <rect x="-14" y="-12" width="28" height="24" rx="5" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                  <text x="0" y="4" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">TG2</text>
                  <circle cx="18" cy="0" r="4" fill="#38bdf8" />
                  <line x1="14" y1="0" x2="18" y2="0" stroke="#38bdf8" strokeWidth="2" />
                </g>
              </g>

              {/* 5. ZONE: Assembly Hall Lines 1 - 4 */}
              <g
                onClick={() => onSelectStation("lines")}
                className="cursor-pointer group transition-all"
              >
                <rect
                  x="750"
                  y="40"
                  width="220"
                  height="340"
                  rx="12"
                  fill="#0c1424"
                  stroke={selectedStation === "lines" ? "#ff6b00" : "#1f304d"}
                  strokeWidth={selectedStation === "lines" ? "2.5" : "1.5"}
                  className="group-hover:stroke-cyan-400 transition"
                />
                <circle cx="768" cy="61" r="4.5" fill="#38bdf8" />
                <text x="780" y="65" fill="#ffffff" fontSize="12" fontWeight="bold">XƯỞNG LẮP RÁP CHÍNH</text>
                <text x="780" y="80" fill="#38bdf8" fontSize="10" fontFamily="monospace">4 DÂY CHUYỀN (L1 - L4)</text>

                {/* 4 Production Lines */}
                {[
                  { id: "L1", name: "Chuyền 1 (Line 1)", surge: true, takt: "58s", color: "#f59e0b" },
                  { id: "L2", name: "Chuyền 2 (Line 2)", surge: true, takt: "58s", color: "#f59e0b" },
                  { id: "L3", name: "Chuyền 3 (Line 3)", surge: false, takt: "65s", color: "#10b981" },
                  { id: "L4", name: "Chuyền 4 (Line 4)", surge: false, takt: "65s", color: "#10b981" },
                ].map((ln, idx) => (
                  <g key={ln.id} transform={`translate(770, ${100 + idx * 68})`}>
                    <rect x="0" y="0" width="180" height="52" rx="8" fill="#121b2d" stroke="#1f2f4a" />
                    <text x="12" y="22" fill="#ffffff" fontSize="11" fontWeight="bold">{ln.name}</text>
                    <text x="12" y="38" fill="#94a3b8" fontSize="9">Takt Time: <tspan fill="#38bdf8" fontWeight="bold">{ln.takt}</tspan></text>
                    {ln.surge ? (
                      <rect x="115" y="10" width="55" height="18" rx="4" fill="#d97706" />
                    ) : (
                      <rect x="125" y="10" width="45" height="18" rx="4" fill="#065f46" />
                    )}
                    <text x={ln.surge ? "142" : "147"} y="23" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                      {ln.surge ? "+30% S2" : "Chuẩn"}
                    </text>
                  </g>
                ))}
              </g>
            </svg>

            {/* Float Overlay Indicator of Active Fleet */}
            <div className="absolute bottom-3 left-4 bg-[#0a101d]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1e2e4a] text-[11px] text-slate-300 font-mono flex items-center space-x-3">
              <span className="flex items-center space-x-1.5">
                <Truck className="w-3.5 h-3.5 text-[#ff6b00]" />
                <span>Đội xe kéo hoạt động:</span>
                <b className="text-white">TG-01, TG-02</b>
              </span>
              <span>•</span>
              <span className="text-amber-400">TG-03: Bảo dưỡng 13:00 - 16:00</span>
            </div>
          </div>
        </div>
      ) : (
        /* Alternate Quick Zone Cards View */
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { id: "supermarket", icon: Warehouse, name: "Supermarket SMKT-A", status: "Bình thường", color: "emerald", detail: "2 Thủ kho · Tồn 100%" },
            { id: "picking", icon: PackageOpen, name: "Picking PK1-4", status: "Bận 59%", color: "emerald", detail: "4 Pickers · 2 đơn chờ" },
            { id: "loading", icon: Anchor, name: "Loading Docks", status: "Nghẽn ROI 4.8x", color: "rose", detail: `3 Cửa · ${dockQueueCount} đơn chờ` },
            { id: "transport", icon: Truck, name: "Xe Kéo Milk-run", status: "Bận 94%", color: "amber", detail: "TG1, TG2 · Chu kỳ 20m" },
            { id: "lines", icon: Factory, name: "4 Chuyền L1-L4", status: "L1/L2 +30%", color: "amber", detail: "Takt time 58s/xe" },
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
