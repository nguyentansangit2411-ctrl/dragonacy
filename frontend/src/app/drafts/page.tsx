"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Sparkles, 
  Send, 
  Calendar, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle, 
  Facebook 
} from "lucide-react";
import { useStore, PostQueueItem } from "@/store/useStore";

export default function DraftsPage() {
  const queryClient = useQueryClient();
  const queue = useStore((state) => state.queue);
  const updateQueueItem = useStore((state) => state.updateQueueItem);
  const pages = useStore((state) => state.pages);
  const addLog = useStore((state) => state.addLog);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  
  // Custom AI command states
  const [customPrompt, setCustomPrompt] = useState("");
  const [refiningId, setRefiningId] = useState<string | null>(null);

  // Fetch pages from backend and sync with Zustand store
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

  // Fetch drafts from backend and sync with Zustand store
  const { data: draftsList = [], isLoading: isLoadingDrafts } = useQuery({
    queryKey: ["drafts"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3000/api/post-drafts");
      if (!res.ok) throw new Error("Failed to fetch drafts");
      const list = await res.json();
      
      // Map post drafts to match PostQueueItem interface
      const mapped = list.map((d: any) => ({
        id: d.id,
        productId: d.productId || "",
        productName: d.product?.title || "Sản phẩm không có tên",
        pageId: d.schedules?.[0]?.facebookPageId || connectedPages[0]?.id || "",
        pageName: d.schedules?.[0]?.facebookPage?.pageName || connectedPages[0]?.name || "Chưa gán trang",
        content: d.content,
        status: d.status === 'DRAFT' ? 'READY' : d.status,
        scheduledTime: d.schedules?.[0]?.postTime || new Date().toISOString(),
        retryCount: d.schedules?.[0]?.retryCount || 0,
      }));
      useStore.setState({ queue: mapped });
      return mapped;
    }
  });

  // Filter queue for drafts (PENDING, GENERATING, READY, FAILED)
  const drafts = draftsList.filter((q: any) => q.status !== "PUBLISHED");

  // React Query mutation to publish a draft immediately to Facebook API
  const publishMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const draft = draftsList.find((d: any) => d.id === draftId);
      const targetPageId = selectedPageId || draft?.pageId || connectedPages[0]?.id;
      if (!targetPageId) throw new Error("Chưa có trang Facebook nào được kết nối. Hãy cấu hình cài đặt trước.");
      
      const res = await fetch(`http://localhost:3000/api/post-drafts/${draftId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facebookPageId: targetPageId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to publish");
      }
      return { id: draftId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      addLog({ level: "INFO", message: `Đã đưa bài đăng ${data.id} vào hàng đợi xuất bản thành công.` });
      alert("Yêu cầu gửi đi thành công! Bài đăng đã được chuyển sang hàng đợi xuất bản và đang chờ Local Worker tải lên.");
    },
    onError: (err: any) => {
      addLog({ level: "ERROR", message: `Gửi bài viết thất bại: ${err.message}` });
      alert(`Đăng bài thất bại: ${err.message}`);
    }
  });

  // React Query mutation for AI copywriting adjustments (Gemini)
  const refineMutation = useMutation({
    mutationFn: async ({ draftId, instruction }: { draftId: string, instruction: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const targetDraft = queue.find(q => q.id === draftId);
      return {
        id: draftId,
        refinedContent: `🤖 AI Refined Content (${instruction}):\n\n${targetDraft?.content || ""}\n\n💥 Don't miss this! Limited stock left.`
      };
    },
    onSuccess: (data) => {
      updateQueueItem(data.id, { content: data.refinedContent });
      addLog({ level: "INFO", message: `AI refined copywriting for draft ID: ${data.id}` });
      setRefiningId(null);
      setCustomPrompt("");
    }
  });

  const startEdit = (draft: PostQueueItem) => {
    setEditingId(draft.id);
    setEditText(draft.content);
    setSelectedPageId(draft.pageId);
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/post-drafts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editText,
        }),
      });
      if (!res.ok) throw new Error("Failed to save edit");
      
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      setEditingId(null);
      addLog({ level: "INFO", message: `Đã cập nhật bài viết nháp ID: ${id}` });
    } catch (err: any) {
      alert("Lưu chỉnh sửa thất bại: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Bài viết nháp</h1>
        <p className="text-zinc-400 text-xs mt-0.5">Chỉnh sửa nội dung AI, điều chỉnh các trang Facebook mục tiêu và kích hoạt đăng ngay.</p>
      </div>

      <div className="space-y-4">
        {drafts.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-xl">
            <Sparkles className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Không có bài viết nháp nào hoạt động. Đi tới trang 'Sản phẩm' để tạo bài viết!</p>
          </div>
        ) : (
          drafts.map((draft: any) => {
            const isEditing = editingId === draft.id;
            return (
              <div key={draft.id} className="glass-panel p-6 rounded-xl space-y-4 border-l-4 border-purple-500">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-200">{draft.productName}</h3>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Facebook className="h-3 w-3 text-blue-500" />
                        {draft.pageName}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Lịch đăng: {new Date(draft.scheduledTime).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] rounded border ${
                      draft.status === "READY" 
                        ? "bg-indigo-950/30 text-indigo-400 border-indigo-900/50"
                        : draft.status === "GENERATING"
                        ? "bg-purple-950/30 text-purple-400 border-purple-900/50 animate-pulse"
                        : "bg-rose-950/30 text-rose-400 border-rose-900/50"
                    }`}>
                      {draft.status === "READY" 
                        ? "Sẵn sàng" 
                        : draft.status === "GENERATING" 
                        ? "Đang tạo..." 
                        : "Thất bại"}
                    </span>
                  </div>
                </div>

                {/* Draft Content Area */}
                {isEditing ? (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">Nội dung bài viết Facebook</label>
                      <textarea
                        rows={4}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">Trang đăng mục tiêu</label>
                        <select
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                          value={selectedPageId}
                          onChange={(e) => setSelectedPageId(e.target.value)}
                        >
                          {pages.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.status === "ACTIVE" ? "Hoạt động" : "Hết hạn"})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => saveEdit(draft.id)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Lưu thay đổi
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/40 p-3 rounded-lg border border-zinc-900 whitespace-pre-wrap">
                      {draft.content || <em className="text-zinc-600">Đang chờ AI tạo nội dung...</em>}
                    </p>

                    {/* AI Copy Adjustment Controls */}
                    {draft.content && (
                      <div className="flex gap-2 items-center flex-wrap pt-1">
                        {refiningId === draft.id ? (
                          <div className="flex gap-2 w-full max-w-lg">
                            <input
                              type="text"
                              placeholder="Ví dụ: 'Làm cho chuyên nghiệp hơn', 'Thêm thẻ Amazon', 'Kèm theo giảm giá'"
                              value={customPrompt}
                              onChange={(e) => setCustomPrompt(e.target.value)}
                              className="flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-lg px-3 py-1 text-[11px] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                            />
                            <button
                              onClick={() => refineMutation.mutate({ draftId: draft.id, instruction: customPrompt })}
                              disabled={refineMutation.isPending || !customPrompt.trim()}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-medium"
                            >
                              {refineMutation.isPending ? "Đang tinh chỉnh..." : "Gửi tới Gemini"}
                            </button>
                            <button
                              onClick={() => setRefiningId(null)}
                              className="text-zinc-500 hover:text-zinc-300 text-[11px]"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRefiningId(draft.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            <Sparkles className="h-3 w-3 text-purple-400" />
                            Tinh chỉnh bằng chỉ dẫn AI
                          </button>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 border-t border-zinc-900/60 pt-3">
                      <button
                        onClick={() => startEdit(draft)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-855 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Sửa bản nháp
                      </button>
                      
                      <button
                        onClick={() => publishMutation.mutate(draft.id)}
                        disabled={publishMutation.isPending || !draft.content}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600/90 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {publishMutation.isPending && publishMutation.variables === draft.id 
                          ? "Đang đăng..." 
                          : "Đăng ngay"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
