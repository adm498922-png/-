import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDecryptedSettings } from "@/lib/settings";
import { requestProductVideo } from "@/lib/video-gen";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const link = await prisma.coupangLink.findUnique({ where: { id } });
  if (!link) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(link);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const settings = await getDecryptedSettings();
  if (!settings.openaiApiKey) {
    return NextResponse.json(
      { error: "설정 화면에서 OpenAI API 키를 먼저 입력해주세요." },
      { status: 400 }
    );
  }

  const link = await prisma.coupangLink.findUnique({ where: { id } });
  if (!link) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });
  }
  if (!link.imageUrl) {
    return NextResponse.json(
      { error: "상품 이미지가 있는 링크만 영상을 만들 수 있습니다." },
      { status: 400 }
    );
  }
  if (link.videoStatus === "GENERATING") {
    return NextResponse.json({ error: "이미 영상을 생성 중입니다." }, { status: 400 });
  }

  try {
    await requestProductVideo({
      apiKey: settings.openaiApiKey,
      linkId: link.id,
      productName: link.productName ?? "이 상품",
      imageUrl: link.imageUrl,
    });
  } catch (e) {
    console.error("영상 생성 요청 실패", e);
    return NextResponse.json(
      { error: "영상 생성 요청 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  const updated = await prisma.coupangLink.findUnique({ where: { id } });
  return NextResponse.json(updated);
}
