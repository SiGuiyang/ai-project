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
    if (e.key === "Enter") {
      save();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const save = () => {
    if (field === "weight" || field === "pieces") {
      onSave(Number(editValue));
    } else {
      onSave(editValue);
    }
  };

  if (field === "temperatureLevel") {
    return (
      <select
        className="w-full border rounded px-1 py-1 text-sm"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={save}
        autoFocus
      >
        <option value="">请选择</option>
        {TEMPERATURE_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef}
      className="w-full border border-blue-400 rounded px-1 py-1 text-sm outline-none"
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
