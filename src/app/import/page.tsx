"use client";

import { ImportProvider, useImport } from "@/store/import-context";
import FileUploader from "@/components/FileUploader";
import TemplateMatcher from "@/components/TemplateMatcher";
import ImportPreview from "@/components/ImportPreview";
import ImportResult from "@/components/ImportResult";

function ImportFlow() {
  const { step } = useImport();

  switch (step) {
    case "upload":
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 border">
            <h2 className="text-lg font-medium mb-4">上传 Excel 文件</h2>
            <FileUploader />
          </div>
        </div>
      );
    case "mapping":
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 border">
            <h2 className="text-lg font-medium mb-4">列映射配置</h2>
            <TemplateMatcher />
          </div>
        </div>
      );
    case "preview":
      return <ImportPreview />;
    case "submitting":
    case "result":
      return <ImportResult />;
    default:
      return null;
  }
}

export default function ImportPage() {
  return (
    <ImportProvider>
      <ImportFlow />
    </ImportProvider>
  );
}
