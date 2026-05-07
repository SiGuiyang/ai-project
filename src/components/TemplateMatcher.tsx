"use client";

import { useState, useMemo } from "react";
import { useImport } from "@/store/import-context";
import { getFileSignature } from "@/lib/excel-parser";
import {
  findBestTemplate,
  autoSuggestMapping,
  saveTemplateMapping,
} from "@/lib/template-matcher";
import type { ColumnMapping } from "@/types";

const SYSTEM_FIELDS = [
  { value: "", label: "忽略此列" },
  { value: "senderName", label: "发件人姓名" },
  { value: "senderPhone", label: "发件人电话" },
  { value: "senderAddress", label: "发件人地址" },
  { value: "receiverName", label: "收件人姓名" },
  { value: "receiverPhone", label: "收件人电话" },
  { value: "receiverAddress", label: "收件人地址" },
  { value: "weight", label: "重量" },
  { value: "pieces", label: "件数" },
  { value: "temperatureLevel", label: "温层" },
  { value: "externalCode", label: "客户单号" },
  { value: "remark", label: "备注" },
];

export default function TemplateMatcher() {
  const { parsedData, applyMapping } = useImport();
  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    if (!parsedData) return {};
    const best = findBestTemplate(parsedData.headers);
    if (best) {
      const m: ColumnMapping = {};
      for (const h of parsedData.headers) {
        m[h] = best.mapping[h] ?? "";
      }
      return m;
    }
    return autoSuggestMapping(parsedData.headers);
  });

  const detectedTemplate = useMemo(() => {
    if (!parsedData) return null;
    const best = findBestTemplate(parsedData.headers);
    return best ? best.name : null;
  }, [parsedData]);

  const fileSignature = useMemo(() => {
    if (!parsedData) return "";
    return getFileSignature(parsedData.headers);
  }, [parsedData]);

  if (!parsedData) return null;

  const handleChange = (header: string, value: string) => {
    setMapping((prev) => ({ ...prev, [header]: value }));
  };

  const handleApply = () => {
    saveTemplateMapping(fileSignature, mapping);
    applyMapping(mapping);
  };

  const usedFields = Object.values(mapping).filter(Boolean);
  const requiredUnmapped = SYSTEM_FIELDS.filter(
    (f) =>
      f.value &&
      ["senderName","senderPhone","senderAddress","receiverName","receiverPhone","receiverAddress","weight","pieces","temperatureLevel"].includes(f.value) &&
      !usedFields.includes(f.value)
  );

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded px-4 py-3 text-sm text-blue-700">
        {detectedTemplate
          ? `已自动识别模板：${detectedTemplate}`
          : "未能自动识别模板，请手动设置列映射关系"}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2 text-left">Excel 列名</th>
              <th className="border px-3 py-2 text-left">示例数据</th>
              <th className="border px-3 py-2 text-left">映射到系统字段</th>
            </tr>
          </thead>
          <tbody>
            {parsedData.headers.map((header) => (
              <tr key={header} className="hover:bg-gray-50">
                <td className="border px-3 py-2 font-medium">{header}</td>
                <td className="border px-3 py-2 text-gray-500 max-w-[200px] truncate">
                  {parsedData.rows[0]?.[header] ?? ""}
                </td>
                <td className="border px-3 py-2">
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={mapping[header] ?? ""}
                    onChange={(e) => handleChange(header, e.target.value)}
                  >
                    {SYSTEM_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {requiredUnmapped.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded px-4 py-3 text-sm text-yellow-700">
          以下必填字段尚未映射：{requiredUnmapped.map((f) => f.label).join("、")}
        </div>
      )}

      <div className="flex justify-end">
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={handleApply}
          disabled={requiredUnmapped.length > 0}
        >
          确认映射并预览数据
        </button>
      </div>
    </div>
  );
}
