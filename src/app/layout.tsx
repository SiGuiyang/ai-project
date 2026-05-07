import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "批量导入系统",
  description: "Excel 批量导入运单管理系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
            <a href="/import" className="font-bold text-lg text-gray-800">
              运单批量导入
            </a>
            <div className="flex gap-4 text-sm">
              <a
                href="/import"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                导入
              </a>
              <a
                href="/import/history"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                历史记录
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
