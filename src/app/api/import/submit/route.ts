import { NextRequest, NextResponse } from "next/server";
import { createBatch, saveWaybills, getAllExternalCodes, updateBatchStatus, type WaybillInput } from "@/lib/db";
import { validateRow, findDuplicates } from "@/lib/validator";
import type { WaybillRow } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows, batchId: existingBatchId }: { rows: WaybillRow[]; batchId?: string } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "没有可提交的数据" }, { status: 400 });
    }

    const existingCodes = await getAllExternalCodes();

    for (let i = 0; i < rows.length; i++) {
      const errors = validateRow(rows[i], i);
      if (errors.length > 0) {
        return NextResponse.json({ error: `第 ${i + 1} 行存在校验错误`, details: errors }, { status: 400 });
      }
    }

    const duplicates = findDuplicates(rows, existingCodes);
    if (duplicates.length > 0) {
      return NextResponse.json({ error: "存在重复的客户单号", details: duplicates }, { status: 409 });
    }

    const batchId = existingBatchId || (await createBatch());

    const inputs: WaybillInput[] = rows.map((row) => ({
      batchId,
      externalCode: row.externalCode || undefined,
      senderName: row.senderName,
      senderPhone: row.senderPhone,
      senderAddress: row.senderAddress,
      receiverName: row.receiverName,
      receiverPhone: row.receiverPhone,
      receiverAddress: row.receiverAddress,
      weight: Number(row.weight),
      pieces: Number(row.pieces),
      temperatureLevel: row.temperatureLevel,
      remark: row.remark || undefined,
    }));

    const result = await saveWaybills(inputs, existingBatchId ? "append" : "new");
    result.batchId = batchId;

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

    await updateBatchStatus(batchId, status);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "更新失败" }, { status: 500 });
  }
}
