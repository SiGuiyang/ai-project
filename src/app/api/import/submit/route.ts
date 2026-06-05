import { NextRequest, NextResponse } from "next/server";
import { createBatch, saveOrders, prisma, type SaveOrdersInput } from "@/lib/db";
import { validateOrderRow } from "@/lib/validator";
import type { ImportOrderRow } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orders, batchId: existingBatchId }: { orders: ImportOrderRow[]; batchId?: string } = body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: "没有可提交的数据" }, { status: 400 });
    }

    for (let i = 0; i < orders.length; i++) {
      const errors = validateOrderRow(orders[i], i);
      if (errors.length > 0) {
        return NextResponse.json({ error: `第 ${i + 1} 行存在校验错误`, details: errors }, { status: 400 });
      }
    }

    const batchId = existingBatchId || (await createBatch());

    const inputs: SaveOrdersInput[] = orders.map((order) => ({
      externalCode: order.externalCode || undefined,
      storeName: order.storeName || undefined,
      receiverName: order.receiverName || undefined,
      receiverPhone: order.receiverPhone || undefined,
      receiverAddress: order.receiverAddress || undefined,
      remark: order.remark || undefined,
      items: order.items.map((item) => ({
        skuCode: item.skuCode,
        skuName: item.skuName,
        quantity: item.quantity,
        spec: item.spec || undefined,
      })),
    }));

    const result = await saveOrders(batchId, inputs, existingBatchId ? "append" : "new");

    return NextResponse.json(result);
  } catch (e) {
    console.error("Import submit error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "提交失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchId, status }: { batchId: string; status: string } = body;

    if (!batchId) {
      return NextResponse.json({ error: "batchId 是必需的" }, { status: 400 });
    }

    await prisma.importBatch.update({
      where: { id: batchId },
      data: { status },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "更新失败" }, { status: 500 });
  }
}
