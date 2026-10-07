import React, { useState } from "react";
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Zap,
  Target,
  Leaf
} from "lucide-react";
import { askLogisticsCopilot, CopilotChatResponse } from "../api";

interface ChatMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  isSafe?: boolean;
  violations?: string[];
  suggestedActions?: string[];
  data?: any;
}

interface LogisticsCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "vi" | "en";
}

export const LogisticsCopilotModal: React.FC<LogisticsCopilotModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "copilot",
      text: (
        "Xin chào! Tôi là **Logistics Copilot (Hệ thống Hỗ trợ Ra Quyết định Thông minh)**.\n\n" +
        "Tôi được kết nối trực tiếp với mô phỏng Discrete-Event Simulation (SimPy), cây phân rã nguyên nhân gốc rễ (RCA) và bộ kiểm tra ràng buộc vật lý nhà máy (Constraint Checker).\n\n" +
        "Hãy đặt câu hỏi về điểm nghẽn, mục tiêu SLA, phương án giảm phát thải CO₂ hoặc thử nghiệm điều phối nhân sự!"
      ),
      isSafe: true,
      suggestedActions: [
        "Tại sao Cầu bốc hàng có nguy cơ nghẽn?",
        "Cần can thiệp tối thiểu gì để SLA ≥ 95%?",
        "Phương án nào cắt giảm CO2 tốt nhất?",
        "Điều động thêm 12 xe kéo được không?",
      ],
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    try {
      const res: CopilotChatResponse = await askLogisticsCopilot(q);
      const copilotMsg: ChatMessage = {
        id: `cp-${Date.now()}`,
        sender: "copilot",
        text: res.answer,
        isSafe: res.is_safe,
        violations: res.constraint_violations,
        suggestedActions: res.suggested_actions,
        data: res.data,
      };
      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err) {
      console.error("Copilot error:", err);
      const errMsg: ChatMessage = {
        id: `cp-${Date.now()}`,
        sender: "copilot",
        text: "⚠️ Đã xảy ra lỗi kết nối với máy chủ AI Copilot. Vui lòng thử lại sau.",
        isSafe: false,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: "init-reset",
        sender: "copilot",
        text: "Đã làm mới phiên hội thoại với Logistics Copilot. Bạn muốn kiểm tra phương án nào tiếp theo?",
        isSafe: true,
        suggestedActions: [
          "Tại sao Cầu bốc hàng có nguy cơ nghẽn?",
          "Cần can thiệp tối thiểu gì để SLA ≥ 95%?",
          "Phương án nào cắt giảm CO2 tốt nhất?",
          "Điều động thêm 12 xe kéo được không?",
        ],
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e1628] border-2 border-indigo-500/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#141f36] border-b border-[#233554] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-500/60 text-indigo-300">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-white text-sm">LOGISTICS COPILOT AI</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-700">
                  DECISION INTELLIGENCE
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Grounded trong mô phỏng SimPy & Giới hạn Vật lý (Zero Hallucination)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Làm mới đoạn chat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              {msg.sender === "user" ? (
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 font-medium shadow-md">
                  {msg.text}
                </div>
              ) : (
                <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-[#131c30] border border-[#223352] p-4 text-slate-200 space-y-2.5 shadow-md">
                  {/* Safety Status Pill */}
                  {msg.isSafe === false ? (
                    <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-extrabold bg-rose-950/80 text-rose-300 border border-rose-700">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>TỪ CHỐI DO VI PHẠM RÀNG BUỘC VẬT LÝ XƯỞNG</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>PHÂN TÍCH CHÍNH XÁC TỪ MÔ PHỎNG SẢN XUẤT</span>
                    </div>
                  )}

                  {/* Markdown formatted text */}
                  <div className="leading-relaxed whitespace-pre-line text-[11px] sm:text-xs">
                    {msg.text}
                  </div>

                  {/* Suggested Follow-up Actions */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="pt-2 border-t border-[#1e2c48] space-y-1.5">
                      <div className="text-[10px] text-slate-400 font-semibold">Gợi ý truy vấn tiếp theo:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestedActions.map((act, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(act)}
                            className="px-2.5 py-1 rounded-lg bg-[#18233a] hover:bg-indigo-900/60 text-indigo-300 hover:text-white font-medium text-[11px] transition cursor-pointer border border-[#273859]"
                          >
                            {act}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold p-3 bg-[#131c30] rounded-xl border border-[#223352] w-fit">
              <Sparkles className="w-4 h-4 animate-spin text-[#ff6b00]" />
              <span>Copilot đang giải mã mô phỏng SimPy & kiểm tra ràng buộc...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3.5 bg-[#141f36] border-t border-[#233554]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Nhập câu hỏi (ví dụ: 'Tại sao Cầu bốc hàng nghẽn?', 'Cần gì để SLA ≥ 95%?')..."
              className="flex-1 bg-[#0c1220] border border-[#263756] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff6b00]"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#e60012] hover:from-[#ff7b1a] hover:to-[#f01426] text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5 shadow-md shadow-[#ff6b00]/20"
            >
              <span>Gửi</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
