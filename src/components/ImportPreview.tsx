"use client";

import { useCallback, useState } from "react";
import { useImport } from "@/store/import-context";
import ExcelTable from "./ExcelTable";
import { generateExcelBuffer } from "@/lib/excel-parser";
import { FIELD_LABELS } from "@/types";
import { getFieldValue } from "@/lib/helpers";
import { saveAs } from "@/lib/file-saver";

const DISPLAY_FIELDS = [
  "externalCode", "senderName", "senderPhone", "senderAddress",
  "receiverName", "receiverPhone", "receiverAddress",
  "weight", "pieces", "temperatureLevel", "remark",
] as const;

export default function ImportPreview() {
  const { rows, validationResults, step, setStep, setBatchId, setBatchResult } = useImport();
  const [submitting, setSubmitting] = useState(false);

  const hasErrors = validationResults.some((vr) => vr.errors.length > 0);

  const handleExport = useCallback(() => {
    const headers = DISPLAY_FIELDS.map((f) => FIELD_LABELS[f] || f);
    const data = rows.map((row) => {
      const obj: Record<string, string> = {};
      for (const field of DISPLAY_FIELDS) {
        obj[FIELD_LABELS[field] || field] = String(getFieldValue(row, field) ?? "");
      }
      return obj;
    });
    const buffer = generateExcelBuffer(headers, data);
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `导入数据预览_${Date.now()}.xlsx`);
  }, [rows]);

  const handleSubmit = async () => {
    if (hasErrors) { alert("请先修正所有错误后再提交"); return; }
    setSubmitting(true);
    setStep("submitting");
    try {
      const res = await fetch("/api/import/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error("提交失败");
      const result = await res.json();
      setBatchId(result.batchId);
      setBatchResult({
        id: result.batchId,
        createdAt: new Date().toISOString(),
        totalCount: result.successCount + result.failCount,
        successCount: result.successCount,
        failCount: result.failCount,
        status: result.failCount > 0 ? "failed" : "completed",
      });
      setStep("result");
    } catch (e) {
      alert(e instanceof Error ? e.message : "提交失败，请重试");
      setStep("preview");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "submitting") {
    return (
      <div className="el-card" style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 14, color: "var(--el-text-color-regular)", marginBottom: 20, fontWeight: 500 }}>
          正在提交下单...
        </div>
        <div style={{ maxWidth: 400, margin: "0 auto" }}>
          <div className="el-progress-bar" style={{ height: 10 }}>
            <div className="el-progress-bar__inner" style={{ width: "100%", animation: "progress-stripes 1.5s linear infinite", backgroundImage: "linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)" }} />
          </div>
          <style>{`@keyframes progress-stripes { from { background-position: 40px 0; } to { background-position: 0 0; } }`}</style>
        </div>
        <p style={{ fontSize: 12, color: "var(--el-text-color-placeholder)", marginTop: 8 }}>正在上传数据，请勿关闭页面...</p>
      </div>
    );
  }

  return (
    <div className="el-card">
      <div className="el-card__header">
        <span style={{ fontWeight: 500, fontSize: 16 }}>数据预览与编辑</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="el-button el-button--plain el-button--small" onClick={handleExport}>
            导出 Excel
          </button>
          <button className="el-button el-button--plain el-button--small" onClick={() => setStep("upload")}>
            返回重新上传
          </button>
          <button
            className={`el-button el-button--success el-button--small`}
            disabled={hasErrors || submitting}
            onClick={handleSubmit}
            style={{
              background: hasErrors ? "var(--el-color-success-light-3)" : undefined,
              opacity: hasErrors ? 0.5 : undefined,
              cursor: hasErrors ? "not-allowed" : undefined,
            }}
          >
            提交下单
          </button>
        </div>
      </div>
      <div className="el-card__body">
        <ExcelTable />
      </div>
    </div>
  );
}
