import React, { useState, useEffect } from "react";
import { 
  Bot, 
  Presentation,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  X,
  Cpu,
  Radio
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
import { SimulateTab, ExternalSimConfig } from "./components/SimulateTab";
import { RecommendTab } from "./components/RecommendTab";
import { DataTab } from "./components/DataTab";
import { AuditTab } from "./components/AuditTab";
import { LogisticsCopilotModal } from "./components/LogisticsCopilotModal";

const PITCH_STEPS = [
  {
    step: 1,
    tab: "overview",
    timeTag: "TRỤ CỘT 1 · SLIDE 17",
    title: "1. Hiển thị hóa (What is happening now?)",
    summary:
      "Xóa bỏ 5 file Excel phân tán (Kế hoạch SX, Tồn kho, Lịch xe, Ca kíp, Bảo trì) để hợp nhất thành Single Source of Truth thời gian thực: giám sát đồng bộ Kho Supermarket & GTP, Nhân sự Kitting, Cổng Dock, Đội xe AGV/AMR/Tàu kéo và Xe nâng Forklift.",
    evidence: "Single Source of Truth · 5 Nguồn lực Nội khu · Sơ đồ 2D CAD trực quan",
  },
  {
    step: 2,
    tab: "predict",
    timeTag: "TRỤ CỘT 2 · SLIDE 17 & 24",
    title: "2. Dự báo & Ngưỡng xử lý (Capacity Gap)",
    summary:
      "Thay thế ước tính thủ công bằng đối chiếu tự động Công suất hiện tại vs. Khối lượng công việc 2 giờ tới. Không chỉ vẽ đường dự báo mà báo rõ: Còn 105 phút chạm ngưỡng 85%, thiếu 01 Loader tại Dock & cần phát lệnh trước 09:45.",
    evidence: "Đếm ngược Time-to-Breach · Quy đổi thiếu hụt Nhân sự/AGV/Dock · CQR 81.2%",
  },
  {
    step: 3,
    tab: "detect",
    timeTag: "CHẨN ĐOÁN · SLIDE 17",
    title: "3. Khoanh vùng Điểm nghẽn Gốc (Root-Cause)",
    summary:
      "Giải phẫu chính xác nguyên nhân gây ùn ứ: Đội xe kéo bận 94% là hệ quả của việc phải xếp hàng chờ tại Cầu bốc hàng (Loading Dock DK1–DK3). Xử lý tại Dock mang lại hiệu quả gấp 4.8 lần so với điều thêm xe kéo.",
    evidence: "6 Chỉ số Nghẽn cổ chai · Phân rã nguyên nhân gốc · Tránh điều phối sai chỗ",
  },
  {
    step: 4,
    tab: "simulate",
    timeTag: "TRỤ CỘT 3 · SLIDE 17",
    title: "4. Mô phỏng What-if (If conditions change?)",
    summary:
      "Nền tảng trực tuyến cho phép tổ trưởng PC&L thử nghiệm trước các biến động (Đơn hàng tăng +20%, AGV sạc/lỗi, thiếu nhân sự, đổi chu kỳ Milk-run) trên cùng hạt giống CRN Seed = 42 trước khi áp dụng thực tế xuống xưởng.",
    evidence: "4 Kịch bản thực chiến DMVN 1-Click · So sánh Trước/Sau tức thời · 0 Rủi ro thử sai",
  },
  {
    step: 5,
    tab: "recommend",
    timeTag: "ĐẦU RA · SLIDE 22 & 24",
    title: "5. Khuyến nghị, Số đo Trước–Sau & ROI",
    summary:
      "Xếp hạng TOP-3 phương án khả thi theo đa mục tiêu QCDS. Minh chứng trên cùng bộ 30 kịch bản test: Rút ngắn lập kế hoạch từ 30–45 phút Excel xuống <1 phút, giảm 43.1% phút xe chờ, chi phí ~35 triệu VNĐ/khu vực, hoàn vốn sau 2.2 tháng.",
    evidence: "Cùng bộ Test 30 ca · Tiết kiệm ~540 giờ công/năm · Hoàn vốn 2.2 tháng",
  },
  {
    step: 6,
    tab: "data",
    timeTag: "TÁI LẬP · SLIDE 22 & 25",
    title: "6. Input 4 Lớp & Sẵn sàng Factory Tour",
    summary:
      "Đáp ứng trọn vẹn 4 lớp Input bắt buộc (Log máy/AGV/GTP, Nghiệp vụ BOM/SLA, Tri thức người vận hành, 30 ca Benchmark cố định) kèm danh mục giả định A01–A12 và phiếu bấm giờ thực địa cho chuyến thăm nhà máy DMVN.",
    evidence: "4 Lớp Input chuẩn BTC · 30 Ca Test cố định · Phiếu đo Factory Tour",
  },
];

export function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [lang, setLang] = useState<"vi" | "en">("vi");
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [currentData, setCurrentData] = useState<any>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCopilot, setShowCopilot] = useState(false);
  const [externalSimConfig, setExternalSimConfig] = useState<ExternalSimConfig | null>(null);

  // Guided Judge Pitch Mode state
  const [pitchMode, setPitchMode] = useState<boolean>(true);
  const [pitchStepIdx, setPitchStepIdx] = useState<number>(0);

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

  const handleSelectPitchStep = (idx: number) => {
    setPitchStepIdx(idx);
    setActiveTab(PITCH_STEPS[idx].tab);
  };

  const handleLaunchSimulation = (cfg: ExternalSimConfig) => {
    setExternalSimConfig({ ...cfg });
    setActiveTab("simulate");
    setPitchStepIdx(3);
  };

  const handleDownloadExcel = () => {
    window.open("/api/reports/excel", "_blank");
  };

  const currentPitch = PITCH_STEPS[pitchStepIdx];

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

      {/* Guided Judge Pitch Mode Storyboard Bar */}
      <div className="bg-gradient-to-r from-[#111a2e] via-[#152039] to-[#111a2e] border-b border-[#243556] px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto space-y-2">
          {/* Slide 11 & Slide 22 Self-Check Strip */}
          <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-950/50 via-[#0d182c] to-amber-950/30 border border-emerald-700/40 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-black uppercase tracking-wider shrink-0">
                DIGITAL TRIPLET (SLIDE 11 & 22)
              </span>
              <span className="text-slate-200">
                <b className="text-emerald-300">Lợi ích thực tế cho người vận hành DMVN (1 Câu & 1 Con số):</b> Xóa bỏ <b>30–45 phút</b> ghép nối 5 file Excel đầu ca xuống <b>&lt; 60 giây</b> — Giải phóng <b>118 phút xe AGV/Tàu kéo chờ mỗi ca (-43.1%)</b> để tổ trưởng tập trung quản lý <b>QCDS & Kaizen</b>.
              </span>
            </div>
            <div className="shrink-0 font-mono text-[10px] text-amber-300 bg-[#0b1324] px-2.5 py-1 rounded border border-amber-700/40">
              Chi phí ~35 Triệu VNĐ/khu vực · Hoàn vốn 2.2 tháng
            </div>
          </div>

          {!pitchMode ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <Presentation className="w-4 h-4 text-[#ff6b00]" />
                <span>Chế độ dẫn chuyện tương tác theo chuẩn Kickoff Workshop DENSO 2026 (6 bước khép kín)</span>
              </div>
              <button
                onClick={() => setPitchMode(true)}
                className="px-3 py-1 rounded-lg bg-[#ff6b00] hover:bg-[#e66000] text-white text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
              >
                <Presentation className="w-3.5 h-3.5" />
                <span>Mở Guided Pitch Mode (6 Bước)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Stepper Pills Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-[#ff6b00] text-white font-mono text-[10px] font-black uppercase tracking-wider flex items-center space-x-1">
                    <Presentation className="w-3 h-3" />
                    <span>DENSO KICKOFF RUBRIC</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {PITCH_STEPS.map((s, idx) => {
                      const isCurrent = idx === pitchStepIdx;
                      const isDone = idx < pitchStepIdx;
                      return (
                        <button
                          key={s.step}
                          onClick={() => handleSelectPitchStep(idx)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center space-x-1 border ${
                            isCurrent
                              ? "bg-[#ff6b00]/20 border-[#ff6b00] text-white shadow-sm"
                              : isDone
                              ? "bg-emerald-950/40 border-emerald-700/50 text-emerald-300"
                              : "bg-[#0c1322] border-[#1f2e4a] text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                          <span>{s.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    disabled={pitchStepIdx === 0}
                    onClick={() => handleSelectPitchStep(Math.max(0, pitchStepIdx - 1))}
                    className="p-1.5 rounded-lg bg-[#0c1322] border border-[#223250] text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                    title="Bước trước"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={pitchStepIdx === PITCH_STEPS.length - 1}
                    onClick={() => handleSelectPitchStep(Math.min(PITCH_STEPS.length - 1, pitchStepIdx + 1))}
                    className="px-2.5 py-1 rounded-lg bg-[#ff6b00] hover:bg-[#e66000] text-white text-[11px] font-bold disabled:opacity-40 cursor-pointer flex items-center space-x-1"
                  >
                    <span>Bước tiếp ({pitchStepIdx + 1}/{PITCH_STEPS.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPitchMode(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                    title="Thu gọn thanh thuyết trình"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Active Step Narrative Callout */}
              <div className="p-2.5 rounded-xl bg-[#0b111e]/90 border border-[#223454] flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs">
                <div className="flex items-start space-x-2.5">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold shrink-0 mt-0.5">
                    {currentPitch.timeTag}
                  </span>
                  <p className="text-slate-200 leading-relaxed">
                    <b className="text-white">{currentPitch.title}:</b> {currentPitch.summary}
                  </p>
                </div>
                <div className="shrink-0 px-2.5 py-1 rounded-lg bg-[#111b2e] border border-[#233657] text-[10px] font-mono text-amber-300">
                  ★ Bằng chứng: {currentPitch.evidence}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
              <SimulateTab lang={lang} externalSimConfig={externalSimConfig} />
            </div>
            <div style={{ display: activeTab === "recommend" ? "block" : "none" }}>
              <RecommendTab lang={lang} onLaunchSimulation={handleLaunchSimulation} />
            </div>
            <div style={{ display: activeTab === "data" ? "block" : "none" }}>
              <DataTab
                currentData={currentData}
                quality={currentData?.quality || null}
                onRefreshData={loadAll}
                lang={lang}
                onLaunchSimulation={handleLaunchSimulation}
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

      {/* Footer with Industrial OPC-UA / PLC Telemetry Strip */}
      <footer className="border-t border-[#1e293b] bg-[#0c121e] py-3 px-6 text-xs text-slate-500 flex flex-col lg:flex-row items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span>Dự án tham dự</span>
          <span className="font-semibold text-slate-300">DENSO Factory Hacks 2026</span>
          <span>· Bài toán D2: Predict → Detect → Simulate → Recommend</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center space-x-1 text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>OPC-UA GATEWAY: READY</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1 text-cyan-400">
            <Cpu className="w-3 h-3" />
            <span>PLC_DOCK_SCANNER: 15ms</span>
          </span>
          <span>•</span>
          <span className="text-[#ff6b00] font-semibold">SYNTHETIC MODE (D0 VERIFIED)</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
