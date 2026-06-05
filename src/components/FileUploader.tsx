"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { parseExcelFile } from "@/lib/excel-parser";
import { useImport } from "@/store/import-context";
import type { ParsedData } from "@/types";

const ACCEPTED_EXTS = ["xlsx", "xls", "docx", "pdf"] as const;
type FileExt = (typeof ACCEPTED_EXTS)[number];

function getFileType(ext: string): "excel" | "word" | "pdf" | null {
  if (["xlsx", "xls"].includes(ext)) return "excel";
  if (ext === "docx") return "word";
  if (ext === "pdf") return "pdf";
  return null;
}

async function parseExcel(buffer: ArrayBuffer): Promise<ParsedData> {
  const result = parseExcelFile(buffer);
  if (!result.success) throw new Error(result.error);
  return result.data;
}

async function parseWord(buffer: ArrayBuffer): Promise<ParsedData> {
  const mammoth = await import("mammoth");
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer });
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, "\t")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const lines = text.split("\n").filter(Boolean);
  return { headers: ["content"], rows: lines.map((l) => ({ content: l })) };
}

async function parsePdf(buffer: ArrayBuffer): Promise<ParsedData> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const textParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str ?? "" : ""))
      .join(" ");
    textParts.push(pageText);
  }
  const text = textParts.join("\n");
  const lines = text.split("\n").filter(Boolean);
  return { headers: ["content"], rows: lines.map((l) => ({ content: l })) };
}

export default function FileUploader() {
  const { setParsedData, setRawFile, setStep } = useImport();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseLabel, setParseLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (uploadingRef.current) return;
      uploadingRef.current = true;

      setError(null);
      setFileName(file.name);
      setParsing(true);
      setParseProgress(0);

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!ACCEPTED_EXTS.includes(ext as FileExt)) {
        setError("文件格式错误，请上传 .xlsx / .xls / .docx / .pdf 文件");
        setParsing(false);
        uploadingRef.current = false;
        return;
      }

      const fileType = getFileType(ext);
      if (!fileType) {
        setError("不支持的文件格式");
        setParsing(false);
        uploadingRef.current = false;
        return;
      }

      if (file.size === 0) {
        setError("文件为空，请选择有效文件");
        setParsing(false);
        uploadingRef.current = false;
        return;
      }

      try {
        setParseLabel("正在读取文件...");
        setParseProgress(10);

        const buffer = await file.arrayBuffer();

        setParseProgress(30);
        setParseLabel(`正在解析 ${ext.toUpperCase()} 数据...`);

        let parsed: ParsedData;
        switch (fileType) {
          case "excel":
            parsed = await parseExcel(buffer);
            break;
          case "word":
            parsed = await parseWord(buffer);
            break;
          case "pdf":
            parsed = await parsePdf(buffer);
            break;
          default:
            throw new Error("Unsupported type");
        }

        setParseProgress(80);
        setParseLabel(`已解析 ${parsed.rows.length} 条数据...`);

        await new Promise((r) => setTimeout(r, 100));

        setParseProgress(100);
        setParseLabel("解析完成");

        await new Promise((r) => setTimeout(r, 200));

        setParsedData(parsed);
        setRawFile(buffer, file.name, fileType);
        setStep("rule");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "文件读取失败，请重试";
        if (msg.includes("image") || msg.includes("image.png") || msg.includes("image input")) {
          setError("文件包含图片内容或为扫描件，当前 AI 模型不支持图片输入。请使用含可提取文本的文件，或手动创建规则。");
        } else {
          setError(msg);
        }
        setParsing(false);
        uploadingRef.current = false;
      }
    },
    [setParsedData, setRawFile, setStep]
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

  const onClick = () => {
    if (!parsing) inputRef.current?.click();
  };

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
          cursor: parsing ? "wait" : "pointer",
          transition: "all 0.2s",
          background: dragging
            ? "var(--el-color-primary-light-9)"
            : parsing
            ? "var(--el-bg-color)"
            : "var(--el-color-white)",
          opacity: parsing ? 0.7 : 1,
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={onClick}
      >
        {parsing ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ marginBottom: 16 }}>
              <svg width="48" height="48" viewBox="0 0 48 48" style={{ display: "inline-block" }}>
                <circle cx="24" cy="24" r="20" fill="none" stroke="var(--el-border-color-lighter)" strokeWidth="4"/>
                <circle
                  cx="24" cy="24" r="20" fill="none" stroke="var(--el-color-primary)" strokeWidth="4"
                  strokeDasharray={`${(parseProgress / 100) * 125.6} 125.6`}
                  strokeLinecap="round"
                  transform="rotate(-90 24 24)"
                  style={{ transition: "stroke-dasharray 0.4s ease" }}
                />
                <text x="24" y="29" textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--el-text-color-primary)">
                  {parseProgress}%
                </text>
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--el-text-color-primary)", marginBottom: 8 }}>
              {parseLabel}
            </div>
            <div className="el-progress-bar" style={{ height: 6, maxWidth: 320, margin: "0 auto" }}>
              <div className="el-progress-bar__inner" style={{ width: `${parseProgress}%`, transition: "width 0.4s ease" }} />
            </div>
          </div>
        ) : (
          <>
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
              支持 .xlsx / .xls / .docx / .pdf 格式
            </p>
            {fileName && (
              <p style={{ fontSize: 12, color: "var(--el-color-primary)", marginTop: 12 }}>
                已选择：{fileName}
              </p>
            )}
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.docx,.pdf"
          style={{ display: "none" }}
          onChange={onInputChange}
          disabled={parsing}
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
