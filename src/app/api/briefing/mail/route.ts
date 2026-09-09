import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { fetchRecentMail } from "@/lib/mail-inbox";

/** 오늘 온 메일 읽어오기 (지메일 + 네이버) */
export async function GET() {
  const row = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const accounts = await fetchRecentMail();
  return NextResponse.json({
    accounts,
    gmailConfigured: Boolean(row?.briefingGmailUser && row?.briefingGmailPassEnc),
    naverConfigured: Boolean(row?.naverMailUser && row?.naverMailPassEnc),
  });
}

/** 네이버 메일 계정 저장/해제. body: { naverUser?, naverPassword? } — 둘 다 빈 값이면 해제 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const data: Record<string, string | null> = {};
  if (typeof body.naverUser === "string") {
    data.naverMailUser = body.naverUser.trim() || null;
    if (!body.naverUser.trim()) data.naverMailPassEnc = null;
  }
  if (typeof body.naverPassword === "string" && body.naverPassword.trim()) {
    data.naverMailPassEnc = encrypt(body.naverPassword.trim());
  }
  if (Object.keys(data).length > 0) {
    await prisma.settings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });
  }
  return NextResponse.json({ ok: true });
}
