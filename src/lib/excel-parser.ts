import * as XLSX from "xlsx";
import type { ParsedData } from "@/types";

const CATEGORY_KEYWORDS = ["发件方", "收件方", "货物", "信息"];

function normalize(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[（）()]/g, "");
}

function isRowEmpty(row: (string | undefined)[]): boolean {
  return row.every((v) => !v || String(v).trim() === "");
}

function isCategoryRow(row: (string | undefined)[]): boolean {
  const nonEmpty: string[] = [];
  for (const v of row) {
    if (v && v.trim()) nonEmpty.push(v);
  }
  if (nonEmpty.length === 0) return false;
  return nonEmpty.some((v) =>
    CATEGORY_KEYWORDS.some((kw) => v.includes(kw))
  );
}

const HEADER_PATTERNS: { keywords: string[]; field: string }[] = [
  // 外部订单号 variants
  { keywords: ["外部订单号", "外部编码", "客户单号", "orderno", "ordernumber", "order no", "order number"], field: "externalCode" },
  // 发货人 variants
  { keywords: ["发货人", "发件人", "发件人姓名", "sendername", "sender name"], field: "senderName" },
  // 发货电话 variants
  { keywords: ["发货电话", "发件电话", "发件人电话", "senderphone", "sender phone"], field: "senderPhone" },
  // 发货地址 variants
  { keywords: ["发货地址", "发件地址", "发件人地址", "senderaddress", "sender address"], field: "senderAddress" },
  // 收货人 variants
  { keywords: ["收货人", "收件人", "收件人姓名", "receivername", "receiver name"], field: "receiverName" },
  // 收货电话 variants
  { keywords: ["收货电话", "收件电话", "收件人电话", "receiverphone", "receiver phone"], field: "receiverPhone" },
  // 收货地址 variants
  { keywords: ["收货地址", "收件地址", "收件人地址", "receiveraddress", "receiver address"], field: "receiverAddress" },
  // 重量 variants
  { keywords: ["重量", "重量kg", "weight"], field: "weight" },
  // 数量/件数 variants
  { keywords: ["数量", "件数", "pieces"], field: "pieces" },
  // 温度要求 variants
  { keywords: ["温度要求", "温层", "温度", "temperature"], field: "temperatureLevel" },
  // 备注/附言 variants
  { keywords: ["附言", "备注", "remark"], field: "remark" },
];

function scoreRowAsHeader(row: (string | undefined)[]): number {
  let score = 0;
  const normalizedCells = row
    .filter((v): v is string => v !== undefined && v.trim() !== "")
    .map((v) => normalize(v));

  for (const cell of normalizedCells) {
    for (const pattern of HEADER_PATTERNS) {
      if (pattern.keywords.some((kw) => cell === normalize(kw) || cell.includes(normalize(kw)))) {
        score++;
        break;
      }
    }
  }
  return score;
}

function findHeaderRowIndex(rows: (string | undefined)[][]): number {
  const MIN_HEADER_SCORE = 3;

  for (let i = 0; i < rows.length; i++) {
    if (isRowEmpty(rows[i])) continue;
    const score = scoreRowAsHeader(rows[i]);
    if (score >= MIN_HEADER_SCORE) {
      return i;
    }
  }
  return -1;
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

    const rawRows = XLSX.utils.sheet_to_json<(string | undefined)[]>(sheet, {
      header: 1,
      defval: "",
    }) as (string | undefined)[][];

    if (rawRows.length === 0) {
      return { success: false, error: "文件中没有数据" };
    }

    // Find the header row by content matching
    const headerRowIndex = findHeaderRowIndex(rawRows);

    if (headerRowIndex === -1) {
      return { success: false, error: "无法识别表头行，请确认文件包含正确的列名" };
    }

    // If header is preceded by a category row, use the category row info for display
    const hasCategoryAbove =
      headerRowIndex > 0 && isCategoryRow(rawRows[headerRowIndex - 1]);

    // Extract headers from the identified header row
    const rawHeaders = rawRows[headerRowIndex]
      .filter((h): h is string => h !== undefined)
      .map((h) => h.trim());

    if (rawHeaders.length === 0 || rawHeaders.every((h) => !h)) {
      return { success: false, error: "表头行为空" };
    }

    // Data starts after the header row (and after category row if present)
    const dataStartIndex = headerRowIndex + 1;
    const dataRows = rawRows.slice(dataStartIndex).filter(
      (row) => row && row.some((v) => v && v.trim() !== "")
    );

    if (dataRows.length === 0) {
      return { success: false, error: "除表头外没有数据行" };
    }

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
