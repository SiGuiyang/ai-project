import type { WaybillRow, ImportOrderRow, RowError, DuplicateInfo, ValidationResult } from "@/types";
import { REQUIRED_FIELDS, TEMPERATURE_LEVELS, FIELD_LABELS } from "@/types";
import { getFieldValue } from "@/lib/helpers";

const PHONE_REGEX = /^1[3-9]\d{9}$/;

function validateField(
  row: WaybillRow,
  field: string,
  rowIndex: number
): RowError | null {
  const value = getFieldValue(row, field);
  const label = FIELD_LABELS[field] || field;

  if (REQUIRED_FIELDS.includes(field as typeof REQUIRED_FIELDS[number])) {
    if (value === undefined || value === null || String(value).trim() === "") {
      return { rowIndex, field, message: `${label}为必填项` };
    }
  }

  if (field === "senderPhone" || field === "receiverPhone") {
    if (value && !PHONE_REGEX.test(String(value).trim())) {
      return {
        rowIndex,
        field,
        message: `${label}：格式错误，需为11位手机号`,
      };
    }
  }

  if (field === "weight") {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      return { rowIndex, field, message: `${label}必须为正数` };
    }
  }

  if (field === "pieces") {
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) {
      return { rowIndex, field, message: `${label}必须为正整数` };
    }
  }

  if (field === "temperatureLevel") {
    if (value && !TEMPERATURE_LEVELS.includes(value as typeof TEMPERATURE_LEVELS[number])) {
      return {
        rowIndex,
        field,
        message: `${label}值不在范围内，可选值：${TEMPERATURE_LEVELS.join("、")}`,
      };
    }
  }

  return null;
}

export function validateRow(
  row: WaybillRow,
  rowIndex: number
): RowError[] {
  const errors: RowError[] = [];
  const fieldsToCheck = [...REQUIRED_FIELDS, "senderPhone", "receiverPhone"];

  for (const field of fieldsToCheck) {
    const error = validateField(row, field, rowIndex);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

export function validateOrderRow(
  order: ImportOrderRow,
  rowIndex: number
): RowError[] {
  const errors: RowError[] = [];

  const hasStore = order.storeName && String(order.storeName).trim() !== "";
  const hasReceiver = order.receiverName && String(order.receiverName).trim() !== "" &&
    order.receiverPhone && String(order.receiverPhone).trim() !== "" &&
    order.receiverAddress && String(order.receiverAddress).trim() !== "";

  if (!hasStore && !hasReceiver) {
    errors.push({
      rowIndex,
      field: "storeName",
      message: "收货门店和收件人信息（姓名+电话+地址）至少填一项",
    });
  }
  if (order.receiverPhone && !PHONE_REGEX.test(String(order.receiverPhone).trim())) {
    errors.push({
      rowIndex,
      field: "receiverPhone",
      message: "收件人电话格式错误，需为11位手机号",
    });
  }

  if (order.items && order.items.length > 0) {
    order.items.forEach((item, itemIdx) => {
      if (!item.skuCode || String(item.skuCode).trim() === "") {
        errors.push({ rowIndex, field: `items.${itemIdx}.skuCode`, message: `第 ${itemIdx + 1} 个SKU编码不能为空` });
      }
      if (!item.skuName || String(item.skuName).trim() === "") {
        errors.push({ rowIndex, field: `items.${itemIdx}.skuName`, message: `第 ${itemIdx + 1} 个SKU名称不能为空` });
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        errors.push({ rowIndex, field: `items.${itemIdx}.quantity`, message: `第 ${itemIdx + 1} 个SKU数量必须为正数` });
      }
    });
  } else {
    errors.push({ rowIndex, field: "items", message: "至少需要一个SKU物品" });
  }

  return errors;
}

export function findDuplicates(
  rows: WaybillRow[],
  existingExternalCodes: Set<string>
): DuplicateInfo[] {
  const duplicates: DuplicateInfo[] = [];
  const seenInBatch = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const code = rows[i].externalCode;
    if (!code || String(code).trim() === "") continue;

    const trimmedCode = String(code).trim();

    if (existingExternalCodes.has(trimmedCode)) {
      duplicates.push({
        rowIndex: i,
        field: "externalCode",
        duplicateWithRow: -1,
        value: trimmedCode,
      });
      continue;
    }

    const existingRow = seenInBatch.get(trimmedCode);
    if (existingRow !== undefined) {
      duplicates.push({
        rowIndex: i,
        field: "externalCode",
        duplicateWithRow: existingRow,
        value: trimmedCode,
      });
    } else {
      seenInBatch.set(trimmedCode, i);
    }
  }

  return duplicates;
}

export function validateAll(
  rows: WaybillRow[],
  existingExternalCodes?: Set<string>
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const duplicates = existingExternalCodes
    ? findDuplicates(rows, existingExternalCodes)
    : [];

  for (let i = 0; i < rows.length; i++) {
    const errors = validateRow(rows[i], i);
    const rowDuplicates = duplicates.filter((d) => d.rowIndex === i);
    results.push({
      rowIndex: i,
      errors,
      duplicates: rowDuplicates,
    });
  }

  return results;
}

export function validateAllOrders(
  orders: ImportOrderRow[],
  existingExternalCodes?: Set<string>
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (let i = 0; i < orders.length; i++) {
    const errors = validateOrderRow(orders[i], i);
    results.push({
      rowIndex: i,
      errors,
      duplicates: [],
    });
  }

  return results;
}
