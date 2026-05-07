"use client";

import { useState, useCallback, useEffect } from "react";

interface WaybillRecord {
  id: string;
  batchId: string;
  externalCode: string | null;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  weight: number;
  pieces: number;
  temperatureLevel: string;
  createdAt: string;
}

interface PageData {
  data: WaybillRecord[];
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
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (externalCode) params.set("externalCode", externalCode);
      if (receiverName) params.set("receiverName", receiverName);
      const res = await fetch(`/api/waybills?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [page, externalCode, receiverName, pageSize]);

  useEffect(() => {
    fetchData(); // eslint-disable-line
  }, [fetchData]);

  return (
    <div className="el-card">
      <div className="el-card__header">
        <span style={{ fontWeight: 500, fontSize: 16 }}>已导入运单记录</span>
        <span style={{ fontSize: 13, color: "var(--el-text-color-secondary)" }}>
          {data ? `共 ${data.total} 条` : ""}
        </span>
      </div>
      <div className="el-card__body">
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div className="el-input" style={{ flex: 1, maxWidth: 260 }}>
            <input
              className="el-input__inner"
              placeholder="搜索客户单号"
              value={externalCode}
              onChange={(e) => { setExternalCode(e.target.value); setPage(1); }}
            />
          </div>
          <div className="el-input" style={{ flex: 1, maxWidth: 260 }}>
            <input
              className="el-input__inner"
              placeholder="搜索收件人姓名"
              value={receiverName}
              onChange={(e) => { setReceiverName(e.target.value); setPage(1); }}
            />
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
                    <th className="el-table__header">客户单号</th>
                    <th className="el-table__header">发件人</th>
                    <th className="el-table__header">发件人电话</th>
                    <th className="el-table__header">收件人</th>
                    <th className="el-table__header">收件人电话</th>
                    <th className="el-table__header">重量</th>
                    <th className="el-table__header">件数</th>
                    <th className="el-table__header">温层</th>
                    <th className="el-table__header">提交时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row) => (
                    <tr key={row.id}>
                      <td>{row.externalCode || <span style={{ color: "var(--el-text-color-placeholder)" }}>-</span>}</td>
                      <td>{row.senderName}</td>
                      <td>{row.senderPhone}</td>
                      <td>{row.receiverName}</td>
                      <td>{row.receiverPhone}</td>
                      <td>{row.weight}</td>
                      <td>{row.pieces}</td>
                      <td><span className={`el-tag el-tag--${row.temperatureLevel === "常温" ? "success" : row.temperatureLevel === "冷藏" ? "primary" : "warning"}`}>{row.temperatureLevel}</span></td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--el-text-color-secondary)", fontSize: 13 }}>
                        {new Date(row.createdAt).toLocaleString("zh-CN")}
                      </td>
                    </tr>
                  ))}
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
