# 运单下单功能设计文档

## 概述

在已有的「万能导入 V2」文件导入流程基础上，增加「转为运单」功能。用户导入订单数据后，可将导入的订单批量转为正式的运单（Waybill），并查看运单记录。

## 数据模型

### 现有 Waybill 模型（已存在，无需新建）

```prisma
model Waybill {
  id               String   @id @default(cuid())
  batchId          String
  externalCode     String?
  senderName       String
  senderPhone      String
  senderAddress    String
  receiverName     String
  receiverPhone    String
  receiverAddress  String
  weight           Float
  pieces           Int
  temperatureLevel String
  remark           String?
  batch            ImportBatch @relation(fields: [batchId], references: [id])
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

### ImportOrder 模型扩充

在现有 ImportOrder 模型上增加发件人信息、物流字段及转换状态：

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

  // 新增字段
  senderName      String?     // 发件人姓名（从文件映射）
  senderPhone     String?     // 发件人电话（从文件映射）
  senderAddress   String?     // 发件人地址（从文件映射）
  weight          Float?      // 重量(kg)（从文件映射）
  pieces          Int?        // 件数（从文件映射）
  temperatureLevel String?   // 温层（从文件映射）
  convertedAt     DateTime?   // 转为运单的时间，null=未转换

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([convertedAt])
}
```

`convertedAt` 用于追踪每个 ImportOrder 的转换状态，支持分批转换。

### ImportBatch 模型（已有）

```prisma
model ImportBatch {
  id           String        @id @default(cuid())
  status       String        @default("pending")  // pending | processing | completed | failed | converted
  totalCount   Int           @default(0)
  successCount Int           @default(0)
  failCount    Int           @default(0)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  waybills     Waybill[]
  orders       ImportOrder[]
}
```

`converted` 状态表示该批次所有订单已转为运单。

### 同步更新清单

- `prisma/schema.prisma` — ImportOrder 加字段
- `src/types/index.ts` — `ImportOrderRow` 接口增加新字段
- `src/lib/db.ts` — `saveOrders` 写入新字段；`SaveOrdersInput` 增加新字段
- `src/store/import-context.tsx` — `applyMapping` 支持新字段映射
- `src/types/index.ts` — `V2_FIELD_LABELS` 增加新字段中文标签
- `src/types/index.ts` — `FIELD_ALIASES` 增加新字段别名（发件人→senderName等）

## API 设计

### 新增 POST /api/waybills/create-from-batch

将一批 ImportOrder 转为 Waybill 记录。

**请求体：**
```json
{
  "batchId": "string (必填)",
  "senderName": "string (必填)",
  "senderPhone": "string (必填)",
  "senderAddress": "string (必填)",
  "orderIds": ["string"]  // 可选，为空则转换该批次全部未转换的订单
}
```

**处理逻辑（使用 Prisma $transaction 保证原子性）：**
1. 校验 batchId 存在，否则返回 400
2. 查询指定 batchId 下 `convertedAt IS NULL` 的 ImportOrder
   - 若 orderIds 不为空，额外过滤只保留 orderIds 中的且未转换的
   - 若无有效订单，返回 400 "没有可转为运单的订单"
3. 校验每行：
   - receiverName/receiverPhone/receiverAddress 不可为空（Waybill 模型要求非空）→ 为空时计入 failedRows
   - weight/pieces/temperatureLevel 为空时使用默认值（weight=0, pieces=0, temperatureLevel="常温"）
   - 有空值/默认值的行不阻塞其他行
4. 事务内执行：
   - 创建 Waybill 记录（每条 ImportOrder 一条）：
     - senderName/senderPhone/senderAddress 使用请求传入的值
     - receiverName/receiverPhone/receiverAddress/externalCode/remark 从 ImportOrder 复制
     - weight/pieces/temperatureLevel 从 ImportOrder 复制（空则用默认值）
   - 更新对应 ImportOrder 的 convertedAt = now()
   - 若批次内所有 ImportOrder 均已转换（convertedAt 全部非空），更新 ImportBatch.status = "converted"
5. 返回创建结果

**成功响应 (200)：**
```json
{
  "successCount": 50,
  "failCount": 0,
  "failedRows": [{ "orderId": "xxx", "externalCode": "yyy", "error": "收件人电话为空" }]
}
```

**错误响应：**
| 状态码 | 场景 | 响应体 |
|--------|------|--------|
| 400 | batchId 不存在 | `{ "error": "批次不存在" }` |
| 400 | 无有效订单可转 | `{ "error": "没有可转为运单的订单" }` |
| 500 | 事务执行失败 | `{ "error": "转换失败，请重试" }` |

### 修正 GET /api/waybills（运单历史查询）

当前 `/api/waybills/route.ts` 误用了 `queryOrders()`（查询 ImportOrder），需修正为 `queryWaybills()`（查询 Waybill）。

**查询参数：** page, pageSize, externalCode, receiverName, senderName, startDate, endDate

**响应：**
```json
{
  "data": [Waybill],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

### 新增 GET /api/orders（订单历史查询）

将原 `/api/waybills` 的 ImportOrder 查询逻辑迁移到 `/api/orders/route.ts`，供 `/import/history` 页面使用。

参数与响应格式与当前 `/api/waybills` 的现有行为一致（即查询 ImportOrder + OrderItem，当前实现实际上查询的是 ImportOrder，/api/waybills 修正后 /api/orders 接过这个职责）。

## 页面设计

### 新增 /waybills/create?batchId=xxx — 转为运单工作页

布局分三部分：

1. **发件人信息填写区**（顶部卡片）
   - 发件人姓名（必填）、电话（必填）、地址（必填）
   - 一次性填写，作用于所有选中运单
   - 前端实时校验，三项均填才启用「提交运单」按钮

2. **数据表格**（中间，基于 ExcelTable 改造的 WaybillCreateTable）
   - 使用 react-window 虚拟列表渲染
   - 展示该批次所有 ImportOrder
   - 列：外部编码、收货门店、收件人、收件人电话、收件人地址、重量、件数、温层、SKU
   - 重量/件数/温层可编辑（Inline CellEditor）
   - 行前 checkbox 支持多选
   - 顶部全选 checkbox
   - 注意：`storeName`（收货门店）仅在表格中展示参考，不会写入 Waybill（Waybill 模型无此字段）
   - 已转换的订单（convertedAt 不为空）灰化不可选

3. **操作栏**（底部固定）
   - 显示「已选中 X / 共 Y 条」
   - 「提交运单」按钮，点击后：
     - 按钮变为 loading 状态，禁用重复点击
     - 调用 POST /api/waybills/create-from-batch
     - 成功后显示结果（成功/失败数）
     - 提供「查看运单记录」按钮跳转到 /waybills

### 新增 /waybills — 运单历史列表

与现有 `/import/history` 风格一致的搜索+分页表格。

**搜索筛选：**
- 外部编码（模糊搜索）
- 收件人姓名（模糊搜索）
- 发件人姓名（模糊搜索）
- 日期区间

**表格列：**
外部编码、发件人、发件人电话、收件人、收件人电话、重量、件数、温层、创建时间

### 现有页面调整

1. **NavBar** (`src/app/NavBar.tsx`)
   - 新增「运单管理」菜单项，指向 `/waybills`

2. **ImportResult** (`src/components/ImportResult.tsx`)
   - 新增「转为运单」按钮，指向 `/waybills/create?batchId=xxx`，放在「继续导入」和「查看历史记录」之间

3. **ImportHistory** (`src/app/import/history/page.tsx`)
   - 调用的 API 从 `/api/waybills` 改为 `/api/orders`

## 组件结构

```
src/
├── app/
│   ├── api/
│   │   ├── orders/
│   │   │   └── route.ts          # ImportOrder 历史查询（从 /api/waybills 迁移）
│   │   └── waybills/
│   │       ├── create-from-batch/
│   │       │   └── route.ts      # 转运单 API（事务保护）
│   │       └── route.ts          # Waybill 历史查询（修正为 queryWaybills）
│   ├── waybills/
│   │   ├── create/
│   │   │   └── page.tsx          # 转为运单工作页
│   │   └── page.tsx              # 运单历史列表页
│   └── import/
│       └── history/
│           └── page.tsx          # 改 API 地址为 /api/orders
└── components/
    └── WaybillCreateTable.tsx    # 转为运单的数据表格组件
```

## 数据流

```
文件上传 → 解析 → 规则映射 → 预览编辑 → 提交(ImportOrder)
                                                    ↓
                                              ImportResult
                                           ├─ 继续导入 → /import
                                           ├─ 转为运单 → /waybills/create?batchId=xxx
                                           └─ 查看历史记录 → /import/history
                                                           ↓
                                             /waybills/create
                                             填写发件人信息（统一作用于所有选中订单）
                                             勾选未转换的订单
                                             编辑 weight/pieces/temperatureLevel
                                             点击「提交运单」
                                                           ↓
                                             POST /api/waybills/create-from-batch
                                             ($transaction: 创建 Waybill + 标记 convertedAt)
                                                           ↓
                                             创建 Waybill 成功
                                                           ↓
                                             跳转到 /waybills 查看运单记录
```
