// Load .env manually
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {}

// === Inline config (mirrors src/lib/ai/config.ts) ===
const AI_CONFIG = {
  baseUrl: process.env.AI_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
  apiKey: process.env.AI_API_KEY || "",
  model: process.env.AI_MODEL || "qwen-plus",
  maxTokens: 4096,
  temperature: 0.1,
};

// === Improved prompt (mirrors src/lib/ai/prompt.ts) ===
const SYSTEM_PROMPT = `You are a document parsing rule generator. Given file content, generate a JSON parse rule configuration.

# System Fields

| Field | Required | Description |
|-------|----------|-------------|
| externalCode | no | External order ID / 外部订单号 |
| storeName | A-group | Receiving store name / 收货门店 |
| receiverName | B-group | Recipient name / 收件人 |
| receiverPhone | B-group | Recipient phone / 收件人电话 |
| receiverAddress | B-group | Recipient address / 收件人地址 |
| skuCode | YES | SKU code / SKU编码 |
| skuName | YES | SKU name / SKU名称 |
| quantity | YES | Quantity to ship / 数量 (positive integer) |
| spec | no | SKU specification / 规格 |
| remark | no | Notes / 备注 |

Validation: Group A (storeName) OR Group B (receiverName+receiverPhone+receiverAddress) must be present.

# Rule Config Format

{
  "fileType": "excel" | "word" | "pdf",
  "headerRow": <number | null> (0-based row index of column headers; null for non-tabular),
  "dataStartRow": <number | null> (0-based first data row; null for non-tabular),
  "skipRows": <number[] | null> (row indices to skip before header; null if none),
  "columnMappings": <array | null> (tabular data only: [{ "source": "colName", "target": "fieldName" }]),
  "extractors": <array | null> (regex-based extraction for non-tabular / compound fields),
  "postProcessors": <array | null>,
  "groupBy": "<fieldName> | null" (field to group line items into orders)
}

# When to Use columnMappings vs extractors

## Tabular data (Excel with clear table structure)
Use columnMappings to map each column header to a system field. Set headerRow and dataStartRow.

## Non-tabular data (Word, PDF, card-style Excel)
Use extractors (regex patterns) instead of columnMappings. Set headerRow and dataStartRow to null.
Each extractor defines a regex pattern with capture groups, mapped to system fields:
{ "pattern": "商品编码[：:](\\\\S+)", "target": "skuCode" }

## Compound fields (cellSplit)
When a single cell contains multiple values (e.g. "SKU001 商品A"), use columnMappings + cellSplit + extractor:
{
  "columnMappings": [{ "source": "商品信息", "target": "tmpField" }],
  "postProcessors": [{ "type": "cellSplit", "config": { "field": "tmpField", "separator": "\\\\s+" } }],
  "extractors": [{ "pattern": "^(SKU\\\\w+)\\\\s+(.+)$", "target": ["skuCode", "skuName"] }]
}

# PostProcessors (add to "postProcessors" array)

## aggregate
Merge rows with same key fields; sum quantity. Use when SKU is repeated across rows.
{ "type": "aggregate", "config": { "fields": ["skuCode", "skuName"], "aggFunction": "sum" } }

## transpose
Use when data is transposed: column headers are SKU codes, first column is store names, cells are quantities.
IMPORTANT for transpose: The first column header maps to "storeName". Remaining column headers are SKU codes.
Data rows: first cell = storeName value, remaining cells = quantities for each SKU.
After transpose, each row becomes: { storeName, skuCode: <col header>, quantity: <cell value> }
Your columnMappings for transpose should be just: [{ "source": "<first-col-header>", "target": "storeName" }]
{ "type": "transpose" }

## extractTail
Extract trailing info (e.g. from footer rows).
{ "type": "extractTail", "config": { "label": "备注", "target": "remark" } }

## cardSplit
Use when each record spans multiple rows (key:value pairs). Split records by blank line.
{ "type": "cardSplit" }

## cellSplit
Split a compound cell into sub-values. Must pair with an extractor that maps split parts to fields.
{ "type": "cellSplit", "config": { "field": "<sourceField>", "separator": "\\\\s+" } }

## multiSheet
Use when the file has multiple sheets with similar structure.
{ "type": "multiSheet" }

# Examples

## Excel: standard table
(headerRow=0, dataStartRow=1, columnMappings: 货号→skuCode, 品名→skuName, 数量→quantity, 门店→storeName)

## Excel: interference rows
(headerRow=2, dataStartRow=3, skipRows=[0,1], columnMappings same as above)

## Excel: aggregate
(headerRow=0, dataStartRow=1, columnMappings: SKU→skuCode, 名称→skuName, 数量→quantity, add aggregate postProcessor)

## Excel: transposed
(headerRow=0, dataStartRow=1, columnMappings: [{source:"门店\\\\SKU", target:"storeName"}], postProcessors: [{type:"transpose"}])

## Word: paragraph / card-style Excel
(headerRow=null, dataStartRow=null, columnMappings=null, postProcessors: [cardSplit], extractors with regex patterns for each field)

## PDF: structured lines
(headerRow=null, dataStartRow=null, columnMappings=null, postProcessors: [cardSplit with delimiter], extractors with multi-group patterns)

## Excel: compound cell
(columnMappings: 商品信息→tmpField, postProcessors: [cellSplit], extractors: regex to split tmpField into skuCode+skuName)

# Important Rules
- Output ONLY valid JSON, no explanations or markdown
- For non-Excel files, always use extractors and cardSplit, never columnMappings
- For transposed Excel, only map storeName in columnMappings; transpose processor handles the rest
- For card-style Excel (key:value pairs per row), use cardSplit + extractors, NOT columnMappings
- Chinese header name mapping: 门店→storeName, 收件人→receiverName, 电话→receiverPhone, 地址→receiverAddress, 备注→remark, 订单号→externalCode, 商品编码/货号/SKU→skuCode, 商品名称/品名/名称→skuName, 数量→quantity, 规格→spec`;

function buildUserPrompt(fileName, fileType, content) {
  return `File: ${fileName}\nType: ${fileType}\n\nContent:\n${content}\n\nGenerate a parsing rule config as JSON. Do not include \`\`\`json or any markdown. Output raw JSON only.`;
}

// Test cases
const testCases = [
  {
    name: "01 - Excel: 标准表头(standard table)",
    fileName: "test.xlsx", fileType: "excel",
    content: `货号\t品名\t数量\t门店\t备注\nSKU001\t商品A\t10\t上海店\t\nSKU002\t商品B\t20\t北京店\t急件`,
  },
  {
    name: "02 - Excel: 干扰行(interference header rows)",
    fileName: "import.xlsx", fileType: "excel",
    content: `导入日期：2024-01-01\n制表人：张三\n货号\t品名\t数量\t门店\nSKU001\t商品A\t10\t上海店`,
  },
  {
    name: "03 - Excel: 聚合行(aggregate rows)",
    fileName: "aggregate.xlsx", fileType: "excel",
    content: `SKU\t名称\t数量\t门店\nSKU001\tA\t5\t上海店\nSKU001\tA\t3\t上海店\nSKU002\tB\t10\t北京店`,
  },
  {
    name: "04 - Excel: 卡片式(card-style non-tabular)",
    fileName: "card.xlsx", fileType: "excel",
    content: `订单号：ORD001\n商品：SKU001 商品A x10\n收货：上海店\n\n订单号：ORD002\n商品：SKU002 商品B x20\n收货：北京店`,
  },
  {
    name: "05 - Excel: B组收件人(B group receiver)",
    fileName: "receiver.xlsx", fileType: "excel",
    content: `SKU编码\tSKU名称\t数量\t收件人\t电话\t地址\t订单号\nSKU001\t商品A\t10\t张三\t13800138000\t北京路1号\tORD001\nSKU002\t商品B\t20\t李四\t13900139000\t上海路2号\tORD002`,
  },
  {
    name: "06 - Excel: 矩阵转置(matrix transpose)",
    fileName: "matrix.xlsx", fileType: "excel",
    content: `门店\\SKU\tSKU001\tSKU002\tSKU003\n上海店\t10\t20\t30\n北京店\t15\t25\t35`,
  },
  {
    name: "07 - Word: 段落式(paragraph style)",
    fileName: "order.docx", fileType: "word",
    content: `订单列表\n\n订单1：\n商品编码：SKU001\n商品名称：商品A\n数量：10\n收货门店：上海店\n\n订单2：\n商品编码：SKU002\n商品名称：商品B\n数量：20\n收货门店：北京店`,
  },
  {
    name: "08 - PDF: 多页多订单(multi-page)",
    fileName: "orders.pdf", fileType: "pdf",
    content: `Order: ORD-001\nSKU: SKU001, Name: Product A, Qty: 10\nReceiver: John, Phone: 13800138000, Address: Beijing\n\nOrder: ORD-002\nSKU: SKU002, Name: Product B, Qty: 20\nReceiver: Jane, Phone: 13900139000, Address: Shanghai`,
  },
  {
    name: "09 - Excel: 复合单元格(cell-split compound)",
    fileName: "compound.xlsx", fileType: "excel",
    content: `订单号\t商品信息\t数量\t门店\nORD001\tSKU001 商品A\t10\t上海店\nORD001\tSKU002 商品B\t20\t上海店`,
  },
];

// Collect all field names referenced by extractors (multi-group)
function collectExtractorTargets(extractors) {
  const targets = [];
  if (!extractors) return targets;
  for (const ex of extractors) {
    if (Array.isArray(ex.target)) targets.push(...ex.target);
    else if (typeof ex.target === "string") targets.push(ex.target);
  }
  return targets;
}

function validateConfig(config, testName) {
  const errors = [];

  if (!config.fileType) errors.push("missing fileType");
  else if (!["excel", "word", "pdf"].includes(config.fileType)) errors.push("invalid fileType: " + config.fileType);

  // Gather all field targets from columnMappings + extractors
  const cmTargets = (config.columnMappings || []).map(m => m.target);
  const exTargets = collectExtractorTargets(config.extractors);
  const allTargets = [...new Set([...cmTargets, ...exTargets])];

  const isTabular = config.headerRow !== null && config.dataStartRow !== null;
  const isNonTabular = config.headerRow === null && config.dataStartRow === null;

  // For non-Excel types, expect null headerRow/dataStartRow and extractors
  if (config.fileType === "word" || config.fileType === "pdf") {
    if (config.headerRow !== null) errors.push("word/pdf should have headerRow=null");
    if (config.dataStartRow !== null) errors.push("word/pdf should have dataStartRow=null");
    if (!config.extractors || config.extractors.length === 0) errors.push("word/pdf should use extractors, not columnMappings");
  }

  // Transpose: processor handles skuCode+quantity expansion at runtime
  const hasTranspose = config.postProcessors?.some(p => p.type === "transpose");
  if (hasTranspose) {
    if (cmTargets.length !== 1 || cmTargets[0] !== "storeName") {
      errors.push("transpose should only map storeName in columnMappings");
    }
    // skuCode and quantity will be generated by transpose processor; skip field checks
  } else {
    // Required fields: skuCode, skuName, quantity (not needed for transpose)
    if (!allTargets.includes("skuCode")) errors.push("missing skuCode mapping");
    if (!allTargets.includes("skuName")) errors.push("missing skuName mapping");
    if (!allTargets.includes("quantity")) errors.push("missing quantity mapping");
  }

  // A/B group check
  const hasStore = allTargets.includes("storeName");
  const hasReceiver = ["receiverName","receiverPhone","receiverAddress"].some(t => allTargets.includes(t));
  if (!hasStore && !hasReceiver) {
    errors.push("missing both Group A (storeName) and Group B (receiverName/Phone/Address)");
  }

  // Card-style should have cardSplit
  const hasCardSplit = config.postProcessors?.some(p => p.type === "cardSplit");
  if (isNonTabular && config.fileType === "excel" && !hasCardSplit) {
    errors.push("non-tabular excel should use cardSplit postProcessor");
  }

  // cellSplit should have matching extractors
  const hasCellSplit = config.postProcessors?.some(p => p.type === "cellSplit");
  if (hasCellSplit && (!config.extractors || config.extractors.length === 0)) {
    errors.push("cellSplit should be paired with extractors");
  }

  if (errors.length) {
    console.log(`  ❌  ${errors.join("; ")}`);
    return false;
  }
  console.log(`  ✅  Valid`);
  return true;
}

async function callAI(systemPrompt, userContent) {
  const { baseUrl, apiKey, model, maxTokens, temperature } = AI_CONFIG;
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`AI API error: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 500)}` : ""}`);
    }

    const json = await response.json();
    const text = json.choices?.[0]?.message?.content;
    if (!text) throw new Error("AI response missing content");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function run() {
  console.log("=".repeat(70));
  console.log("  万能导入 V2 — LLM 调用 + Prompt 设计测试 (改进版)");
  console.log("=".repeat(70));
  console.log("");
  console.log("AI Config:");
  console.log(`  Base URL   : ${AI_CONFIG.baseUrl}`);
  console.log(`  Model      : ${AI_CONFIG.model}`);
  console.log(`  API Key    : ${AI_CONFIG.apiKey ? AI_CONFIG.apiKey.slice(0, 8) + "..." : "NOT SET"}`);
  console.log(`  Max Tokens : ${AI_CONFIG.maxTokens}`);
  console.log(`  Temperature: ${AI_CONFIG.temperature}`);
  console.log("");

  if (!AI_CONFIG.apiKey || AI_CONFIG.apiKey === "your_qwen_api_key_here") {
    console.error("❌ AI_API_KEY 未设置。请先在 .env 中配置 API Key。");
    process.exit(1);
  }

  let passed = 0, failed = 0;
  const results = [];

  for (const tc of testCases) {
    console.log("-".repeat(70));
    console.log(`  ${tc.name}`);
    console.log(`  File: ${tc.fileName} (${tc.fileType})`);
    console.log("-".repeat(70));

    const userPrompt = buildUserPrompt(tc.fileName, tc.fileType, tc.content);

    console.log("  Content:");
    tc.content.split("\n").forEach(line => console.log(`    │ ${line}`));
    console.log(`  Prompt: system=${SYSTEM_PROMPT.length}B, user=${userPrompt.length}B`);

    console.log("  Calling AI...");
    try {
      const start = Date.now();
      const raw = await callAI(SYSTEM_PROMPT, userPrompt);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log(`  ❌  No JSON found in response (${elapsed}s)`);
        console.log(`  Raw: ${raw.slice(0, 300)}`);
        failed++;
        results.push({ ...tc, status: "fail", error: "No JSON", elapsed });
        continue;
      }

      const config = JSON.parse(jsonMatch[0]);
      console.log(`  Response (${elapsed}s):`);
      console.log(`  fileType: ${config.fileType}`);
      console.log(`  headerRow: ${config.headerRow}, dataStartRow: ${config.dataStartRow}`);
      console.log(`  skipRows: ${JSON.stringify(config.skipRows)}`);
      console.log(`  columnMappings: ${JSON.stringify(config.columnMappings)}`);
      if (config.extractors?.length) console.log(`  extractors: ${JSON.stringify(config.extractors, null, 4)}`);
      if (config.postProcessors?.length) console.log(`  postProcessors: ${JSON.stringify(config.postProcessors)}`);
      if (config.groupBy !== undefined) console.log(`  groupBy: ${config.groupBy}`);

      const ok = validateConfig(config, tc.name);
      if (ok) passed++; else failed++;
      results.push({ ...tc, status: ok ? "pass" : "fail", config, elapsed });
    } catch (err) {
      console.log(`  ❌  Error: ${err.message.slice(0, 300)}`);
      failed++;
      results.push({ ...tc, status: "error", error: err.message });
    }
    console.log("");
  }

  console.log("=".repeat(70));
  console.log("  测试结果汇总");
  console.log("=".repeat(70));
  console.log(`  通过: ${passed}  |  失败: ${failed}  |  总计: ${testCases.length}`);
  console.log("");
  for (const r of results) {
    const icon = r.status === "pass" ? "✅" : r.status === "fail" ? "⚠️" : "❌";
    console.log(`  ${icon}  ${r.name} (${r.elapsed || "-"}s)`);
    if (r.status !== "pass") console.log(`      ${r.error || "config validation failed"}`);
  }
  console.log("");
  console.log("=".repeat(70));

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
