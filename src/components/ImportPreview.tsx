"use client";

import { useCallback, useState } from "react";
import { useImport } from "@/store/import-context";
import ExcelTable from "./ExcelTable";
import { generateExcelBuffer } from "@/lib/excel-parser";
import { FIELD_LABELS } from "@/types";
import { getFieldValue } from "@/lib/helpers";
import { saveAs } from "@/lib/file-saver";

const DISPLAY_FIELDS = [
  "externalCode",
  "senderName",
  "senderPhone",
  "senderAddress",
  "receiverName",
  "receiverPhone",
  "receiverAddress",
  "weight",
  "pieces",
  "temperatureLevel",
  "remark",
] as const;

export default function ImportPreview() {
  const {
    rows,
    validationResults,
    step,
    setStep,
    setBatchId,
    setBatchResult,
  } = useImport();

  const [submitting, setSubmitting] = useState(false);

  const hasErrors = validationResults.some(
    (vr) => vr.errors.length > 0
  );

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
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `导入数据预览_${Date.now()}.xlsx`);
  }, [rows]);

  const handleSubmit = async () => {
    if (hasErrors) {
      alert("请先修正所有错误后再提交");
      return;
    }

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
      <div className="bg-white rounded-lg p-6 border space-y-4">
        <h2 className="text-lg font-medium">正在提交下单...</h2>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div className="bg-blue-600 h-full rounded-full" style={{ width: "100%" }} />
        </div>
        <p className="text-xs text-gray-500 text-right">正在上传数据...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">数据预览与编辑</h2>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              onClick={handleExport}
            >
              导出 Excel
            </button>
            <button
              className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              onClick={() => setStep("upload")}
            >
              返回重新上传
            </button>
            <button
              className={`px-6 py-2 text-sm rounded text-white ${
                hasErrors
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
              disabled={hasErrors || submitting}
              onClick={handleSubmit}
            >
              提交下单
            </button>
          </div>
        </div>

        <ExcelTable />
      </div>
    </div>
  );
}
