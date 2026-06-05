"use client";

import { useState, useMemo, useCallback, type CSSProperties } from "react";
import { List } from "react-window";
import CellEditor from "./CellEditor";
import type { ImportOrderRow } from "@/types";
import { V2_FIELD_LABELS } from "@/types";

interface WaybillCreateTableProps {
  orders: ImportOrderRow[];
  convertedIds: Set<string>;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onCellEdit: (orderId: string, field: string, value: string | number) => void;
}

const DISPLAY_FIELDS = [
  "externalCode", "storeName", "receiverName", "receiverPhone", "receiverAddress",
  "weight", "pieces", "temperatureLevel",
] as const;

const COL_WIDTHS: Record<string, string> = {
  checkbox: "40px",
  index: "40px",
  externalCode: "110px",
  storeName: "110px",
  receiverName: "100px",
  receiverPhone: "120px",
  receiverAddress: "150px",
  weight: "80px",
  pieces: "60px",
  temperatureLevel: "70px",
  skuInfo: "80px",
};

const ROW_HEIGHT = 36;

export default function WaybillCreateTable({
  orders, convertedIds, selectedIds, onSelectionChange, onCellEdit,
}: WaybillCreateTableProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);

  const filteredOrders = useMemo(() => orders.filter((o) => !convertedIds.has(o.id)), [orders, convertedIds]);

  const allSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selectedIds.has(o.id));
  const someSelected = filteredOrders.some((o) => selectedIds.has(o.id));

  const toggleRow = useCallback((id: string) => {
    onSelectionChange(
      new Set(selectedIds.has(id)
        ? [...selectedIds].filter((sid) => sid !== id)
        : [...selectedIds, id])
    );
  }, [selectedIds, onSelectionChange]);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(filteredOrders.map((o) => o.id)));
    }
  }, [allSelected, filteredOrders, onSelectionChange]);

  const handleCellSave = useCallback((index: number, field: string, value: string | number) => {
    const order = filteredOrders[index];
    if (order) {
      onCellEdit(order.id, field, value);
    }
    setEditingCell(null);
  }, [filteredOrders, onCellEdit]);

  const RowComponent = useCallback(
    ({ index, style }: { index: number; style: CSSProperties }) => {
      const order = filteredOrders[index];
      if (!order) return null;
      const isSelected = selectedIds.has(order.id);
      const skuCount = order.items?.length || 0;

      return (
        <div style={{ ...style, display: "flex", alignItems: "center", borderBottom: "1px solid var(--el-border-color-light)", boxSizing: "border-box", background: isSelected ? "var(--el-color-primary-light-9)" : undefined }}>
          <div style={{ width: COL_WIDTHS.checkbox, textAlign: "center", flexShrink: 0 }}>
            <input type="checkbox" className="el-checkbox" checked={isSelected} onChange={() => toggleRow(order.id)} />
          </div>
          <div style={{ width: COL_WIDTHS.index, textAlign: "center", color: "var(--el-text-color-placeholder)", flexShrink: 0 }}>
            {index + 1}
          </div>
          {DISPLAY_FIELDS.map((field) => {
            const isEditing = editingCell?.row === index && editingCell?.field === field;
            const value = (order as unknown as Record<string, string | number | undefined>)[field];
            const isEditable = field === "weight" || field === "pieces" || field === "temperatureLevel";

            return (
              <div key={field} style={{ width: COL_WIDTHS[field] || "100px", padding: "4px 8px", flexShrink: 0, boxSizing: "border-box", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isEditing ? (
                  <CellEditor field={field} value={value} onSave={(v) => handleCellSave(index, field, v)} onCancel={() => setEditingCell(null)} />
                ) : (
                  <div
                    style={{ minHeight: 24, padding: "0 4px", cursor: isEditable ? "pointer" : "default", borderRadius: "var(--el-border-radius-small)", display: "flex", alignItems: "center", lineHeight: "24px", fontSize: 13 }}
                    onMouseEnter={(e) => { if (isEditable) (e.currentTarget as HTMLElement).style.background = "var(--el-color-primary-light-9)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    onClick={() => { if (isEditable) setEditingCell({ row: index, field }); }}
                  >
                    {field === "weight" ? (value != null ? `${value} kg` : "-") :
                     field === "pieces" ? (value != null ? `${value}` : "-") :
                     field === "temperatureLevel" ? (value || "-") :
                     String(value ?? "")}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ width: COL_WIDTHS.skuInfo, textAlign: "center", fontSize: 12, color: "var(--el-text-color-secondary)", flexShrink: 0 }}>
            {skuCount > 0 ? `${skuCount} 个` : "-"}
          </div>
        </div>
      );
    },
    [filteredOrders, selectedIds, editingCell, toggleRow, handleCellSave]
  );

  const containerHeight = Math.min(filteredOrders.length * ROW_HEIGHT + 8, 500);

  return (
    <div style={{ overflow: "hidden", border: "1px solid var(--el-border-color-light)", borderRadius: "var(--el-border-radius-base)" }}>
      <div style={{ display: "flex", background: "var(--el-bg-color)", fontWeight: 500, fontSize: 13, borderBottom: "1px solid var(--el-border-color-light)", position: "sticky", top: 0, zIndex: 2 }}>
        <div style={{ width: COL_WIDTHS.checkbox, textAlign: "center", padding: "8px 0", flexShrink: 0 }}>
          <input type="checkbox" className="el-checkbox" checked={allSelected} onChange={toggleAll} ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }} />
        </div>
        <div style={{ width: COL_WIDTHS.index, textAlign: "center", padding: "8px 0", color: "var(--el-text-color-placeholder)", flexShrink: 0 }}>#</div>
        {DISPLAY_FIELDS.map((field) => (
          <div key={field} style={{ width: COL_WIDTHS[field] || "100px", padding: "8px", flexShrink: 0, whiteSpace: "nowrap", boxSizing: "border-box" }}>
            {V2_FIELD_LABELS[field] || field}
          </div>
        ))}
        <div style={{ width: COL_WIDTHS.skuInfo, textAlign: "center", padding: "8px 0", flexShrink: 0 }}>SKU</div>
      </div>
      <List
        defaultHeight={containerHeight}
        rowCount={filteredOrders.length}
        rowHeight={ROW_HEIGHT}
        style={{ height: containerHeight, width: "100%" }}
        rowComponent={RowComponent}
        rowProps={{} as any}
      />
    </div>
  );
}
