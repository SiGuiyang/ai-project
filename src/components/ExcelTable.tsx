"use client";

import { useState, useMemo } from "react";
import { useImport } from "@/store/import-context";
import CellEditor from "./CellEditor";
import { FIELD_LABELS } from "@/types";
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
  "senderName", "senderPhone", "senderAddress",
  "receiverName", "receiverPhone", "receiverAddress",
  "weight", "pieces", "temperatureLevel",
  "externalCode", "remark",
]);

export default function ExcelTable() {
  const { rows, validationResults, updateRow, addRow, deleteRows } = useImport();

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);

  const errorMap = useMemo(() => {
    const map = new Map<number, typeof validationResults[0]["errors"]>();
    for (const vr of validationResults) {
      if (vr.errors.length > 0) map.set(vr.rowIndex, vr.errors);
    }
    return map;
  }, [validationResults]);

  const duplicateMap = useMemo(() => {
    const map = new Map<number, typeof validationResults[0]["duplicates"]>();
    for (const vr of validationResults) {
      if (vr.duplicates.length > 0) map.set(vr.rowIndex, vr.duplicates);
    }
    return map;
  }, [validationResults]);

  const cellErrors = useMemo(() => {
    const map = new Map<string, typeof validationResults[0]["errors"]>();
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

  const totalErrors = validationResults.reduce((s, vr) => s + vr.errors.length, 0);
  const totalDuplicates = validationResults.reduce((s, vr) => s + vr.duplicates.length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 14 }}>
        <span style={{ color: "var(--el-text-color-secondary)" }}>
          共 <strong style={{ color: "var(--el-text-color-primary)" }}>{rows.length}</strong> 行
        </span>
        {totalErrors > 0 && (
          <span className="el-tag el-tag--danger">错误 {totalErrors} 处</span>
        )}
        {totalDuplicates > 0 && (
          <span className="el-tag el-tag--warning">重复 {totalDuplicates} 处</span>
        )}
        <div style={{ flex: 1 }} />
        <button className="el-button el-button--plain el-button--small" onClick={addRow}>
          + 新增空行
        </button>
        <button
          className="el-button el-button--danger el-button--small"
          onClick={handleDelete}
          disabled={selectedRows.size === 0}
          style={{ opacity: selectedRows.size === 0 ? 0.5 : undefined, cursor: selectedRows.size === 0 ? "not-allowed" : undefined }}
        >
          删除选中（{selectedRows.size}）
        </button>
      </div>

      <div style={{ overflow: "auto", border: "1px solid var(--el-border-color-light)", borderRadius: "var(--el-border-radius-base)", maxHeight: 560 }}>
        <table className="el-table" style={{ minWidth: 1200 }}>
          <thead>
            <tr>
              <th className="el-table__header" style={{ width: 40, textAlign: "center", position: "sticky", left: 0, zIndex: 2, background: "var(--el-bg-color)" }}>
                <input type="checkbox" className="el-checkbox" checked={selectedRows.size === rows.length && rows.length > 0} onChange={(e) => { if (e.target.checked) setSelectedRows(new Set(rows.map((_, i) => i))); else setSelectedRows(new Set()); }} />
              </th>
              <th className="el-table__header" style={{ width: 40, textAlign: "center", position: "sticky", left: 40, zIndex: 2, background: "var(--el-bg-color)" }}>
                #
              </th>
              {DISPLAY_FIELDS.map((field) => (
                <th key={field} className="el-table__header" style={{ minWidth: 130, whiteSpace: "nowrap" }}>
                  {FIELD_LABELS[field] || field}
                  {(field === "externalCode" || field === "remark") && (
                    <span style={{ color: "var(--el-text-color-placeholder)", fontWeight: 400, marginLeft: 2 }}>（选填）</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const rowErrors = errorMap.get(rowIndex);
              const rowDuplicates = duplicateMap.get(rowIndex);
              const hasError = !!rowErrors?.length;
              const hasDup = !!rowDuplicates?.length;

              return (
                <tr key={row.id}>
                  <td style={{ textAlign: "center", position: "sticky", left: 0, zIndex: 1, background: hasError ? "var(--el-color-danger-light-9)" : hasDup ? "var(--el-color-warning-light-9)" : undefined }}>
                    <input type="checkbox" className="el-checkbox" checked={selectedRows.has(rowIndex)} onChange={() => toggleRow(rowIndex)} />
                  </td>
                  <td style={{ textAlign: "center", color: "var(--el-text-color-placeholder)", position: "sticky", left: 40, zIndex: 1, background: hasError ? "var(--el-color-danger-light-9)" : hasDup ? "var(--el-color-warning-light-9)" : undefined }}>
                    {rowIndex + 1}
                  </td>
                  {DISPLAY_FIELDS.map((field) => {
                    const cellKey = `${rowIndex}-${field}`;
                    const cellErr = cellErrors.get(cellKey);
                    const dup = duplicateMap.get(rowIndex)?.find((d) => d.field === field);
                    const value = getFieldValue(row, field);
                    const isEditing = editingCell?.row === rowIndex && editingCell?.field === field;

                    return (
                      <td
                        key={field}
                        style={{
                          background: cellErr ? "var(--el-color-danger-light-9)" : dup ? "var(--el-color-warning-light-9)" : hasError ? undefined : undefined,
                          padding: "4px 8px",
                          position: "relative",
                        }}
                        title={cellErr ? cellErr.map((e) => e.message).join("; ") : dup ? `与第 ${dup.duplicateWithRow + 1} 行重复：${dup.value}` : undefined}
                      >
                        {isEditing ? (
                          <CellEditor field={field} value={value} onSave={(v) => handleCellSave(rowIndex, field, v)} onCancel={() => setEditingCell(null)} />
                        ) : (
                          <div
                            style={{
                              minHeight: 24,
                              padding: "0 4px",
                              cursor: EDITABLE_FIELDS.has(field) ? "pointer" : "default",
                              borderRadius: "var(--el-border-radius-small)",
                              display: "flex",
                              alignItems: "center",
                              lineHeight: "24px",
                            }}
                            onMouseEnter={(e) => {
                              if (EDITABLE_FIELDS.has(field)) (e.currentTarget as HTMLElement).style.background = "var(--el-color-primary-light-9)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "transparent";
                            }}
                            onClick={() => {
                              if (EDITABLE_FIELDS.has(field)) setEditingCell({ row: rowIndex, field });
                            }}
                          >
                            {field === "temperatureLevel" && !value ? (
                              <span style={{ color: "var(--el-text-color-placeholder)" }}>请选择</span>
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
        <div style={{ background: "var(--el-bg-color)", border: "1px solid var(--el-border-color-lighter)", borderRadius: "var(--el-border-radius-base)", padding: 12, fontSize: 13, maxHeight: 160, overflowY: "auto" }}>
          <p style={{ fontWeight: 500, marginBottom: 4, color: "var(--el-text-color-primary)" }}>校验结果：</p>
          {validationResults.map((vr) => {
            const all = [
              ...vr.errors.map((e) => ({ type: "error" as const, msg: `第 ${vr.rowIndex + 1} 行，${e.message}` })),
              ...vr.duplicates.map((d) => ({
                type: "duplicate" as const,
                msg: d.duplicateWithRow >= 0
                  ? `第 ${vr.rowIndex + 1} 行，客户单号"${d.value}"与第 ${d.duplicateWithRow + 1} 行重复`
                  : `第 ${vr.rowIndex + 1} 行，客户单号"${d.value}"与已存在数据重复`,
              })),
            ];
            if (all.length === 0) return null;
            return (
              <div key={vr.rowIndex}>
                {all.map((item, i) => (
                  <p key={i} style={{ color: item.type === "error" ? "var(--el-color-danger)" : "var(--el-color-warning)", margin: "2px 0", lineHeight: 1.6 }}>
                    {item.msg}
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
