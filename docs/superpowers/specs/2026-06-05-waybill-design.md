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

在现有 ImportOrder 模型上增加发件人信息及物流字段：

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
  senderName      String?     // 发件人姓名
  senderPhone     String?     // 发件人电话
  senderAddress   String?     // 发件人地址
  weight          Float?      // 重量(kg)
  pieces          Int?        // 件数
  temperatureLevel String?   // 温层

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}
```

### ImportBatch 状态扩充

在现有 status 枚举值 `pending | processing | completed | failed` 基础上，增加 `converted` 状态，表示该批次已转为运单。

### 同步更新清单

- `prisma/schema.prisma` — ImportOrder 加字段、ImportBatch 状态说明
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
  "orderIds": ["string"]  // 可选，为空则转换该批次全部订单
}
```

**处理逻辑：**
1. 校验 batchId 存在且 ImportBatch 状态不为 converted（防重复提交）
2. 查询指定 batchId 下的 ImportOrder（若 orderIds 不为空则过滤）
3. 若 orderIds 中有不存在的 ID，返回 400 及具体错误
4. 对每条 ImportOrder，创建一条 Waybill：
   - senderName/senderPhone/senderAddress 使用请求传入的值
   - receiverName/receiverPhone/receiverAddress/externalCode/remark 从 ImportOrder 复制
   - weight/pieces/temperatureLevel 从 ImportOrder 复制
5. 更新 ImportBatch 状态为 `converted`，累加 successCount/failCount
6. 返回创建的运单数

**成功响应 (200)：**
```json
{
  "successCount": 100,
  "failCount": 0,
  "failedRows": []
}
```

**错误响应：**
| 状态码 | 场景 | 响应体 |
|--------|------|--------|
| 400 | batchId 不存在 | `{ "error": "批次不存在" }` |
| 400 | 该批次已转为运单 | `{ "error": "该批次已转为运单，请勿重复提交" }` |
| 400 | orderIds 中有无效 ID | `{ "error": "以下订单不存在: [id1, id2]" }` |
| 400 | 无有效订单可转 | `{ "error": "没有可转为运单的订单" }` |
| 500 | 数据库异常 | `{ "error": "转换失败，请重试" }` |

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

将原 `/api/waybills` 的 ImportOrder 查询逻辑迁移到 `/api/orders/route.ts`，供 `/import/history` 页面继续使用。

参数与响应格式与当前 `/api/waybills` 一致。

## 页面设计

### 新增 /waybills/create?batchId=xxx — 转为运单工作页

布局分三部分：

1. **发件人信息填写区**（顶部卡片）
   - 发件人姓名（必填）、电话（必填，格式校验）、地址（必填）
   - 一次性填写，作用于所有选中运单
   - 前端实时校验，未填时「提交运单」按钮禁用

2. **数据表格**（中间，与 ImportPreview 风格一致）
   - 使用 react-window 虚拟列表渲染
   - 展示该批次所有 ImportOrder
   - 列：外部编码、收货门店、收件人、收件人电话、收件人地址、重量、件数、温层、SKU
   - 重量/件数/温层可编辑（Inline CellEditor）
   - 行前 checkbox 支持多选
   - 顶部全选 checkbox
   - 选中行数实时显示

3. **操作栏**（底部固定）
   - 显示「已选中 X / 共 Y 条」
   - 「提交运单」按钮，点击后：
     - 按钮变为 loading 状态，禁用重复点击
     - 显示进度条（分批提交）
     - 提交完成后显示成功/失败数
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

**分页：** 与现有分页组件一致

### 现有页面调整

1. **NavBar** (`src/app/NavBar.tsx`)
   - 新增「运单管理」菜单项，指向 `/waybills`

2. **ImportResult** (`src/components/ImportResult.tsx`)
   - 新增「转为运单」按钮，指向 `/waybills/create?batchId=xxx`
   - 放在「继续导入」和「查看历史记录」之间

3. **ImportPreview** (`src/components/ExcelTable.tsx`)
   - 数据表头增加「重量」「件数」「温层」列显示（当数据中有这些字段时）

4. **ImportHistory** (`src/app/import/history/page.tsx`)
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
│   │       │   └── route.ts      # 转运单 API
│   │       └── route.ts          # Waybill 历史查询（修正为 queryWaybills）
│   ├── waybills/
│   │   ├── create/
│   │   │   └── page.tsx          # 转为运单工作页
│   │   └── page.tsx              # 运单历史列表页（复用 /import/history 风格）
│   └── import/
│       └── history/
│           └── page.tsx          # 改 API 地址为 /api/orders
└── components/
    └── WaybillCreateTable.tsx    # 转为运单的数据表格组件（基于 ExcelTable）
```

## 数据流

```
文件上传 → 解析 → 规则映射 → 预览编辑 → 提交(ImportOrder)
                                                    ↓
                                              ImportResult
                                           ┌─ 查看历史记录 → /import/history (/api/orders)
                                           └─ 转为运单 → /waybills/create?batchId=xxx
                                                           ↓
                                                   填写发件人信息
                                                   勾选订单 → 编辑 weight/pieces/temperatureLevel
                                                   点击「提交运单」（按钮 loading，防重复）
                                                           ↓
                                           POST /api/waybills/create-from-batch
                                           (校验批次状态，防重复提交)
                                                           ↓
                                                   创建 Waybill 记录
                                                   ImportBatch → status=converted
                                                           ↓
                                           ┌─ 查看运单记录 → /waybills (/api/waybills)
                                           └─ 继续导入 → /import
```
