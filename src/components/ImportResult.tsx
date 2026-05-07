"use client";

import { useImport } from "@/store/import-context";

export default function ImportResult() {
  const { batchResult, step, setStep, reset } = useImport();

  if (step !== "result" || !batchResult) return null;

  return (
    <div className="el-card">
      <div className="el-card__body" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>提交结果</div>

        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 32 }}>
          <div style={{ textAlign: "center", minWidth: 120 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--el-color-primary)" }}>{batchResult.totalCount}</div>
            <div style={{ fontSize: 13, color: "var(--el-text-color-secondary)", marginTop: 4 }}>总条数</div>
          </div>
          <div style={{ width: 1, background: "var(--el-border-color-light)", alignSelf: "stretch" }} />
          <div style={{ textAlign: "center", minWidth: 120 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--el-color-success)" }}>{batchResult.successCount}</div>
            <div style={{ fontSize: 13, color: "var(--el-text-color-secondary)", marginTop: 4 }}>成功</div>
          </div>
          <div style={{ width: 1, background: "var(--el-border-color-light)", alignSelf: "stretch" }} />
          <div style={{ textAlign: "center", minWidth: 120 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--el-color-danger)" }}>{batchResult.failCount}</div>
            <div style={{ fontSize: 13, color: "var(--el-text-color-secondary)", marginTop: 4 }}>失败</div>
          </div>
        </div>

        {batchResult.failCount > 0 && (
          <div className="el-alert el-alert--warning" style={{ marginBottom: 24, textAlign: "left" }}>
            部分数据提交失败，失败的条数不会影响已成功提交的数据。
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          <button className="el-button el-button--primary" onClick={() => { reset(); setStep("upload"); }}>
            继续导入
          </button>
          <button className="el-button el-button--plain" onClick={() => { window.location.href = "/import/history"; }}>
            查看历史记录
          </button>
        </div>
      </div>
    </div>
  );
}
