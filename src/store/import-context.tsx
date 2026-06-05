"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  ImportOrderRow,
  ColumnMapping,
  ValidationResult,
  ParsedData,
  ImportBatch,
  ParseRuleConfig,
} from "@/types";
import { validateAllOrders } from "@/lib/validator";

interface ImportState {
  step: "upload" | "rule" | "preview" | "submitting" | "result";
  parsedData: ParsedData | null;
  columnMapping: ColumnMapping | null;
  orders: ImportOrderRow[];
  validationResults: ValidationResult[];
  selectedRule: ParseRuleConfig | null;
  aiGeneratedRule: ParseRuleConfig | null;
  batchId: string | null;
  batchResult: ImportBatch | null;
  progress: { current: number; total: number };
  submitted: boolean;
}

interface ImportContextValue extends ImportState {
  setParsedData: (data: ParsedData) => void;
  setColumnMapping: (mapping: ColumnMapping) => void;
  setOrders: (orders: ImportOrderRow[]) => void;
  setSelectedRule: (rule: ParseRuleConfig | null) => void;
  setAiGeneratedRule: (rule: ParseRuleConfig | null) => void;
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
  orders: [],
  validationResults: [],
  selectedRule: null,
  aiGeneratedRule: null,
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

  const setOrders = useCallback((orders: ImportOrderRow[]) => {
    setState((prev) => ({ ...prev, orders }));
  }, []);

  const setSelectedRule = useCallback((rule: ParseRuleConfig | null) => {
    setState((prev) => ({ ...prev, selectedRule: rule }));
  }, []);

  const setAiGeneratedRule = useCallback((rule: ParseRuleConfig | null) => {
    setState((prev) => ({ ...prev, aiGeneratedRule: rule }));
  }, []);

  const applyMapping = useCallback((mapping: ColumnMapping) => {
    setState((prev) => {
      if (!prev.parsedData) return prev;

      const systemFields = [
        "externalCode", "storeName",
        "receiverName", "receiverPhone", "receiverAddress",
        "remark",
      ] as const;

      const orders: ImportOrderRow[] = prev.parsedData.rows.map((row, i) => {
        const mapped: Record<string, string> = {};
        for (const [excelCol, systemField] of Object.entries(mapping)) {
          if (systemField && systemFields.includes(systemField as typeof systemFields[number])) {
            mapped[systemField] = String(row[excelCol] ?? "");
          }
        }
        return {
          id: `order-${i}-${Date.now()}`,
          externalCode: mapped.externalCode || undefined,
          storeName: mapped.storeName || undefined,
          receiverName: mapped.receiverName || undefined,
          receiverPhone: mapped.receiverPhone || undefined,
          receiverAddress: mapped.receiverAddress || undefined,
          remark: mapped.remark || undefined,
          items: [],
        };
      });

      const validationResults = validateAllOrders(orders);
      return {
        ...prev,
        columnMapping: mapping,
        orders,
        validationResults,
        step: "preview",
      };
    });
  }, []);

  const updateRow = useCallback(
    (index: number, field: string, value: string | number) => {
      setState((prev) => {
        const newOrders = [...prev.orders];
        newOrders[index] = { ...newOrders[index], [field]: value };
        const validationResults = validateAllOrders(newOrders);
        return { ...prev, orders: newOrders, validationResults };
      });
    },
    []
  );

  const addRow = useCallback(() => {
    setState((prev) => {
      const newOrder: ImportOrderRow = {
        id: `order-${prev.orders.length}-${Date.now()}`,
        storeName: "",
        receiverName: "",
        receiverPhone: "",
        receiverAddress: "",
        externalCode: "",
        remark: "",
        items: [],
      };
      const newOrders = [...prev.orders, newOrder];
      const validationResults = validateAllOrders(newOrders);
      return { ...prev, orders: newOrders, validationResults };
    });
  }, []);

  const deleteRows = useCallback((indices: number[]) => {
    setState((prev) => {
      const newOrders = prev.orders.filter(
        (_, i) => !indices.includes(i)
      );
      const validationResults = validateAllOrders(newOrders);
      return { ...prev, orders: newOrders, validationResults };
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
      const validationResults = validateAllOrders(prev.orders, existingCodes);
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
        setOrders,
        setSelectedRule,
        setAiGeneratedRule,
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
