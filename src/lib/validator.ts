import type { WaybillRow, RowError, DuplicateInfo, ValidationResult } from "@/types";
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
