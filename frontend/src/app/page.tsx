"use client";

import React from "react";
import ThreeCanvas from "@/components/ThreeCanvas";
import { useStore } from "@/store/useStore";
import { useQuery } from "@tanstack/react-query";
import { 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Facebook
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  // Fetch Facebook pages
  const { data: connectedPages = [] } = useQuery({
    queryKey: ["pages"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3000/api/facebook/pages");
      if (!res.ok) throw new Error("Failed to fetch pages");
      const list = await res.json();
      const mapped = list.map((p: any) => ({
        id: p.id,
        name: p.pageName,
        status: p.isActive ? "ACTIVE" : "EXPIRED",
        postCount: 0,
      }));
      useStore.setState({ pages: mapped });
      return mapped;
    }
  });

  // Fetch Schedules (Queue)
  const { data: schedules = [] } = useQuery({
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

  // Fetch Logs
  const { data: systemLogs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3000/api/logs?limit=50");
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

  // Fetch Products for metric
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3000/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    }
  });

  const totalProducts = products.length;
  const totalPublished = schedules.filter((s: any) => s.status === "PUBLISHED").length;
  const pendingQueue = schedules.filter((s: any) => s.status === "READY" || s.status === "GENERATING").length;
  const failedQueue = schedules.filter((s: any) => s.status === "FAILED").length;
  
  const activePagesCount = connectedPages.filter((p: any) => p.status === "ACTIVE").length;
  const tokenHealth = connectedPages.length > 0 
    ? Math.round((activePagesCount / connectedPages.length) * 100) 
    : 100;

  const queue = schedules;
  const logs = systemLogs;
  const pages = connectedPages;
  const metrics = {
    totalProducts,
    totalPublished,
    pendingQueue,
    failedQueue,
    tokenHealth
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-50 to-zinc-300 bg-clip-text text-transparent">
            Bảng điều khiển hệ thống
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Giám sát quá trình tạo nội dung AI, lên lịch và trạng thái đăng bài qua Facebook Graph API.
          </p>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-sm transition-all hover:bg-zinc-800 self-start"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới số liệu
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div className="glass-panel p-5 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sản phẩm đồng bộ</span>
            <div className="p-2 bg-blue-950/40 rounded-lg text-blue-400 border border-blue-900/50">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold">{metrics.totalProducts}</h3>
            <p className="text-[10px] text-zinc-500 mt-1">Nguồn từ Amazon & Aliexpress</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel p-5 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bài viết đã đăng</span>
            <div className="p-2 bg-emerald-950/40 rounded-lg text-emerald-400 border border-emerald-900/50">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold">{metrics.totalPublished}</h3>
            <p className="text-[10px] text-zinc-500 mt-1">100% bình luận link liên kết đã đăng</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel p-5 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Hàng đợi chờ đăng</span>
            <div className="p-2 bg-purple-950/40 rounded-lg text-purple-400 border border-purple-900/50">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold">{metrics.pendingQueue}</h3>
            <p className="text-[10px] text-zinc-500 mt-1">Đã tạo và đang chờ bộ lập lịch</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel p-5 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Thất bại / Thử lại</span>
            <div className="p-2 bg-rose-950/40 rounded-lg text-rose-400 border border-rose-900/50">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-rose-400">{metrics.failedQueue}</h3>
            <p className="text-[10px] text-zinc-500 mt-1">Hết hạn Token OAuth / Mã lỗi 190</p>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="glass-panel p-5 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sức khỏe Token trang</span>
            <div className="p-2 bg-indigo-950/40 rounded-lg text-indigo-400 border border-indigo-900/50">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold">{metrics.tokenHealth}%</h3>
            <p className="text-[10px] text-zinc-500 mt-1">{activePagesCount} trên {pages.length} trang hoạt động</p>
          </div>
        </div>
      </div>

      {/* 3D Visualizer Canvas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-200">Trực quan hóa luồng công việc đang hoạt động</h2>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-950/40 text-purple-400 border border-purple-800/30">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping" />
            Trạng thái trực tiếp
          </span>
        </div>
        <ThreeCanvas />
      </div>

      {/* Bottom Layout - Queue & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue Preview */}
        <div className="glass-panel p-6 rounded-xl lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-zinc-200">Hàng đợi sắp tới</h2>
              <p className="text-xs text-zinc-400">Các bài đăng tiếp theo lên Facebook theo lịch trình</p>
            </div>
            <Link 
              href="/queue" 
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 hover:underline"
            >
              Quản lý hàng đợi
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-semibold">
                  <th className="py-2.5 pb-3">Sản phẩm</th>
                  <th className="py-2.5 pb-3">Trang Facebook đích</th>
                  <th className="py-2.5 pb-3">Trạng thái</th>
                  <th className="py-2.5 pb-3 text-right">Thời gian đăng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {queue.slice(0, 3).map((item: any) => (
                  <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors group">
                    <td className="py-3 font-medium text-zinc-200 group-hover:text-white">
                      {item.productName}
                    </td>
                    <td className="py-3 text-zinc-400 flex items-center gap-1.5">
                      <Facebook className="h-3 w-3 text-blue-500" />
                      {item.pageName}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                        item.status === "READY" 
                          ? "bg-indigo-950/30 text-indigo-400 border-indigo-900/50"
                          : item.status === "GENERATING"
                          ? "bg-purple-950/30 text-purple-400 border-purple-900/50 animate-pulse"
                          : item.status === "FAILED"
                          ? "bg-rose-950/30 text-rose-400 border-rose-900/50"
                          : "bg-emerald-950/30 text-emerald-400 border-emerald-900/50"
                      }`}>
                        {item.status === "READY" 
                          ? "Sẵn sàng" 
                          : item.status === "GENERATING" 
                          ? "Đang tạo..." 
                          : item.status === "FAILED" 
                          ? "Thất bại" 
                          : "Đã đăng"}
                      </span>
                    </td>
                    <td className="py-3 text-right text-zinc-500">
                      {new Date(item.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live System Logs */}
        <div className="glass-panel p-6 rounded-xl flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-zinc-200">Nhật ký thực thi</h2>
              <p className="text-xs text-zinc-400">Các tiến trình ngầm thời gian thực</p>
            </div>
            <Link 
              href="/logs" 
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 hover:underline"
            >
              Tất cả nhật ký
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[160px] font-mono text-[10px] space-y-2 border border-zinc-900 p-3 rounded-lg bg-zinc-950/60 shadow-inner">
            {logs.slice(0, 5).map((log: any) => (
              <div key={log.id} className="flex gap-2 leading-relaxed">
                <span className="text-zinc-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span className={
                  log.level === "ERROR" 
                    ? "text-rose-400" 
                    : log.level === "WARN" 
                    ? "text-amber-400" 
                    : "text-zinc-400"
                }>
                  [{log.level === "INFO" ? "THÔNG TIN" : log.level === "WARN" ? "CẢNH BÁO" : "LỖI"}]
                </span>
                <span className="text-zinc-300 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
