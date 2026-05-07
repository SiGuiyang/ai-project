"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
};

const BG_COLORS: Record<ToastType, string> = {
  success: "var(--el-color-success-light-9)",
  error: "var(--el-color-danger-light-9)",
  warning: "var(--el-color-warning-light-9)",
  info: "var(--el-color-info-light-9)",
};

const BORDER_COLORS: Record<ToastType, string> = {
  success: "#b3e19d",
  error: "#fab6b6",
  warning: "#f3d19e",
  info: "#c8c9cc",
};

const TEXT_COLORS: Record<ToastType, string> = {
  success: "var(--el-color-success)",
  error: "var(--el-color-danger)",
  warning: "var(--el-color-warning)",
  info: "var(--el-color-info)",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const remove = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              background: BG_COLORS[t.type],
              border: `1px solid ${BORDER_COLORS[t.type]}`,
              borderRadius: "var(--el-border-radius-base)",
              boxShadow: "var(--el-shadow-light)",
              fontSize: 14,
              color: TEXT_COLORS[t.type],
              pointerEvents: "auto",
              cursor: "pointer",
              minWidth: 280,
              maxWidth: 420,
              animation: "toast-slide-in 0.25s ease-out",
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                background: TEXT_COLORS[t.type],
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {ICONS[t.type]}
            </span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
