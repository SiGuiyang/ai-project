import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai/client";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType, content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "No file content provided" }, { status: 400 });
    }

    const userPrompt = buildUserPrompt(fileName, fileType, content);
    const result = await callAI(SYSTEM_PROMPT, userPrompt);

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI response is not valid JSON", raw: result }, { status: 500 });
    }

    const config = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ config });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
