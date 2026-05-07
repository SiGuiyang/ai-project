"use client";

import { useState, useEffect, useRef } from "react";
import { TEMPERATURE_LEVELS } from "@/types";

interface CellEditorProps {
  field: string;
  value: string | number | undefined;
  onSave: (value: string | number) => void;
  onCancel: () => void;
}

export default function CellEditor({
  field,
  value,
  onSave,
  onCancel,
}: CellEditorProps) {
  const [editValue, setEditValue] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") save();
    else if (e.key === "Escape") onCancel();
  };

  const save = () => {
    if (field === "weight" || field === "pieces") onSave(Number(editValue));
    else onSave(editValue);
  };

  if (field === "temperatureLevel") {
    return (
      <select
        className="el-input__inner"
        style={{ height: 28, fontSize: 13, width: "100%" }}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={save}
        autoFocus
      >
        <option value="">请选择</option>
        {TEMPERATURE_LEVELS.filter(Boolean).map((level) => (
          <option key={level} value={level}>{level}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef}
      className="el-input__inner"
      style={{
        height: 28,
        fontSize: 13,
        width: "100%",
        borderColor: "var(--el-color-primary)",
        boxShadow: "0 0 0 1px var(--el-color-primary-light-5)",
      }}
      type={field === "weight" || field === "pieces" ? "number" : "text"}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={save}
      min={field === "weight" || field === "pieces" ? 0 : undefined}
      step={field === "weight" ? "0.01" : undefined}
    />
  );
}
