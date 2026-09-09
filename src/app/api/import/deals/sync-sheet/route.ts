import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateSettings } from "@/lib/settings";
import { sheetCsvUrl, syncSalesSheetOnce } from "@/lib/sales-sheet-sync";

/** 구글 시트 자동 동기화 상태 (연결된 주소, 마지막 결과) */
export async function GET() {
  const row = await prisma.settings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    url: row?.salesSheetUrl ?? null,
    syncedAt: row?.salesSheetSyncedAt?.toISOString() ?? null,
    note: row?.salesSheetSyncNote ?? null,
  });
}

/**
 * 시트 주소 저장(선택) + 지금 바로 한 번 동기화.
 * body: { url?: string } — url을 보내면 그 주소를 저장하고 동기화, 없으면 저장된 주소로 동기화.
 * url을 빈 문자열로 보내면 연결을 해제한다.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (typeof body.url === "string") {
    const url = body.url.trim();
    if (url && !sheetCsvUrl(url)) {
      return NextResponse.json(
        {
          error:
            "구글 시트 주소가 아니에요. 주소창의 docs.google.com/spreadsheets/… 링크를 그대로 붙여넣어주세요.",
        },
        { status: 400 }
      );
    }
    await updateSettings({ salesSheetUrl: url });
    if (!url) {
      await prisma.settings.update({
        where: { id: "singleton" },
        data: { salesSheetSyncedAt: null, salesSheetSyncNote: null },
      });
      return NextResponse.json({ ok: true, disconnected: true });
    }
  }

  const outcome = await syncSalesSheetOnce();
  const row = await prisma.settings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    ok: outcome.ok,
    note: outcome.note,
    url: row?.salesSheetUrl ?? null,
    syncedAt: row?.salesSheetSyncedAt?.toISOString() ?? null,
  });
}
