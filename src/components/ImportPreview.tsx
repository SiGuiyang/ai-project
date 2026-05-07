"use client";

import { useCallback, useState, useRef, useMemo } from "react";
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
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const abortRef = useRef(false);

  const totalChunks = useMemo(() => Math.ceil(rows.length / CHUNK_SIZE), [rows.length]);
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
    setSuccessCount(0);
    setFailCount(0);
    setCurrentChunk(0);
    abortRef.current = false;

    const total = rows.length;
    let totalSuccess = 0;
    let totalFail = 0;
    let batchId: string | null = null;
    const startTime = Date.now();

    try {
      for (let start = 0; start < total; start += CHUNK_SIZE) {
        if (abortRef.current) break;

        const chunk = rows.slice(start, start + CHUNK_SIZE);
        const end = Math.min(start + CHUNK_SIZE, total);
        const chunkNum = Math.floor(start / CHUNK_SIZE) + 1;
        const pct = Math.round((end / total) * 100);

        setCurrentChunk(chunkNum);
        setSubmitProgress(pct);
        setSubmitLabel(`正在提交 ${start + 1}-${end} / ${total} 条`);

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
        setSuccessCount(totalSuccess);
        setFailCount(totalFail);
      }

      if (batchId) {
        await fetch("/api/import/submit", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId, status: "completed" }),
        }).catch(() => {});
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setSubmitProgress(100);
      setSubmitLabel("提交完成");
      setSuccessCount(totalSuccess);
      setFailCount(totalFail);

      toast("success", `导入完成！成功 ${totalSuccess} 条${totalFail > 0 ? `，失败 ${totalFail} 条` : ""}（耗时 ${elapsed}s）`);

      await new Promise((r) => setTimeout(r, 500));

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

  return (
    <div className="el-card" style={{ position: "relative" }}>
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
      <div className="el-card__body" style={{ opacity: step === "submitting" ? 0.3 : 1, transition: "opacity 0.3s" }}>
        <ExcelTable />
      </div>

      {/* Overlay progress modal */}
      {(step === "submitting" || submitProgress === 100) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(2px)",
            borderRadius: "var(--el-border-radius-base)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              padding: "36px 48px",
              maxWidth: 480,
              width: "90%",
              textAlign: "center",
            }}
          >
            {submitProgress < 100 ? (
              <>
                <div style={{ marginBottom: 20 }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" style={{ display: "inline-block" }}>
                    <circle cx="20" cy="20" r="16" fill="none" stroke="var(--el-border-color-lighter)" strokeWidth="4"/>
                    <circle
                      cx="20" cy="20" r="16" fill="none" stroke="var(--el-color-primary)" strokeWidth="4"
                      strokeDasharray={`${(submitProgress / 100) * 100.5} 100.5`}
                      strokeLinecap="round"
                      transform="rotate(-90 20 20)"
                      style={{ transition: "stroke-dasharray 0.3s ease" }}
                    />
                    <text x="20" y="24" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--el-text-color-primary)">
                      {submitProgress}%
                    </text>
                  </svg>
                </div>
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--el-text-color-primary)", marginBottom: 4 }}>
                  {submitLabel}
                </p>
                <p style={{ fontSize: 13, color: "var(--el-text-color-secondary)", marginBottom: 16 }}>
                  第 {currentChunk}/{totalChunks} 批
                </p>
                <div className="el-progress-bar" style={{ height: 6, marginBottom: 16 }}>
                  <div className="el-progress-bar__inner" style={{ width: `${submitProgress}%`, transition: "width 0.3s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 24, fontSize: 13 }}>
                  <span style={{ color: "var(--el-color-success)" }}>成功 {successCount}</span>
                  {failCount > 0 && <span style={{ color: "var(--el-color-danger)" }}>失败 {failCount}</span>}
                </div>
                <p style={{ fontSize: 12, color: "var(--el-text-color-placeholder)", marginTop: 12 }}>正在提交数据，请勿关闭页面</p>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 16, animation: "scaleIn 0.3s ease" }}>
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="24" fill="var(--el-color-success-light-9)" stroke="var(--el-color-success)" strokeWidth="2.5"/>
                    <path d="M18 26l6 6 12-12" fill="none" stroke="var(--el-color-success)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "drawCheck 0.4s ease 0.1s both" }}/>
                  </svg>
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, color: "var(--el-text-color-primary)", marginBottom: 12 }}>
                  提交完成
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 32, fontSize: 15 }}>
                  <span style={{ color: "var(--el-color-success)", fontWeight: 700 }}>成功 {successCount}</span>
                  {failCount > 0 && <span style={{ color: "var(--el-color-danger)", fontWeight: 700 }}>失败 {failCount}</span>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
