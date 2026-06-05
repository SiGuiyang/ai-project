import * as XLSX from "xlsx";
import type { ParseRuleConfig } from "@/types";
import type { ExecutorResult } from "./types";

function applyColumnMappings(
  row: Record<string, string>,
  mappings: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [source, target] of Object.entries(mappings)) {
    result[target] = row[source] ?? "";
  }
  return result;
}

function processAggregate(
  rows: Record<string, string>[],
  config: ParseRuleConfig,
  extraInfo: Record<string, string>
): ExecutorResult {
  const groupKey = config.groupBy;
  const orderMap = new Map<string, ExecutorResult["orders"][number]>();

  for (const row of rows) {
    const mapped = applyColumnMappings(row, config.columnMappings);
    const key = groupKey ? (mapped[groupKey] || "_ungrouped") : "_ungrouped";

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

    const existingItem = order.items.find((i) => i.skuCode === skuCode && i.spec === spec);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      order.items.push({ skuCode, skuName, quantity, spec });
    }
  }

  return { orders: Array.from(orderMap.values()) };
}

function processTranspose(
  rows: Record<string, string>[],
  config: ParseRuleConfig
): ExecutorResult {
  const dimFields = new Set(["skuCode", "skuName", "spec", "quantity"]);
  const targetFields = new Set([
    "externalCode", "storeName", "receiverName",
    "receiverPhone", "receiverAddress", "remark",
  ]);
  const dataColMappings: Record<string, string> = {};
  const dimMappings: Record<string, string> = {};
  for (const [source, target] of Object.entries(config.columnMappings)) {
    if (dimFields.has(target) || targetFields.has(target)) {
      dimMappings[source] = target;
    } else {
      dataColMappings[source] = target;
    }
  }

  const orders: ExecutorResult["orders"] = [];

  for (const row of rows) {
    const dimData = applyColumnMappings(row, dimMappings);
    for (const [source, target] of Object.entries(dataColMappings)) {
      const cellVal = row[source];
      if (!cellVal || String(cellVal).trim() === "") continue;
      const qty = Number(cellVal);
      if (isNaN(qty) || qty === 0) continue;

      orders.push({
        storeName: target,
        items: [
          {
            skuCode: dimData.skuCode || "",
            skuName: dimData.skuName || "",
            quantity: qty,
            spec: dimData.spec || undefined,
          },
        ],
        ...(dimData.externalCode ? { externalCode: dimData.externalCode } : {}),
        ...(dimData.receiverName ? { receiverName: dimData.receiverName } : {}),
        ...(dimData.receiverPhone ? { receiverPhone: dimData.receiverPhone } : {}),
        ...(dimData.receiverAddress ? { receiverAddress: dimData.receiverAddress } : {}),
        ...(dimData.remark ? { remark: dimData.remark } : {}),
      });
    }
  }

  return { orders };
}

function processCardSplit(
  rows: Record<string, string>[],
  config: ParseRuleConfig
): ExecutorResult {
  const orders: ExecutorResult["orders"] = [];
  let currentHeader: Record<string, string> = {};
  let currentItems: ExecutorResult["orders"][number]["items"] = [];

  function flush() {
    if (currentItems.length > 0) {
      orders.push({
        externalCode: currentHeader.externalCode || undefined,
        storeName: currentHeader.storeName || undefined,
        receiverName: currentHeader.receiverName || undefined,
        receiverPhone: currentHeader.receiverPhone || undefined,
        receiverAddress: currentHeader.receiverAddress || undefined,
        remark: currentHeader.remark || undefined,
        items: currentItems,
      });
    }
    currentHeader = {};
    currentItems = [];
  }

  for (const row of rows) {
    const mapped = applyColumnMappings(row, config.columnMappings);
    const hasHeaderField = !!(mapped.externalCode || mapped.storeName || mapped.receiverName);
    const hasItemField = !!(mapped.skuCode || mapped.skuName);

    if (hasHeaderField && !hasItemField) {
      if (currentItems.length > 0) flush();
      currentHeader = mapped;
    } else if (hasItemField) {
      currentItems.push({
        skuCode: mapped.skuCode || "",
        skuName: mapped.skuName || "",
        quantity: Number(mapped.quantity) || 0,
        spec: mapped.spec || undefined,
      });
    }
  }

  flush();
  return { orders };
}

function processCellSplit(
  rows: Record<string, string>[],
  config: ParseRuleConfig
): ExecutorResult {
  const splitEntry = Object.entries(config.columnMappings).find(
    ([_, target]) => target === "skuName" || target === "skuCode"
  );
  const splitSource = splitEntry?.[0];
  if (!splitSource) return processAggregate(rows, config, {});

  const expandedRows: Record<string, string>[] = [];
  for (const row of rows) {
    const val = row[splitSource];
    if (val && val.includes("\n")) {
      const parts = val.split("\n").map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        expandedRows.push({ ...row, [splitSource]: part });
      }
    } else {
      expandedRows.push(row);
    }
  }
  return processAggregate(expandedRows, config, {});
}

function processExtractTail(
  rows: Record<string, string>[],
  config: ParseRuleConfig
): Record<string, string> {
  const info: Record<string, string> = {};
  const extractors = config.extractors?.filter((e) => e.type === "tail");
  if (!extractors || rows.length === 0) return info;

  for (const ex of extractors) {
    let tailRow: Record<string, string> | undefined;
    for (let i = rows.length - 1; i >= 0; i--) {
      const hasVal = ex.fields.some((f) => rows[i][f.label]);
      if (hasVal) {
        tailRow = rows[i];
        break;
      }
    }
    if (tailRow) {
      for (const f of ex.fields) {
        info[f.target] = tailRow[f.label] ?? info[f.target] ?? "";
      }
    }
  }
  return info;
}

function extractHead(
  rows: Record<string, string>[],
  extractors: ParseRuleConfig["extractors"]
): Record<string, string> {
  const info: Record<string, string> = {};
  if (!extractors) return info;
  for (const ex of extractors) {
    if (ex.type !== "header") continue;
    if (rows.length === 0) continue;
    const first = rows[0];
    for (const f of ex.fields) {
      info[f.target] = first[f.label] ?? "";
    }
  }
  return info;
}

export function executeExcel(
  buffer: ArrayBuffer,
  config: ParseRuleConfig
): ExecutorResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[config.sheetIndex ?? 0];
  if (!sheetName) return { orders: [], errors: ["Sheet not found"] };
  const sheet = workbook.Sheets[sheetName];
  if (!sheet || !sheet["!ref"]) return { orders: [], errors: ["Empty sheet"] };

  const rawRows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
  }) as string[][];

  if (rawRows.length === 0) return { orders: [], errors: ["No data"] };

  const errors: string[] = [];
  const skipRowsSet = new Set(config.skipRows ?? []);
  const dataStartRow = config.dataStartRow ?? (config.headerRow != null ? config.headerRow + 1 : 0);
  const headerRowIdx = config.headerRow ?? 0;

  if (headerRowIdx >= rawRows.length) {
    return { orders: [], errors: ["Header row index out of range"] };
  }

  const rawHeaders = rawRows[headerRowIdx]
    .map((h) => String(h).trim())
    .filter(Boolean);

  if (rawHeaders.length === 0) {
    return { orders: [], errors: ["Header row is empty"] };
  }

  const dataRows: Record<string, string>[] = [];
  for (let i = dataStartRow; i < rawRows.length; i++) {
    if (skipRowsSet.has(i)) continue;
    const row = rawRows[i];
    const hasData = row?.some((v) => v && String(v).trim() !== "");
    if (!hasData) continue;
    const record: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => {
      record[h] = row[idx] !== undefined ? String(row[idx]).trim() : "";
    });
    dataRows.push(record);
  }

  const tailInfo = processExtractTail(dataRows, config);
  const headerInfo = extractHead(dataRows, config.extractors);

  if (dataRows.length === 0) {
    return { orders: [], errors: [] };
  }

  const processors = config.postProcessors ?? [];
  if (processors.length === 0) {
    return processAggregate(dataRows, config, { ...headerInfo, ...tailInfo });
  }

  const firstProcessor = processors[0];

  switch (firstProcessor.type) {
    case "transpose":
      return processTranspose(dataRows, config);
    case "cardSplit":
      return processCardSplit(dataRows, config);
    case "cellSplit":
      return processCellSplit(dataRows, config);
    case "multiSheet": {
      const allOrders: ExecutorResult["orders"] = [];
      for (let si = 0; si < workbook.SheetNames.length; si++) {
        const sn = workbook.SheetNames[si];
        const s = workbook.Sheets[sn];
        if (!s || !s["!ref"]) continue;
        const subRows = XLSX.utils.sheet_to_json<string[]>(s, { header: 1, defval: "" }) as string[][];
        if (subRows.length === 0) continue;
        const subConfig = {
          ...config,
          sheetIndex: si,
          postProcessors: processors.slice(1),
        };
        const result = executeExcel(buffer, subConfig);
        allOrders.push(...result.orders);
        if (result.errors) errors.push(...result.errors);
      }
      return { orders: allOrders, errors: errors.length > 0 ? errors : undefined };
    }
    case "aggregate":
    default:
      return processAggregate(dataRows, { ...config, postProcessors: processors.slice(1) }, { ...headerInfo, ...tailInfo });
  }
}
