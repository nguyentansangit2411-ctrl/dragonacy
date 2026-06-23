"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Play, 
  Trash2, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Loader2, 
  Link2,
  Server,
  HelpCircle,
  AlertTriangle
} from "lucide-react";
import { useStore } from "@/store/useStore";

interface AutoPostLink {
  id: string;
  url: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AutoPostPage() {
  const queryClient = useQueryClient();
  const [urlsInput, setUrlsInput] = useState("");
  const addLog = useStore((state) => state.addLog);

  // Fetch queued links
  const { data: links = [], isLoading } = useQuery<AutoPostLink[]>({
    queryKey: ["auto-post-links"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3000/api/auto-post/links");
      if (!res.ok) throw new Error("Failed to fetch auto-post links");
      return res.json();
    },
  });

  // Mutation to add links to queue
  const addLinksMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const res = await fetch("http://localhost:3000/api/auto-post/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      if (!res.ok) throw new Error("Failed to queue links");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["auto-post-links"] });
      setUrlsInput("");
      addLog({ level: "INFO", message: `Đã thêm liên kết vào hàng đợi đăng tự động.` });
      alert(`Đã thêm thành công vào hàng đợi!`);
    },
    onError: () => {
      alert("Không thể thêm liên kết. Vui lòng kiểm tra lại kết nối backend.");
    }
  });

  // Mutation to delete a link
  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:3000/api/auto-post/links/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete link");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-post-links"] });
      addLog({ level: "WARN", message: `Đã xóa liên kết khỏi hàng đợi.` });
    }
  });

  // Mutation to clear all links
  const clearLinksMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("http://localhost:3000/api/auto-post/links/clear", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to clear queue");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-post-links"] });
      addLog({ level: "WARN", message: `Đã xóa sạch hàng đợi đăng tự động.` });
    }
  });

  // Mutation to trigger pipeline immediately
  const triggerWorkflowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("http://localhost:3000/api/auto-post/trigger", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Trigger failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["auto-post-links"] });
      if (data.success) {
        addLog({ level: "INFO", message: `Chạy tự động hóa hoàn tất. Bài đăng đã lên hàng đợi đăng chính.` });
        alert("🎉 Chạy tự động hóa thành công!\nSản phẩm đã được cào, ảnh đã chọn, bài viết AI đã viết xong và được chuyển sang trạng thái chờ đăng.");
      } else {
        if (data.reason === "QUEUE_EMPTY") {
          alert("ℹ️ Hàng đợi đang rỗng. Vui lòng thêm link sản phẩm vào trước.");
        } else if (data.reason === "NO_ACTIVE_FB_PAGE") {
          alert("❌ Không có trang Facebook nào đang hoạt động. Vui lòng thiết lập trong Cài đặt.");
        } else {
          alert(`❌ Quy trình gặp lỗi: ${data.error || data.reason}`);
        }
      }
    },
    onError: (err: any) => {
      alert(`❌ Lỗi kết nối hoặc xử lý tự động hóa: ${err.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = urlsInput
      .split("\n")
      .map(u => u.trim())
      .filter(u => u !== "");
    
    if (urls.length === 0) return;
    addLinksMutation.mutate(urls);
  };

  const handleClearAll = () => {
    if (confirm("Bạn có chắc chắn muốn xóa sạch toàn bộ hàng đợi link không?")) {
      clearLinksMutation.mutate();
    }
  };

  const renderStatus = (status: AutoPostLink["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Clock className="h-3.5 w-3.5" /> Chờ xử lý
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang cào & AI
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle className="h-3.5 w-3.5" /> Hoàn thành
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <AlertCircle className="h-3.5 w-3.5" /> Lỗi
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tự động đăng bài (Auto-Post Queue)</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Cung cấp liên kết sản phẩm. Hệ thống sẽ tự động cào, chọn 5 ảnh, viết bài chuẩn review và đăng vào 8:00, 12:00, 17:00 hàng ngày.
          </p>
        </div>
        
        <button
          onClick={() => triggerWorkflowMutation.mutate()}
          disabled={triggerWorkflowMutation.isPending || links.filter(l => l.status === "PENDING").length === 0}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-md"
        >
          {triggerWorkflowMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Chạy thử ngay (Trigger Next Link)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Queue control & Link input */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Plus className="h-5 w-5 text-purple-500" />
              Thêm liên kết vào hàng đợi
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Nhập link sản phẩm (Mỗi dòng một link)
                </label>
                <textarea
                  value={urlsInput}
                  onChange={(e) => setUrlsInput(e.target.value)}
                  placeholder="https://shopvnb.com/giay-yonex-stratas.html&#10;https://hvshop.vn/giay-yonex-stratas/"
                  rows={8}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={addLinksMutation.isPending}
                className="w-full py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-all"
              >
                {addLinksMutation.isPending ? "Đang xử lý..." : "Thêm vào hàng đợi"}
              </button>
            </form>
          </div>

          {/* Settings info card */}
          <div className="glass-panel p-6 rounded-xl space-y-3 bg-muted/20">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-purple-500" />
              Thông tin cấu hình tự động
            </h3>
            <div className="text-[11px] space-y-2 text-muted-foreground leading-relaxed">
              <p>
                <strong>Khung giờ chạy:</strong> Hệ thống tự động quét và cào sản phẩm đăng bài vào các mốc: <span className="text-foreground font-semibold">08:00</span>, <span className="text-foreground font-semibold">12:00</span> và <span className="text-foreground font-semibold">17:00</span> hàng ngày.
              </p>
              <p>
                <strong>Affiliate Link:</strong> Đường dẫn mua hàng ở comment sẽ tự động được bọc qua template cài đặt trong biến môi trường <code className="bg-background px-1 py-0.5 rounded border border-border text-foreground">AFFILIATE_LINK_TEMPLATE</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Right column - Queue Table & Deployment Guide */}
        <div className="lg:col-span-2 space-y-6">
          {/* Links Queue Table */}
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-foreground">Hàng đợi liên kết sản phẩm ({links.length})</h2>
              {links.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa sạch hàng đợi
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              </div>
            ) : links.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg bg-muted/10">
                <Link2 className="h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">Hàng đợi trống</p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5 max-w-[280px]">
                  Hãy dán các liên kết sản phẩm từ ShopVNB hoặc HVShop vào khung bên trái để bắt đầu.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Liên kết</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Trạng thái</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Thời gian tạo</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-muted-foreground">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card/40">
                    {links.map((link) => (
                      <tr key={link.id} className="hover:bg-muted/30 transition-colors text-xs">
                        <td className="px-4 py-3 max-w-[200px] md:max-w-[300px]">
                          <div className="flex flex-col gap-1">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-purple-500 hover:underline truncate block"
                            >
                              {link.url}
                            </a>
                            {link.status === "FAILED" && link.errorMessage && (
                              <span className="text-[10px] text-rose-500 flex items-start gap-1 leading-snug">
                                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                {link.errorMessage}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{renderStatus(link.status)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-[11px] whitespace-nowrap">
                          {new Date(link.createdAt).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => deleteLinkMutation.mutate(link.id)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-rose-500 transition-colors"
                            title="Xóa khỏi hàng đợi"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Deployment instructions card */}
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-500" />
              Hướng dẫn triển khai Server (Chạy 24/7)
            </h2>
            
            <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                Để hệ thống có thể đăng bài tự động ngay cả khi bạn tắt laptop, bạn cần deploy toàn bộ dự án lên một VPS (Virtual Private Server) chạy Linux (Ubuntu).
              </p>
              
              <div className="space-y-2 bg-muted/30 p-4 rounded-lg border border-border">
                <p className="font-semibold text-foreground text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Bước 1: Chạy Database & Redis trên VPS
                </p>
                <p className="text-[11px]">
                  Cài đặt Docker & Docker Compose trên VPS, sao chép thư mục dự án và chạy:
                </p>
                <pre className="bg-black/50 text-zinc-300 p-2 rounded text-[10px] font-mono overflow-x-auto">
                  cd backend && docker-compose up -d
                </pre>
                
                <p className="font-semibold text-foreground text-xs flex items-center gap-1 pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Bước 2: Build & Chạy Backend/Frontend bằng PM2
                </p>
                <p className="text-[11px]">
                  Cài đặt Node.js và chạy PM2 để duy trì hoạt động của backend & frontend:
                </p>
                <pre className="bg-black/50 text-zinc-300 p-2 rounded text-[10px] font-mono overflow-x-auto">
                  # Tại backend: npm run build && pm2 start dist/src/main.js --name backend&#10;# Tại frontend: npm run build && pm2 start npm --name frontend -- start
                </pre>
                
                <p className="font-semibold text-foreground text-xs flex items-center gap-1 pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Bước 3: Đồng bộ Session Cookie và Chạy Worker Headless
                </p>
                <p className="text-[11px]">
                  Chạy <code className="bg-background px-1 rounded text-foreground font-mono">npm run login</code> trên laptop cá nhân để lấy file cookie <code className="bg-background px-1 rounded text-foreground font-mono">facebook-session.json</code>, sau đó tải file này lên VPS đặt tại thư mục <code className="bg-background px-1 rounded text-foreground font-mono">worker/</code>. Chạy worker trên VPS bằng màn hình ảo Xvfb:
                </p>
                <pre className="bg-black/50 text-zinc-300 p-2 rounded text-[10px] font-mono overflow-x-auto">
                  # Cài đặt Playwright & Xvfb trên VPS&#10;sudo apt-get install -y xvfb&#10;npx playwright install chromium && npx playwright install-deps&#10;&#10;# Chạy worker qua Xvfb&#10;pm2 start --name worker -- xvfb-run ts-node src/index.ts
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
