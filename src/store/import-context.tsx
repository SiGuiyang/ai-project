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
  rawFileBuffer: ArrayBuffer | null;
  rawFileName: string;
  rawFileType: "excel" | "word" | "pdf" | "";
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
  setRawFile: (buffer: ArrayBuffer, name: string, type: ImportState["rawFileType"]) => void;
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
  rawFileBuffer: null,
  rawFileName: "",
  rawFileType: "",
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

  const setRawFile = useCallback((buffer: ArrayBuffer, name: string, type: ImportState["rawFileType"]) => {
    setState((prev) => ({ ...prev, rawFileBuffer: buffer, rawFileName: name, rawFileType: type }));
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

      const headerFields = new Set([
        "externalCode", "storeName",
        "receiverName", "receiverPhone", "receiverAddress",
        "remark",
      ]);
      const itemFields = new Set(["skuCode", "skuName", "quantity", "spec"]);

      const orders: ImportOrderRow[] = prev.parsedData.rows.map((row, i) => {
        const mapped: Record<string, string> = {};
        const itemMapped: Record<string, string> = {};
        for (const [excelCol, systemField] of Object.entries(mapping)) {
          if (systemField && headerFields.has(systemField)) {
            mapped[systemField] = String(row[excelCol] ?? "");
          }
          if (systemField && itemFields.has(systemField)) {
            itemMapped[systemField] = String(row[excelCol] ?? "");
          }
        }
        const items: ImportOrderRow["items"] = [];
        if (itemMapped.skuCode || itemMapped.skuName) {
          items.push({
            skuCode: itemMapped.skuCode || "",
            skuName: itemMapped.skuName || "",
            quantity: Number(itemMapped.quantity) || 0,
            spec: itemMapped.spec || undefined,
          });
        }
        return {
          id: `order-${i}-${Date.now()}`,
          externalCode: mapped.externalCode || undefined,
          storeName: mapped.storeName || undefined,
          receiverName: mapped.receiverName || undefined,
          receiverPhone: mapped.receiverPhone || undefined,
          receiverAddress: mapped.receiverAddress || undefined,
          remark: mapped.remark || undefined,
          items,
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
    setState({ ...initialState });
  }, []);

  return (
    <ImportContext.Provider
      value={{
        ...state,
        setParsedData,
        setRawFile,
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
