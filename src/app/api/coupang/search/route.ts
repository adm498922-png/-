import { NextRequest, NextResponse } from "next/server";
import { getDecryptedSettings } from "@/lib/settings";
import { searchProducts, CoupangApiError } from "@/lib/coupang-api";

export async function POST(req: NextRequest) {
  const { keyword } = await req.json();
  if (typeof keyword !== "string" || !keyword.trim()) {
    return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });
  }

  const settings = await getDecryptedSettings();
  if (!settings.coupangAccessKey || !settings.coupangSecretKey) {
    return NextResponse.json(
      { error: "설정 화면에서 쿠팡파트너스 API 키를 먼저 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    const results = await searchProducts({
      accessKey: settings.coupangAccessKey,
      secretKey: settings.coupangSecretKey,
      keyword: keyword.trim(),
    });
    return NextResponse.json({ products: results });
  } catch (e) {
    if (e instanceof CoupangApiError) {
      console.error("Coupang search API error", e.status, e.body);
      return NextResponse.json(
        { error: `쿠팡파트너스 API 오류: ${e.message}` },
        { status: 502 }
      );
    }
    console.error("Coupang product search failed", e);
    return NextResponse.json(
      { error: "상품 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
