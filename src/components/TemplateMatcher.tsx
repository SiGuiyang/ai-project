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
  { value: "externalCode", label: "客户单号（选填）" },
  { value: "remark", label: "备注（选填）" },
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
  const requiredFields = ["senderName","senderPhone","senderAddress","receiverName","receiverPhone","receiverAddress","weight","pieces","temperatureLevel"];
  const requiredUnmapped = requiredFields.filter((f) => !usedFields.includes(f));
  const fieldLabelMap: Record<string, string> = {
    senderName: "发件人姓名", senderPhone: "发件人电话", senderAddress: "发件人地址",
    receiverName: "收件人姓名", receiverPhone: "收件人电话", receiverAddress: "收件人地址",
    weight: "重量", pieces: "件数", temperatureLevel: "温层",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="el-alert el-alert--info">
        {detectedTemplate
          ? `已自动识别模板：${detectedTemplate}`
          : "未能自动识别模板，请手动设置列映射关系"}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="el-table">
          <thead>
            <tr>
              <th className="el-table__header">Excel 列名</th>
              <th className="el-table__header">示例数据</th>
              <th className="el-table__header">映射到系统字段</th>
            </tr>
          </thead>
          <tbody>
            {parsedData.headers.map((header) => (
              <tr key={header}>
                <td style={{ fontWeight: 500 }}>{header}</td>
                <td style={{ color: "var(--el-text-color-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {parsedData.rows[0]?.[header] ?? ""}
                </td>
                <td>
                  <select
                    className="el-input__inner"
                    style={{ width: 200, height: 28, fontSize: 13 }}
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
        <div className="el-alert el-alert--warning">
          以下必填字段尚未映射：{requiredUnmapped.map((f) => fieldLabelMap[f] || f).join("、")}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          className="el-button el-button--primary"
          onClick={handleApply}
          disabled={requiredUnmapped.length > 0}
          style={{ opacity: requiredUnmapped.length > 0 ? 0.5 : undefined, cursor: requiredUnmapped.length > 0 ? "not-allowed" : undefined }}
        >
          确认映射并预览数据
        </button>
      </div>
    </div>
  );
}
