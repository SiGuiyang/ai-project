"use client";

import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/Toast";

interface ParseRule {
  id: string;
  name: string;
  fileType: string;
  config: string;
  createdAt: string;
}

const FILE_TYPE_LABELS: Record<string, string> = {
  excel: "Excel",
  word: "Word",
  pdf: "PDF",
};

const FILE_TYPE_OPTIONS = [
  { value: "excel", label: "Excel" },
  { value: "word", label: "Word" },
  { value: "pdf", label: "PDF" },
];

interface FormData {
  name: string;
  fileType: string;
  config: string;
}

const EMPTY_FORM: FormData = { name: "", fileType: "excel", config: "{}" };

export default function RulesPage() {
  const { toast } = useToast();
  const [rules, setRules] = useState<ParseRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rules");
      const json = await res.json();
      setRules(json);
    } catch {
      toast("error", "加载规则列表失败");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(rule: ParseRule) {
    setEditingId(rule.id);
    setForm({ name: rule.name, fileType: rule.fileType, config: rule.config });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast("warning", "请输入规则名称");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(form.config);
    } catch {
      toast("error", "规则配置必须是合法的 JSON");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch("/api/rules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, name: form.name, fileType: form.fileType, config: parsed }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast("success", "规则更新成功");
      } else {
        const res = await fetch("/api/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, fileType: form.fileType, config: parsed }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast("success", "规则创建成功");
      }
      closeForm();
      await fetchRules();
    } catch (e) {
      toast("error", String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("确定要删除这条解析规则吗？")) return;
    try {
      const res = await fetch(`/api/rules?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast("success", "规则已删除");
      await fetchRules();
    } catch (e) {
      toast("error", String(e));
    }
  }

  return (
    <>
      <div className="el-card" style={{ marginBottom: showForm ? 16 : 0 }}>
        <div className="el-card__header">
          <span style={{ fontWeight: 500, fontSize: 16 }}>解析规则管理</span>
          <button className="el-button el-button--primary" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 2 }}>
              <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            新建规则
          </button>
        </div>
        <div className="el-card__body">
          {loading ? (
            <div className="el-empty">
              <div className="el-empty__icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="20" stroke="var(--el-border-color)" strokeWidth="2" strokeDasharray="4 4">
                    <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="1s" repeatCount="indefinite" />
                  </circle>
                </svg>
              </div>
              <div className="el-empty__text">加载中...</div>
            </div>
          ) : rules.length === 0 ? (
            <div className="el-empty">
              <div className="el-empty__icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="8" y="12" width="32" height="28" rx="2" stroke="var(--el-border-color)" strokeWidth="2"/>
                  <line x1="14" y1="20" x2="34" y2="20" stroke="var(--el-border-color)" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="14" y1="26" x2="30" y2="26" stroke="var(--el-border-color)" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="14" y1="32" x2="26" y2="32" stroke="var(--el-border-color)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="el-empty__text">暂无规则，点击上方按钮新建</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="el-table" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th className="el-table__header">规则名称</th>
                    <th className="el-table__header">文件类型</th>
                    <th className="el-table__header">创建时间</th>
                    <th className="el-table__header" style={{ width: 140 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td style={{ fontWeight: 500 }}>{rule.name}</td>
                      <td>
                        <span className={`el-tag el-tag--${rule.fileType === "excel" ? "success" : rule.fileType === "word" ? "primary" : "warning"}`}>
                          {FILE_TYPE_LABELS[rule.fileType] || rule.fileType}
                        </span>
                      </td>
                      <td style={{ color: "var(--el-text-color-secondary)", fontSize: 13, whiteSpace: "nowrap" }}>
                        {new Date(rule.createdAt).toLocaleString("zh-CN")}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="el-button el-button--text el-button--small" onClick={() => openEdit(rule)}>编辑</button>
                          <button className="el-button el-button--text el-button--small" style={{ color: "var(--el-color-danger)" }} onClick={() => handleDelete(rule.id)}>删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={closeForm}>
          <div className="el-card" style={{ width: 520, maxHeight: "80vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="el-card__header">
              <span style={{ fontWeight: 500, fontSize: 16 }}>{editingId ? "编辑规则" : "新建规则"}</span>
              <button className="el-button el-button--text" onClick={closeForm} style={{ fontSize: 18, padding: 0, width: 28, height: 28, color: "var(--el-text-color-secondary)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="el-card__body">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--el-text-color-secondary)" }}>规则名称</label>
                  <div className="el-input" style={{ width: "100%" }}>
                    <input className="el-input__inner" placeholder="请输入规则名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--el-text-color-secondary)" }}>文件类型</label>
                  <div className="el-select" style={{ width: "100%" }}>
                    <select className="el-input__inner" value={form.fileType} onChange={(e) => setForm({ ...form, fileType: e.target.value })}>
                      {FILE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--el-text-color-secondary)" }}>规则配置 (JSON)</label>
                  <textarea
                    className="el-input__inner"
                    style={{ height: 200, padding: "10px 12px", fontFamily: "monospace", fontSize: 13, resize: "vertical", lineHeight: 1.6 }}
                    placeholder='{"columnMappings": {"列名": "字段名"}}'
                    value={form.config}
                    onChange={(e) => setForm({ ...form, config: e.target.value })}
                  />
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                  <button className="el-button el-button--plain" onClick={closeForm}>取消</button>
                  <button className="el-button el-button--primary" disabled={saving} onClick={handleSave}>
                    {saving ? "保存中..." : "保存"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
