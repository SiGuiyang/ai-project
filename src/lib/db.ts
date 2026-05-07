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
  batchId?: string;
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
  const { page, pageSize, externalCode, receiverName, batchId } = query;
  const where: Record<string, unknown> = {};

  if (externalCode) {
    where.externalCode = { contains: externalCode };
  }
  if (receiverName) {
    where.receiverName = { contains: receiverName };
  }
  if (batchId) {
    where.batchId = batchId;
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
