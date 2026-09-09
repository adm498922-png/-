import { NextRequest, NextResponse } from "next/server";
import { runDealsImport } from "@/lib/deals-import";

/**
 * 판매일보 붙여넣기 → 공구 기록 만들기.
 * 실제 처리는 deals-import.ts가 한다 (구글 시트 자동 동기화와 공용).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text : "";
  const mode = body.mode === "commit" ? "commit" : "preview";

  const result = await runDealsImport(text, mode);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
