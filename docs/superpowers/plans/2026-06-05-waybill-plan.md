# 运单下单功能 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Convert to Waybill" functionality after file import, plus waybill history page.

**Architecture:** Expand ImportOrder model with sender/logistics fields → new API endpoint for batch conversion → new create waybill page with sender form + editable table → waybill history page.

**Tech Stack:** Next.js 16, Prisma, PostgreSQL, react-window, Element Plus style

---

## Chunk 1: Data Model & Types

### Task 1: Update Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields to ImportOrder model**

Replace the existing ImportOrder model with:

```prisma
model ImportOrder {
  id              String      @id @default(cuid())
  batchId         String
  externalCode    String?
  storeName       String?
  receiverName    String?
  receiverPhone   String?
  receiverAddress String?
  remark          String?
  batch           ImportBatch @relation(fields: [batchId], references: [id])
  items           OrderItem[]

  senderName      String?
  senderPhone     String?
  senderAddress   String?
  weight          Float?
  pieces          Int?
  temperatureLevel String?
  convertedAt     DateTime?

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([batchId])
  @@index([externalCode])
  @@index([receiverName])
  @@index([createdAt])
  @@index([convertedAt])
}
```

- [ ] **Step 2: Run migration**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
npx prisma migrate dev --name add-waybill-fields
```

Expected: Migration created and applied to dev.db.

- [ ] **Step 3: Re-generate Prisma client**

```bash
npx prisma generate
```

Expected: Client regenerated with new fields.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add sender/logistics fields and convertedAt to ImportOrder"
```

---

### Task 2: Update TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add new fields to ImportOrderRow**

```typescript
export interface ImportOrderRow {
  id: string;
  externalCode?: string;
  storeName?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  remark?: string;
  items: OrderItemRow[];
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  weight?: number;
  pieces?: number;
  temperatureLevel?: string;
  convertedAt?: string;
}
```

- [ ] **Step 2: Add labels in V2_FIELD_LABELS**

```typescript
export const V2_FIELD_LABELS: Record<string, string> = {
  externalCode: "外部编码",
  storeName: "收货门店",
  receiverName: "收件人姓名",
  receiverPhone: "收件人电话",
  receiverAddress: "收件人地址",
  skuCode: "SKU物品编码",
  skuName: "SKU物品名称",
  quantity: "SKU发货数量",
  spec: "SKU规格型号",
  remark: "备注",
  senderName: "发件人姓名",
  senderPhone: "发件人电话",
  senderAddress: "发件人地址",
  weight: "重量(kg)",
  pieces: "件数",
  temperatureLevel: "温层",
};
```

- [ ] **Step 3: Add aliases in FIELD_ALIASES**

```typescript
"发件人": "senderName",
"发货人": "senderName",
"发件电话": "senderPhone",
"发货电话": "senderPhone",
"发件地址": "senderAddress",
"发货地址": "senderAddress",
"重量(kg)": "weight",
"重量": "weight",
"数量": "pieces",
"件数": "pieces",
"温层": "temperatureLevel",
"温度要求": "temperatureLevel",
```

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: update types with sender/logistics fields for waybill conversion"
```

---

## Chunk 2: Backend Core Logic

### Task 3: Update DB Layer

**Files:**
- Modify: `src/lib/db.ts`

- [ ] **Step 1: Add new fields to SaveOrdersInput**

Replace the existing interface:

```typescript
export interface SaveOrdersInput {
  externalCode?: string;
  storeName?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  remark?: string;
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  weight?: number;
  pieces?: number;
  temperatureLevel?: string;
  items: { skuCode: string; skuName: string; quantity: number; spec?: string }[];
}
```

- [ ] **Step 2: Update saveOrders to write new fields**

In `saveOrders`, update the `prisma.importOrder.create` call to include:

```typescript
senderName: input.senderName || null,
senderPhone: input.senderPhone || null,
senderAddress: input.senderAddress || null,
weight: input.weight || null,
pieces: input.pieces || null,
temperatureLevel: input.temperatureLevel || null,
```

- [ ] **Step 3: Add createWaybillsFromBatch function**

Add after `saveOrders`:

```typescript
export interface ConvertToWaybillInput {
  batchId: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  orderIds?: string[];
  overrides?: Record<string, { weight?: number; pieces?: number; temperatureLevel?: string }>;
}

export interface ConvertResult {
  successCount: number;
  failCount: number;
  failedRows: { orderId: string; externalCode: string | null; error: string }[];
}

export async function createWaybillsFromBatch(input: ConvertToWaybillInput): Promise<ConvertResult> {
  const { batchId, senderName, senderPhone, senderAddress, orderIds, overrides } = input;

  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch) {
    throw new Error("批次不存在");
  }

    const result = await prisma.$transaction(async (tx) => {
      const where: Record<string, unknown> = { batchId, convertedAt: null };
      if (orderIds && orderIds.length > 0) {
        where.id = { in: orderIds };
      }

      // Step 1: Find unconverted orders
      const candidates = await tx.importOrder.findMany({
        where,
        include: { items: true },
      });

      if (candidates.length === 0) {
        return { successCount: 0, failCount: 0, failedRows: [], skipped: true };
      }

      // Step 2: Atomically mark them as converting (convertedAt: null guard = concurrency lock)
      const candidateIds = candidates.map((o) => o.id);
      const { count: lockedCount } = await tx.importOrder.updateMany({
        where: { id: { in: candidateIds }, convertedAt: null },
        data: { convertedAt: new Date() },
      });

      if (lockedCount === 0) {
        return { successCount: 0, failCount: 0, failedRows: [], skipped: true };
      }

      // Step 3: Read back the orders that were successfully locked (at most lockedCount)
      const orders = await tx.importOrder.findMany({
        where: { id: { in: candidateIds }, convertedAt: { not: null } },
        include: { items: true },
      });

      let successCount = 0;
      let failCount = 0;
      const failedRows: ConvertResult["failedRows"] = [];

      for (const order of orders) {
        if (!order.receiverName || !order.receiverPhone || !order.receiverAddress) {
          failCount++;
          failedRows.push({
            orderId: order.id,
            externalCode: order.externalCode,
            error: "收件人信息不完整（姓名、电话、地址为必填）",
          });
          continue;
        }

        const override = overrides?.[order.id];
        const w = override?.weight ?? order.weight ?? 0;
        const p = override?.pieces ?? order.pieces ?? 0;
        const t = override?.temperatureLevel ?? order.temperatureLevel ?? "常温";

        try {
          await tx.waybill.create({
            data: {
              batchId,
              externalCode: order.externalCode || null,
              senderName,
              senderPhone,
              senderAddress,
              receiverName: order.receiverName,
              receiverPhone: order.receiverPhone,
              receiverAddress: order.receiverAddress,
              weight: Number(w),
              pieces: Number(p),
              temperatureLevel: t,
              remark: order.remark || null,
            },
          });
          successCount++;
        } catch (e) {
          failCount++;
          failedRows.push({
            orderId: order.id,
            externalCode: order.externalCode,
            error: e instanceof Error ? e.message : "创建运单失败",
          });
        }
      }

    // Check if all orders in batch are converted
    const remaining = await tx.importOrder.count({
      where: { batchId, convertedAt: null },
    });
    if (remaining === 0) {
      await tx.importBatch.update({
        where: { id: batchId },
        data: { status: "converted" },
      });
    }

    return { successCount, failCount, failedRows, skipped: false };
  });

  if (result.skipped) {
    throw new Error("没有可转为运单的订单");
  }

  return { successCount: result.successCount, failCount: result.failCount, failedRows: result.failedRows };
}
```

- [ ] **Step 4: Update WaybillQuery to include senderName**

```typescript
export interface WaybillQuery {
  page: number;
  pageSize: number;
  externalCode?: string;
  receiverName?: string;
  senderName?: string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
}
```

- [ ] **Step 5: Update queryWaybills to support senderName filter**

In `queryWaybills`, after the `receiverName` condition, add:

```typescript
if (senderName) {
  where.senderName = { contains: senderName };
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: add createWaybillsFromBatch, update SaveOrdersInput and WaybillQuery"
```

---

### Task 4: Update Import Store

**Files:**
- Modify: `src/store/import-context.tsx`

- [ ] **Step 1: Add new fields to applyMapping**

In the `applyMapping` function, update the `headerFields` Set to include:

```typescript
const headerFields = new Set([
  "externalCode", "storeName",
  "receiverName", "receiverPhone", "receiverAddress",
  "senderName", "senderPhone", "senderAddress",
  "weight", "pieces", "temperatureLevel",
  "remark",
]);
```

- [ ] **Step 2: Update ImportOrder creation in applyMapping**

Replace the existing order creation to pass new fields:

```typescript
const orders: ImportOrderRow[] = prev.parsedData.rows.map((row, i) => {
  const mapped: Record<string, string> = {};
  const itemMapped: Record<string, string> = {};
  for (const [excelCol, systemField] of Object.entries(mapping)) {
    if (systemField && headerFields.has(systemField)) {
      mapped[systemField] = String(row[excelCol] ?? "");
    }
    if (systemField && itemFields.has(systemField)) {
      itemMapped[systemField] = String(row[excelCol] ?? "");
    }
  }
  const items: ImportOrderRow["items"] = [];
  if (itemMapped.skuCode || itemMapped.skuName) {
    items.push({
      skuCode: itemMapped.skuCode || "",
      skuName: itemMapped.skuName || "",
      quantity: Number(itemMapped.quantity) || 0,
      spec: itemMapped.spec || undefined,
    });
  }
  return {
    id: `order-${i}-${Date.now()}`,
    externalCode: mapped.externalCode || undefined,
    storeName: mapped.storeName || undefined,
    receiverName: mapped.receiverName || undefined,
    receiverPhone: mapped.receiverPhone || undefined,
    receiverAddress: mapped.receiverAddress || undefined,
    remark: mapped.remark || undefined,
    senderName: mapped.senderName || undefined,
    senderPhone: mapped.senderPhone || undefined,
    senderAddress: mapped.senderAddress || undefined,
    weight: mapped.weight ? Number(mapped.weight) : undefined,
    pieces: mapped.pieces ? Number(mapped.pieces) : undefined,
    temperatureLevel: mapped.temperatureLevel || undefined,
    items,
  };
});
```

- [ ] **Step 3: Update addRow to include new fields**

```typescript
const newOrder: ImportOrderRow = {
  id: `order-${prev.orders.length}-${Date.now()}`,
  storeName: "",
  receiverName: "",
  receiverPhone: "",
  receiverAddress: "",
  externalCode: "",
  remark: "",
  senderName: "",
  senderPhone: "",
  senderAddress: "",
  weight: undefined,
  pieces: undefined,
  temperatureLevel: undefined,
  items: [],
};
```

- [ ] **Step 4: Commit**

```bash
git add src/store/import-context.tsx
git commit -m "feat: update import store with waybill fields in applyMapping"
```

---

### Task 5: Fix /api/waybills Route & Create /api/orders Route

**Files:**
- Modify: `src/app/api/waybills/route.ts`
- Create: `src/app/api/orders/route.ts`

- [ ] **Step 1: Fix /api/waybills to use queryWaybills**

Replace content of `src/app/api/waybills/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { queryWaybills } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const externalCode = searchParams.get("externalCode") || undefined;
    const receiverName = searchParams.get("receiverName") || undefined;
    const senderName = searchParams.get("senderName") || undefined;
    const batchId = searchParams.get("batchId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const result = await queryWaybills({
      page, pageSize, externalCode, receiverName, senderName, batchId, startDate, endDate,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("Waybill query error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "查询失败" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create /api/orders route**

Create `src/app/api/orders/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { queryOrders } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const externalCode = searchParams.get("externalCode") || undefined;
    const receiverName = searchParams.get("receiverName") || undefined;
    const batchId = searchParams.get("batchId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const result = await queryOrders({
      page, pageSize, externalCode, receiverName, batchId, startDate, endDate,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("Order query error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "查询失败" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/waybills/route.ts src/app/api/orders/route.ts
git commit -m "feat: fix waybills route to queryWaybills, add orders route for ImportOrder"
```

---

### Task 6: Create Create-From-Batch API

**Files:**
- Create: `src/app/api/waybills/create-from-batch/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createWaybillsFromBatch } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchId, senderName, senderPhone, senderAddress, orderIds, overrides } = body;

    if (!batchId) {
      return NextResponse.json({ error: "batchId 是必需的" }, { status: 400 });
    }
    if (!senderName || !senderPhone || !senderAddress) {
      return NextResponse.json({ error: "发件人姓名、电话、地址为必填" }, { status: 400 });
    }

    const result = await createWaybillsFromBatch({
      batchId,
      senderName,
      senderPhone,
      senderAddress,
      orderIds: Array.isArray(orderIds) ? orderIds : undefined,
      overrides: overrides || undefined,
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "转换失败";
    const status = msg === "批次不存在" || msg === "没有可转为运单的订单" ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/waybills/create-from-batch/route.ts
git commit -m "feat: add create-from-batch API endpoint for waybill conversion"
```

---

## Chunk 3: New Pages

### Task 7: Create Waybill History Page

**Files:**
- Create: `src/app/waybills/page.tsx`
- Create: `src/app/waybills/layout.tsx`

- [ ] **Step 1: Create waybill layout**

Create `src/app/waybills/layout.tsx`:

```typescript
export default function WaybillsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 2: Create waybill history page**

Create `src/app/waybills/page.tsx`:

```typescript
"use client";

import { useState, useCallback, useEffect } from "react";

interface WaybillRecord {
  id: string;
  batchId: string;
  externalCode: string | null;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
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

export default function WaybillsPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [externalCode, setExternalCode] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (externalCode) params.set("externalCode", externalCode);
      if (receiverName) params.set("receiverName", receiverName);
      if (senderName) params.set("senderName", senderName);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/waybills?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  }, [page, externalCode, receiverName, senderName, startDate, endDate, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="el-card">
      <div className="el-card__header">
        <span style={{ fontWeight: 500, fontSize: 16 }}>运单管理</span>
        <span style={{ fontSize: 13, color: "var(--el-text-color-secondary)" }}>
          {data ? `共 ${data.total} 条` : ""}
        </span>
      </div>
      <div className="el-card__body">
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", padding: "12px 16px", background: "var(--el-bg-color)", borderRadius: 8, border: "1px solid var(--el-border-color-lighter)" }}>
          <div className="el-input" style={{ flex: 1, minWidth: 160, maxWidth: 220 }}>
            <input className="el-input__inner" placeholder="搜索外部编码" value={externalCode} onChange={(e) => { setExternalCode(e.target.value); setPage(1); }} />
          </div>
          <div className="el-input" style={{ flex: 1, minWidth: 160, maxWidth: 220 }}>
            <input className="el-input__inner" placeholder="搜索发件人" value={senderName} onChange={(e) => { setSenderName(e.target.value); setPage(1); }} />
          </div>
          <div className="el-input" style={{ flex: 1, minWidth: 160, maxWidth: 220 }}>
            <input className="el-input__inner" placeholder="搜索收件人" value={receiverName} onChange={(e) => { setReceiverName(e.target.value); setPage(1); }} />
          </div>
          <div className="el-date-picker" style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <div className="el-input" style={{ width: 155 }}>
              <input className="el-input__inner" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} placeholder="开始日期" />
            </div>
            <span>至</span>
            <div className="el-input" style={{ width: 155 }}>
              <input className="el-input__inner" type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} placeholder="结束日期" />
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
            <div className="el-empty__text">暂无运单记录</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="el-table" style={{ minWidth: 1000 }}>
                <thead>
                  <tr>
                    <th className="el-table__header">外部编码</th>
                    <th className="el-table__header">发件人</th>
                    <th className="el-table__header">发件人电话</th>
                    <th className="el-table__header">收件人</th>
                    <th className="el-table__header">收件人电话</th>
                    <th className="el-table__header">重量(kg)</th>
                    <th className="el-table__header">件数</th>
                    <th className="el-table__header">温层</th>
                    <th className="el-table__header">创建时间</th>
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
                      <td>{row.temperatureLevel}</td>
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
```

- [ ] **Step 3: Commit**

```bash
git add src/app/waybills/
git commit -m "feat: add waybill history page"
```

---

### Task 8: Create WaybillCreateTable Component

**Files:**
- Create: `src/components/WaybillCreateTable.tsx`
- Note: Based on ExcelTable.tsx pattern, adapted for waybill creation flow.

- [ ] **Step 1: Create WaybillCreateTable component**

```typescript
"use client";

import { useState, useMemo, useCallback, type CSSProperties } from "react";
import { List } from "react-window";
import CellEditor from "./CellEditor";
import type { ImportOrderRow } from "@/types";
import { V2_FIELD_LABELS } from "@/types";

interface WaybillCreateTableProps {
  orders: ImportOrderRow[];
  convertedIds: Set<string>;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onCellEdit: (orderId: string, field: string, value: string | number) => void;
}

const DISPLAY_FIELDS = [
  "externalCode", "storeName", "receiverName", "receiverPhone", "receiverAddress",
  "weight", "pieces", "temperatureLevel",
] as const;

const COL_WIDTHS: Record<string, string> = {
  checkbox: "40px",
  index: "40px",
  externalCode: "110px",
  storeName: "110px",
  receiverName: "100px",
  receiverPhone: "120px",
  receiverAddress: "150px",
  weight: "80px",
  pieces: "60px",
  temperatureLevel: "70px",
  skuInfo: "80px",
};

const ROW_HEIGHT = 36;

export default function WaybillCreateTable({
  orders, convertedIds, selectedIds, onSelectionChange, onCellEdit,
}: WaybillCreateTableProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);

  const filteredOrders = useMemo(() => orders.filter((o) => !convertedIds.has(o.id)), [orders, convertedIds]);

  const allSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selectedIds.has(o.id));
  const someSelected = filteredOrders.some((o) => selectedIds.has(o.id));

  const toggleRow = useCallback((id: string) => {
    onSelectionChange(
      new Set(selectedIds.has(id)
        ? [...selectedIds].filter((sid) => sid !== id)
        : [...selectedIds, id])
    );
  }, [selectedIds, onSelectionChange]);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(filteredOrders.map((o) => o.id)));
    }
  }, [allSelected, filteredOrders, onSelectionChange]);

  const handleCellSave = useCallback((index: number, field: string, value: string | number) => {
    const order = filteredOrders[index];
    if (order) {
      onCellEdit(order.id, field, value);
    }
    setEditingCell(null);
  }, [filteredOrders, onCellEdit]);

  const RowComponent = useCallback(
    ({ index, style }: { index: number; style: CSSProperties }) => {
      const order = filteredOrders[index];
      if (!order) return null;
      const isSelected = selectedIds.has(order.id);
      const skuCount = order.items?.length || 0;

      return (
        <div style={{ ...style, display: "flex", alignItems: "center", borderBottom: "1px solid var(--el-border-color-light)", boxSizing: "border-box", background: isSelected ? "var(--el-color-primary-light-9)" : undefined }}>
          <div style={{ width: COL_WIDTHS.checkbox, textAlign: "center", flexShrink: 0 }}>
            <input type="checkbox" className="el-checkbox" checked={isSelected} onChange={() => toggleRow(order.id)} />
          </div>
          <div style={{ width: COL_WIDTHS.index, textAlign: "center", color: "var(--el-text-color-placeholder)", flexShrink: 0 }}>
            {index + 1}
          </div>
          {DISPLAY_FIELDS.map((field) => {
            const isEditing = editingCell?.row === index && editingCell?.field === field;
            const value = (order as unknown as Record<string, string | number | undefined>)[field];
            const isEditable = field === "weight" || field === "pieces" || field === "temperatureLevel";

            return (
              <div key={field} style={{ width: COL_WIDTHS[field] || "100px", padding: "4px 8px", flexShrink: 0, boxSizing: "border-box", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isEditing ? (
                  <CellEditor field={field} value={value} onSave={(v) => handleCellSave(index, field, v)} onCancel={() => setEditingCell(null)} />
                ) : (
                  <div
                    style={{ minHeight: 24, padding: "0 4px", cursor: isEditable ? "pointer" : "default", borderRadius: "var(--el-border-radius-small)", display: "flex", alignItems: "center", lineHeight: "24px", fontSize: 13 }}
                    onMouseEnter={(e) => { if (isEditable) (e.currentTarget as HTMLElement).style.background = "var(--el-color-primary-light-9)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    onClick={() => { if (isEditable) setEditingCell({ row: index, field }); }}
                  >
                    {field === "weight" ? (value != null ? `${value} kg` : "-") :
                     field === "pieces" ? (value != null ? `${value}` : "-") :
                     field === "temperatureLevel" ? (value || "-") :
                     String(value ?? "")}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ width: COL_WIDTHS.skuInfo, textAlign: "center", fontSize: 12, color: "var(--el-text-color-secondary)", flexShrink: 0 }}>
            {skuCount > 0 ? `${skuCount} 个` : "-"}
          </div>
        </div>
      );
    },
    [filteredOrders, selectedIds, editingCell, toggleRow, handleCellSave]
  );

  const containerHeight = Math.min(filteredOrders.length * ROW_HEIGHT + 8, 500);

  return (
    <div style={{ overflow: "hidden", border: "1px solid var(--el-border-color-light)", borderRadius: "var(--el-border-radius-base)" }}>
      <div style={{ display: "flex", background: "var(--el-bg-color)", fontWeight: 500, fontSize: 13, borderBottom: "1px solid var(--el-border-color-light)", position: "sticky", top: 0, zIndex: 2 }}>
        <div style={{ width: COL_WIDTHS.checkbox, textAlign: "center", padding: "8px 0", flexShrink: 0 }}>
          <input type="checkbox" className="el-checkbox" checked={allSelected} onChange={toggleAll} ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }} />
        </div>
        <div style={{ width: COL_WIDTHS.index, textAlign: "center", padding: "8px 0", color: "var(--el-text-color-placeholder)", flexShrink: 0 }}>#</div>
        {DISPLAY_FIELDS.map((field) => (
          <div key={field} style={{ width: COL_WIDTHS[field] || "100px", padding: "8px", flexShrink: 0, whiteSpace: "nowrap", boxSizing: "border-box" }}>
            {V2_FIELD_LABELS[field] || field}
          </div>
        ))}
        <div style={{ width: COL_WIDTHS.skuInfo, textAlign: "center", padding: "8px 0", flexShrink: 0 }}>SKU</div>
      </div>
      <List
        defaultHeight={containerHeight}
        rowCount={filteredOrders.length}
        rowHeight={ROW_HEIGHT}
        style={{ height: containerHeight, width: "100%" }}
        rowComponent={RowComponent}
        rowProps={{} as any}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WaybillCreateTable.tsx
git commit -m "feat: add WaybillCreateTable component for waybill creation flow"
```

---

### Task 9: Create /waybills/create Page

**Files:**
- Create: `src/app/waybills/create/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import WaybillCreateTable from "@/components/WaybillCreateTable";
import type { ImportOrderRow } from "@/types";

export default function CreateWaybillPage() {
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
      // Mark selected as converted
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/waybills/create/page.tsx
git commit -m "feat: add waybill creation page with sender form and editable table"
```

---

## Chunk 4: Existing Page Integration

### Task 10: Update NavBar

**Files:**
- Modify: `src/app/NavBar.tsx`

- [ ] **Step 1: Add 运单管理 nav item**

Replace the `NAV_ITEMS` array:

```typescript
const NAV_ITEMS = [
  { href: "/import", label: "导入" },
  { href: "/import/rules", label: "解析规则" },
  { href: "/import/history", label: "历史记录" },
  { href: "/waybills", label: "运单管理" },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/app/NavBar.tsx
git commit -m "feat: add waybill management nav item"
```

---

### Task 11: Update ImportResult

**Files:**
- Modify: `src/components/ImportResult.tsx`

- [ ] **Step 1: Add "转为运单" button**

Replace the button group at the bottom:

```typescript
<div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
  <button className="el-button el-button--primary" onClick={() => { reset(); setStep("upload"); }}>
    继续导入
  </button>
  <button className="el-button el-button--success" onClick={() => { window.location.href = `/waybills/create?batchId=${batchResult.id}`; }}>
    转为运单
  </button>
  <button className="el-button el-button--plain" onClick={() => { window.location.href = "/import/history"; }}>
    查看历史记录
  </button>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ImportResult.tsx
git commit -m "feat: add convert to waybill button in import result"
```

---

### Task 12: Update Import History API Endpoint

**Files:**
- Modify: `src/app/import/history/page.tsx`

- [ ] **Step 1: Change API endpoint from /api/waybills to /api/orders**

In `fetchData` at line 48, replace the fetch URL:

```typescript
const res = await fetch(`/api/orders?${params}`);
```

(Previously: `const res = await fetch(\`/api/waybills?${params}\`);`)

- [ ] **Step 2: Commit**

```bash
git add src/app/import/history/page.tsx
git commit -m "fix: update import history to use /api/orders endpoint"
```

---

### Task 13: Build & Verify

- [ ] **Step 1: Check for ImportBatch status whitelist**

Search for any code that validates or restricts ImportBatch status values:

```bash
grep -rn "ImportBatch" src/ --include="*.ts" --include="*.tsx" | grep -i "status\|pending\|processing\|completed\|failed"
```

If any file has hardcoded status enum checks (e.g., `"pending" | "processing" | "completed" | "failed"`), add `"converted"` to the set. Common places: validation functions, type guards, API route filters.

- [ ] **Step 2: Run the build**

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
npm run build
```

Expected: Compiled successfully, TypeScript passes, all pages generated.

- [ ] **Step 3: Commit if there are changes**

```bash
if ! git diff --quiet; then
  git add -A
  git commit -m "chore: final adjustments after build verification"
fi
```
