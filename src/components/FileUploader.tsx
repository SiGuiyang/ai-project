"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { parseExcelFile } from "@/lib/excel-parser";
import { useImport } from "@/store/import-context";

export default function FileUploader() {
  const { setParsedData, setStep } = useImport();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["xlsx", "xls"].includes(ext)) {
        setError("文件格式错误，请上传 .xlsx 或 .xls 文件");
        return;
      }

      if (file.size === 0) {
        setError("文件为空，请选择有效文件");
        return;
      }

      try {
        const buffer = await file.arrayBuffer();
        const result = parseExcelFile(buffer);

        if (!result.success) {
          setError(result.error);
          return;
        }

        setParsedData(result.data);
        setStep("mapping");
      } catch {
        setError("文件读取失败，请重试");
      }
    },
    [setParsedData, setStep]
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setDragging(false), []);

  const onClick = () => inputRef.current?.click();

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          border: `2px dashed ${dragging ? "var(--el-color-primary)" : "var(--el-border-color)"}`,
          borderRadius: 8,
          padding: "40px 24px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
          background: dragging ? "var(--el-color-primary-light-9)" : "var(--el-color-white)",
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={onClick}
      >
        <div style={{ fontSize: 48, marginBottom: 12, lineHeight: 1 }}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect x="8" y="4" width="48" height="56" rx="4" fill="var(--el-color-primary-light-3)" stroke="var(--el-color-primary)" strokeWidth="2"/>
            <line x1="20" y1="24" x2="44" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="20" y1="32" x2="38" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="20" y1="40" x2="34" y2="40" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M32 48L28 44H30V36H34V44H36L32 48Z" fill="var(--el-color-primary)"/>
          </svg>
        </div>
        <p style={{ fontSize: 14, color: "var(--el-text-color-regular)", marginBottom: 4 }}>
          <span style={{ color: "var(--el-color-primary)", fontWeight: 500 }}>点击上传</span>
          {" "}或拖拽文件到此处
        </p>
        <p style={{ fontSize: 12, color: "var(--el-text-color-placeholder)" }}>
          仅支持 .xlsx / .xls 格式
        </p>
        {fileName && (
          <p style={{ fontSize: 12, color: "var(--el-color-primary)", marginTop: 12 }}>
            已选择：{fileName}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={onInputChange}
        />
      </div>

      {error && (
        <div className="el-alert el-alert--error" style={{ width: "100%", maxWidth: 480 }}>
          {error}
        </div>
      )}
    </div>
  );
}
