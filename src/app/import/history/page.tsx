"use client";

import { useState, useCallback, useEffect } from "react";
import type { ImportOrderRow } from "@/types";

interface OrderRecord {
  id: string;
  batchId: string;
  externalCode: string | null;
  storeName: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  createdAt: string;
  items: Array<{
    skuCode: string;
    skuName: string;
    quantity: number;
    spec: string | null;
  }>;
}

interface PageData {
  data: OrderRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function HistoryPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [externalCode, setExternalCode] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (externalCode) params.set("externalCode", externalCode);
      if (receiverName) params.set("receiverName", receiverName);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/waybills?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [page, externalCode, receiverName, startDate, endDate, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="el-card">
      <div className="el-card__header">
        <span style={{ fontWeight: 500, fontSize: 16 }}>已导入订单记录</span>
        <span style={{ fontSize: 13, color: "var(--el-text-color-secondary)" }}>
          {data ? `共 ${data.total} 条` : ""}
        </span>
      </div>
      <div className="el-card__body">
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 16,
            flexWrap: "wrap",
            padding: "12px 16px",
            background: "var(--el-bg-color)",
            borderRadius: 8,
            border: "1px solid var(--el-border-color-lighter)",
          }}
        >
          <div className="el-input" style={{ flex: 1, minWidth: 160, maxWidth: 220 }}>
            <input
              className="el-input__inner"
              placeholder="搜索外部编码"
              value={externalCode}
              onChange={(e) => { setExternalCode(e.target.value); setPage(1); }}
            />
          </div>
          <div className="el-input" style={{ flex: 1, minWidth: 160, maxWidth: 220 }}>
            <input
              className="el-input__inner"
              placeholder="搜索收件人姓名"
              value={receiverName}
              onChange={(e) => { setReceiverName(e.target.value); setPage(1); }}
            />
          </div>
          <div className="el-date-picker">
            <div className="el-input" style={{ width: 155 }}>
              <span className="el-input__prefix">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="2" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="1" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="4" y1="0.5" x2="4" y2="3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="10" y1="0.5" x2="10" y2="3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </span>
              <input
                className="el-input__inner"
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                placeholder="开始日期"
                style={{ paddingLeft: 28, color: startDate ? undefined : "var(--el-text-color-placeholder)" }}
              />
            </div>
            <span className="el-date-picker__separator">至</span>
            <div className="el-input" style={{ width: 155 }}>
              <span className="el-input__prefix">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="2" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="1" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="4" y1="0.5" x2="4" y2="3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="10" y1="0.5" x2="10" y2="3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </span>
              <input
                className="el-input__inner"
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                placeholder="结束日期"
                style={{ paddingLeft: 28, color: endDate ? undefined : "var(--el-text-color-placeholder)" }}
              />
            </div>
          </div>
        </div>

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
        ) : !data || data.data.length === 0 ? (
          <div className="el-empty">
            <div className="el-empty__icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="12" width="32" height="28" rx="2" stroke="var(--el-border-color)" strokeWidth="2"/>
                <line x1="14" y1="20" x2="34" y2="20" stroke="var(--el-border-color)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="14" y1="26" x2="30" y2="26" stroke="var(--el-border-color)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="14" y1="32" x2="26" y2="32" stroke="var(--el-border-color)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="el-empty__text">暂无记录</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="el-table" style={{ minWidth: 1000 }}>
                <thead>
                  <tr>
                    <th className="el-table__header">外部编码</th>
                    <th className="el-table__header">收货门店</th>
                    <th className="el-table__header">收件人</th>
                    <th className="el-table__header">收件人电话</th>
                    <th className="el-table__header">SKU编码</th>
                    <th className="el-table__header">SKU名称</th>
                    <th className="el-table__header">数量</th>
                    <th className="el-table__header">规格</th>
                    <th className="el-table__header">提交时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row) => {
                    const firstItem = row.items?.[0];
                    return (
                      <tr key={row.id}>
                        <td>{row.externalCode || <span style={{ color: "var(--el-text-color-placeholder)" }}>-</span>}</td>
                        <td>{row.storeName || <span style={{ color: "var(--el-text-color-placeholder)" }}>-</span>}</td>
                        <td>{row.receiverName || <span style={{ color: "var(--el-text-color-placeholder)" }}>-</span>}</td>
                        <td>{row.receiverPhone || <span style={{ color: "var(--el-text-color-placeholder)" }}>-</span>}</td>
                        <td>{firstItem?.skuCode || <span style={{ color: "var(--el-text-color-placeholder)" }}>-</span>}</td>
                        <td>{firstItem?.skuName || <span style={{ color: "var(--el-text-color-placeholder)" }}>-</span>}</td>
                        <td>{firstItem?.quantity ?? <span style={{ color: "var(--el-text-color-placeholder)" }}>-</span>}</td>
                        <td>{firstItem?.spec || <span style={{ color: "var(--el-text-color-placeholder)" }}>-</span>}</td>
                        <td style={{ whiteSpace: "nowrap", color: "var(--el-text-color-secondary)", fontSize: 13 }}>
                          {new Date(row.createdAt).toLocaleString("zh-CN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="el-pagination">
              <span className="el-pagination__total">
                共 {data.total} 条，第 {data.page}/{data.totalPages} 页
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="el-pagination__btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</button>
                {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === data.totalPages || Math.abs(p - page) <= 2)
                  .map((p, idx, arr) => (
                    <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: "var(--el-text-color-placeholder)", padding: "0 4px" }}>...</span>}
                      <button
                        className="el-pagination__btn"
                        style={{
                          background: p === page ? "var(--el-color-primary)" : undefined,
                          borderColor: p === page ? "var(--el-color-primary)" : undefined,
                          color: p === page ? "#fff" : undefined,
                        }}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button className="el-pagination__btn" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>下一页</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
