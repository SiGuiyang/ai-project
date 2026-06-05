import type { WaybillRow, ImportOrderRow } from "@/types";

export function getFieldValue(row: WaybillRow | ImportOrderRow, field: string): string | number | undefined {
  return (row as unknown as Record<string, string | number | undefined>)[field];
}

export function setFieldValue(row: WaybillRow | ImportOrderRow, field: string, value: string | number): WaybillRow | ImportOrderRow {
  return { ...row, [field]: value } as WaybillRow | ImportOrderRow;
}
