import * as XLSX from "xlsx";
import type { ParsedData } from "@/types";

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

    const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: "",
      header: "A",
    });

    if (jsonData.length === 0) {
      return { success: false, error: "文件中没有数据" };
    }

    const headers = Object.keys(jsonData[0]);
    if (headers.length === 0) {
      return { success: false, error: "表头行为空" };
    }

    const dataRows = jsonData.slice(1).filter((row) =>
      Object.values(row).some((v) => v !== "")
    );

    if (dataRows.length === 0) {
      return { success: false, error: "除表头外没有数据行" };
    }

    return {
      success: true,
      data: {
        headers,
        rows: dataRows,
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
