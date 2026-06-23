"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  Clock, 
  RotateCw, 
  Settings2, 
  ChevronRight, 
  Calendar, 
  AlertTriangle,
  Play,
  XCircle
} from "lucide-react";
import { useStore, PostQueueItem } from "@/store/useStore";

export default function QueuePage() {
  const { updateQueueItem, addLog } = useStore();
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [newTime, setNewTime] = useState("");

  // Fetch Schedules (Queue) from backend
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3000/api/schedules");
      if (!res.ok) throw new Error("Failed to fetch schedules");
      const list = await res.json();
      const mapped = list.map((s: any) => ({
        id: s.id,
        productId: s.postDraft?.productId || "",
        productName: s.postDraft?.product?.title || "Sản phẩm không có tên",
        pageId: s.facebookPageId,
        pageName: s.facebookPage?.pageName || "Chưa gán trang",
        content: s.postDraft?.content || "",
        status: s.status === "SUCCESS" ? "PUBLISHED" : (s.status === "AWAITING_WORKER" || s.status === "PENDING" ? "READY" : s.status === "PROCESSING" ? "GENERATING" : "FAILED"),
        scheduledTime: s.postTime,
        retryCount: s.retryCount,
        errorMessage: s.errorMessage || undefined,
      }));
      useStore.setState({ queue: mapped });
      return mapped;
    }
  });

  const queue = schedules;

  // Expontential Backoff Settings
  const [baseDelay, setBaseDelay] = useState(15); // minutes
  const [maxRetries, setMaxRetries] = useState(5);

  // Mutation to retry a failed posting queue item
  const retryMutation = useMutation({
    mutationFn: async (itemId: string) => {
      // Simulating trigger to re-schedule retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return itemId;
    },
    onSuccess: (id) => {
      updateQueueItem(id, { 
        status: "READY", 
        retryCount: 0, 
        errorMessage: undefined,
        scheduledTime: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
      });
      addLog({ level: "INFO", message: `Post queue item ${id} reset. Status set to READY for retry.` });
    }
  });

  const handleReschedule = (id: string) => {
    if (!newTime) return;
    const isoString = new Date(newTime).toISOString();
    updateQueueItem(id, { scheduledTime: isoString });
    setReschedulingId(null);
    setNewTime("");
    addLog({ level: "INFO", message: `Rescheduled post ${id} to ${newTime}` });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Hàng đợi đăng</h1>
          <p className="text-zinc-400 text-xs mt-0.5">Cấu hình lịch đăng bài, chính sách thử lại và các kích hoạt thực thi thủ công.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Queue Flow */}
        <div className="glass-panel p-6 rounded-xl lg:col-span-2 space-y-6">
          <h2 className="text-base font-bold text-zinc-200">Lịch trình đăng bài</h2>
          
          <div className="relative border-l border-zinc-800 pl-6 ml-4 space-y-8">
            {queue.map((item: any) => {
              const isRescheduling = reschedulingId === item.id;
              
              return (
                <div key={item.id} className="relative group">
                  {/* Timeline Dot */}
                  <span className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 bg-zinc-950 ${
                    item.status === "PUBLISHED"
                      ? "border-emerald-500"
                      : item.status === "FAILED"
                      ? "border-rose-500 animate-pulse"
                      : item.status === "GENERATING"
                      ? "border-purple-500 animate-pulse"
                      : "border-indigo-400"
                  }`} />

                  <div className="glass-card p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-zinc-200">{item.productName}</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Đích: {item.pageName}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 text-[9px] rounded font-medium border ${
                          item.status === "PUBLISHED"
                            ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
                            : item.status === "FAILED"
                            ? "bg-rose-950/20 text-rose-400 border-rose-900/50"
                            : item.status === "GENERATING"
                            ? "bg-purple-950/20 text-purple-400 border-purple-900/50"
                            : "bg-indigo-950/20 text-indigo-400 border-indigo-900/50"
                        }`}>
                          {item.status === "PUBLISHED"
                            ? "Đã đăng"
                            : item.status === "FAILED"
                            ? "Thất bại"
                            : item.status === "GENERATING"
                            ? "Đang tạo..."
                            : "Sẵn sàng"}
                        </span>
                      </div>
                    </div>

                    {item.content && (
                      <p className="text-[11px] text-zinc-400 line-clamp-1 italic">
                        "{item.content}"
                      </p>
                    )}

                    {item.status === "FAILED" && item.errorMessage && (
                      <div className="flex items-start gap-1.5 p-2 rounded bg-rose-950/20 border border-rose-900/40 text-[10px] text-rose-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Thực thi thất bại (Lần thử {item.retryCount}/{maxRetries})</p>
                          <p className="text-zinc-400">{item.errorMessage}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-zinc-900/60 pt-3 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.scheduledTime).toLocaleString()}
                      </span>

                      <div className="flex gap-2">
                        {item.status === "FAILED" && (
                          <button
                            onClick={() => retryMutation.mutate(item.id)}
                            disabled={retryMutation.isPending}
                            className="flex items-center gap-1 px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-semibold transition-all disabled:opacity-50"
                          >
                            <RotateCw className="h-2.5 w-2.5" />
                            Thử lại ngay
                          </button>
                        )}
                        
                        {item.status !== "PUBLISHED" && (
                          <>
                            {isRescheduling ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="datetime-local"
                                  className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-zinc-100 focus:outline-none"
                                  value={newTime}
                                  onChange={(e) => setNewTime(e.target.value)}
                                />
                                <button
                                  onClick={() => handleReschedule(item.id)}
                                  className="px-1.5 py-0.5 bg-purple-600 text-white rounded"
                                >
                                  Đồng ý
                                </button>
                                <button
                                  onClick={() => setReschedulingId(null)}
                                  className="px-1.5 py-0.5 bg-zinc-900 text-zinc-400 rounded"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setReschedulingId(item.id)}
                                className="text-zinc-400 hover:text-zinc-200 font-medium"
                              >
                                Đổi lịch đăng
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Retry & Backoff Configs */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-purple-400" />
              <h2 className="text-sm font-bold text-zinc-200">Chính sách tự động thử lại</h2>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Khi gặp các lỗi tạm thời của Facebook (giới hạn tần suất, lỗi máy chủ), hệ thống thực hiện thử lại theo cơ chế lùi bước mũ.
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium">Độ trễ lùi bước cơ bản (phút)</label>
                <input
                  type="number"
                  min={1}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                  value={baseDelay}
                  onChange={(e) => setBaseDelay(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium">Giới hạn số lần thử lại tối đa</label>
                <input
                  type="number"
                  min={1}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(Number(e.target.value))}
                />
              </div>
              
              <div className="pt-2 text-[10px] text-zinc-500 leading-relaxed border-t border-zinc-900">
                <p className="font-semibold text-zinc-400">Công thức lùi bước được áp dụng:</p>
                <code className="block bg-zinc-950 p-2 rounded mt-1 text-purple-400 font-mono text-[9px]">
                  Độ trễ = {baseDelay} phút * 2^lần_thử + nhiễu (0-60s)
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
