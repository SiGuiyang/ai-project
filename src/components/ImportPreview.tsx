"use client";

import { useCallback, useState, useMemo } from "react";
import { useImport } from "@/store/import-context";
import ExcelTable from "./ExcelTable";
import { V2_FIELD_LABELS } from "@/types";
import { useToast } from "./Toast";

const DISPLAY_FIELDS = [
  "externalCode", "storeName", "receiverName", "receiverPhone", "receiverAddress", "remark",
] as const;

export default function ImportPreview() {
  const { orders, validationResults, step, setStep, setBatchId, setBatchResult } = useImport();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitLabel, setSubmitLabel] = useState("");
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const hasErrors = validationResults.some((vr) => vr.errors.length > 0);

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

    const total = orders.length;
    let totalSuccess = 0;
    let totalFail = 0;
    let batchId: string | null = null;
    const startTime = Date.now();
    const CHUNK_SIZE = 100;

    try {
      for (let start = 0; start < total; start += CHUNK_SIZE) {
        const chunk = orders.slice(start, start + CHUNK_SIZE);
        const end = Math.min(start + CHUNK_SIZE, total);
        const pct = Math.round((end / total) * 100);

        setSubmitProgress(pct);
        setSubmitLabel(`正在提交 ${start + 1}-${end} / ${total} 条`);

        const submitRes: Response = await fetch("/api/import/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders: chunk, batchId }),
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
            onClick={() => setStep("rule")}
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
                  <svg width="44" height="44" viewBox="0 0 44 44" style={{ display: "inline-block" }}>
                    <circle cx="22" cy="22" r="18" fill="none" stroke="var(--el-border-color-lighter)" strokeWidth="4"/>
                    <circle
                      cx="22" cy="22" r="18" fill="none" stroke="var(--el-color-primary)" strokeWidth="4"
                      strokeDasharray={`${(submitProgress / 100) * 113.1} 113.1`}
                      strokeLinecap="round"
                      transform="rotate(-90 22 22)"
                      style={{ transition: "stroke-dasharray 0.4s ease" }}
                    />
                    <text x="22" y="27" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--el-text-color-primary)">
                      {submitProgress}%
                    </text>
                  </svg>
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--el-text-color-primary)", marginBottom: 2 }}>
                  {submitLabel}
                </p>
                <p style={{ fontSize: 12, color: "var(--el-text-color-secondary)", marginBottom: 16 }}>
                  共 {orders.length} 条
                </p>
                <div className="el-progress-bar" style={{ height: 6, marginBottom: 16 }}>
                  <div className="el-progress-bar__inner" style={{ width: `${submitProgress}%`, transition: "width 0.4s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 13 }}>
                  <span style={{ color: "var(--el-color-success)" }}>成功 {successCount}</span>
                  {failCount > 0 && <span style={{ color: "var(--el-color-danger)" }}>失败 {failCount}</span>}
                </div>
                <p style={{ fontSize: 11, color: "var(--el-text-color-placeholder)", marginTop: 12, letterSpacing: 0.3 }}>正在提交数据，请勿关闭页面</p>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 16, animation: "scaleIn 0.35s ease" }}>
                  <svg width="56" height="56" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="26" fill="var(--el-color-success-light-9)" stroke="var(--el-color-success)" strokeWidth="2.5"/>
                    <path d="M20 28l6 6 12-12" fill="none" stroke="var(--el-color-success)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "drawCheck 0.4s ease 0.1s both" }}/>
                  </svg>
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, color: "var(--el-text-color-primary)", marginBottom: 12 }}>
                  提交完成
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 28, fontSize: 14 }}>
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
