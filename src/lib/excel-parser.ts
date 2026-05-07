import * as XLSX from "xlsx";
import type { ParsedData } from "@/types";

const CATEGORY_ROW_KEYWORDS = ["发件方", "收件方", "货物", "信息"];

function isCategoryRow(row: (string | undefined)[]): boolean {
  const nonEmpty: string[] = [];
  for (const v of row) {
    if (v && v.trim()) nonEmpty.push(v);
  }
  if (nonEmpty.length === 0) return false;
  return nonEmpty.some((v) =>
    CATEGORY_ROW_KEYWORDS.some((kw) => v.includes(kw))
  );
}

export function parseExcelFile(
  buffer: ArrayBuffer
): { success: true; data: ParsedData } | { success: false; error: string } {
  try {
    const workbook = XLSX.read(buffer, { type: "array" });

    if (workbook.SheetNames.length === 0) {
      return { success: false, error: "Excel 文件中没有找到任何 Sheet" };
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];

    if (!sheet || !sheet["!ref"]) {
      return { success: false, error: `Sheet "${firstSheetName}" 为空` };
    }

    // Read raw rows as arrays to detect multi-row headers
    const rawRows = XLSX.utils.sheet_to_json<(string | undefined)[]>(sheet, {
      header: 1,
      defval: "",
    }) as (string | undefined)[][];

    if (rawRows.length === 0) {
      return { success: false, error: "文件中没有数据" };
    }

    let headerRowIndex = 0;
    let dataStartIndex = 1;

    // Detect if first row is a category/merged header row
    if (isCategoryRow(rawRows[0])) {
      headerRowIndex = 1;
      dataStartIndex = 2;
    }

    // If there's no explicit header row beyond categories, check row 0
    if (headerRowIndex >= rawRows.length) {
      return { success: false, error: "无法识别表头行" };
    }

    const rawHeaders = rawRows[headerRowIndex]
      .filter((h): h is string => h !== undefined)
      .map((h) => h.trim());

    if (rawHeaders.length === 0 || rawHeaders.every((h) => !h)) {
      return { success: false, error: "表头行为空" };
    }

    const dataRows = rawRows.slice(dataStartIndex).filter(
      (row) => row && row.some((v) => v && v.trim() !== "")
    );

    if (dataRows.length === 0) {
      return { success: false, error: "除表头外没有数据行" };
    }

    // Convert data rows to Record<string, string>
    const parsedRows: Record<string, string>[] = dataRows.map((row) => {
      const record: Record<string, string> = {};
      rawHeaders.forEach((header, idx) => {
        record[header] = row[idx] !== undefined ? String(row[idx]).trim() : "";
      });
      return record;
    });

    return {
      success: true,
      data: {
        headers: rawHeaders,
        rows: parsedRows,
      },
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "文件解析失败，请确认文件格式正确";
    if (message.includes("encoding") || message.includes("Encoding")) {
      return { success: false, error: "编码异常，请确认文件编码为 UTF-8 或 GBK" };
    }
    return { success: false, error: message };
  }
}

export function generateExcelBuffer(
  headers: string[],
  rows: Record<string, string>[]
): ArrayBuffer {
  const wsData = [headers, ...rows.map((row) => headers.map((h) => row[h] ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

export function getFileSignature(headers: string[]): string {
  return headers.join("|").toLowerCase().replace(/\s+/g, "");
}
