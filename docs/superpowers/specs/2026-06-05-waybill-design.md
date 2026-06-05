# 运单下单功能设计文档

## 概述

在已有的「万能导入 V2」文件导入流程基础上，增加「转为运单」功能。用户导入订单数据后，可将导入的订单批量转为正式的运单（Waybill），并查看运单记录。

## 数据模型变更

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

需要同步更新的地方：
- `prisma/schema.prisma` — 数据库 schema
- `src/types/index.ts` — `ImportOrderRow` 接口增加新字段
- `src/lib/db.ts` — `saveOrders` 函数写入新字段
- `src/components/RuleSelector.tsx` — `applyMapping` 处理新字段映射
- `src/store/import-context.tsx` — `applyMapping` 支持新字段
- `src/types/index.ts` — `V2_FIELD_LABELS` 增加新字段的中文标签
- `src/types/index.ts` — `FIELD_ALIASES` 增加新字段的别名

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
1. 查询指定 batchId 下的 ImportOrder（若 orderIds 不为空则过滤）
2. 对每条 ImportOrder，创建一条 Waybill：
   - senderName/senderPhone/senderAddress 使用请求传入的值
   - receiverName/receiverPhone/receiverAddress/externalCode/remark 从 ImportOrder 复制
   - weight/pieces/temperatureLevel 从 ImportOrder 复制
3. 更新 ImportBatch 状态
4. 返回创建的运单数

**响应：**
```json
{
  "successCount": 100,
  "failCount": 0,
  "failedRows": []
}
```

### 更新 GET /api/waybills（历史查询）

当前 `/api/waybills` 查询的是 ImportOrder，需改为查询 Waybill 模型。

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

## 页面设计

### 新增 /waybills/create?batchId=xxx — 转为运单工作页

布局分三部分：

1. **发件人信息填写区**（顶部卡片）
   - 发件人姓名、电话、地址
   - 一次性填写，作用于所有运单
   - 三项均为必填

2. **数据表格**（中间，与 ImportPreview 风格一致）
   - 展示该批次所有 ImportOrder
   - 列：外部编码、收货门店、收件人、收件人电话、收件人地址、重量、件数、温层、SKU
   - 重量/件数/温层可编辑
   - 支持多选（可只转部分订单）
   - 带全选/取消功能

3. **操作栏**（底部）
   - 显示选中订单数
   - 「提交运单」按钮

**提交后行为：**
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
   - 「继续导入」和「查看历史记录」按钮旁，新增「转为运单」按钮
   - 指向 `/waybills/create?batchId=xxx`

3. **ImportPreview** (`src/components/ExcelTable.tsx`)
   - 数据表头增加「重量」「件数」「温层」列显示（如果数据中有）

## 组件结构

```
src/
├── app/
│   └── waybills/
│       ├── create/
│       │   └── page.tsx          # 转为运单工作页
│       └── page.tsx              # 运单历史列表页
└── components/
    └── WaybillCreateTable.tsx    # 转为运单专用的数据表格组件
```

## 数据流

```
文件上传 → 解析 → 规则映射 → 预览编辑 → 提交(ImportOrder)
                                                    ↓
                                              ImportResult
                                                    ↓
                                          「转为运单」按钮
                                                    ↓
                                         /waybills/create
                                         填写发件人信息
                                         确认/编辑数据
                                         点击提交
                                                    ↓
                                         POST /api/waybills/create-from-batch
                                                    ↓
                                         创建 Waybill 记录
                                                    ↓
                                         跳转到 /waybills 查看
```
