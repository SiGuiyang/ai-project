export const TEMPERATURE_LEVELS = ["常温", "冷藏", "冷冻", ""] as const;
export type TemperatureLevel = (typeof TEMPERATURE_LEVELS)[number];

export const REQUIRED_FIELDS = [
  "senderName",
  "senderPhone",
  "senderAddress",
  "receiverName",
  "receiverPhone",
  "receiverAddress",
  "weight",
  "pieces",
  "temperatureLevel",
] as const;

export interface WaybillRow {
  id: string;
  externalCode?: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  weight: number;
  pieces: number;
  temperatureLevel: TemperatureLevel;
  remark?: string;
}

export interface RowError {
  rowIndex: number;
  field: string;
  message: string;
}

export interface DuplicateInfo {
  rowIndex: number;
  field: string;
  duplicateWithRow: number;
  value: string;
}

export interface ValidationResult {
  rowIndex: number;
  errors: RowError[];
  duplicates: DuplicateInfo[];
}

export interface ColumnMapping {
  [excelColumn: string]: string;
}

export interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
}

export interface ImportBatch {
  id: string;
  createdAt: string;
  totalCount: number;
  successCount: number;
  failCount: number;
  status: "pending" | "processing" | "completed" | "failed" | "converted";
}

export type FieldLabelMap = Record<string, string>;

export const FIELD_LABELS: FieldLabelMap = {
  senderName: "发件人姓名",
  senderPhone: "发件人电话",
  senderAddress: "发件人地址",
  receiverName: "收件人姓名",
  receiverPhone: "收件人电话",
  receiverAddress: "收件人地址",
  weight: "重量",
  pieces: "件数",
  temperatureLevel: "温层",
  externalCode: "客户单号",
  remark: "备注",
};

export const FIELD_ALIASES: FieldLabelMap = {
  "发件人": "senderName",
  "发货人": "senderName",
  "发件电话": "senderPhone",
  "发货电话": "senderPhone",
  "发件地址": "senderAddress",
  "发货地址": "senderAddress",
  "重量": "weight",
  "件数": "pieces",
  "温层": "temperatureLevel",
  "收件人": "receiverName",
  "收货人": "receiverName",
  "收件电话": "receiverPhone",
  "收货电话": "receiverPhone",
  "收件地址": "receiverAddress",
  "收货地址": "receiverAddress",
  "外部编码": "externalCode",
  "外部订单号": "externalCode",
  "重量(kg)": "weight",
  "数量": "pieces",
  "温度要求": "temperatureLevel",
  "附言": "remark",
};

// ---- V2 Import types ----

export interface OrderItemRow {
  skuCode: string;
  skuName: string;
  quantity: number;
  spec?: string;
}

export interface ImportOrderRow {
  id: string;
  externalCode?: string;
  storeName?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  remark?: string;
  items: OrderItemRow[];
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  weight?: number;
  pieces?: number;
  temperatureLevel?: string;
  convertedAt?: string;
}

export type AggFunction = "sum" | "first" | "concat";

export interface PostProcessor {
  type: "aggregate" | "transpose" | "extractTail" | "cardSplit" | "cellSplit" | "multiSheet";
  config?: Record<string, unknown>;
}

export interface ExtractRule {
  type: "tail" | "header";
  fields: { label: string; target: string }[];
}

export interface ParseRuleConfig {
  name?: string;
  fileType: "excel" | "word" | "pdf";
  sheetIndex?: number;
  headerRow?: number;
  dataStartRow?: number;
  skipRows?: number[];
  columnMappings: Record<string, string>;
  groupBy?: string;
  postProcessors?: PostProcessor[];
  extractors?: ExtractRule[];
}

export const V2_FIELD_LABELS: Record<string, string> = {
  externalCode: "外部编码",
  storeName: "收货门店",
  receiverName: "收件人姓名",
  receiverPhone: "收件人电话",
  receiverAddress: "收件人地址",
  skuCode: "SKU物品编码",
  skuName: "SKU物品名称",
  quantity: "SKU发货数量",
  spec: "SKU规格型号",
  remark: "备注",
  senderName: "发件人姓名",
  senderPhone: "发件人电话",
  senderAddress: "发件人地址",
  weight: "重量(kg)",
  pieces: "件数",
  temperatureLevel: "温层",
};
