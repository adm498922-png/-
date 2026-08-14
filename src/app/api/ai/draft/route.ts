import { NextRequest, NextResponse } from "next/server";
import { getDecryptedSettings } from "@/lib/settings";
import { generateThreadsPost } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const { productName, productPrice } = await req.json();
  if (typeof productName !== "string" || !productName.trim()) {
    return NextResponse.json({ error: "상품명이 필요합니다." }, { status: 400 });
  }

  const settings = await getDecryptedSettings();
  if (!settings.openaiApiKey) {
    return NextResponse.json(
      { error: "설정 화면에서 OpenAI API 키를 먼저 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    const body = await generateThreadsPost({
      apiKey: settings.openaiApiKey,
      productName: productName.trim(),
      productPrice: typeof productPrice === "number" ? productPrice : undefined,
    });
    return NextResponse.json({ body });
  } catch (e) {
    console.error("AI draft generation failed", e);
    return NextResponse.json(
      { error: "AI 글 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
