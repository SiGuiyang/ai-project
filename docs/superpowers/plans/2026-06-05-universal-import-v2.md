# 万能导入 V2 实现计划

> **For agentic workers:** Use subagent-driven-development. Steps use checkbox syntax.

**目标:** 将 V1 运单批量导入系统升级为 V2 — 规则引擎 + AI 辅助生成 + 多格式支持 + 新字段模型 + 性能达标

**架构变更:**
- 新增 `ParseRule` / `ImportOrder` / `OrderItem` 模型，替换 V1 Waybill
- 规则引擎替代硬编码模板匹配，支持 Excel/Word/PDF
- AI 集成 DeepSeek API 分析文件生成规则
- 虚拟列表 react-window 支持 1000+ 行渲染

**Tech Stack:** Next.js 16 + Prisma + PostgreSQL + react-window + mammoth + pdfjs-dist

---

## 任务分解

### Task 1: Prisma Schema 改造

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/` (via db push)

- [ ] **Step 1: 重写 schema**

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
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([batchId])
  @@index([externalCode])
  @@index([receiverName])
  @@index([createdAt])
}

model OrderItem {
  id        String      @id @default(cuid())
  orderId   String
  order     ImportOrder @relation(fields: [orderId], references: [id])
  skuCode   String
  skuName   String
  quantity  Int
  spec      String?
  createdAt DateTime    @default(now())

  @@index([orderId])
}

model ImportBatch {
  id           String        @id @default(cuid())
  status       String        @default("pending")
  totalCount   Int           @default(0)
  successCount Int           @default(0)
  failCount    Int           @default(0)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  orders       ImportOrder[]
}

model ParseRule {
  id        String   @id @default(cuid())
  name      String
  fileType  String   // "excel" | "word" | "pdf"
  config    String   // JSON string
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: 更新 db.ts — CRUD 适配新模型**
- [ ] **Step 3: 更新 types/index.ts — V2 类型定义**

### Task 2: UI 主题切换 #0fc6c2

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: 替换 globals.css 中所有颜色变量**

`--el-color-primary: #409eff` → `--el-color-primary: #0fc6c2`
衍生色计算：light-3=#48d9d6, light-5=#80e6e4, light-7=#b3f0ef, light-8=#ccf5f4, light-9=#e6fafa, dark-2=#0bada9

- [ ] **Step 2: 更新 header/nav 配色**
- [ ] **Step 3: 更新各组件中使用 `var(--el-color-primary)` 的地方**

### Task 3: 规则引擎 — 核心类型 + 执行器

**Files:**
- Create: `src/lib/rule-engine/types.ts`
- Create: `src/lib/rule-engine/parser.ts`
- Create: `src/lib/rule-engine/excel-executor.ts`
- Create: `src/lib/rule-engine/word-executor.ts`
- Create: `src/lib/rule-engine/pdf-executor.ts`

- [ ] **Step 1: 定义规则类型**

```typescript
export interface ColumnMapping {
  source: string;      // source column/field name
  target: string;      // system field: skuCode, skuName, quantity, etc.
  defaultValue?: string;
}

export interface PostProcessor {
  type: "aggregate" | "transpose" | "extractTail" | "cardSplit" | "cellSplit" | "multiSheet";
  config?: Record<string, unknown>;
}

export interface ParseRuleConfig {
  fileType: "excel" | "word" | "pdf";
  sheetIndex?: number;
  headerRow?: number;
  dataStartRow?: number;
  skipRows?: number[];
  columnMappings: ColumnMapping[];
  groupBy?: string;          // field to group records by
  postProcessors?: PostProcessor[];
  extractors?: {             // extract scattered info (tail/header)
    type: "tail" | "header";
    fields: { label: string; target: string }[];
  }[];
}
```

- [ ] **Step 2: Excel 执行器** — 基于配置的通用解析（非硬编码）
- [ ] **Step 3: Word 执行器** — mammoth 转文本 → 行模式解析
- [ ] **Step 4: PDF 执行器** — pdfjs-dist 转文本 → 行模式解析
- [ ] **Step 5: 后处理器实现** — aggregate/transpose/extractTail/cardSplit/cellSplit/multiSheet

### Task 4: 规则管理 API + 页面

**Files:**
- Create: `src/app/api/rules/route.ts`
- Create: `src/app/import/rules/page.tsx` (规则管理)
- Modify: `src/app/layout.tsx` (导航增加规则管理)

- [ ] **Step 1: API CRUD — GET/POST/PUT/DELETE /api/rules**
- [ ] **Step 2: 规则列表页面**
- [ ] **Step 3: 规则新建/编辑表单（JSON 编辑器 + 可视化字段映射）**

### Task 5: AI 辅助生成规则

**Files:**
- Create: `src/lib/ai/index.ts`
- Create: `src/lib/ai/prompt.ts`
- Create: `src/app/api/ai/generate-rule/route.ts`

- [ ] **Step 1: AI 客户端封装（DeepSeek API）**
- [ ] **Step 2: Prompt 设计 — 分析文件结构 → 输出规则 JSON**
- [ ] **Step 3: API 路由 `/api/ai/generate-rule`**
- [ ] **Step 4: 前端 AI 生成按钮 + 规则预览确认 UI**

### Task 6: 导入流程改造

**Files:**
- Modify: `src/store/import-context.tsx`
- Modify: `src/components/FileUploader.tsx`
- Create: `src/components/RuleSelector.tsx`
- Create: `src/components/AIRuleGenerator.tsx`
- Modify: `src/components/ImportPreview.tsx`
- Modify: `src/components/ExcelTable.tsx`
- Modify: `src/components/ImportResult.tsx`
- Modify: `src/app/import/page.tsx`

- [ ] **Step 1: 改造 import-context — 新字段模型 + A/B 组验证**
- [ ] **Step 2: RuleSelector — 选择已有规则或新建**
- [ ] **Step 3: AIRuleGenerator — AI 分析 → 规则预览 → 确认**
- [ ] **Step 4: 改造 FileUploader — 多格式支持**
- [ ] **Step 5: 改造 ExcelTable — 新字段 + SKU 子表展示**
- [ ] **Step 6: 改造校验逻辑 — A/B 组 + SKU 必填**
- [ ] **Step 7: 改造提交 — ImportOrder + OrderItem 分步写入**

### Task 7: 虚拟列表 1000+ 行

**Files:**
- Install: `react-window @types/react-window`
- Modify: `src/components/ExcelTable.tsx`

- [ ] **Step 1: react-window FixedSizeList 替换原生 table**

在表格外层用 FixedSizeList，每行固定高度 36px，visible rows = 容器高度 / 36

- [ ] **Step 2: 表头固定 + 横向滚动保持**

### Task 8: 运单列表页改造

**Files:**
- Modify: `src/app/import/history/page.tsx`
- Modify: `src/app/api/waybills/route.ts`

- [ ] **Step 1: API 适配新模型 ImportOrder + OrderItem**
- [ ] **Step 2: 页面适配新字段**

### Task 9: 部署

- [ ] **Step 1: 推送代码**
- [ ] **Step 2: Vercel 部署验证**
