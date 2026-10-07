import React, { useState, useEffect } from "react";
import { 
  Bot, 
  Sparkles 
} from "lucide-react";
import { 
  SystemStatus, 
  ForecastResponse, 
  AlertItem, 
  fetchHealth, 
  fetchCurrentData, 
  fetchForecast, 
  fetchAlerts 
} from "./api";
import { Navbar } from "./components/Navbar";
import { OverviewTab } from "./components/OverviewTab";
import { PredictTab } from "./components/PredictTab";
import { DetectTab } from "./components/DetectTab";
import { SimulateTab } from "./components/SimulateTab";
import { RecommendTab } from "./components/RecommendTab";
import { DataTab } from "./components/DataTab";
import { AuditTab } from "./components/AuditTab";
import { LogisticsCopilotModal } from "./components/LogisticsCopilotModal";

export function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [lang, setLang] = useState<"vi" | "en">("vi");
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [currentData, setCurrentData] = useState<any>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCopilot, setShowCopilot] = useState(false);

  const loadAll = async () => {
    try {
      const [h, cd, fc, al] = await Promise.all([
        fetchHealth(),
        fetchCurrentData(),
        fetchForecast(8),
        fetchAlerts(),
      ]);
      setStatus(h);
      setCurrentData(cd);
      setForecast(fc);
      setAlerts(al.alerts);
    } catch (err) {
      console.error("Initial data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleDownloadExcel = () => {
    window.open("/api/reports/excel", "_blank");
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        lang={lang}
        setLang={setLang}
        onDownloadExcel={handleDownloadExcel}
        onOpenCopilot={() => setShowCopilot(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="w-10 h-10 border-4 border-[#ff6b00] border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm font-semibold text-slate-300">
              Đang tải dữ liệu và khởi động Control Room...
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: activeTab === "overview" ? "block" : "none" }}>
              <OverviewTab
                forecast={forecast}
                alerts={alerts}
                currentData={currentData}
                onNavigateTab={setActiveTab}
                lang={lang}
              />
            </div>
            <div style={{ display: activeTab === "predict" ? "block" : "none" }}>
              <PredictTab forecast={forecast} lang={lang} />
            </div>
            <div style={{ display: activeTab === "detect" ? "block" : "none" }}>
              <DetectTab alerts={alerts} lang={lang} />
            </div>
            <div style={{ display: activeTab === "simulate" ? "block" : "none" }}>
              <SimulateTab lang={lang} />
            </div>
            <div style={{ display: activeTab === "recommend" ? "block" : "none" }}>
              <RecommendTab lang={lang} />
            </div>
            <div style={{ display: activeTab === "data" ? "block" : "none" }}>
              <DataTab
                currentData={currentData}
                quality={currentData?.quality || null}
                onRefreshData={loadAll}
                lang={lang}
              />
            </div>
            <div style={{ display: activeTab === "audit" ? "block" : "none" }}>
              <AuditTab lang={lang} isActive={activeTab === "audit"} />
            </div>
          </>
        )}
      </main>

      {/* Floating Logistics Copilot Trigger Button (Compact Floating FAB) */}
      <button
        onClick={() => setShowCopilot(true)}
        className="fixed bottom-5 right-5 z-40 w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-[#ff6b00] hover:scale-110 active:scale-95 text-white transition-all shadow-xl shadow-indigo-950/80 flex items-center justify-center border border-white/30 cursor-pointer group"
        title="Mở Trợ lý Logistics Copilot AI"
      >
        <Bot className="w-5 h-5 text-white group-hover:rotate-12 transition" />
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0a0e17] animate-pulse"></span>
      </button>

      {/* Grounded Logistics Copilot Modal */}
      <LogisticsCopilotModal
        isOpen={showCopilot}
        onClose={() => setShowCopilot(false)}
        lang={lang}
      />

      {/* Footer */}
      <footer className="border-t border-[#1e293b] bg-[#0c121e] py-3 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <span>Dự án tham dự </span>
          <span className="font-semibold text-slate-300">DENSO Factory Hacks 2026</span>
          <span> · Bài toán D2: Simulate & Forecast Logistics, Recommend Actions</span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="text-[#ff6b00] font-semibold">TẤT CẢ DỮ LIỆU ĐANG Ở CHẾ ĐỘ SYNTHETIC (D0)</span>
          <span>•</span>
          <span>Decision Intelligence & Digital Twin System</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
