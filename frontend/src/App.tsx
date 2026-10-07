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
            {activeTab === "overview" && (
              <OverviewTab
                forecast={forecast}
                alerts={alerts}
                currentData={currentData}
                onNavigateTab={setActiveTab}
                lang={lang}
              />
            )}
            {activeTab === "predict" && (
              <PredictTab forecast={forecast} lang={lang} />
            )}
            {activeTab === "detect" && (
              <DetectTab alerts={alerts} lang={lang} />
            )}
            {activeTab === "simulate" && (
              <SimulateTab lang={lang} />
            )}
            {activeTab === "recommend" && (
              <RecommendTab lang={lang} />
            )}
            {activeTab === "data" && (
              <DataTab
                currentData={currentData}
                quality={currentData?.quality || null}
                onRefreshData={loadAll}
                lang={lang}
              />
            )}
            {activeTab === "audit" && (
              <AuditTab lang={lang} />
            )}
          </>
        )}
      </main>

      {/* Floating Logistics Copilot Trigger Button */}
      <button
        onClick={() => setShowCopilot(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-[#ff6b00] hover:scale-105 active:scale-95 text-white font-black text-xs transition-all shadow-2xl shadow-indigo-950/80 flex items-center space-x-2 border border-white/20 cursor-pointer group"
        title="Mở Trợ lý Logistics Copilot AI"
      >
        <div className="p-1 rounded-full bg-white/20 group-hover:rotate-12 transition">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <span>Hỏi Copilot AI</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
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
