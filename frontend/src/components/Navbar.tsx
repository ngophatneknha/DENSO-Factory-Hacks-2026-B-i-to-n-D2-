import React, { useState, useEffect } from "react";
import { 
  Activity, 
  BarChart3, 
  AlertTriangle, 
  Sliders, 
  CheckCircle2, 
  Database, 
  FileSpreadsheet, 
  History,
  Clock,
  Sparkles,
  Layers,
  Radio,
  Bot
} from "lucide-react";
import { SystemStatus } from "../api";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  status: SystemStatus | null;
  lang: "vi" | "en";
  setLang: (lang: "vi" | "en") => void;
  onDownloadExcel: () => void;
  onOpenCopilot?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  status,
  lang,
  setLang,
  onDownloadExcel,
  onOpenCopilot,
}) => {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("vi-VN", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const t = {
    vi: {
      title: "DENSO FACTORY HACKS 2026",
      subtitle: "D2 · Simulate & Forecast Logistics, Recommend Actions",
      overview: "Tổng quan điều hành",
      predict: "Dự báo tải (Predict)",
      detect: "Điểm nghẽn (Detect)",
      simulate: "Mô phỏng (What-if)",
      recommend: "Đối sách (Recommend)",
      data: "Dữ liệu & Kiểm chuẩn",
      audit: "Nhật ký & Audit",
      exportExcel: "Xuất Excel",
      mode: "DỮ LIỆU TỔNG HỢP",
      readiness: "D0 READY",
      telemetry: "GIẢ LẬP ĐIỀU HÀNH (SIMULATED D0)",
      copilot: "Copilot AI",
    },
    en: {
      title: "DENSO FACTORY HACKS 2026",
      subtitle: "D2 · Simulate & Forecast Logistics, Recommend Actions",
      overview: "Overview",
      predict: "Predict",
      detect: "Detect",
      simulate: "Simulate (What-if)",
      recommend: "Recommend",
      data: "Data & Quality",
      audit: "Audit & History",
      exportExcel: "Export Excel",
      mode: "SYNTHETIC DATA",
      readiness: "D0 READY",
      telemetry: "SIMULATED TELEMETRY (D0)",
      copilot: "Copilot AI",
    },
  }[lang];

  const tabs = [
    { id: "overview", label: t.overview, icon: Activity },
    { id: "predict", label: t.predict, icon: BarChart3 },
    { id: "detect", label: t.detect, icon: AlertTriangle },
    { id: "simulate", label: t.simulate, icon: Sliders },
    { id: "recommend", label: t.recommend, icon: CheckCircle2 },
    { id: "data", label: t.data, icon: Database },
    { id: "audit", label: t.audit, icon: History },
  ];

  return (
    <header className="border-b border-[#1e2b45] bg-[#0b101d]/90 backdrop-blur-md sticky top-0 z-50 shadow-lg shadow-black/40">
      {/* Top Main Status Bar */}
      <div className="px-5 py-2.5 flex flex-wrap items-center justify-between border-b border-[#18233a] gap-2">
        {/* Brand & Track */}
        <div className="flex items-center space-x-3.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#e60012] via-[#ff6b00] to-[#7928ca] flex items-center justify-center font-extrabold text-white shadow-lg shadow-[#ff6b00]/30 tracking-tight text-sm">
              D2
            </div>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#0b101d] rounded-full"></span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-wider text-xs sm:text-sm text-transparent bg-clip-text bg-gradient-to-r from-[#ff7a1a] via-[#ff9e42] to-white">
                {t.title}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1b253b] text-cyan-300 border border-cyan-800/40">
                Data Utilization Track
              </span>
            </div>
            <h1 className="text-[11px] text-slate-400 font-medium">
              {t.subtitle}
            </h1>
          </div>
        </div>

        {/* Real-time Telemetry & Badges */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Live Clock */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-lg bg-[#131b2e] border border-[#23324f] text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-cyan-300 font-semibold">{timeStr || "06:00:00"}</span>
            <span className="text-[10px] text-slate-500 font-medium">| Ca S1 (06:00 - 14:00)</span>
          </div>

          {/* Telemetry pulse */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-700/50 text-emerald-300 text-[11px] font-semibold">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>{t.telemetry}</span>
          </div>

          {/* Mode Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#ff6b00]/10 border border-[#ff6b00]/40 text-[#ff8f3d] font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#ff6b00] animate-ping"></span>
            <span>{t.mode}</span>
          </div>

          {/* Dataset ID */}
          <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#18233a] border border-[#2a3c5e] text-slate-300 font-mono text-[11px]">
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>{status?.active_dataset || "SYN-s42-20261007"}</span>
          </div>

          {/* Logistics Copilot AI Button */}
          {onOpenCopilot && (
            <button
              onClick={onOpenCopilot}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-indigo-950/50 border border-indigo-400/30"
              title="Mở Trợ lý Quyết định Logistics Copilot AI"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-200" />
              <span>{t.copilot}</span>
            </button>
          )}

          {/* Export Excel Button */}
          <button
            onClick={onDownloadExcel}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-emerald-900/40"
            title="Tải toàn bộ báo cáo phân tích định dạng Excel .xlsx"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t.exportExcel}</span>
          </button>

          {/* Language selector */}
          <button
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            className="px-2.5 py-1 rounded-lg border border-[#2a3c5e] hover:border-slate-400 text-slate-300 transition text-[11px] font-extrabold cursor-pointer"
          >
            {lang.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Modern Tab Bar */}
      <nav className="px-5 flex space-x-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group flex items-center space-x-2 py-3 px-4 border-b-2 text-xs font-semibold tracking-wide transition whitespace-nowrap cursor-pointer relative ${
                isActive
                  ? "border-[#ff6b00] text-white bg-[#162035]/60"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#12192b]/40"
              }`}
            >
              <Icon
                className={`w-4 h-4 transition ${
                  isActive
                    ? "text-[#ff6b00]"
                    : "text-slate-400 group-hover:text-slate-200"
                }`}
              />
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#ff6b00] to-transparent"></span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
