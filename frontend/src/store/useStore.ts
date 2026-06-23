import { create } from "zustand";

export interface PageConnection {
  id: string;
  name: string;
  status: "ACTIVE" | "EXPIRED" | "RATE_LIMITED";
  postCount: number;
}

export interface PostQueueItem {
  id: string;
  productId: string;
  productName: string;
  pageId: string;
  pageName: string;
  content: string;
  status: "PENDING" | "GENERATING" | "READY" | "PUBLISHED" | "FAILED" | "PARTIAL_SUCCESS" | "RETRIES_EXHAUSTED";
  scheduledTime: string;
  retryCount: number;
  errorMessage?: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
}

interface DashboardState {
  pages: PageConnection[];
  queue: PostQueueItem[];
  logs: SystemLog[];
  metrics: {
    totalProducts: number;
    totalPublished: number;
    pendingQueue: number;
    failedQueue: number;
    tokenHealth: number; // 0 to 100
  };
  setPages: (pages: PageConnection[]) => void;
  updatePageStatus: (pageId: string, status: PageConnection["status"]) => void;
  setQueue: (queue: PostQueueItem[]) => void;
  updateQueueItem: (id: string, updates: Partial<PostQueueItem>) => void;
  addLog: (log: Omit<SystemLog, "id" | "timestamp">) => void;
  clearLogs: () => void;
  setMetrics: (metrics: Partial<DashboardState["metrics"]>) => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
}

export const useStore = create<DashboardState>((set) => ({
  pages: [],
  queue: [],
  logs: [],
  metrics: {
    totalProducts: 0,
    totalPublished: 0,
    pendingQueue: 0,
    failedQueue: 0,
    tokenHealth: 100,
  },
  theme: "dark",
  setPages: (pages) => set({ pages }),
  updatePageStatus: (pageId, status) => set((state) => ({
    pages: state.pages.map((p) => (p.id === pageId ? { ...p, status } : p))
  })),
  setQueue: (queue) => set({ queue }),
  updateQueueItem: (id, updates) => set((state) => ({
    queue: state.queue.map((q) => (q.id === id ? { ...q, ...updates } : q))
  })),
  addLog: (log) => set((state) => ({
    logs: [
      { id: Math.random().toString(36).substring(7), timestamp: new Date().toISOString(), ...log },
      ...state.logs.slice(0, 99) // Keep last 100 logs
    ]
  })),
  clearLogs: () => set({ logs: [] }),
  setMetrics: (metrics) => set((state) => ({
    metrics: { ...state.metrics, ...metrics }
  })),
  setTheme: (theme) => set((state) => {
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;
      if (theme === "light") {
        root.classList.add("light");
      } else {
        root.classList.remove("light");
      }
      localStorage.setItem("theme", theme);
    }
    return { theme };
  }),
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === "dark" ? "light" : "dark";
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;
      if (nextTheme === "light") {
        root.classList.add("light");
      } else {
        root.classList.remove("light");
      }
      localStorage.setItem("theme", nextTheme);
    }
    return { theme: nextTheme };
  }),
}));
