import { NextRequest, NextResponse } from "next/server";
import {
  getTemplateMapping,
  upsertTemplateMapping,
} from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateHash = searchParams.get("templateHash");

    if (!templateHash) {
      return NextResponse.json(
        { error: "templateHash is required" },
        { status: 400 }
      );
    }

    const mapping = await getTemplateMapping(templateHash);
    return NextResponse.json({ mapping });
  } catch (e) {
    console.error("Template map GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "查询失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateHash, columnMappings } = body;

    if (!templateHash || !columnMappings) {
      return NextResponse.json(
        { error: "templateHash and columnMappings are required" },
        { status: 400 }
      );
    }

    await upsertTemplateMapping(templateHash, columnMappings);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Template map POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "保存失败" },
      { status: 500 }
    );
  }
}
