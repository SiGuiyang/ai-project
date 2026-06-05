"use client";

import { useState, useMemo, useCallback, type CSSProperties } from "react";
import { List } from "react-window";
import { useImport } from "@/store/import-context";
import CellEditor from "./CellEditor";
import { V2_FIELD_LABELS } from "@/types";

const DISPLAY_FIELDS = [
  "externalCode",
  "storeName",
  "receiverName",
  "receiverPhone",
  "receiverAddress",
  "remark",
] as const;

const EDITABLE_FIELDS = new Set([
  "storeName",
  "receiverName",
  "receiverPhone",
  "receiverAddress",
  "externalCode",
  "remark",
]);

const COL_WIDTHS: Record<string, string> = {
  checkbox: "40px",
  index: "40px",
  externalCode: "130px",
  storeName: "130px",
  receiverName: "130px",
  receiverPhone: "130px",
  receiverAddress: "160px",
  remark: "130px",
  skuInfo: "80px",
};

export default function ExcelTable() {
  const { orders, validationResults, updateRow, addRow, deleteRows, setOrders, revalidate } = useImport();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [skuEditor, setSkuEditor] = useState<{ row: number } | null>(null);
  const [editItems, setEditItems] = useState<{ skuCode: string; skuName: string; quantity: number; spec: string }[]>([]);

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

  const openSkuEditor = (rowIndex: number) => {
    const order = orders[rowIndex];
    setEditItems(
      (order.items || []).map((i) => ({
        skuCode: i.skuCode,
        skuName: i.skuName,
        quantity: i.quantity,
        spec: i.spec || "",
      }))
    );
    setSkuEditor({ row: rowIndex });
  };

  const closeSkuEditor = () => {
    setSkuEditor(null);
    setEditItems([]);
  };

  const saveSkuEditor = () => {
    if (!skuEditor) return;
    const newOrders = [...orders];
    newOrders[skuEditor.row] = {
      ...newOrders[skuEditor.row],
      items: editItems
        .filter((i) => i.skuCode || i.skuName)
        .map((i) => ({
          skuCode: i.skuCode,
          skuName: i.skuName,
          quantity: i.quantity,
          spec: i.spec || undefined,
        })),
    };
    setOrders(newOrders);
    revalidate();
    closeSkuEditor();
  };

  const updateEditItem = (idx: number, field: string, value: string | number) => {
    setEditItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addEditItem = () => {
    setEditItems((prev) => [...prev, { skuCode: "", skuName: "", quantity: 0, spec: "" }]);
  };

  const removeEditItem = (idx: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalErrors = validationResults.reduce((s, vr) => s + vr.errors.length, 0);
  const totalDuplicates = validationResults.reduce((s, vr) => s + vr.duplicates.length, 0);

  const ROW_HEIGHT = 36;
  const containerHeight = Math.min(orders.length * ROW_HEIGHT + 8, 500);

  const RowComponent = useCallback(
    ({ index, style }: { index: number; style: CSSProperties }) => {
      const order = orders[index];
      const rowErrors = errorMap.get(index);
      const rowDuplicates = duplicateMap.get(index);
      const hasError = !!rowErrors?.length;
      const hasDup = !!rowDuplicates?.length;
      const bg = hasError ? "var(--el-color-danger-light-9)" : hasDup ? "var(--el-color-warning-light-9)" : undefined;

      return (
        <div style={{ ...style, display: "flex", alignItems: "center", background: bg, borderBottom: "1px solid var(--el-border-color-light)", boxSizing: "border-box" }}>
          <div style={{ width: COL_WIDTHS.checkbox, textAlign: "center", flexShrink: 0 }}>
            <input type="checkbox" className="el-checkbox" checked={selectedRows.has(index)} onChange={() => toggleRow(index)} />
          </div>
          <div style={{ width: COL_WIDTHS.index, textAlign: "center", color: "var(--el-text-color-placeholder)", flexShrink: 0 }}>
            {index + 1}
          </div>
          {DISPLAY_FIELDS.map((field) => {
            const cellKey = `${index}-${field}`;
            const cellErr = cellErrors.get(cellKey);
            const dup = duplicateMap.get(index)?.find((d) => d.field === field);
            const value = (order as unknown as Record<string, string | number | undefined>)[field];
            const isEditing = editingCell?.row === index && editingCell?.field === field;
            const cellBg = cellErr ? "var(--el-color-danger-light-9)" : dup ? "var(--el-color-warning-light-9)" : undefined;

            return (
              <div
                key={field}
                style={{ width: COL_WIDTHS[field] || "130px", padding: "4px 8px", flexShrink: 0, background: cellBg, position: "relative", boxSizing: "border-box" }}
                title={cellErr ? cellErr.map((e) => e.message).join("; ") : dup ? `重复：${dup.value}` : undefined}
              >
                {isEditing ? (
                  <CellEditor field={field} value={value} onSave={(v) => { handleCellSave(index, field, v); }} onCancel={() => setEditingCell(null)} />
                ) : (
                  <div
                    style={{ minHeight: 24, padding: "0 4px", cursor: EDITABLE_FIELDS.has(field) ? "pointer" : "default", borderRadius: "var(--el-border-radius-small)", display: "flex", alignItems: "center", lineHeight: "24px", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    onMouseEnter={(e) => { if (EDITABLE_FIELDS.has(field)) (e.currentTarget as HTMLElement).style.background = "var(--el-color-primary-light-9)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    onClick={() => { if (EDITABLE_FIELDS.has(field)) setEditingCell({ row: index, field }); }}
                  >
                    {String(value ?? "")}
                  </div>
                )}
              </div>
            );
          })}
          <div
            style={{ width: COL_WIDTHS.skuInfo, textAlign: "center", fontSize: 12, color: "var(--el-color-primary)", flexShrink: 0, padding: "0 8px", boxSizing: "border-box", cursor: "pointer", fontWeight: 500 }}
            onClick={() => openSkuEditor(index)}
            title="点击编辑 SKU"
          >
            {(order.items?.length || 0) > 0 ? `${order.items!.length} 个` : "+ 添加"}
          </div>
        </div>
      );
    },
    [orders, errorMap, duplicateMap, cellErrors, editingCell, selectedRows]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 14 }}>
        <span style={{ color: "var(--el-text-color-secondary)" }}>
          共 <strong style={{ color: "var(--el-text-color-primary)" }}>{orders.length}</strong> 行
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

      <div style={{ overflow: "hidden", border: "1px solid var(--el-border-color-light)", borderRadius: "var(--el-border-radius-base)" }}>
        <div style={{ display: "flex", background: "var(--el-bg-color)", fontWeight: 500, fontSize: 13, borderBottom: "1px solid var(--el-border-color-light)", position: "sticky", top: 0, zIndex: 2 }}>
          <div style={{ width: COL_WIDTHS.checkbox, textAlign: "center", padding: "8px 0", flexShrink: 0 }}>
            <input type="checkbox" className="el-checkbox" checked={selectedRows.size === orders.length && orders.length > 0} onChange={(e) => { if (e.target.checked) setSelectedRows(new Set(orders.map((_, i) => i))); else setSelectedRows(new Set()); }} />
          </div>
          <div style={{ width: COL_WIDTHS.index, textAlign: "center", padding: "8px 0", color: "var(--el-text-color-placeholder)", flexShrink: 0 }}>#</div>
          {DISPLAY_FIELDS.map((field) => (
            <div key={field} style={{ width: COL_WIDTHS[field] || "130px", padding: "8px", flexShrink: 0, whiteSpace: "nowrap", boxSizing: "border-box" }}>
              {V2_FIELD_LABELS[field] || field}
              {(field === "externalCode" || field === "remark") && (
                <span style={{ color: "var(--el-text-color-placeholder)", fontWeight: 400, marginLeft: 2, fontSize: 12 }}>（选填）</span>
              )}
            </div>
          ))}
          <div style={{ width: COL_WIDTHS.skuInfo, textAlign: "center", padding: "8px 0", flexShrink: 0 }}>SKU</div>
        </div>
        <List
          height={containerHeight}
          itemCount={orders.length}
          itemSize={ROW_HEIGHT}
          width="100%"
        >
          {RowComponent}
        </List>
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

      {skuEditor && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeSkuEditor(); }}
        >
          <div
            style={{
              background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              padding: 24, minWidth: 500, maxWidth: 640,
            }}
          >
            <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>
              编辑 SKU 物品 — 第 {skuEditor.row + 1} 行
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--el-border-color-light)" }}>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>SKU 编码</th>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>SKU 名称</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: 80 }}>数量</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: 100 }}>规格</th>
                  <th style={{ padding: "6px 8px", textAlign: "center", width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {editItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--el-border-color-light)" }}>
                    <td style={{ padding: "4px" }}>
                      <input className="el-input__inner" style={{ height: 30, fontSize: 13, width: "100%" }} value={item.skuCode} onChange={(e) => updateEditItem(idx, "skuCode", e.target.value)} placeholder="SKU001" />
                    </td>
                    <td style={{ padding: "4px" }}>
                      <input className="el-input__inner" style={{ height: 30, fontSize: 13, width: "100%" }} value={item.skuName} onChange={(e) => updateEditItem(idx, "skuName", e.target.value)} placeholder="商品名称" />
                    </td>
                    <td style={{ padding: "4px" }}>
                      <input className="el-input__inner" style={{ height: 30, fontSize: 13, width: "100%" }} type="number" min={1} value={item.quantity || ""} onChange={(e) => updateEditItem(idx, "quantity", parseInt(e.target.value) || 0)} />
                    </td>
                    <td style={{ padding: "4px" }}>
                      <input className="el-input__inner" style={{ height: 30, fontSize: 13, width: "100%" }} value={item.spec} onChange={(e) => updateEditItem(idx, "spec", e.target.value)} placeholder="规格（选填）" />
                    </td>
                    <td style={{ padding: "4px", textAlign: "center" }}>
                      <button className="el-button el-button--danger el-button--small" style={{ padding: "0 6px", fontSize: 12, lineHeight: "22px" }} onClick={() => removeEditItem(idx)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="el-button el-button--plain el-button--small" onClick={addEditItem} style={{ marginTop: 12 }}>
              + 添加 SKU
            </button>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button className="el-button el-button--plain el-button--small" onClick={closeSkuEditor}>取消</button>
              <button className="el-button el-button--primary el-button--small" onClick={saveSkuEditor}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
