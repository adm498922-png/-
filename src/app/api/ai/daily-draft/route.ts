import { NextRequest, NextResponse } from "next/server";
import { getDecryptedSettings } from "@/lib/settings";
import { generateDailyPostDrafts } from "@/lib/ai";

function optionalString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export async function POST(req: NextRequest) {
  const { topic, category, tone } = await req.json();

  const settings = await getDecryptedSettings();
  if (!settings.openaiApiKey) {
    return NextResponse.json(
      { error: "설정 화면에서 OpenAI API 키를 먼저 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    const drafts = await generateDailyPostDrafts({
      apiKey: settings.openaiApiKey,
      topic: optionalString(topic),
      category: optionalString(category),
      tone: optionalString(tone),
    });
    return NextResponse.json({ drafts });
  } catch (e) {
    console.error("일상글 AI 생성 실패", e);
    return NextResponse.json(
      { error: "AI 글 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
