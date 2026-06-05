import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType, content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "No file content provided" }, { status: 400 });
    }

    return NextResponse.json({
      content: content.slice(0, 20000),
      totalRows: content.split("\n").length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Extraction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
