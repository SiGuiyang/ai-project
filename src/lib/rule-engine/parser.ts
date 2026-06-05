import type { ParseRuleConfig } from "@/types";
import type { ExecutorResult } from "./types";

export async function parseFile(
  file: File,
  config: ParseRuleConfig
): Promise<ExecutorResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const buffer = await file.arrayBuffer();

  switch (config.fileType) {
    case "excel":
      if (ext !== "xlsx" && ext !== "xls") throw new Error("File type mismatch");
      const { executeExcel } = await import("./excel-executor");
      return executeExcel(buffer, config);
    case "word":
      if (ext !== "docx") throw new Error("File type mismatch");
      const { executeWord } = await import("./word-executor");
      return executeWord(buffer, config);
    case "pdf":
      if (ext !== "pdf") throw new Error("File type mismatch");
      const { executePdf } = await import("./pdf-executor");
      return executePdf(buffer, config);
    default:
      throw new Error(`Unsupported file type: ${config.fileType}`);
  }
}
