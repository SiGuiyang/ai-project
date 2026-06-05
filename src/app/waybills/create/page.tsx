"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import WaybillCreateTable from "@/components/WaybillCreateTable";
import type { ImportOrderRow } from "@/types";

function CreateWaybillForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const batchId = searchParams.get("batchId");

  const [orders, setOrders] = useState<ImportOrderRow[]>([]);
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: number; fail: number } | null>(null);

  const [overrides, setOverrides] = useState<Record<string, { weight?: number; pieces?: number; temperatureLevel?: string }>>({});

  useEffect(() => {
    if (!batchId) {
      setError("缺少 batchId 参数");
      setLoading(false);
      return;
    }
    fetch(`/api/orders?batchId=${batchId}&pageSize=9999`)
      .then((r) => r.json())
      .then((data) => {
        const allOrders: ImportOrderRow[] = data.data || [];
        setOrders(allOrders);
        const conv = new Set<string>();
        allOrders.forEach((o) => { if (o.convertedAt) conv.add(o.id); });
        setConvertedIds(conv);
      })
      .catch(() => setError("加载订单数据失败"))
      .finally(() => setLoading(false));
  }, [batchId]);

  const isFormValid = senderName.trim() && senderPhone.trim() && senderAddress.trim();

  const handleCellEdit = useCallback((orderId: string, field: string, value: string | number) => {
    setOverrides((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], [field]: value },
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!batchId || !isFormValid || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/waybills/create-from-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          senderName: senderName.trim(),
          senderPhone: senderPhone.trim(),
          senderAddress: senderAddress.trim(),
          orderIds: [...selectedIds].filter((id) => !convertedIds.has(id)),
          overrides,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "转换失败");

      setSubmitResult({ success: result.successCount, fail: result.failCount });
      setConvertedIds((prev) => new Set([...prev, ...selectedIds]));
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "转换失败");
    } finally {
      setSubmitting(false);
    }
  }, [batchId, isFormValid, submitting, senderName, senderPhone, senderAddress, selectedIds, convertedIds, overrides]);

  const activeOrders = orders.filter((o) => !convertedIds.has(o.id));
  const filteredSelectedIds = new Set([...selectedIds].filter((id) => !convertedIds.has(id)));

  if (loading) {
    return (
      <div className="el-card">
        <div className="el-card__body" style={{ textAlign: "center", padding: 40 }}>
          <div className="el-empty__text">加载中...</div>
        </div>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="el-card">
        <div className="el-card__body" style={{ textAlign: "center", padding: 40 }}>
          <div className="el-alert el-alert--error">{error}</div>
          <button className="el-button el-button--plain el-button--small" style={{ marginTop: 16 }} onClick={() => router.push("/import")}>
            返回导入
          </button>
        </div>
      </div>
    );
  }

  const allConverted = orders.length > 0 && orders.every((o) => convertedIds.has(o.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="el-card">
        <div className="el-card__header">
          <span style={{ fontWeight: 500, fontSize: 16 }}>转为运单</span>
          <span style={{ fontSize: 13, color: "var(--el-text-color-secondary)", marginLeft: 8 }}>
            batch: {batchId}
          </span>
        </div>
        <div className="el-card__body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {submitResult ? (
            <div style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>转换完成</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16 }}>
                <span style={{ color: "var(--el-color-success)", fontWeight: 700 }}>成功 {submitResult.success}</span>
                {submitResult.fail > 0 && <span style={{ color: "var(--el-color-danger)", fontWeight: 700 }}>失败 {submitResult.fail}</span>}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button className="el-button el-button--primary el-button--small" onClick={() => router.push("/waybills")}>
                  查看运单记录
                </button>
                {!allConverted && (
                  <button className="el-button el-button--plain el-button--small" onClick={() => setSubmitResult(null)}>
                    继续转换
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {allConverted ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <p style={{ marginBottom: 16, color: "var(--el-text-color-secondary)" }}>该批次所有订单已转为运单</p>
                  <button className="el-button el-button--primary el-button--small" onClick={() => router.push("/waybills")}>
                    查看运单记录
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: "12px 16px", background: "var(--el-bg-color)", borderRadius: 8, border: "1px solid var(--el-border-color-lighter)" }}>
                    <div className="el-input" style={{ flex: 1, minWidth: 180 }}>
                      <input className="el-input__inner" placeholder="发件人姓名（必填）" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                    </div>
                    <div className="el-input" style={{ flex: 1, minWidth: 180 }}>
                      <input className="el-input__inner" placeholder="发件人电话（必填）" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} />
                    </div>
                    <div className="el-input" style={{ flex: 2, minWidth: 280 }}>
                      <input className="el-input__inner" placeholder="发件人地址（必填）" value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} />
                    </div>
                  </div>

                  <WaybillCreateTable
                    orders={orders}
                    convertedIds={convertedIds}
                    selectedIds={filteredSelectedIds}
                    onSelectionChange={setSelectedIds}
                    onCellEdit={handleCellEdit}
                  />

                  {error && <div className="el-alert el-alert--error">{error}</div>}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--el-text-color-secondary)" }}>
                      已选中 {filteredSelectedIds.size} / 可转换 {activeOrders.length} 条
                      {convertedIds.size > 0 && <span style={{ marginLeft: 8 }}>（已转换 {convertedIds.size} 条）</span>}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="el-button el-button--plain el-button--small" onClick={() => router.push("/import")}>
                        返回导入
                      </button>
                      <button
                        className="el-button el-button--success el-button--small"
                        disabled={!isFormValid || filteredSelectedIds.size === 0 || submitting}
                        onClick={handleSubmit}
                        style={{ opacity: !isFormValid || filteredSelectedIds.size === 0 || submitting ? 0.5 : undefined }}
                      >
                        {submitting ? "提交中..." : "提交运单"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateWaybillPage() {
  return (
    <Suspense fallback={<div className="el-card"><div className="el-card__body" style={{ textAlign: "center", padding: 40 }}><div className="el-empty__text">加载中...</div></div></div>}>
      <CreateWaybillForm />
    </Suspense>
  );
}
