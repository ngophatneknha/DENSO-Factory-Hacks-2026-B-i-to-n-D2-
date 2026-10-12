import React, { useState, useEffect } from "react";
import { 
  Database, 
  FileSpreadsheet, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  FileText,
  Layers,
  ArrowRight,
  HardDrive,
  Cpu,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Table as TableIcon
} from "lucide-react";
import { QualityProfile, triggerGenerate, uploadDataset, browseTable, BrowseTableResponse } from "../api";

import { ExternalSimConfig } from "./SimulateTab";

interface DataTabProps {
  currentData: any;
  quality: QualityProfile | null;
  onRefreshData: () => void;
  lang: "vi" | "en";
  onLaunchSimulation?: (config: ExternalSimConfig) => void;
}

export const DataTab: React.FC<DataTabProps> = ({
  currentData,
  quality,
  onRefreshData,
  lang,
  onLaunchSimulation,
}) => {
  const [seed, setSeed] = useState(42);
  const [historyDays, setHistoryDays] = useState(84);
  const [generating, setGenerating] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Live Factory Tour Time-Study Calibration Sandbox State
  const [calCycleMin, setCalCycleMin] = useState<number>(15);
  const [calExtraLoaders, setCalExtraLoaders] = useState<number>(1);
  const [calPriority, setCalPriority] = useState<"FIFO" | "EDD">("EDD");
  const [calSurgePct, setCalSurgePct] = useState<number>(30);

  // Data Explorer State
  const [activeTable, setActiveTable] = useState<string>("requests");
  const [tableData, setTableData] = useState<BrowseTableResponse | null>(null);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [loadingTable, setLoadingTable] = useState<boolean>(false);

  const t = {
    vi: {
      title: "QUẢN LÝ DỮ LIỆU & BÁO CÁO KIỂM CHUẨN CHẤT LƯỢNG (DATA QUALITY PROFILING)",
      readinessTitle: "MỨC ĐỘ SẴN SÀNG CỦA DỮ LIỆU (DATA READINESS LEVEL D0 - D3)",
      syntheticCard: "BỘ SINH DỮ LIỆU TỔNG HỢP NỘI BỘ (INTRALOGISTICS GENERATOR)",
      uploadTitle: "NẠP 5 FILE EXCEL THỰC TẾ TỪ NHÀ MÁY DMVN (CSV / 5-SHEET XLSX)",
      templateBtn: "Tải bộ 5 Sheet Excel chuẩn DMVN",
      generateBtn: "Tạo mới dữ liệu tổng hợp (Parquet)",
      stepperD0: "D0: Tổng hợp (Synthetic)",
      stepperD1: "D1: Kết nối Log thực",
      stepperD2: "D2: Dự báo phụ tải xác suất",
      stepperD3: "D3: Điều phối khép kín",
      explorerTitle: "TRÌNH KHÁM PHÁ & SOI CHI TIẾT BẢNG DỮ LIỆU (PARQUET DATA INSPECTOR)",
    },
    en: {
      title: "DATA MANAGEMENT & QUALITY PROFILING REPORT",
      readinessTitle: "DATA READINESS LEVEL ASSESSMENT (D0 - D3)",
      syntheticCard: "INTRALOGISTICS SYNTHETIC DATA GENERATOR",
      uploadTitle: "IMPORT REAL FACTORY DATA (CSV / EXCEL)",
      templateBtn: "Download Excel Template",
      generateBtn: "Generate Synthetic Dataset (Parquet)",
      stepperD0: "D0: Synthetic",
      stepperD1: "D1: Real Factory Logs",
      stepperD2: "D2: Probabilistic Forecast",
      stepperD3: "D3: Closed-loop Dispatch",
      explorerTitle: "PARQUET TABLE DATA INSPECTOR & ROW VIEWER",
    },
  }[lang];

  const loadBrowseData = (tbl: string, p: number, q: string) => {
    setLoadingTable(true);
    browseTable(tbl, p, 20, q)
      .then((res) => setTableData(res))
      .catch((err) => console.error("Error loading table data:", err))
      .finally(() => setLoadingTable(false));
  };

  useEffect(() => {
    loadBrowseData(activeTable, page, search);
  }, [activeTable, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadBrowseData(activeTable, 1, search);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await triggerGenerate(seed, historyDays);
      setTimeout(() => {
        onRefreshData();
        loadBrowseData(activeTable, 1, "");
        setGenerating(false);
      }, 4500);
    } catch (err) {
      console.error(err);
      setGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus("Đang nạp file và kiểm tra schema tính toàn vẹn...");
    try {
      await uploadDataset(file);
      setUploadStatus("✓ Nạp dữ liệu thành công! Đang đồng bộ hóa hệ thống...");
      setTimeout(() => {
        onRefreshData();
        loadBrowseData(activeTable, 1, "");
        setUploadStatus(null);
      }, 1500);
    } catch (err: any) {
      setUploadStatus(`Lỗi tải lên: ${err.message}`);
    }
  };

  const tablesList = [
    { id: "requests", label: "Yêu cầu vật tư (requests)", desc: "70k bản ghi" },
    { id: "process_events", label: "Sự kiện công đoạn (events)", desc: "424k log" },
    { id: "production_plan", label: "Kế hoạch SX (plan)", desc: "6.7k ca" },
    { id: "resource_calendar", label: "Lịch ca kíp (calendar)", desc: "1.6k ca" },
    { id: "resources", label: "Danh mục nguồn lực (resources)", desc: "27 thiết bị/người" },
    { id: "snapshot", label: "Tồn WIP tại T0 (snapshot)", desc: "19 đơn đệm" },
  ];

  return (
    <div className="space-y-6">
      {/* Visual D0-D3 Readiness Stepper Progress Card */}
      <div className="control-panel p-5.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{t.readinessTitle}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Đánh giá theo thang 4 mức D0-D3 của bài toán D2 - DENSO Factory Hacks 2026.
            </p>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#ff6b00]/15 border border-[#ff6b00]/50 text-[#ff8f3d] font-extrabold text-xs flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#ff6b00] animate-pulse"></span>
            <span>Mức hiện tại: {quality?.readiness_label || "D0 - Dữ liệu tổng hợp (Synthetic)"}</span>
          </div>
        </div>

        {/* 4-Step Visual Level Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
          <div className="p-3.5 rounded-xl border bg-gradient-to-r from-[#1b2640] to-[#121c30] border-[#ff6b00] ring-1 ring-[#ff6b00]/30">
            <div className="flex items-center justify-between text-xs font-extrabold text-[#ff6b00] mb-1">
              <span>{t.stepperD0}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#ff6b00] text-white font-bold">ĐANG CHẠY</span>
            </div>
            <div className="text-[11px] text-slate-300">
              Mô phỏng 12 tuần lịch sử không rò rỉ dữ liệu (No future leakage), đầy đủ log sự kiện.
            </div>
          </div>

          <div className="p-3.5 rounded-xl border bg-[#111929]/70 border-[#22334f]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
              <span>{t.stepperD1}</span>
              <span className="text-[10px] text-slate-500 font-mono">Sẵn sàng nạp</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Nhận nạp CSV / Excel từ hệ thống MES/ERP thực tế của DENSO qua chuẩn dữ liệu chung.
            </div>
          </div>

          <div className="p-3.5 rounded-xl border bg-[#111929]/70 border-[#22334f]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
              <span>{t.stepperD2}</span>
              <span className="text-[10px] text-emerald-400 font-mono">Đã tích hợp</span>
            </div>
            <div className="text-[11px] text-slate-400">
              LightGBM Quantile + CQR dải tin cậy 80% có kiểm chuẩn backtest WAPE +26.1%.
            </div>
          </div>

          <div className="p-3.5 rounded-xl border bg-[#111929]/70 border-[#22334f]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
              <span>{t.stepperD3}</span>
              <span className="text-[10px] text-indigo-400 font-mono">Đã tích hợp</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Đánh đổi Pareto & CVaR90, nhật ký phê duyệt điều phối tự động lưu vào sổ cái kiểm toán.
            </div>
          </div>
        </div>
      </div>

      {/* SLIDE 22: 4 LỚP DỮ LIỆU ĐẦU VÀO BẮT BUỘC (4 MANDATORY INPUT LAYERS) */}
      <div className="control-panel p-5.5 border border-cyan-500/30 bg-gradient-to-r from-[#0e182a] via-[#0c1424] to-[#101a2e] space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 border-b border-[#223454] pb-3">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 mb-1 font-mono">
              <Layers className="w-3.5 h-3.5" />
              <span>SLIDE 22 · CHUẨN HÓA 4 LỚP INPUT BẮT BUỘC CỦA BAN TỔ CHỨC DENSO</span>
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              CẤU TRÚC 4 LỚP DỮ LIỆU ĐẦU VÀO: THIẾT BỊ · NGHIỆP VỤ · TRI THỨC NGƯỜI VẬN HÀNH · BỘ 30 CA TEST CỐ ĐỊNH
            </h3>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Nhấp vào từng lớp dữ liệu bên dưới để mở trực tiếp bảng bản ghi tương ứng trong Trình khám phá Parquet phía dưới.
            </p>
          </div>
          <span className="shrink-0 font-mono text-[11px] px-3 py-1 rounded-lg bg-[#09111e] border border-[#1f3150] text-emerald-400">
            Schema chuẩn hóa 100% · Chống rò rỉ tương lai
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          {/* Layer 1: Machine / Sensor Data */}
          <div
            onClick={() => { setActiveTable("process_events"); setPage(1); }}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              activeTable === "process_events"
                ? "bg-[#172642] border-cyan-400 ring-1 ring-cyan-400/40"
                : "bg-[#0d1526] border-[#213252] hover:border-slate-500"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold text-cyan-300">LỚP 1: DỮ LIỆU THIẾT BỊ</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                424k bản ghi
              </span>
            </div>
            <div className="text-white font-bold mb-1">Log AGV/AMR, Tàu kéo, GTP & Dock</div>
            <ul className="text-[11px] text-slate-300 space-y-0.5 list-disc pl-4">
              <li><b>Tần suất lấy mẫu:</b> 15 giây / gói tin</li>
              <li><b>Nhãn thời gian:</b> ISO-8601 (Phút trong ca)</li>
              <li><b>Đơn vị đo:</b> Phút chuẩn, Số khay, % Pin</li>
            </ul>
          </div>

          {/* Layer 2: Business Data */}
          <div
            onClick={() => { setActiveTable("production_plan"); setPage(1); }}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              activeTable === "production_plan"
                ? "bg-[#172642] border-cyan-400 ring-1 ring-cyan-400/40"
                : "bg-[#0d1526] border-[#213252] hover:border-slate-500"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold text-emerald-300">LỚP 2: DỮ LIỆU NGHIỆP VỤ</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                6.7k ca SX
              </span>
            </div>
            <div className="text-white font-bold mb-1">Kế hoạch SX, BOM & Chuẩn SLA</div>
            <ul className="text-[11px] text-slate-300 space-y-0.5 list-disc pl-4">
              <li><b>Kế hoạch SX & BOM:</b> Nhịp Takt 4 chuyền L1–L4</li>
              <li><b>Tiêu chuẩn 'Đạt' (Pass):</b> Giao trước Due Time (SLA ≥ 95%)</li>
              <li><b>Quy tắc ưu tiên:</b> FIFO vs. EDD theo độ khẩn</li>
            </ul>
          </div>

          {/* Layer 3: Human Know-How */}
          <div
            onClick={() => { setActiveTable("resources"); setPage(1); }}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              activeTable === "resources"
                ? "bg-[#172642] border-cyan-400 ring-1 ring-cyan-400/40"
                : "bg-[#0d1526] border-[#213252] hover:border-slate-500"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold text-amber-300">LỚP 3: TRI THỨC VẬN HÀNH</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                27 nguồn lực
              </span>
            </div>
            <div className="text-white font-bold mb-1">Ca kíp, Kỹ năng chéo & Biểu mẫu</div>
            <ul className="text-[11px] text-slate-300 space-y-0.5 list-disc pl-4">
              <li><b>Ma trận đa kỹ năng:</b> Picker NV-04/06 kiêm Loader</li>
              <li><b>Lịch nghỉ & Bảo trì:</b> Nghỉ giữa ca, TG-03 bảo dưỡng</li>
              <li><b>Biểu mẫu hiện trường:</b> Phiếu lệnh điều độ chuẩn</li>
            </ul>
          </div>

          {/* Layer 4: Fixed Benchmark Test Set */}
          <div
            onClick={() => { setActiveTable("requests"); setPage(1); }}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              activeTable === "requests"
                ? "bg-[#172642] border-cyan-400 ring-1 ring-cyan-400/40"
                : "bg-[#0d1526] border-[#213252] hover:border-slate-500"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold text-purple-300">LỚP 4: BỘ KIỂM THỬ CHUẨN</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                30 Ca Cố định
              </span>
            </div>
            <div className="text-white font-bold mb-1">Fixed Benchmark (Cố định trước khi code)</div>
            <ul className="text-[11px] text-slate-300 space-y-0.5 list-disc pl-4">
              <li><b>10 Ca bình thường:</b> Kiểm tra độ ổn định (0 cảnh báo giả)</li>
              <li><b>12 Ca cao điểm (+30%):</b> Đổi mẫu L1/L2 giờ đỉnh</li>
              <li><b>08 Ca sự cố kép:</b> Bảo trì TG-03 + thiếu nhân sự Dock</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Interactive Parquet Table Explorer (Data Inspector) */}
      <div className="control-panel p-5.5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <TableIcon className="w-4 h-4 text-cyan-400" />
              <span>{t.explorerTitle}</span>
            </h3>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Soi trực tiếp từng dòng dữ liệu trong cơ sở dữ liệu Parquet của hệ thống
            </div>
          </div>

          {/* Table Switcher Pills */}
          <div className="flex items-center overflow-x-auto bg-[#101726] p-1 rounded-xl border border-[#23314d] text-xs">
            {tablesList.map((tbl) => (
              <button
                key={tbl.id}
                onClick={() => { setActiveTable(tbl.id); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer font-semibold ${
                  activeTable === tbl.id
                    ? "bg-[#ff6b00] text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tbl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0d1424] p-3 rounded-xl border border-[#21314d]">
          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm nội dung dòng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#141d30] border border-[#2b3c5e] rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 w-full focus:outline-none focus:border-[#ff6b00]"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1 rounded-lg bg-[#22334f] hover:bg-[#ff6b00] hover:text-white text-slate-200 text-xs font-semibold cursor-pointer transition"
            >
              Tìm
            </button>
          </form>

          <div className="flex items-center space-x-3 text-xs text-slate-400">
            <span>
              Tổng số: <b className="text-white font-mono">{tableData?.total_rows.toLocaleString() || 0}</b> dòng
            </span>
            <div className="flex items-center space-x-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded bg-[#141d30] border border-[#2b3c5e] hover:border-slate-400 disabled:opacity-40 cursor-pointer text-slate-300"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-cyan-300 px-2">
                Trang {page} / {Math.ceil((tableData?.total_rows || 1) / (tableData?.page_size || 20))}
              </span>
              <button
                disabled={page * (tableData?.page_size || 20) >= (tableData?.total_rows || 0)}
                onClick={() => setPage((p) => p + 1)}
                className="p-1 rounded bg-[#141d30] border border-[#2b3c5e] hover:border-slate-400 disabled:opacity-40 cursor-pointer text-slate-300"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Data Grid */}
        <div className="overflow-x-auto rounded-xl border border-[#23314d] max-h-96 overflow-y-auto">
          {loadingTable ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#ff6b00]" />
              <span>Đang đọc dữ liệu Parquet...</span>
            </div>
          ) : tableData && tableData.rows.length > 0 ? (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#23314d] text-slate-300 bg-[#141c2e]">
                  {tableData.columns.map((col) => (
                    <th key={col} className="py-2.5 px-3 font-bold whitespace-nowrap bg-[#141c2e]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2a44] bg-[#0f1626]/80 font-mono text-[11px]">
                {tableData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#18233a]/60 text-slate-300">
                    {tableData.columns.map((col) => (
                      <td key={col} className="py-2 px-3 whitespace-nowrap text-slate-300">
                        {String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-10 text-center text-slate-500 text-xs">
              Không có dữ liệu trong bảng này.
            </div>
          )}
        </div>
      </div>

      {/* Ingestion & Template Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Import Real Data */}
        <div className="control-panel p-5.5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <Upload className="w-4 h-4 text-[#ff6b00]" />
              <span>{t.uploadTitle}</span>
            </h3>

            <a
              href="/api/data/template"
              download
              className="px-3 py-1.5 rounded-lg bg-[#141d30] border border-[#2e3e5c] hover:border-slate-400 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.templateBtn}</span>
            </a>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Hỗ trợ nạp file <code className="text-slate-200 font-mono">.csv</code> hoặc file Excel đa sheet <code className="text-slate-200 font-mono">.xlsx</code> (requests, production_plan, disruptions). Hệ thống tự động chống trùng khóa (idempotent) và kiểm tra schema trước khi ghi đè.
          </p>

          <div className="border-2 border-dashed border-[#2d3e5e] hover:border-[#ff6b00] rounded-xl p-6 text-center transition cursor-pointer bg-[#0f1728]/40">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload-input"
            />
            <label htmlFor="file-upload-input" className="cursor-pointer space-y-2 block">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-200">Kéo thả file vào đây hoặc bấm để chọn file từ máy tính</div>
              <div className="text-[11px] text-slate-500">Hỗ trợ định dạng .xlsx, .csv (Tối đa 50MB)</div>
            </label>
          </div>

          {uploadStatus && (
            <div className="text-xs font-medium text-emerald-300 bg-emerald-950/60 p-3 rounded-xl border border-emerald-700 animate-in fade-in">
              {uploadStatus}
            </div>
          )}
        </div>

        {/* Card 2: Synthetic Data Generator */}
        <div className="control-panel p-5.5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            <span>{t.syntheticCard}</span>
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed">
            Tạo tập dữ liệu mô phỏng hoàn chỉnh 12 tuần (84 ngày) gồm kế hoạch sản xuất 4 dây chuyền, nhịp ca kíp, sự cố bảo dưỡng ngẫu nhiên và chạy SimPy để sinh toàn bộ log sự kiện mà không rò rỉ dữ liệu tương lai.
          </p>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Hạt giống ngẫu nhiên (Seed):</label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                className="w-full bg-[#141d30] border border-[#2c3d5e] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#ff6b00]"
              />
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">Độ dài lịch sử (Ngày):</label>
              <input
                type="number"
                value={historyDays}
                onChange={(e) => setHistoryDays(Number(e.target.value))}
                className="w-full bg-[#141d30] border border-[#2c3d5e] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#ff6b00]"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-lg shadow-indigo-950/40 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            <span>{generating ? "Đang sinh dữ liệu SimPy (khoảng 3.5 giây)..." : t.generateBtn}</span>
          </button>
        </div>
      </div>

      {/* SLIDE 22 (OUTPUT 3) & SLIDE 25: TÀI LIỆU TÁI LẬP (GIẢ ĐỊNH A01–A06 & GIỚI HẠN BIẾT TRƯỚC) & PHIẾU BẤM GIỜ THỰC ĐỊA FACTORY TOUR */}
      <div className="control-panel p-5.5 border border-amber-500/30 bg-gradient-to-r from-[#141828] via-[#0e1424] to-[#12182b] space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 border-b border-[#243554] pb-3">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/15 border border-amber-500/40 text-amber-300 mb-1 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>OUTPUT 3 · SLIDE 22 & SLIDE 25: REPRODUCIBILITY, ASSUMPTIONS & FACTORY TOUR CHECKLIST</span>
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              DANH MỤC GIẢ ĐỊNH TÁI LẬP (A01–A06), GIỚI HẠN BIẾT TRƯỚC & PHIẾU BẤM GIỜ THỰC ĐỊA TẠI FACTORY TOUR DMVN
            </h3>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Mọi thông số giả định đều được tách bạch trong file cấu hình. Khi xuống nhà máy DMVN trong buổi <b>Factory Tour (Slide 25)</b>, đội thi chỉ cần bấm giờ thực tế và nhập đè vào bảng dưới đây trong 5 phút mà không phải sửa mã nguồn.
            </p>
          </div>
          <span className="shrink-0 font-mono text-[11px] px-3 py-1 rounded-lg bg-[#09101d] border border-amber-700/50 text-amber-300">
            Sẵn sàng hiệu chuẩn thực địa tại DMVN
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#233554]">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#233554] text-slate-200 bg-[#141f36]">
                <th className="py-2.5 px-3 font-bold w-20">Mã</th>
                <th className="py-2.5 px-3 font-bold">Tham số Vận hành Nội khu</th>
                <th className="py-2.5 px-3 font-bold text-cyan-300">Giá trị Giả định Hiện tại (D0)</th>
                <th className="py-2.5 px-3 font-bold text-amber-300">Vị trí Bấm giờ & Thu thập tại Factory Tour (Slide 25)</th>
                <th className="py-2.5 px-3 font-bold text-slate-300">Giới hạn Biết trước (Known Limitations)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2b47] bg-[#0b1322]/90">
              <tr className="hover:bg-[#15223a]/60">
                <td className="py-2 px-3 font-mono font-bold text-amber-400">A01</td>
                <td className="py-2 px-3 font-semibold text-white">Chu kỳ vòng lặp Tàu kéo Milk-run</td>
                <td className="py-2 px-3 font-mono text-cyan-300">20 phút / vòng (Rút ngắn: 15p)</td>
                <td className="py-2 px-3 text-slate-200">Bấm giờ thực tế 1 vòng tàu kéo từ Kho SMKT qua 4 chuyền L1–L4</td>
                <td className="py-2 px-3 text-slate-400">Chưa tính độ trễ giao cắt người đi bộ qua hành lang phụ</td>
              </tr>
              <tr className="hover:bg-[#15223a]/60">
                <td className="py-2 px-3 font-mono font-bold text-amber-400">A02</td>
                <td className="py-2 px-3 font-semibold text-white">Năng suất trạm GTP & Kitting</td>
                <td className="py-2 px-3 font-mono text-cyan-300">145 khay GTP/h · 3.4 phút/đơn</td>
                <td className="py-2 px-3 text-slate-200">Đo thời gian thao tác của công nhân tại bàn Pick-to-Light & trạm GTP</td>
                <td className="py-2 px-3 text-slate-400">Giả định tỷ lệ lỗi quét mã vạch cố định ở mức 0.5%</td>
              </tr>
              <tr className="hover:bg-[#15223a]/60">
                <td className="py-2 px-3 font-mono font-bold text-amber-400">A03</td>
                <td className="py-2 px-3 font-semibold text-white">Thời gian bốc xếp tại Cổng Dock</td>
                <td className="py-2 px-3 font-mono text-cyan-300">4.8 phút / chuyến (LogNormal)</td>
                <td className="py-2 px-3 text-slate-200">Bấm giờ thao tác của Loader và xe nâng Forklift tại khu vực Dock</td>
                <td className="py-2 px-3 text-slate-400">Phụ thuộc kích thước kiện hàng (Bin vs. Pallet nặng)</td>
              </tr>
              <tr className="hover:bg-[#15223a]/60">
                <td className="py-2 px-3 font-mono font-bold text-amber-400">A04</td>
                <td className="py-2 px-3 font-semibold text-white">Sức chở tối đa mỗi chuyến xe kéo</td>
                <td className="py-2 px-3 font-mono text-cyan-300">08 đơn hàng (Trolley/Bin) / chuyến</td>
                <td className="py-2 px-3 text-slate-200">Đếm số rơ-moóc kéo theo quy định an toàn nội bộ của DMVN</td>
                <td className="py-2 px-3 text-slate-400">Quy đổi đồng nhất theo đơn vị tương đương chuẩn (EQ)</td>
              </tr>
              <tr className="hover:bg-[#15223a]/60">
                <td className="py-2 px-3 font-mono font-bold text-amber-400">A05</td>
                <td className="py-2 px-3 font-semibold text-white">Thời gian chuyển vị trí nhân sự đa năng</td>
                <td className="py-2 px-3 font-mono text-cyan-300">05 phút đi bộ & bàn giao vị trí</td>
                <td className="py-2 px-3 text-slate-200">Phỏng vấn Tổ trưởng PC&L về quy trình điều người từ Kitting sang Dock</td>
                <td className="py-2 px-3 text-slate-400">Chỉ áp dụng cho nhân sự đã có chứng chỉ kỹ năng chéo</td>
              </tr>
              <tr className="hover:bg-[#15223a]/60">
                <td className="py-2 px-3 font-mono font-bold text-amber-400">A06</td>
                <td className="py-2 px-3 font-semibold text-white">Ngưỡng cảnh báo quá tải công đoạn</td>
                <td className="py-2 px-3 font-mono text-cyan-300">85% (Vàng) · 95% (Đỏ khẩn cấp)</td>
                <td className="py-2 px-3 text-slate-200">Đối chiếu với tiêu chuẩn bảng Andon hiện hành tại phân xưởng DMVN</td>
                <td className="py-2 px-3 text-slate-400">Cần tối thiểu 2 tuần dữ liệu thực để hiệu chỉnh Conformal CQR</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Interactive Factory Tour Time-Study Calibration Sandbox */}
        <div className="p-4 rounded-xl bg-[#09111f] border border-amber-500/40 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-extrabold text-amber-300 uppercase flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>BÀN HIỆU CHUẨN NHANH SỐ ĐO BẤM GIỜ THỰC ĐỊA (FACTORY TOUR TIME-STUDY SANDBOX)</span>
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Sau khi ghi nhận số đo bấm giờ tại phân xưởng DMVN, điều chỉnh trực tiếp các thông số A01–A05 bên dưới và bấm <b>Áp dụng & Chạy Kiểm chứng SimPy</b>.
              </div>
            </div>
            {onLaunchSimulation && (
              <button
                onClick={() =>
                  onLaunchSimulation({
                    priority: calPriority,
                    cycleMin: calCycleMin,
                    extraPickers: 0,
                    extraLoaders: calExtraLoaders,
                    extraTuggers: 0,
                    demandSurge: calSurgePct,
                    label: `Hiệu chuẩn Factory Tour (A01=${calCycleMin}p, A05=+${calExtraLoaders} Loader, ${calPriority}, Tải +${calSurgePct}%)`,
                  })
                }
                className="px-4 py-2 rounded-xl bg-[#ff6b00] hover:bg-[#ff7b1a] text-white text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5 shadow-md shadow-[#ff6b00]/25 shrink-0"
              >
                <span>Áp dụng & Chạy Kiểm chứng SimPy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-[#121c30] border border-[#243656]">
              <label className="text-slate-300 font-semibold block mb-1">A01 · Chu kỳ Tàu kéo thực địa:</label>
              <select
                value={calCycleMin}
                onChange={(e) => setCalCycleMin(Number(e.target.value))}
                className="w-full bg-[#0c1322] border border-[#2c3f63] rounded px-2.5 py-1.5 text-cyan-300 font-mono font-bold"
              >
                <option value={10}>10 phút / vòng (Tuyến ngắn)</option>
                <option value={15}>15 phút / vòng (Tối ưu Milk-run)</option>
                <option value={20}>20 phút / vòng (Chuẩn hiện tại)</option>
                <option value={30}>30 phút / vòng (Tuyến xa)</option>
              </select>
            </div>

            <div className="p-2.5 rounded-lg bg-[#121c30] border border-[#243656]">
              <label className="text-slate-300 font-semibold block mb-1">A05 · Nhân sự đa năng sang Dock:</label>
              <select
                value={calExtraLoaders}
                onChange={(e) => setCalExtraLoaders(Number(e.target.value))}
                className="w-full bg-[#0c1322] border border-[#2c3f63] rounded px-2.5 py-1.5 text-emerald-300 font-mono font-bold"
              >
                <option value={0}>+0 Loader (Giữ nguyên 2 người)</option>
                <option value={1}>+1 Loader (Điều NV-04 sang Dock)</option>
                <option value={2}>+2 Loaders (Tăng cường tối đa)</option>
              </select>
            </div>

            <div className="p-2.5 rounded-lg bg-[#121c30] border border-[#243656]">
              <label className="text-slate-300 font-semibold block mb-1">A02 · Quy tắc xuất hàng Kitting:</label>
              <select
                value={calPriority}
                onChange={(e) => setCalPriority(e.target.value as "FIFO" | "EDD")}
                className="w-full bg-[#0c1322] border border-[#2c3f63] rounded px-2.5 py-1.5 text-amber-300 font-mono font-bold"
              >
                <option value="EDD">EDD (Ưu tiên hạn giao gấp)</option>
                <option value="FIFO">FIFO (Đến trước làm trước)</option>
              </select>
            </div>

            <div className="p-2.5 rounded-lg bg-[#121c30] border border-[#243656]">
              <label className="text-slate-300 font-semibold block mb-1">Phụ tải ca kiểm thử tại xưởng:</label>
              <select
                value={calSurgePct}
                onChange={(e) => setCalSurgePct(Number(e.target.value))}
                className="w-full bg-[#0c1322] border border-[#2c3f63] rounded px-2.5 py-1.5 text-white font-mono font-bold"
              >
                <option value={0}>Bình thường (Baseline 0%)</option>
                <option value={20}>Tăng tải +20%</option>
                <option value={30}>Storyline Đề bài (+30%)</option>
                <option value={40}>Stress Test (+40%)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
