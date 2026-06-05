import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export interface WaybillInput {
  batchId: string;
  externalCode?: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  weight: number;
  pieces: number;
  temperatureLevel: string;
  remark?: string;
}

export interface BatchResult {
  batchId: string;
  successCount: number;
  failCount: number;
  failedRows: { rowIndex: number; error: string }[];
}

export async function createBatch(): Promise<string> {
  const batch = await prisma.importBatch.create({
    data: { status: "pending" },
  });
  return batch.id;
}

export async function saveWaybills(
  inputs: WaybillInput[],
  mode: "new" | "append" = "new"
): Promise<BatchResult> {
  if (inputs.length === 0) {
    return { batchId: "", successCount: 0, failCount: 0, failedRows: [] };
  }

  const batchId = inputs[0].batchId;

  if (mode === "new") {
    await prisma.importBatch.update({
      where: { id: batchId },
      data: { status: "processing", totalCount: inputs.length },
    });
  }

  let successCount = 0;
  let failCount = 0;
  const failedRows: { rowIndex: number; error: string }[] = [];

  for (let i = 0; i < inputs.length; i++) {
    try {
      const input = inputs[i];
      await prisma.waybill.create({ data: { ...input, externalCode: input.externalCode || null, remark: input.remark || null } });
      successCount++;
    } catch (e) {
      failCount++;
      failedRows.push({ rowIndex: i, error: e instanceof Error ? e.message : "保存失败" });
    }
  }

  if (mode === "new") {
    await prisma.importBatch.update({
      where: { id: batchId },
      data: { status: "completed", successCount, failCount },
    });
  } else {
    await prisma.importBatch.update({
      where: { id: batchId },
      data: { totalCount: { increment: inputs.length }, successCount: { increment: successCount }, failCount: { increment: failCount } },
    });
  }

  return { batchId, successCount, failCount, failedRows };
}

export async function updateBatchStatus(batchId: string, status: string): Promise<void> {
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status },
  });
}

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

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function queryWaybills(
  query: WaybillQuery
): Promise<PaginatedResult<import("@prisma/client").Waybill>> {
  const { page, pageSize, externalCode, receiverName, senderName, batchId, startDate, endDate } = query;
  const where: Record<string, unknown> = {};

  if (externalCode) {
    where.externalCode = { contains: externalCode };
  }
  if (receiverName) {
    where.receiverName = { contains: receiverName };
  }
  if (senderName) {
    where.senderName = { contains: senderName };
  }
  if (batchId) {
    where.batchId = batchId;
  }
  if (startDate || endDate) {
    const createdAt: Record<string, Date> = {};
    if (startDate) createdAt.gte = new Date(startDate);
    if (endDate) createdAt.lte = new Date(endDate + "T23:59:59.999Z");
    where.createdAt = createdAt;
  }

  const [data, total] = await Promise.all([
    prisma.waybill.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.waybill.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getAllExternalCodes(): Promise<Set<string>> {
  const codes = await prisma.waybill.findMany({
    select: { externalCode: true },
    where: { externalCode: { not: null } },
  });
  return new Set(codes.map((c) => c.externalCode).filter(Boolean) as string[]);
}

export async function getTemplateMapping(
  templateHash: string
): Promise<Record<string, string> | null> {
  const mapping = await prisma.templateMapping.findUnique({
    where: { templateHash },
  });
  if (!mapping) return null;
  try {
    return JSON.parse(mapping.columnMappings) as Record<string, string>;
  } catch {
    return null;
  }
}

export async function upsertTemplateMapping(
  templateHash: string,
  columnMappings: Record<string, string>
): Promise<void> {
  await prisma.templateMapping.upsert({
    where: { templateHash },
    update: { columnMappings: JSON.stringify(columnMappings) },
    create: { templateHash, columnMappings: JSON.stringify(columnMappings) },
  });
}

// ---- ParseRule CRUD ----

export async function getAllRules(): Promise<import("@prisma/client").ParseRule[]> {
  return prisma.parseRule.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getRule(id: string): Promise<import("@prisma/client").ParseRule | null> {
  return prisma.parseRule.findUnique({ where: { id } });
}

export async function createRule(data: {
  name: string;
  fileType: string;
  config: string;
}): Promise<import("@prisma/client").ParseRule> {
  return prisma.parseRule.create({ data });
}

export async function updateRule(
  id: string,
  data: { name?: string; fileType?: string; config?: string }
): Promise<import("@prisma/client").ParseRule> {
  return prisma.parseRule.update({ where: { id }, data });
}

export async function deleteRule(id: string): Promise<void> {
  await prisma.parseRule.delete({ where: { id } });
}

// ---- ImportOrder + OrderItem CRUD ----

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

export async function saveOrders(
  batchId: string,
  inputs: SaveOrdersInput[],
  mode: "new" | "append" = "new"
): Promise<BatchResult> {
  if (inputs.length === 0) {
    return { batchId: "", successCount: 0, failCount: 0, failedRows: [] };
  }

  if (mode === "new") {
    await prisma.importBatch.update({
      where: { id: batchId },
      data: { status: "processing", totalCount: inputs.length },
    });
  }

  let successCount = 0;
  let failCount = 0;
  const failedRows: { rowIndex: number; error: string }[] = [];

  for (let i = 0; i < inputs.length; i++) {
    try {
      const input = inputs[i];
      await prisma.importOrder.create({
        data: {
          batchId,
          externalCode: input.externalCode || null,
          storeName: input.storeName || null,
          receiverName: input.receiverName || null,
          receiverPhone: input.receiverPhone || null,
          receiverAddress: input.receiverAddress || null,
          remark: input.remark || null,
          senderName: input.senderName || null,
          senderPhone: input.senderPhone || null,
          senderAddress: input.senderAddress || null,
          weight: input.weight || null,
          pieces: input.pieces || null,
          temperatureLevel: input.temperatureLevel || null,
          items: {
            create: input.items.map((item) => ({
              skuCode: item.skuCode,
              skuName: item.skuName,
              quantity: item.quantity,
              spec: item.spec || null,
            })),
          },
        },
      });
      successCount++;
    } catch (e) {
      failCount++;
      failedRows.push({ rowIndex: i, error: e instanceof Error ? e.message : "保存失败" });
    }
  }

  if (mode === "new") {
    await prisma.importBatch.update({
      where: { id: batchId },
      data: { status: "completed", successCount, failCount },
    });
  } else {
    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        totalCount: { increment: inputs.length },
        successCount: { increment: successCount },
        failCount: { increment: failCount },
      },
    });
  }

  return { batchId, successCount, failCount, failedRows };
}

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

    const candidates = await tx.importOrder.findMany({
      where,
      include: { items: true },
    });

    if (candidates.length === 0) {
      return { successCount: 0, failCount: 0, failedRows: [], skipped: true };
    }

    const candidateIds = candidates.map((o) => o.id);
    const { count: lockedCount } = await tx.importOrder.updateMany({
      where: { id: { in: candidateIds }, convertedAt: null },
      data: { convertedAt: new Date() },
    });

    if (lockedCount === 0) {
      return { successCount: 0, failCount: 0, failedRows: [], skipped: true };
    }

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

export interface OrderQuery {
  page: number;
  pageSize: number;
  externalCode?: string;
  receiverName?: string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
}

export async function queryOrders(
  query: OrderQuery
): Promise<PaginatedResult<import("@prisma/client").ImportOrder>> {
  const { page, pageSize, externalCode, receiverName, batchId, startDate, endDate } = query;
  const where: Record<string, unknown> = {};

  if (externalCode) where.externalCode = { contains: externalCode };
  if (receiverName) where.receiverName = { contains: receiverName };
  if (batchId) where.batchId = batchId;
  if (startDate || endDate) {
    const createdAt: Record<string, Date> = {};
    if (startDate) createdAt.gte = new Date(startDate);
    if (endDate) createdAt.lte = new Date(endDate + "T23:59:59.999Z");
    where.createdAt = createdAt;
  }

  const [data, total] = await Promise.all([
    prisma.importOrder.findMany({
      where,
      include: { items: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.importOrder.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
