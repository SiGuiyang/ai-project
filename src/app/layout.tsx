import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import NavBar from "./NavBar";

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
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(8px)",
              borderBottom: "1px solid var(--el-border-color-light)",
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
              position: "sticky",
              top: 0,
              zIndex: 100,
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
                letterSpacing: 0.5,
              }}
            >
              运单批量导入
            </a>
            <NavBar />
          </header>
          <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
