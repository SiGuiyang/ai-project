import { NextRequest, NextResponse } from "next/server";
import { queryWaybills } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const externalCode = searchParams.get("externalCode") || undefined;
    const receiverName = searchParams.get("receiverName") || undefined;
    const batchId = searchParams.get("batchId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const result = await queryWaybills({
      page,
      pageSize,
      externalCode,
      receiverName,
      batchId,
      startDate,
      endDate,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("Waybill query error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "查询失败" },
      { status: 500 }
    );
  }
}
