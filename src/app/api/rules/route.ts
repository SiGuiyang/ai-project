import { NextRequest, NextResponse } from "next/server";
import { getAllRules, getRule, createRule, updateRule, deleteRule } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) {
      const rule = await getRule(id);
      return NextResponse.json(rule);
    }
    const rules = await getAllRules();
    return NextResponse.json(rules);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rule = await createRule({ name: body.name, fileType: body.fileType, config: JSON.stringify(body.config) });
    return NextResponse.json(rule);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const rule = await updateRule(body.id, { name: body.name, fileType: body.fileType, config: JSON.stringify(body.config) });
    return NextResponse.json(rule);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteRule(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
