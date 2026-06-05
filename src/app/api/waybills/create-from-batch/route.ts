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
