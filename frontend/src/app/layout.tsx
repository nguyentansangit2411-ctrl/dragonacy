import type { Metadata } from "next";
import Providers from "@/components/Providers";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dragonacy - Bảng điều khiển liên kết FB AI",
  description: "Bảng điều khiển hệ thống tự động đăng bài liên kết Facebook AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen text-foreground bg-background transition-colors duration-200">
        <Providers>
          <div className="flex h-screen w-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-background/40 p-6 md:p-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
