"use client";

import { useState, useEffect, useCallback } from "react";
import { useImport } from "@/store/import-context";
import type { ParseRuleConfig, ImportOrderRow } from "@/types";
import type { ExecutorResult } from "@/lib/rule-engine/types";

interface SavedRule {
  id: string;
  name: string;
  fileType: string;
  config: string;
  createdAt: string;
}

export default function RuleSelector() {
  const {
    parsedData: pd, rawFileBuffer, rawFileName, rawFileType,
    selectedRule, setSelectedRule,
    aiGeneratedRule, setAiGeneratedRule,
    setOrders, applyMapping, setStep,
  } = useImport();

  const [savedRules, setSavedRules] = useState<SavedRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [mode, setMode] = useState<"select" | "manual" | "ai">("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [manualName, setManualName] = useState("");
  const [manualType, setManualType] = useState("excel");
  const [manualConfig, setManualConfig] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rules")
      .then((r) => r.json())
      .then((data) => {
        setSavedRules(Array.isArray(data) ? data : []);
      })
      .catch(() => setSavedRules([]))
      .finally(() => setLoadingRules(false));
  }, []);

  const handleSelectRule = (rule: SavedRule) => {
    setSelectedId(rule.id);
    try {
      const config = JSON.parse(rule.config) as ParseRuleConfig;
      setSelectedRule(config);
    } catch {
      setSelectedRule(null);
    }
  };

  const handleManualConfirm = () => {
    if (!manualName.trim()) return;
    let config: ParseRuleConfig;
    try {
      config = JSON.parse(manualConfig) as ParseRuleConfig;
    } catch {
      return;
    }
    config.name = manualName;
    config.fileType = manualType as ParseRuleConfig["fileType"];
    setSelectedRule(config);
  };

  const handleAiAnalysis = useCallback(async () => {
    if (!pd) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { headers, rows } = pd;
      const sampleRows = rows.slice(0, 20);
      const textContent = [
        `列头: ${headers.join("\t")}`,
        ...sampleRows.map((r) => headers.map((h) => r[h] ?? "").join("\t")),
        ...(rows.length > 20 ? [`\n... 共 ${rows.length} 行数据`] : []),
      ].join("\n");

      const res = await fetch("/api/ai/generate-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "parsed-data.xlsx",
          fileType: "excel",
          content: textContent,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setAiError(data.raw ? `AI 返回格式异常: ${data.raw.slice(0, 200)}` : data.error);
        return;
      }
      const rule = data.config as ParseRuleConfig;
      rule.fileType = rawFileType || "excel";
      setAiGeneratedRule(rule);
    } catch {
      setAiError("AI 分析失败，请重试");
    } finally {
      setAiLoading(false);
    }
  }, [pd, rawFileType, setAiGeneratedRule]);

  const handleNext = useCallback(async () => {
    let config: ParseRuleConfig | null = null;
    if (mode === "select") config = selectedRule;
    else if (mode === "manual") config = selectedRule;
    else if (mode === "ai") config = aiGeneratedRule;

    if (!config) return;

    // If raw file is available and it's Word/PDF or has postProcessors, use rule-engine
    const needsEngine = rawFileBuffer &&
      (rawFileType !== "excel" ||
       (config.postProcessors && config.postProcessors.length > 0) ||
       (config.extractors && config.extractors.length > 0));

    if (needsEngine && rawFileBuffer) {
      try {
        let result: ExecutorResult;
        const resolvedFileType = rawFileType || config.fileType || "excel";

        switch (resolvedFileType) {
          case "word": {
            const { executeWord } = await import("@/lib/rule-engine/word-executor");
            result = await executeWord(rawFileBuffer, config);
            break;
          }
          case "pdf": {
            const { executePdf } = await import("@/lib/rule-engine/pdf-executor");
            result = await executePdf(rawFileBuffer, config);
            break;
          }
          default: {
            const { executeExcel } = await import("@/lib/rule-engine/excel-executor");
            result = executeExcel(rawFileBuffer, config);
            break;
          }
        }

        const orders: ImportOrderRow[] = result.orders.map((o, i) => ({
          id: `order-${i}-${Date.now()}`,
          externalCode: o.externalCode || undefined,
          storeName: o.storeName || undefined,
          receiverName: o.receiverName || undefined,
          receiverPhone: o.receiverPhone || undefined,
          receiverAddress: o.receiverAddress || undefined,
          remark: o.remark || undefined,
          items: o.items.map((item) => ({
            skuCode: item.skuCode,
            skuName: item.skuName,
            quantity: item.quantity,
            spec: item.spec || undefined,
          })),
        }));

        setOrders(orders);
        setStep("preview");
      } catch {
        // Fallback to old flow on error
        if (pd && config.columnMappings && Object.keys(config.columnMappings).length > 0) {
          applyMapping(config.columnMappings);
        }
      }
    } else if (pd && config.columnMappings && Object.keys(config.columnMappings).length > 0) {
      applyMapping(config.columnMappings);
    } else {
      setStep("preview");
    }
  }, [mode, selectedRule, aiGeneratedRule, rawFileBuffer, rawFileType, pd, setOrders, setStep, applyMapping]);

  return (
    <div className="el-card">
      <div className="el-card__header">
        <span style={{ fontWeight: 500, fontSize: 15 }}>解析规则</span>
      </div>
      <div className="el-card__body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button className={`el-button el-button--small ${mode === "select" ? "el-button--primary" : "el-button--plain"}`} onClick={() => setMode("select")}>选择已有规则</button>
          <button className={`el-button el-button--small ${mode === "manual" ? "el-button--primary" : "el-button--plain"}`} onClick={() => setMode("manual")}>新建规则（手动）</button>
          <button className={`el-button el-button--small ${mode === "ai" ? "el-button--primary" : "el-button--plain"}`} onClick={() => setMode("ai")}>AI 生成规则</button>
        </div>

        {mode === "select" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {loadingRules ? (
              <span style={{ color: "var(--el-text-color-placeholder)" }}>加载中...</span>
            ) : savedRules.length === 0 ? (
              <span style={{ color: "var(--el-text-color-placeholder)" }}>暂无已保存的规则</span>
            ) : (
              savedRules.map((rule) => (
                <label key={rule.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: `1px solid ${selectedId === rule.id ? "var(--el-color-primary)" : "var(--el-border-color-light)"}`, borderRadius: 6, cursor: "pointer", background: selectedId === rule.id ? "var(--el-color-primary-light-9)" : undefined }}>
                  <input type="radio" name="rule" checked={selectedId === rule.id} onChange={() => handleSelectRule(rule)} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{rule.name}</div>
                    <div style={{ fontSize: 12, color: "var(--el-text-color-secondary)" }}>{rule.fileType} · {new Date(rule.createdAt).toLocaleString("zh-CN")}</div>
                  </div>
                </label>
              ))
            )}
          </div>
        )}

        {mode === "manual" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="el-input">
              <input className="el-input__inner" placeholder="规则名称" value={manualName} onChange={(e) => setManualName(e.target.value)} />
            </div>
            <div className="el-input">
              <select className="el-input__inner" value={manualType} onChange={(e) => setManualType(e.target.value)}>
                <option value="excel">Excel</option>
                <option value="word">Word</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div className="el-input">
              <textarea className="el-input__inner" rows={8} placeholder='配置 JSON，例如：{"columnMappings":{"客户名称":"storeName","SKU编码":"skuCode"},"headerRow":0}' value={manualConfig} onChange={(e) => setManualConfig(e.target.value)} style={{ fontFamily: "monospace", fontSize: 12 }} />
            </div>
            <button className="el-button el-button--primary el-button--small" onClick={handleManualConfirm} disabled={!manualName.trim() || !manualConfig.trim()}>
              确认规则
            </button>
            {selectedRule && selectedRule.name === manualName && (
              <span style={{ color: "var(--el-color-success)", fontSize: 13 }}>规则已确认</span>
            )}
          </div>
        )}

        {mode === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pd ? (
              <div style={{ background: "var(--el-color-info-light-9)", borderRadius: 6, padding: 12, fontSize: 13 }}>
                <p>已解析数据：<strong>{pd.headers.length}</strong> 列，<strong>{pd.rows.length}</strong> 行</p>
                {rawFileName && (
                  <p style={{ color: "var(--el-text-color-secondary)", marginTop: 4, fontSize: 12 }}>
                    文件：{rawFileName}（{rawFileType?.toUpperCase() || "未知"}）
                  </p>
                )}
                <p style={{ color: "var(--el-text-color-secondary)", marginTop: 4, fontSize: 12 }}>
                  列头：{pd.headers.join("、")}
                </p>
                {pd.rows.length > 0 && (
                  <pre style={{ fontSize: 11, marginTop: 8, whiteSpace: "pre-wrap", background: "var(--el-color-white)", padding: 8, borderRadius: 4, maxHeight: 120, overflow: "auto" }}>
                    {pd.headers.join("\t")}
                    {"\n"}
                    {pd.rows.slice(0, 5).map((r) => pd.headers.map((h) => r[h] ?? "").join("\t")).join("\n")}
                  </pre>
                )}
              </div>
            ) : (
              <div className="el-alert el-alert--warning">请先在导入页面选择文件</div>
            )}
            <button className="el-button el-button--primary el-button--small" onClick={handleAiAnalysis} disabled={!pd || aiLoading}>
              {aiLoading ? "AI 分析中..." : "AI 分析并生成规则"}
            </button>
            {aiError && <div className="el-alert el-alert--error">{aiError}</div>}
            {aiGeneratedRule && (
              <div style={{ background: "var(--el-color-success-light-9)", border: "1px solid var(--el-color-success-light-5)", borderRadius: 6, padding: 12 }}>
                <p style={{ fontWeight: 500, marginBottom: 4 }}>AI 已生成规则：</p>
                <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(aiGeneratedRule, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <button className="el-button el-button--plain el-button--small" onClick={() => setStep("upload")}>返回</button>
          <button className="el-button el-button--success el-button--small" onClick={handleNext} disabled={(mode === "select" && !selectedRule) || (mode === "ai" && !aiGeneratedRule)}>
            下一步
          </button>
        </div>
      </div>
    </div>
  );
}
