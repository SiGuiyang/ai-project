"use client";

import { useState, useMemo } from "react";
import { useImport } from "@/store/import-context";
import CellEditor from "./CellEditor";
import { FIELD_LABELS } from "@/types";
import type { RowError, DuplicateInfo } from "@/types";
import { getFieldValue } from "@/lib/helpers";

const DISPLAY_FIELDS = [
  "externalCode",
  "senderName",
  "senderPhone",
  "senderAddress",
  "receiverName",
  "receiverPhone",
  "receiverAddress",
  "weight",
  "pieces",
  "temperatureLevel",
  "remark",
] as const;

const EDITABLE_FIELDS = new Set([
  "senderName",
  "senderPhone",
  "senderAddress",
  "receiverName",
  "receiverPhone",
  "receiverAddress",
  "weight",
  "pieces",
  "temperatureLevel",
  "externalCode",
  "remark",
]);

export default function ExcelTable() {
  const {
    rows,
    validationResults,
    updateRow,
    addRow,
    deleteRows,
  } = useImport();

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{
    row: number;
    field: string;
  } | null>(null);

  const errorMap = useMemo(() => {
    const map = new Map<number, RowError[]>();
    for (const vr of validationResults) {
      if (vr.errors.length > 0) {
        map.set(vr.rowIndex, vr.errors);
      }
    }
    return map;
  }, [validationResults]);

  const duplicateMap = useMemo(() => {
    const map = new Map<number, DuplicateInfo[]>();
    for (const vr of validationResults) {
      if (vr.duplicates.length > 0) {
        map.set(vr.rowIndex, vr.duplicates);
      }
    }
    return map;
  }, [validationResults]);

  const cellErrors = useMemo(() => {
    const map = new Map<string, RowError[]>();
    for (const vr of validationResults) {
      for (const err of vr.errors) {
        const key = `${vr.rowIndex}-${err.field}`;
        const existing = map.get(key) || [];
        existing.push(err);
        map.set(key, existing);
      }
    }
    return map;
  }, [validationResults]);

  const toggleRow = (index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleDelete = () => {
    if (selectedRows.size === 0) return;
    deleteRows(Array.from(selectedRows).sort((a, b) => b - a));
    setSelectedRows(new Set());
  };

  const handleCellSave = (rowIndex: number, field: string, value: string | number) => {
    updateRow(rowIndex, field, value);
    setEditingCell(null);
  };

  const totalErrors = validationResults.reduce(
    (sum, vr) => sum + vr.errors.length,
    0
  );
  const totalDuplicates = validationResults.reduce(
    (sum, vr) => sum + vr.duplicates.length,
    0
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-600">
          共 {rows.length} 行
        </span>
        {totalErrors > 0 && (
          <span className="text-red-600 font-medium">
            错误 {totalErrors} 处
          </span>
        )}
        {totalDuplicates > 0 && (
          <span className="text-yellow-600 font-medium">
            重复 {totalDuplicates} 处
          </span>
        )}
        <div className="flex-1" />
        <button
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          onClick={addRow}
        >
          + 新增空行
        </button>
        <button
          className="px-3 py-1 text-sm border rounded text-red-600 hover:bg-red-50 disabled:opacity-50"
          onClick={handleDelete}
          disabled={selectedRows.size === 0}
        >
          删除选中行 ({selectedRows.size})
        </button>
      </div>

      <div className="overflow-auto border rounded-lg max-h-[600px]">
        <table className="w-full text-sm border-collapse" style={{ minWidth: 1400 }}>
          <thead>
            <tr className="bg-gray-100 sticky top-0 z-10">
              <th className="border px-2 py-2 w-10 sticky left-0 bg-gray-100 z-20">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(new Set(rows.map((_, i) => i)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                  checked={selectedRows.size === rows.length && rows.length > 0}
                />
              </th>
              <th className="border px-2 py-2 w-10 sticky left-[40px] bg-gray-100 z-20">
                #
              </th>
              {DISPLAY_FIELDS.map((field) => (
                <th
                  key={field}
                  className="border px-2 py-2 whitespace-nowrap min-w-[120px]"
                >
                  {FIELD_LABELS[field] || field}
                  {field === "externalCode" && <span className="text-gray-400 ml-1">(选填)</span>}
                  {field === "remark" && <span className="text-gray-400 ml-1">(选填)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const rowHasErrors = errorMap.has(rowIndex);
              const rowHasDuplicates = duplicateMap.has(rowIndex);

              return (
                <tr
                  key={row.id}
                  className={`${
                    rowHasErrors
                      ? "bg-red-50"
                      : rowHasDuplicates
                      ? "bg-yellow-50"
                      : rowIndex % 2 === 0
                      ? "bg-white"
                      : "bg-gray-50"
                  } hover:bg-blue-50`}
                >
                  <td className="border px-2 py-1 sticky left-0 bg-inherit z-10">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(rowIndex)}
                      onChange={() => toggleRow(rowIndex)}
                    />
                  </td>
                  <td className="border px-2 py-1 text-center text-gray-400 sticky left-[40px] bg-inherit z-10">
                    {rowIndex + 1}
                  </td>
                  {DISPLAY_FIELDS.map((field) => {
                    const cellKey = `${rowIndex}-${field}`;
                    const cellErr = cellErrors.get(cellKey);
                    const dup = duplicateMap
                      .get(rowIndex)
                      ?.find((d) => d.field === field);
                    const value = getFieldValue(row, field);
                    const isEditing =
                      editingCell?.row === rowIndex &&
                      editingCell?.field === field;

                    return (
                      <td
                        key={field}
                        className={`border px-2 py-1 relative ${
                          cellErr ? "bg-red-100" : ""
                        } ${dup ? "bg-yellow-100" : ""}`}
                      >
                        {isEditing ? (
                          <CellEditor
                            field={field}
                            value={value}
                            onSave={(v) => handleCellSave(rowIndex, field, v)}
                            onCancel={() => setEditingCell(null)}
                          />
                        ) : (
                          <div
                            className={`min-h-[24px] cursor-pointer ${
                              EDITABLE_FIELDS.has(field) ? "hover:ring-1 hover:ring-blue-400 rounded px-1" : ""
                            }`}
                            onClick={() => {
                              if (EDITABLE_FIELDS.has(field)) {
                                setEditingCell({ row: rowIndex, field });
                              }
                            }}
                            title={
                              cellErr
                                ? cellErr.map((e) => e.message).join("; ")
                                : dup
                                ? `与第 ${dup.duplicateWithRow + 1} 行重复：${dup.value}`
                                : undefined
                            }
                          >
                            {field === "temperatureLevel" && !value ? (
                              <span className="text-gray-300">点击选择</span>
                            ) : (
                              String(value ?? "")
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {validationResults.length > 0 && (
        <div className="bg-gray-50 border rounded p-3 text-sm space-y-1 max-h-48 overflow-y-auto">
          <p className="font-medium text-gray-700">校验结果：</p>
          {validationResults.map((vr) => {
            const allIssues = [
              ...vr.errors.map((e) => ({
                type: "error" as const,
                message: `第 ${vr.rowIndex + 1} 行，${e.message}`,
              })),
              ...vr.duplicates.map((d) => ({
                type: "duplicate" as const,
                message:
                  d.duplicateWithRow >= 0
                    ? `第 ${vr.rowIndex + 1} 行，客户单号"${d.value}"与第 ${d.duplicateWithRow + 1} 行重复`
                    : `第 ${vr.rowIndex + 1} 行，客户单号"${d.value}"与已存在数据重复`,
              })),
            ];
            if (allIssues.length === 0) return null;
            return (
              <div key={vr.rowIndex}>
                {allIssues.map((issue, i) => (
                  <p
                    key={i}
                    className={
                      issue.type === "error" ? "text-red-600" : "text-yellow-600"
                    }
                  >
                    {issue.message}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
