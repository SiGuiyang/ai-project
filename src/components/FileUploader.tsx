"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { parseExcelFile } from "@/lib/excel-parser";
import { useImport } from "@/store/import-context";
export default function FileUploader() {
  const { setParsedData, setStep } = useImport();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

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
    <div className="flex flex-col items-center gap-4">
      <div
        className={`w-full max-w-xl border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={onClick}
      >
        <div className="text-4xl mb-2">📂</div>
        <p className="text-gray-600 text-sm">
          拖拽 Excel 文件到此处，或点击选择文件
        </p>
        <p className="text-gray-400 text-xs mt-1">支持 .xlsx 和 .xls 格式</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {error && (
        <div className="w-full max-w-xl bg-red-50 border border-red-200 rounded px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
