import React, { useState, useEffect } from "react";
import { 
  History, 
  Shield, 
  CheckCircle2, 
  Clock, 
  FileText,
  Lock,
  Search,
  Download,
  Filter,
  Check
} from "lucide-react";
import { fetchDecisions, fetchAuditLogs } from "../api";

interface AuditTabProps {
  lang: "vi" | "en";
  isActive?: boolean;
}

export const AuditTab: React.FC<AuditTabProps> = ({ lang, isActive }) => {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"DECISIONS" | "SYSTEM_LOGS">("DECISIONS");
  const [searchTerm, setSearchTerm] = useState("");

  const reloadAuditData = () => {
    setLoading(true);
    Promise.all([fetchDecisions(), fetchAuditLogs()])
      .then(([decRes, logRes]) => {
        setDecisions(decRes);
        setLogs(logRes);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reloadAuditData();
  }, [isActive]);

  const t = {
    vi: {
      decisionsTitle: "SỔ CÁI QUYẾT ĐỊNH ĐIỀU PHỐI ĐÃ PHÊ DUYỆT (OPERATOR DECISIONS LEDGER)",
      auditTitle: "NHẬT KÝ TRUY VẾT HỆ THỐNG (TAMPER-EVIDENT AUDIT TRAIL)",
      emptyDec: "Chưa có quyết định điều phối nào được ghi nhận.",
      emptyLog: "Chưa có bản ghi audit nào.",
      tamperBadge: "SỔ CÁI BẢO MẬT BẤT BIẾN (SHA-256 VERIFIED)",
      tabDecisions: "Quyết định điều phối",
      tabLogs: "Nhật ký hệ thống",
      totalDecisions: "Tổng quyết định",
      approvedTotal: "Đã phê duyệt",
      committedCost: "Chi phí cam kết",
    },
    en: {
      decisionsTitle: "OPERATOR DISPATCH DECISIONS LEDGER",
      auditTitle: "TAMPER-EVIDENT SYSTEM AUDIT TRAIL",
      emptyDec: "No operator decisions recorded yet.",
      emptyLog: "No audit records found.",
      tamperBadge: "TAMPER-EVIDENT LEDGER (SHA-256 VERIFIED)",
      tabDecisions: "Operator Decisions",
      tabLogs: "System Logs",
      totalDecisions: "Total Decisions",
      approvedTotal: "Approved Actions",
      committedCost: "Committed Budget",
    },
  }[lang];

  const totalCost = decisions.reduce((acc, d) => acc + (d.cost_vnd || 0), 0);

  const filteredDecisions = decisions.filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      d.decision_id?.toLowerCase().includes(q) ||
      d.action_name?.toLowerCase().includes(q) ||
      d.operator_name?.toLowerCase().includes(q)
    );
  });

  const filteredLogs = logs.filter((l) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      l.action_type?.toLowerCase().includes(q) ||
      l.user_name?.toLowerCase().includes(q) ||
      l.entity_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Security & Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="control-panel p-4">
          <div className="text-slate-400 text-xs mb-1">{t.totalDecisions}</div>
          <div className="text-2xl font-extrabold text-white">{decisions.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Ghi nhận vào SQLite DB</div>
        </div>

        <div className="control-panel p-4">
          <div className="text-slate-400 text-xs mb-1">{t.approvedTotal}</div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {decisions.filter((d) => d.decision_status === "APPROVED").length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Lệnh đã có hiệu lực</div>
        </div>

        <div className="control-panel p-4">
          <div className="text-slate-400 text-xs mb-1">{t.committedCost}</div>
          <div className="text-2xl font-extrabold text-[#ff6b00]">
            {totalCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">đ</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Ngân sách điều động thực tế</div>
        </div>
      </div>

      {/* Main Ledger Panel */}
      <div className="control-panel p-5.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-[#101726] p-1 rounded-lg border border-[#23314d]">
              <button
                onClick={() => setActiveView("DECISIONS")}
                className={`px-3 py-1.5 text-xs rounded-md font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                  activeView === "DECISIONS"
                    ? "bg-[#ff6b00] text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t.tabDecisions} ({decisions.length})</span>
              </button>
              <button
                onClick={() => setActiveView("SYSTEM_LOGS")}
                className={`px-3 py-1.5 text-xs rounded-md font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                  activeView === "SYSTEM_LOGS"
                    ? "bg-[#ff6b00] text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>{t.tabLogs} ({logs.length})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-[10px] font-mono font-bold flex items-center space-x-1.5">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>{t.tamperBadge}</span>
            </div>
          </div>
        </div>

        {/* Decisions Table View */}
        {activeView === "DECISIONS" && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{t.decisionsTitle}</span>
            </h2>

            {filteredDecisions.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                {t.emptyDec} (Vui lòng bấm 'Phê duyệt & Ban hành' tại tab Đối sách để ghi nhận).
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#23314d]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#23314d] text-slate-300 bg-[#141c2e]">
                      <th className="py-3 px-3.5 font-bold">Mã quyết định</th>
                      <th className="py-3 px-3 font-semibold">Thời điểm</th>
                      <th className="py-3 px-3 font-semibold">Người phê duyệt</th>
                      <th className="py-3 px-3 font-semibold">Phương án được chọn</th>
                      <th className="py-3 px-3 font-semibold">Trạng thái</th>
                      <th className="py-3 px-3 font-semibold">Chi phí</th>
                      <th className="py-3 px-3.5 font-semibold">Ghi chú điều phối</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2a44] bg-[#0f1626]/80">
                    {filteredDecisions.map((dec) => (
                      <tr key={dec.decision_id} className="hover:bg-[#18233a]/60 text-slate-300 transition">
                        <td className="py-3 px-3.5 font-mono text-[#ff8f3d] font-bold">{dec.decision_id}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {dec.timestamp ? dec.timestamp.replace("T", " ").slice(0, 19) : "-"}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white">{dec.operator_name}</td>
                        <td className="py-3 px-3 text-emerald-400 font-medium">{dec.action_name}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-extrabold">
                            {dec.decision_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {dec.cost_vnd ? `${dec.cost_vnd.toLocaleString()} đ` : "0 đ"}
                        </td>
                        <td className="py-3 px-3.5 text-slate-400">{dec.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* System Logs Table View */}
        {activeView === "SYSTEM_LOGS" && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
              <History className="w-4 h-4 text-indigo-400" />
              <span>{t.auditTitle}</span>
            </h2>

            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">{t.emptyLog}</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#23314d]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#23314d] text-slate-300 bg-[#141c2e]">
                      <th className="py-3 px-3.5 font-bold">Thời điểm</th>
                      <th className="py-3 px-3 font-semibold">Tác vụ</th>
                      <th className="py-3 px-3 font-semibold">Tác tử thực hiện</th>
                      <th className="py-3 px-3 font-semibold">Đối tượng</th>
                      <th className="py-3 px-3.5 font-semibold">Chi tiết payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2a44] bg-[#0f1626]/80">
                    {filteredLogs.map((lg) => (
                      <tr key={lg.id} className="hover:bg-[#18233a]/60 text-slate-300 transition">
                        <td className="py-3 px-3.5 font-mono text-slate-400">
                          {lg.timestamp ? lg.timestamp.replace("T", " ").slice(0, 19) : "-"}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">{lg.action_type}</td>
                        <td className="py-3 px-3 text-slate-200">{lg.user_name}</td>
                        <td className="py-3 px-3 font-mono text-indigo-300">{lg.entity_id || "-"}</td>
                        <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px] truncate max-w-sm">
                          {JSON.stringify(lg.details || {})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
