import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

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
      <body>
        <ToastProvider>
          <header
            style={{
              height: 48,
              background: "#fff",
              borderBottom: "1px solid var(--el-border-color-light)",
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
              position: "sticky",
              top: 0,
              zIndex: 100,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <a
              href="/import"
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--el-text-color-primary)",
                textDecoration: "none",
                marginRight: 32,
              }}
            >
              运单批量导入
            </a>
            <nav style={{ display: "flex", gap: 4 }}>
              <a
                href="/import"
                style={{
                  height: 32,
                  padding: "0 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: 14,
                  color: "var(--el-color-primary)",
                  textDecoration: "none",
                  borderRadius: "var(--el-border-radius-base)",
                  background: "var(--el-color-primary-light-9)",
                }}
              >
                导入
              </a>
              <a
                href="/import/history"
                style={{
                  height: 32,
                  padding: "0 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: 14,
                  color: "var(--el-text-color-regular)",
                  textDecoration: "none",
                  borderRadius: "var(--el-border-radius-base)",
                }}
              >
                历史记录
              </a>
            </nav>
          </header>
          <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
