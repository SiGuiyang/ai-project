"use client";

import { useCallback, useState, useRef } from "react";
import { useImport } from "@/store/import-context";
import ExcelTable from "./ExcelTable";
import { generateExcelBuffer } from "@/lib/excel-parser";
import { FIELD_LABELS } from "@/types";
import { getFieldValue } from "@/lib/helpers";
import { saveAs } from "@/lib/file-saver";
import { useToast } from "./Toast";

const CHUNK_SIZE = 100;

const DISPLAY_FIELDS = [
  "externalCode", "senderName", "senderPhone", "senderAddress",
  "receiverName", "receiverPhone", "receiverAddress",
  "weight", "pieces", "temperatureLevel", "remark",
] as const;

export default function ImportPreview() {
  const { rows, validationResults, step, setStep, setBatchId, setBatchResult } = useImport();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitLabel, setSubmitLabel] = useState("");
  const abortRef = useRef(false);

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
    if (hasErrors) {
      toast("warning", "请先修正所有错误后再提交");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setStep("submitting");
    setSubmitProgress(0);
    setSubmitLabel("正在准备数据...");
    abortRef.current = false;

    const total = rows.length;
    let totalSuccess = 0;
    let totalFail = 0;
    let batchId: string | null = null;

    try {
      for (let start = 0; start < total; start += CHUNK_SIZE) {
        if (abortRef.current) break;

        const chunk = rows.slice(start, start + CHUNK_SIZE);
        const end = Math.min(start + CHUNK_SIZE, total);

        setSubmitProgress(Math.round((end / total) * 100));
        setSubmitLabel(`正在提交 ${start + 1}-${end} / ${total} 条...`);

        const submitRes: Response = await fetch("/api/import/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunk, batchId }),
        });

        if (!submitRes.ok) {
          const errData = await submitRes.json().catch(() => ({}));
          throw new Error(errData.error || `第 ${start + 1}-${end} 条提交失败`);
        }

        const result = await submitRes.json();
        batchId = result.batchId;
        totalSuccess += result.successCount;
        totalFail += result.failCount;
      }

      if (batchId) {
        await fetch("/api/import/submit", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId, status: "completed" }),
        }).catch(() => {});
      }

      setSubmitProgress(100);
      setSubmitLabel("提交完成");

      toast("success", `成功提交 ${totalSuccess} 条${totalFail > 0 ? `，${totalFail} 条失败` : ""}`);

      await new Promise((r) => setTimeout(r, 300));

      setBatchId(batchId || "");
      setBatchResult({
        id: batchId || "",
        createdAt: new Date().toISOString(),
        totalCount: totalSuccess + totalFail,
        successCount: totalSuccess,
        failCount: totalFail,
        status: totalFail > 0 ? "failed" : "completed",
      });
      setStep("result");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "提交失败，请重试";
      toast("error", msg);
      setStep("preview");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "submitting") {
    return (
      <div className="el-card" style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 14, color: "var(--el-text-color-regular)", marginBottom: 24, fontWeight: 500 }}>
          {submitLabel}
        </div>
        <div style={{ maxWidth: 400, margin: "0 auto" }}>
          <div className="el-progress-bar" style={{ height: 10 }}>
            <div
              className="el-progress-bar__inner"
              style={{
                width: `${submitProgress}%`,
                transition: "width 0.3s ease",
                background: submitProgress === 100 ? "var(--el-color-success)" : undefined,
              }}
            />
          </div>
        </div>
        <p style={{ fontSize: 13, color: "var(--el-text-color-secondary)", marginTop: 12 }}>
          {submitProgress}%
        </p>
        <p style={{ fontSize: 12, color: "var(--el-text-color-placeholder)", marginTop: 4 }}>
          {submitting ? "请勿关闭页面..." : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="el-card">
      <div className="el-card__header">
        <span style={{ fontWeight: 500, fontSize: 16 }}>数据预览与编辑</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="el-button el-button--plain el-button--small"
            onClick={handleExport}
            disabled={submitting}
            style={{ opacity: submitting ? 0.5 : undefined, cursor: submitting ? "not-allowed" : undefined }}
          >
            导出 Excel
          </button>
          <button
            className="el-button el-button--plain el-button--small"
            onClick={() => setStep("upload")}
            disabled={submitting}
            style={{ opacity: submitting ? 0.5 : undefined, cursor: submitting ? "not-allowed" : undefined }}
          >
            返回重新上传
          </button>
          <button
            className="el-button el-button--success el-button--small"
            disabled={hasErrors || submitting}
            onClick={handleSubmit}
            style={{
              opacity: hasErrors || submitting ? 0.5 : undefined,
              cursor: hasErrors || submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "提交中..." : "提交下单"}
          </button>
        </div>
      </div>
      <div className="el-card__body">
        <ExcelTable />
      </div>
    </div>
  );
}
