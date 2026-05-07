"use client";

import { ImportProvider, useImport } from "@/store/import-context";
import FileUploader from "@/components/FileUploader";
import TemplateMatcher from "@/components/TemplateMatcher";
import ImportPreview from "@/components/ImportPreview";
import ImportResult from "@/components/ImportResult";

const STEPS = [
  { key: "upload", label: "上传文件", icon: "1" },
  { key: "mapping", label: "列映射", icon: "2" },
  { key: "preview", label: "预览数据", icon: "3" },
  { key: "submitting", label: "提交中", icon: "4" },
  { key: "result", label: "完成", icon: "5" },
] as const;

const STEP_ORDER = ["upload", "mapping", "preview", "submitting", "result"];

function StepIndicator({ current }: { current: string }) {
  const currentIdx = STEP_ORDER.indexOf(current);
  return (
    <div className="el-steps" style={{ maxWidth: 600, margin: "0 auto 32px" }}>
      {STEPS.filter((s) => s.key !== "submitting").map((step) => {
        const stepIdx = STEP_ORDER.indexOf(step.key);
        const isActive = step.key === current;
        const isFinish = currentIdx > stepIdx;
        const circleClass = isActive ? "is-active" : isFinish ? "is-finish" : "is-wait";
        const titleClass = isActive ? "is-active" : isFinish ? "is-finish" : "is-wait";
        return (
          <div key={step.key} className={`el-step ${isActive ? "is-active" : ""}`}>
            <div className="el-step__head">
              <div className={`el-step__circle ${circleClass}`}>
                {isFinish ? "✓" : step.icon}
              </div>
              <span className={`el-step__title ${titleClass}`}>{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ImportFlow() {
  const { step } = useImport();

  return (
    <div>
      <StepIndicator current={step} />
      {step === "upload" && (
        <div className="el-card">
          <div className="el-card__header">
            <span style={{ fontWeight: 500, fontSize: 16 }}>上传 Excel 文件</span>
          </div>
          <div className="el-card__body" style={{ display: "flex", justifyContent: "center" }}>
            <FileUploader />
          </div>
        </div>
      )}
      {step === "mapping" && (
        <div className="el-card">
          <div className="el-card__header">
            <span style={{ fontWeight: 500, fontSize: 16 }}>列映射配置</span>
          </div>
          <div className="el-card__body">
            <TemplateMatcher />
          </div>
        </div>
      )}
      {(step === "preview" || step === "submitting") && <ImportPreview />}
      {step === "result" && <ImportResult />}
    </div>
  );
}

export default function ImportPage() {
  return (
    <ImportProvider>
      <ImportFlow />
    </ImportProvider>
  );
}
