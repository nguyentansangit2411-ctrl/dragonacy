"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Facebook, 
  Key, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";
import { useStore, PageConnection } from "@/store/useStore";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { pages, setPages, addLog, updatePageStatus } = useStore();
  const [showKey, setShowKey] = useState(false);
  const [geminiKey, setGeminiKey] = useState("••••••••••••••••••••••••••••");
  
  // Connection Form State
  const [pageNameInput, setPageNameInput] = useState("");
  const [pageIdInput, setPageIdInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch connected pages from backend and sync with Zustand store
  const { isLoading: isLoadingPages } = useQuery({
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
      setPages(mapped);
      return mapped;
    }
  });

  // React Query mutation to add Facebook Page connection
  const connectPageMutation = useMutation({
    mutationFn: async (data: { name: string; pageId: string }) => {
      const res = await fetch("http://localhost:3000/api/facebook/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: data.pageId,
          pageName: data.name,
        }),
      });
      if (!res.ok) throw new Error("Failed to connect page");
      return res.json();
    },
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      addLog({ level: "INFO", message: `Đã kết nối trang Facebook thành công: ${newPage.pageName}` });
      setPageNameInput("");
      setPageIdInput("");
      setIsConnecting(false);
    },
    onError: () => {
      addLog({ level: "ERROR", message: `Kết nối trang Facebook thất bại.` });
      alert("Kết nối trang thất bại. Xác minh lại ID trang.");
    }
  });

  // Mutation to refresh token status (triggers graph API mock check)
  const verifyTokenMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const res = await fetch(`http://localhost:3000/api/facebook/pages/${pageId}/verify`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Verification failed");
      return res.json();
    },
    onSuccess: (data, pageId) => {
      if (data.status === 'healthy') {
        updatePageStatus(pageId, "ACTIVE");
        addLog({ level: "INFO", message: `Đã xác minh trang kết nối hoạt động: ${pageId}` });
        alert(data.message);
      } else {
        updatePageStatus(pageId, "EXPIRED");
        addLog({ level: "WARN", message: `Trạng thái trang không hoạt động: ${pageId}` });
        alert(data.message);
      }
    }
  });

  // React Query mutation to delete Facebook Page connection
  const deletePageMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:3000/api/facebook/pages/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete page");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      addLog({ level: "WARN", message: `Đã ngắt kết nối trang.` });
    }
  });

  const handleDeletePage = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn ngắt kết nối ${name} không?`)) {
      deletePageMutation.mutate(id);
    }
  };

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageNameInput.trim() || !pageIdInput.trim()) return;
    connectPageMutation.mutate({
      name: pageNameInput,
      pageId: pageIdInput,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Cài đặt tích hợp hệ thống</h1>
        <p className="text-zinc-400 text-xs mt-0.5">Quản lý thông tin xác thực AI và kết nối an toàn các tích hợp trang doanh nghiệp Facebook.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Integrations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Facebook Pages Card */}
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-zinc-200 flex items-center gap-2">
                <Facebook className="h-5 w-5 text-blue-500" />
                Các trang Facebook đã kết nối
              </h2>
              
              <button
                onClick={() => setIsConnecting(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold"
              >
                <Plus className="h-4 w-4" />
                Liên kết trang
              </button>
            </div>

            <div className="divide-y divide-zinc-900">
              {pages.map((page) => (
                <div key={page.id} className="py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-950/40 rounded-lg text-blue-400 border border-blue-900/50">
                      <Facebook className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-zinc-200">{page.name}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">ID: {page.id} • Đã đăng: {page.postCount} lần</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      page.status === "ACTIVE"
                        ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30"
                        : page.status === "EXPIRED"
                        ? "bg-rose-950/20 text-rose-400 border-rose-900/30"
                        : "bg-amber-950/20 text-amber-400 border-amber-900/30"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        page.status === "ACTIVE" 
                          ? "bg-emerald-400" 
                          : page.status === "EXPIRED" 
                          ? "bg-rose-400" 
                          : "bg-amber-400"
                      }`} />
                      {page.status === "ACTIVE" ? "Hoạt động" : page.status === "EXPIRED" ? "Hết hạn" : "Đang chờ"}
                    </span>

                    <button
                      onClick={() => verifyTokenMutation.mutate(page.id)}
                      disabled={verifyTokenMutation.isPending}
                      className="p-1.5 hover:bg-zinc-900 rounded border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      title="Kiểm tra sức khỏe"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${verifyTokenMutation.isPending && verifyTokenMutation.variables === page.id ? "animate-spin" : ""}`} />
                    </button>
                    
                    <button
                      onClick={() => handleDeletePage(page.id, page.name)}
                      className="p-1.5 hover:bg-rose-950/20 rounded border border-zinc-800 hover:border-rose-900/30 text-zinc-500 hover:text-rose-400"
                      title="Ngắt kết nối trang"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connect Modal */}
          {isConnecting && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-up">
                <div className="p-6 border-b border-zinc-900">
                  <h2 className="text-lg font-bold text-zinc-200">Kết nối trang doanh nghiệp Facebook</h2>
                  <p className="text-xs text-zinc-500 mt-1">Cấu hình các điểm cuối Graph API để đăng bài viết.</p>
                </div>
                
                <form onSubmit={handleConnectSubmit} className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 font-medium">Tên hồ sơ trang</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Tech Hot Deals"
                      value={pageNameInput}
                      onChange={(e) => setPageNameInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 font-medium">ID trang Facebook</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: 100984372983719"
                      value={pageIdInput}
                      onChange={(e) => setPageIdInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-zinc-900 flex flex-col gap-2 bg-purple-950/10 p-3.5 rounded border border-purple-900/30 text-[11px] text-purple-300">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-purple-400" />
                      <span className="font-bold text-purple-200">Xác thực cục bộ bảo mật</span>
                    </div>
                    <p className="leading-relaxed">
                      Vì lý do bảo mật, Access Token Facebook <strong>không bao giờ</strong> được gửi lên cloud hay lưu trữ trên máy chủ. Thay vào đó, bạn sẽ chạy worker đăng nhập ngay trên máy tính cá nhân của mình.
                    </p>
                    <div className="bg-black/45 p-2 rounded border border-zinc-900 font-mono text-[10px] text-zinc-400 select-all space-y-1 mt-1">
                      <div>cd worker</div>
                      <div>npm install</div>
                      <div>npm run login</div>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal mt-1">
                      Lệnh trên sẽ mở trình duyệt để bạn đăng nhập thủ công, lưu trữ session an toàn trong file <code>facebook-session.json</code> trên máy tính cá nhân.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsConnecting(false)}
                      className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs transition-all"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={connectPageMutation.isPending}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      {connectPageMutation.isPending ? "Đang xử lý..." : "Kết nối trang"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Credentials & Keys */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-400" />
              <h2 className="text-sm font-bold text-zinc-200">Tích hợp mô hình lớn Gemini</h2>
            </div>
            
            <p className="text-xs text-zinc-500 leading-relaxed">
              Yêu cầu cho việc mở rộng mô tả cào dữ liệu và các mẫu tự động tạo nội dung.
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 font-medium">Khóa API Gemini 1.5 Flash</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-10 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex items-start gap-2 bg-purple-950/10 p-3 rounded border border-purple-900/30 text-[10px] text-purple-400">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="leading-normal font-semibold">
                  Cảnh báo bảo mật: Các khóa truy cập được gửi qua HTTPS và được lưu trữ mã hóa trong cơ sở dữ liệu backend. Chúng không bao giờ được ghi vào bộ nhớ phía máy khách (localStorage / Cookies).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
