"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  FileText, 
  Activity, 
  Settings, 
  Terminal, 
  Share2,
  Sun,
  Moon,
  Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

const navItems = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/products", label: "Sản phẩm", icon: ShoppingBag },
  { href: "/drafts", label: "Bài viết nháp", icon: FileText },
  { href: "/queue", label: "Hàng đợi đăng", icon: Activity },
  { href: "/autopost", label: "Tự động đăng", icon: Cpu },
  { href: "/logs", label: "Nhật ký hệ thống", icon: Terminal },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useStore();

  return (
    <aside className="w-64 border-r border-border bg-card/90 backdrop-blur-md flex flex-col h-full shrink-0 text-foreground">
      <div className="h-16 flex items-center justify-between px-6 border-b border-border gap-2">
        <div className="flex items-center gap-2">
          <Share2 className="h-6 w-6 text-purple-500 animate-pulse" />
          <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Dragonacy AI
          </span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-all"
          title={theme === "dark" ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-500" />
          ) : (
            <Moon className="h-4 w-4 text-purple-600" />
          )}
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-purple-900/10 text-purple-500 border-l-2 border-purple-500 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-purple-500" : "text-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/40 border border-border">
          <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-sm text-white shrink-0">
            A
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold truncate">Quản trị Liên kết</p>
            <p className="text-[10px] text-muted-foreground truncate">active_session_01</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
