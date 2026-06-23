"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Link2, Sparkles, AlertCircle, ShoppingBag, Eye, Trash, Check, Trash2, ArrowLeft } from "lucide-react";
import { useStore } from "@/store/useStore";

interface Product {
  id: string;
  title: string;
  description: string;
  affiliateUrl: string;
  imageUrl: string;
  createdAt: string;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [urls, setUrls] = useState<string[]>([""]);
  
  // Scraped preview state
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewDescription, setPreviewDescription] = useState("");
  const [scrapedImages, setScrapedImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const addLog = useStore((state) => state.addLog);

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("http://localhost:3000/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  // Mutation to scrape URLs
  const scrapeMutation = useMutation({
    mutationFn: async (urlsList: string[]) => {
      const res = await fetch("http://localhost:3000/api/products/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urlsList.filter(u => u.trim() !== "") }),
      });
      if (!res.ok) throw new Error("Failed to scrape products");
      return res.json();
    },
    onSuccess: (data) => {
      setPreviewTitle(data.title || "");
      setPreviewDescription(data.description || "");
      setScrapedImages(data.images || []);
      // Pre-select first image if available
      if (data.images && data.images.length > 0) {
        setSelectedImages([data.images[0]]);
      } else {
        setSelectedImages([]);
      }
      setImportStep(2);
      addLog({ level: "INFO", message: `Đã thu thập dữ liệu từ các liên kết.` });
    },
    onError: () => {
      alert("Không thể thu thập dữ liệu từ các link. Vui lòng kiểm tra lại liên kết hoặc kết nối backend.");
    }
  });

  // Mutation to save product
  const importMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string; affiliateUrl: string; images: string[] }) => {
      const res = await fetch("http://localhost:3000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          affiliateUrl: payload.affiliateUrl,
          imageUrl: payload.images[0] || "",
          metadata: { images: payload.images }
        }),
      });
      if (!res.ok) throw new Error("Failed to import product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      addLog({ level: "INFO", message: `Đã nhập sản phẩm thành công.` });
      setIsImportModalOpen(false);
      setUrls([""]);
      setPreviewTitle("");
      setPreviewDescription("");
      setScrapedImages([]);
      setSelectedImages([]);
      setImportStep(1);
    },
    onError: () => {
      alert("Không thể lưu sản phẩm. Hãy kiểm tra kết nối với Backend API.");
    }
  });

  // Mutation to trigger Gemini post draft generation
  const generateDraftMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch("http://localhost:3000/api/post-drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          customInstruction: "Tạo bài đăng Facebook hấp dẫn bằng tiếng Việt chứa nhiều emoji và hashtag",
        }),
      });
      if (!res.ok) {
        let errMsg = "Failed to generate draft";
        try {
          const errData = await res.json();
          errMsg = errData?.message || JSON.stringify(errData);
        } catch {}
        throw new Error(errMsg);
      }
      return res.json();
    },
    onSuccess: (data) => {
      addLog({ level: "INFO", message: `Đã tạo bài viết nháp bằng AI cho sản phẩm UUID: ${data.productId}` });
      alert("Đã tạo bài viết nháp bằng AI thành công! Bạn có thể xem và duyệt bài trong mục 'Bài viết nháp'.");
    },
    onError: (error: Error) => {
      const msg = error?.message || "";
      if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("too many")) {
        alert("⚠️ Gemini API bị lỗi 429 - Hết quota miễn phí!\n\nBạn cần:\n1. Vào https://aistudio.google.com/app/apikey\n2. Tạo API key mới từ tài khoản Google khác\n3. Cập nhật GEMINI_API_KEY trong file backend/.env\n4. Khởi động lại backend");
      } else if (msg.toLowerCase().includes("key") || msg.toLowerCase().includes("api_key") || msg.toLowerCase().includes("unauthorized")) {
        alert("❌ GEMINI_API_KEY chưa hợp lệ. Vui lòng kiểm tra lại key trong file backend/.env");
      } else {
        alert(`❌ Tạo bài viết bằng Gemini thất bại:\n${msg}`);
      }
    }
  });

  // Delete product
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:3000/api/products/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      addLog({ level: "INFO", message: `Đã xóa sản phẩm thành công.` });
    },
    onError: () => {
      alert("Không thể xóa sản phẩm. Hãy kiểm tra kết nối với Backend API.");
    }
  });

  const handleAddUrlField = () => {
    if (urls.length >= 4) return;
    setUrls([...urls, ""]);
  };

  const handleRemoveUrlField = (index: number) => {
    if (urls.length === 1) {
      setUrls([""]);
      return;
    }
    const updated = [...urls];
    updated.splice(index, 1);
    setUrls(updated);
  };

  const handleUrlChange = (index: number, val: string) => {
    const updated = [...urls];
    updated[index] = val;
    setUrls(updated);
  };

  const handleScrapeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeUrls = urls.filter(u => u.trim() !== "");
    if (activeUrls.length === 0) return;
    scrapeMutation.mutate(activeUrls);
  };

  const handleImageToggle = (imgUrl: string) => {
    if (selectedImages.includes(imgUrl)) {
      setSelectedImages(selectedImages.filter(url => url !== imgUrl));
    } else {
      if (selectedImages.length >= 5) {
        alert("Bạn chỉ được chọn tối đa 5 hình ảnh.");
        return;
      }
      setSelectedImages([...selectedImages, imgUrl]);
    }
  };

  const handleSaveProduct = () => {
    if (!previewTitle.trim()) {
      alert("Vui lòng nhập tiêu đề sản phẩm.");
      return;
    }
    const mainAffUrl = urls[0] || "";
    importMutation.mutate({
      title: previewTitle,
      description: previewDescription,
      affiliateUrl: mainAffUrl,
      images: selectedImages
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sản phẩm liên kết</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Quản lý danh sách sản phẩm Amazon, AliExpress và ShopVNB để phân phối nội dung.</p>
        </div>
        
        <button
          onClick={() => {
            setImportStep(1);
            setUrls([""]);
            setIsImportModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-md transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nhập sản phẩm
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product: any) => (
          <div key={product.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col justify-between shadow-sm">
            <div className="p-5 space-y-4">
              <div className="flex gap-4">
                <img
                  src={product.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80"}
                  alt={product.title}
                  className="w-16 h-16 rounded-lg bg-muted border border-border object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm line-clamp-2 text-foreground">{product.title}</h3>
                  <a
                    href={product.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-purple-400 hover:underline mt-1 truncate max-w-full"
                  >
                    <Link2 className="h-3 w-3 shrink-0" />
                    Link liên kết
                  </a>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {product.description || "Không có mô tả sản phẩm."}
              </p>
            </div>

            <div className="px-5 py-4 border-t border-border bg-muted/20 flex justify-between gap-2 items-center">
              <button 
                onClick={() => generateDraftMutation.mutate(product.id)}
                disabled={generateDraftMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-background hover:bg-muted border border-border hover:border-purple-500/30 text-foreground rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                {generateDraftMutation.isPending && generateDraftMutation.variables === product.id 
                  ? "Đang viết..." 
                  : "Tạo bài viết bằng AI"}
              </button>
              <button
                onClick={() => {
                  if (confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
                    deleteMutation.mutate(product.id);
                  }
                }}
                className="p-1.5 text-muted-foreground hover:text-red-500 bg-background border border-border rounded-lg hover:border-red-500/20 transition-all shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Import */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-up text-foreground">
            {importStep === 1 ? (
              <>
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-bold text-foreground">Thu thập thông tin sản phẩm</h2>
                  <p className="text-xs text-muted-foreground mt-1">Cung cấp tối đa 4 link sản phẩm (ví dụ: ShopVNB, Amazon, v.v.) để tự động lấy tên, mô tả và hình ảnh.</p>
                </div>
                
                <form onSubmit={handleScrapeSubmit} className="p-6 space-y-4">
                  <div className="space-y-3">
                    <label className="text-xs text-muted-foreground font-medium block">Đường dẫn sản phẩm</label>
                    {urls.map((url, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="url"
                          required={index === 0}
                          placeholder={`Link sản phẩm nguồn ${index + 1}...`}
                          value={url}
                          onChange={(e) => handleUrlChange(index, e.target.value)}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                        />
                        {urls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveUrlField(index)}
                            className="p-2 text-muted-foreground hover:text-red-500 bg-background border border-border rounded-lg hover:border-red-500/20 transition-all shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}

                    {urls.length < 4 && (
                      <button
                        type="button"
                        onClick={handleAddUrlField}
                        className="text-xs text-purple-500 hover:text-purple-400 font-medium inline-flex items-center gap-1 mt-1 hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Thêm liên kết nguồn khác
                      </button>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setUrls([""]);
                      }}
                      className="px-4 py-2 bg-background border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs transition-all"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={scrapeMutation.isPending}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1"
                    >
                      {scrapeMutation.isPending ? "Đang thu thập..." : "Thu thập dữ liệu"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="p-6 border-b border-border flex items-center gap-2">
                  <button
                    onClick={() => setImportStep(1)}
                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted border border-border rounded transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Xem trước & chỉnh sửa sản phẩm</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Xác nhận thông tin thu thập và chọn tối đa 5 hình ảnh để tạo bài đăng.</p>
                  </div>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Tên sản phẩm</label>
                    <input
                      type="text"
                      value={previewTitle}
                      onChange={(e) => setPreviewTitle(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Mô tả chi tiết</label>
                    <textarea
                      rows={5}
                      value={previewDescription}
                      onChange={(e) => setPreviewDescription(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-purple-500 leading-relaxed"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground block">
                      Chọn hình ảnh cho bài viết ({selectedImages.length}/5)
                    </label>
                    {scrapedImages.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Không tìm thấy hình ảnh nào trên các trang web nguồn.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {scrapedImages.map((imgUrl, idx) => {
                          const isSelected = selectedImages.includes(imgUrl);
                          return (
                            <div
                              key={idx}
                              onClick={() => handleImageToggle(imgUrl)}
                              className={`relative aspect-square bg-background border-2 rounded-lg overflow-hidden cursor-pointer hover:opacity-95 transition-all ${
                                isSelected ? "border-purple-500" : "border-border"
                              }`}
                            >
                              <img src={imgUrl} className="w-full h-full object-cover" alt="" />
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-purple-600 text-white rounded-full p-0.5 shadow-md">
                                  <Check className="h-3 w-3 font-bold" />
                                </div>
                              )}
                              <div className="absolute bottom-0 inset-x-0 bg-black/50 text-[9px] text-center text-white py-0.5 truncate">
                                Ảnh {idx + 1}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-border flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setImportStep(1)}
                    className="px-4 py-2 bg-background border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs transition-all"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProduct}
                    disabled={importMutation.isPending}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {importMutation.isPending ? "Đang lưu..." : "Lưu & Hoàn tất"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
