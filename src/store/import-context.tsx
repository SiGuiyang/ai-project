"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  WaybillRow,
  ColumnMapping,
  ValidationResult,
  ParsedData,
  ImportBatch,
} from "@/types";
import { validateAll } from "@/lib/validator";

interface ImportState {
  step: "upload" | "mapping" | "preview" | "submitting" | "result";
  parsedData: ParsedData | null;
  columnMapping: ColumnMapping | null;
  rows: WaybillRow[];
  validationResults: ValidationResult[];
  batchId: string | null;
  batchResult: ImportBatch | null;
  progress: { current: number; total: number };
  submitted: boolean;
}

interface ImportContextValue extends ImportState {
  setParsedData: (data: ParsedData) => void;
  setColumnMapping: (mapping: ColumnMapping) => void;
  setRows: (rows: WaybillRow[]) => void;
  applyMapping: (mapping: ColumnMapping) => void;
  updateRow: (index: number, field: string, value: string | number) => void;
  addRow: () => void;
  deleteRows: (indices: number[]) => void;
  setStep: (step: ImportState["step"]) => void;
  setBatchId: (id: string) => void;
  setBatchResult: (result: ImportBatch) => void;
  setProgress: (progress: { current: number; total: number }) => void;
  setSubmitted: (submitted: boolean) => void;
  revalidate: (existingCodes?: Set<string>) => void;
  reset: () => void;
}

const initialState: ImportState = {
  step: "upload",
  parsedData: null,
  columnMapping: null,
  rows: [],
  validationResults: [],
  batchId: null,
  batchResult: null,
  progress: { current: 0, total: 0 },
  submitted: false,
};

const ImportContext = createContext<ImportContextValue | null>(null);

export function ImportProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImportState>(initialState);

  const setParsedData = useCallback((data: ParsedData) => {
    setState((prev) => ({ ...prev, parsedData: data }));
  }, []);

  const setColumnMapping = useCallback((mapping: ColumnMapping) => {
    setState((prev) => ({ ...prev, columnMapping: mapping }));
  }, []);

  const setRows = useCallback((rows: WaybillRow[]) => {
    setState((prev) => ({ ...prev, rows }));
  }, []);

  const applyMapping = useCallback((mapping: ColumnMapping) => {
    setState((prev) => {
      if (!prev.parsedData) return prev;

      const systemFields = [
        "senderName", "senderPhone", "senderAddress",
        "receiverName", "receiverPhone", "receiverAddress",
        "weight", "pieces", "temperatureLevel",
        "externalCode", "remark",
      ] as const;

      const rows: WaybillRow[] = prev.parsedData.rows.map((row, i) => {
        const mapped: Record<string, string | number> = {};
        for (const [excelCol, systemField] of Object.entries(mapping)) {
          if (systemField && systemFields.includes(systemField as typeof systemFields[number])) {
            let value: string | number = row[excelCol] ?? "";
            if (systemField === "weight" || systemField === "pieces") {
              const num = Number(value);
              value = isNaN(num) ? value : num;
            }
            mapped[systemField] = value;
          }
        }
        return {
          id: `row-${i}-${Date.now()}`,
          senderName: String(mapped.senderName ?? ""),
          senderPhone: String(mapped.senderPhone ?? ""),
          senderAddress: String(mapped.senderAddress ?? ""),
          receiverName: String(mapped.receiverName ?? ""),
          receiverPhone: String(mapped.receiverPhone ?? ""),
          receiverAddress: String(mapped.receiverAddress ?? ""),
          weight: Number(mapped.weight) || 0,
          pieces: Number(mapped.pieces) || 0,
          temperatureLevel: (String(mapped.temperatureLevel ?? "") as WaybillRow["temperatureLevel"]),
          externalCode: mapped.externalCode ? String(mapped.externalCode) : undefined,
          remark: mapped.remark ? String(mapped.remark) : undefined,
        } as WaybillRow;
      });

      const validationResults = validateAll(rows);
      return {
        ...prev,
        columnMapping: mapping,
        rows,
        validationResults,
        step: "preview",
      };
    });
  }, []);

  const updateRow = useCallback(
    (index: number, field: string, value: string | number) => {
      setState((prev) => {
        const newRows = [...prev.rows];
        newRows[index] = { ...newRows[index], [field]: value };
        const validationResults = validateAll(newRows);
        return { ...prev, rows: newRows, validationResults };
      });
    },
    []
  );

  const addRow = useCallback(() => {
    setState((prev) => {
      const newRow: WaybillRow = {
        id: `row-${prev.rows.length}-${Date.now()}`,
        senderName: "",
        senderPhone: "",
        senderAddress: "",
        receiverName: "",
        receiverPhone: "",
        receiverAddress: "",
        weight: 0,
        pieces: 0,
        temperatureLevel: "",
      };
      const newRows = [...prev.rows, newRow];
      const validationResults = validateAll(newRows);
      return { ...prev, rows: newRows, validationResults };
    });
  }, []);

  const deleteRows = useCallback((indices: number[]) => {
    setState((prev) => {
      const newRows = prev.rows.filter(
        (_, i) => !indices.includes(i)
      );
      const validationResults = validateAll(newRows);
      return { ...prev, rows: newRows, validationResults };
    });
  }, []);

  const setStep = useCallback((step: ImportState["step"]) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const setBatchId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, batchId: id }));
  }, []);

  const setBatchResult = useCallback((result: ImportBatch) => {
    setState((prev) => ({ ...prev, batchResult: result }));
  }, []);

  const setProgress = useCallback(
    (progress: { current: number; total: number }) => {
      setState((prev) => ({ ...prev, progress }));
    },
    []
  );

  const setSubmitted = useCallback((submitted: boolean) => {
    setState((prev) => ({ ...prev, submitted }));
  }, []);

  const revalidate = useCallback((existingCodes?: Set<string>) => {
    setState((prev) => {
      const validationResults = validateAll(prev.rows, existingCodes);
      return { ...prev, validationResults };
    });
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <ImportContext.Provider
      value={{
        ...state,
        setParsedData,
        setColumnMapping,
        setRows,
        applyMapping,
        updateRow,
        addRow,
        deleteRows,
        setStep,
        setBatchId,
        setBatchResult,
        setProgress,
        setSubmitted,
        revalidate,
        reset,
      }}
    >
      {children}
    </ImportContext.Provider>
  );
}

export function useImport() {
  const ctx = useContext(ImportContext);
  if (!ctx) {
    throw new Error("useImport must be used within ImportProvider");
  }
  return ctx;
}
