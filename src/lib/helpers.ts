import type { WaybillRow } from "@/types";

export function getFieldValue(row: WaybillRow, field: string): string | number | undefined {
  return (row as unknown as Record<string, string | number | undefined>)[field];
}

export function setFieldValue(row: WaybillRow, field: string, value: string | number): WaybillRow {
  return { ...row, [field]: value } as WaybillRow;
}
