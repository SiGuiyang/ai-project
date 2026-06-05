import mammoth from "mammoth";
import type { ParseRuleConfig } from "@/types";
import type { ExecutorResult } from "./types";

function extractTextFromHtml(html: string): string {
  return html
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
}

function parseTextToRows(
  text: string,
  config: ParseRuleConfig
): Record<string, string>[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const headerRow = config.headerRow ?? 0;
  const dataStart = config.dataStartRow ?? (headerRow + 1);
  const skipSet = new Set(config.skipRows ?? []);

  if (headerRow >= lines.length) return [];

  const headers = lines[headerRow]
    .split(/\t| {2,}/)
    .map((h) => h.trim())
    .filter(Boolean);

  if (headers.length === 0) return [];

  const rows: Record<string, string>[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    if (skipSet.has(i)) continue;
    const cols = lines[i].split(/\t| {2,}/).map((c) => c.trim());
    if (cols.length === 0 || cols.every((c) => !c)) continue;
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = cols[idx] ?? "";
    });
    rows.push(record);
  }

  return rows;
}

function applyExtractors(
  text: string,
  config: ParseRuleConfig
): Record<string, string> {
  const info: Record<string, string> = {};
  const extractors = config.extractors ?? [];
  if (extractors.length === 0) return info;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const ex of extractors) {
    if (ex.type === "header" && lines.length > 0) {
      for (const f of ex.fields) {
        for (const line of lines.slice(0, Math.min(10, lines.length))) {
          if (line.includes(f.label)) {
            const parts = line.split(":").map((s) => s.trim());
            if (parts.length >= 2) {
              info[f.target] = parts.slice(1).join(":");
            }
            break;
          }
        }
      }
    }
    if (ex.type === "tail" && lines.length > 0) {
      for (const f of ex.fields) {
        for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
          if (lines[i].includes(f.label)) {
            const parts = lines[i].split(":").map((s) => s.trim());
            if (parts.length >= 2) {
              info[f.target] = parts.slice(1).join(":");
            }
            break;
          }
        }
      }
    }
  }

  return info;
}

function buildOrders(
  rows: Record<string, string>[],
  config: ParseRuleConfig,
  extraInfo: Record<string, string>
): ExecutorResult {
  const groupBy = config.groupBy;
  const orderMap = new Map<string, ExecutorResult["orders"][number]>();

  for (const row of rows) {
    const mapped: Record<string, string> = {};
    for (const [source, target] of Object.entries(config.columnMappings)) {
      mapped[target] = row[source] ?? "";
    }

    const key = groupBy ? (mapped[groupBy] || "_ungrouped") : "_ungrouped";
    let order = orderMap.get(key);
    if (!order) {
      order = {
        externalCode: mapped.externalCode || extraInfo.externalCode || undefined,
        storeName: mapped.storeName || extraInfo.storeName || undefined,
        receiverName: mapped.receiverName || extraInfo.receiverName || undefined,
        receiverPhone: mapped.receiverPhone || extraInfo.receiverPhone || undefined,
        receiverAddress: mapped.receiverAddress || extraInfo.receiverAddress || undefined,
        remark: mapped.remark || extraInfo.remark || undefined,
        items: [],
      };
      orderMap.set(key, order);
    }

    const skuCode = mapped.skuCode || "";
    const skuName = mapped.skuName || "";
    const quantity = Number(mapped.quantity) || 0;
    const spec = mapped.spec || undefined;

    const existing = order.items.find((i) => i.skuCode === skuCode && i.spec === spec);
    if (existing) {
      existing.quantity += quantity;
    } else {
      order.items.push({ skuCode, skuName, quantity, spec });
    }
  }

  return { orders: Array.from(orderMap.values()) };
}

export async function executeWord(
  buffer: ArrayBuffer,
  config: ParseRuleConfig
): Promise<ExecutorResult> {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const text = extractTextFromHtml(result.value);
    const rows = parseTextToRows(text, config);
    const extraInfo = applyExtractors(text, config);
    return buildOrders(rows, config, extraInfo);
  } catch (e) {
    return {
      orders: [],
      errors: [e instanceof Error ? e.message : "Word parsing failed"],
    };
  }
}
