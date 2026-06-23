"use client";

import React, { useState } from "react";
import { Terminal, Search, Trash2, RefreshCcw, ShieldAlert } from "lucide-react";
import { useStore, SystemLog } from "@/store/useStore";
import { useQuery } from "@tanstack/react-query";

export default function LogsPage() {
  const { clearLogs, addLog } = useStore();
  const [filterLevel, setFilterLevel] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch Logs from backend
  const { data: dbLogs = [], isLoading } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3000/api/logs?limit=100");
      if (!res.ok) throw new Error("Failed to fetch logs");
      const list = await res.json();
      const mapped = list.map((l: any) => ({
        id: l.id,
        timestamp: l.createdAt,
        level: l.level,
        message: l.message,
      }));
      useStore.setState({ logs: mapped });
      return mapped;
    }
  });

  const logs = dbLogs;

  const handleClear = () => {
    clearLogs();
    addLog({ level: "INFO", message: "Logs cleared by administrative user." });
  };

  const filteredLogs = logs.filter((log: any) => {
    const matchesLevel = filterLevel === "ALL" || log.level === filterLevel;
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.level.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Terminal className="h-6 w-6 text-purple-400" />
            Nhật ký hệ thống
          </h1>
          <p className="text-zinc-400 text-xs mt-0.5">Lịch sử hoạt động của tiến trình tự động đăng bài, công cụ cào dữ liệu và các yêu cầu OpenAI/Gemini.</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-xl space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Tìm kiếm nhật ký..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500 w-48 sm:w-64"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              {(["ALL", "INFO", "WARN", "ERROR"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${
                    filterLevel === lvl 
                      ? "bg-zinc-800 text-zinc-100 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {lvl === "ALL" ? "Tất cả" : lvl === "INFO" ? "Thông tin" : lvl === "WARN" ? "Cảnh báo" : "Lỗi"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                addLog({ level: "INFO", message: "Manual check triggered: Posting queue scanned." });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Quét ngay
            </button>
            
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-rose-950/20 border border-zinc-800 hover:border-rose-900/50 text-zinc-500 hover:text-rose-400 rounded-lg text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa nhật ký
            </button>
          </div>
        </div>

        {/* Console display */}
        <div className="font-mono text-xs bg-zinc-950/90 border border-zinc-900 rounded-xl p-4 min-h-[400px] max-h-[600px] overflow-y-auto space-y-3 shadow-inner scrollbar-thin">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 pt-24 space-y-2">
              <ShieldAlert className="h-8 w-8" />
              <p>Không có bản ghi nhật ký nào khớp với bộ lọc</p>
            </div>
          ) : (
            filteredLogs.map((log: any) => (
              <div 
                key={log.id} 
                className={`py-1 flex items-start gap-4 border-b border-zinc-900/40 hover:bg-zinc-900/10 px-2 rounded transition-colors ${
                  log.level === "ERROR" 
                    ? "bg-rose-950/5" 
                    : log.level === "WARN" 
                    ? "bg-amber-950/5" 
                    : ""
                }`}
              >
                {/* Timestamp */}
                <span className="text-zinc-600 select-none shrink-0 font-medium text-[11px] pt-0.5">
                  {new Date(log.timestamp).toISOString()}
                </span>
                
                {/* Level badge */}
                <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${
                  log.level === "ERROR" 
                    ? "text-rose-400" 
                    : log.level === "WARN" 
                    ? "text-amber-400" 
                    : "text-blue-400"
                }`}>
                  [{log.level === "INFO" ? "THÔNG TIN" : log.level === "WARN" ? "CẢNH BÁO" : "LỖI"}]
                </span>

                {/* Message */}
                <span className="text-zinc-300 break-all leading-relaxed whitespace-pre-wrap">
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
