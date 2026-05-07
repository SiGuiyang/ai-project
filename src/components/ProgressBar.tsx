"use client";

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="el-progress" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
      {label && <p style={{ fontSize: 14, color: "var(--el-text-color-regular)", marginBottom: 4 }}>{label}</p>}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="el-progress-bar">
          <div
            className="el-progress-bar__inner"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="el-progress__text">{percent}%</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--el-text-color-placeholder)", textAlign: "right" }}>
        {current} / {total}
      </p>
    </div>
  );
}
