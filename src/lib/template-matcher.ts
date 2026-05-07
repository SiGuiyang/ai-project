import type { ColumnMapping } from "@/types";
import { FIELD_LABELS, FIELD_ALIASES } from "@/types";

const TEMPLATE_MAP_STORAGE_KEY = "template-mappings";

const DEFAULT_TEMPLATES: { name: string; mapping: ColumnMapping }[] = [
  {
    name: "模板A（标准列名）",
    mapping: {
      "发件人姓名": "senderName",
      "发件人电话": "senderPhone",
      "发件人地址": "senderAddress",
      "收件人姓名": "receiverName",
      "收件人电话": "receiverPhone",
      "收件人地址": "receiverAddress",
      "重量": "weight",
      "件数": "pieces",
      "温层": "temperatureLevel",
      "客户单号": "externalCode",
      "备注": "remark",
    },
  },
  {
    name: "模板B（英文列名）",
    mapping: {
      "Sender Name": "senderName",
      "Sender Phone": "senderPhone",
      "Sender Address": "senderAddress",
      "Receiver Name": "receiverName",
      "Receiver Phone": "receiverPhone",
      "Receiver Address": "receiverAddress",
      "Weight": "weight",
      "Pieces": "pieces",
      "Temperature": "temperatureLevel",
      "Order No": "externalCode",
      "Remark": "remark",
    },
  },
  {
    name: "模板C（分组表头）",
    mapping: {
      "发件人": "senderName",
      "发件电话": "senderPhone",
      "发件地址": "senderAddress",
      "外部编码": "externalCode",
      "收件人": "receiverName",
      "收件电话": "receiverPhone",
      "收件地址": "receiverAddress",
      "备注": "remark",
      "重量(kg)": "weight",
      "件数": "pieces",
      "温层": "temperatureLevel",
    },
  },
];

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[（）()]/g, "");
}

function computeSimilarity(excelHeaders: string[], mapping: ColumnMapping): number {
  const mappedHeaders = Object.keys(mapping);
  const matched = excelHeaders.filter((h) =>
    mappedHeaders.some(
      (mh) => normalizeHeader(h) === normalizeHeader(mh)
    )
  ).length;
  return matched / Math.max(excelHeaders.length, mappedHeaders.length);
}

export function getSavedTemplateMappings(): Record<string, ColumnMapping> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(TEMPLATE_MAP_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function saveTemplateMapping(
  signature: string,
  mapping: ColumnMapping
): void {
  if (typeof window === "undefined") return;
  try {
    const mappings = getSavedTemplateMappings();
    mappings[signature] = mapping;
    localStorage.setItem(
      TEMPLATE_MAP_STORAGE_KEY,
      JSON.stringify(mappings)
    );
  } catch {
    // silently fail
  }
}

export function findBestTemplate(
  excelHeaders: string[]
): { name: string; mapping: ColumnMapping } | null {
  const allTemplates = [...DEFAULT_TEMPLATES];

  const savedMappings = getSavedTemplateMappings();
  for (const mapping of Object.values(savedMappings)) {
    allTemplates.push({ name: "已保存模板", mapping });
  }

  let best: { name: string; mapping: ColumnMapping; score: number } | null = null;

  for (const tmpl of allTemplates) {
    const score = computeSimilarity(excelHeaders, tmpl.mapping);
    if (!best || score > best.score) {
      best = { ...tmpl, score };
    }
  }

  if (best && best.score >= 0.5) {
    return { name: best.name, mapping: best.mapping };
  }

  return null;
}

export function autoSuggestMapping(
  excelHeaders: string[]
): ColumnMapping {
  const mapping: ColumnMapping = {};
  const fieldLabels = Object.entries(FIELD_LABELS);
  const aliases = Object.entries(FIELD_ALIASES);

  for (const header of excelHeaders) {
    const normalized = normalizeHeader(header);
    let matched = false;

    // Check direct aliases first
    for (const [aliasHeader, field] of aliases) {
      if (normalized === normalizeHeader(aliasHeader)) {
        mapping[header] = field;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Check field labels
    for (const [field, label] of fieldLabels) {
      if (
        normalized === normalizeHeader(label) ||
        normalized === normalizeHeader(field) ||
        normalized.includes(normalizeHeader(label)) ||
        normalizeHeader(label).includes(normalized)
      ) {
        mapping[header] = field;
        matched = true;
        break;
      }
    }

    if (!matched) {
      mapping[header] = "";
    }
  }

  return mapping;
}
