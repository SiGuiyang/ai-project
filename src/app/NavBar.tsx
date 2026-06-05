"use client";

import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/import", label: "导入" },
  { href: "/import/rules", label: "解析规则" },
  { href: "/import/history", label: "历史记录" },
  { href: "/waybills", label: "运单管理" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", gap: 2 }}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/import" && pathname.startsWith(item.href));
        return (
          <a
            key={item.href}
            href={item.href}
            style={{
              height: 32,
              padding: "0 14px",
              display: "inline-flex",
              alignItems: "center",
              fontSize: 13,
              color: isActive ? "var(--el-color-primary)" : "var(--el-text-color-regular)",
              textDecoration: "none",
              borderRadius: 6,
              background: isActive ? "var(--el-color-primary-light-9)" : "transparent",
              fontWeight: isActive ? 600 : 400,
              position: "relative",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = "var(--el-bg-color)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }
            }}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
