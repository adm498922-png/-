import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDecryptedSettings } from "@/lib/settings";
import { createDeeplinks, CoupangApiError } from "@/lib/coupang-api";

export async function GET() {
  const links = await prisma.coupangLink.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(links);
}

export async function POST(req: NextRequest) {
  const { url, productName } = await req.json();
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "쿠팡 상품 URL을 입력해주세요." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return NextResponse.json({ error: "올바른 URL이 아닙니다." }, { status: 400 });
  }
  if (!parsed.hostname.endsWith("coupang.com")) {
    return NextResponse.json(
      { error: "쿠팡(coupang.com) 상품 URL만 입력할 수 있습니다." },
      { status: 400 }
    );
  }

  const settings = await getDecryptedSettings();
  if (!settings.coupangAccessKey || !settings.coupangSecretKey) {
    return NextResponse.json(
      { error: "설정 화면에서 쿠팡파트너스 API 키를 먼저 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    const results = await createDeeplinks({
      accessKey: settings.coupangAccessKey,
      secretKey: settings.coupangSecretKey,
      coupangUrls: [parsed.toString()],
    });
    const result = results[0];
    if (!result) {
      return NextResponse.json(
        { error: "쿠팡파트너스 API가 링크를 반환하지 않았습니다." },
        { status: 502 }
      );
    }

    const saved = await prisma.coupangLink.create({
      data: {
        productName: productName || null,
        originalUrl: result.originalUrl,
        shortUrl: result.shortenUrl,
      },
    });
    return NextResponse.json(saved);
  } catch (e) {
    if (e instanceof CoupangApiError) {
      console.error("Coupang API error", e.status, e.body);
      return NextResponse.json(
        { error: `쿠팡파트너스 API 오류: ${e.message}` },
        { status: 502 }
      );
    }
    console.error("Coupang deeplink generation failed", e);
    return NextResponse.json(
      { error: "링크 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
