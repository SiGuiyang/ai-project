"use client";

import { useImport } from "@/store/import-context";

export default function ImportResult() {
  const { batchResult, step, setStep, reset } = useImport();

  if (step !== "result" || !batchResult) return null;

  return (
    <div className="bg-white rounded-lg p-6 border space-y-6">
      <h2 className="text-lg font-medium">提交结果</h2>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {batchResult.totalCount}
          </p>
          <p className="text-sm text-blue-700">总条数</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {batchResult.successCount}
          </p>
          <p className="text-sm text-green-700">成功</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded p-4 text-center">
          <p className="text-2xl font-bold text-red-600">
            {batchResult.failCount}
          </p>
          <p className="text-sm text-red-700">失败</p>
        </div>
      </div>

      {batchResult.failCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-sm text-yellow-700">
            部分数据提交失败，失败的条数不会影响已成功提交的数据。
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => {
            reset();
            setStep("upload");
          }}
        >
          继续导入
        </button>
        <button
          className="px-6 py-2 border rounded hover:bg-gray-50"
          onClick={() => {
            window.location.href = "/import/history";
          }}
        >
          查看历史记录
        </button>
      </div>
    </div>
  );
}
