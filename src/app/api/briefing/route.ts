import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { sendDailyBriefing } from "@/lib/daily-briefing";

/** 아침 브리핑 설정 상태 */
export async function GET() {
  const row = await prisma.settings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    enabled: row?.briefingEnabled ?? false,
    gmailUser: row?.briefingGmailUser ?? null,
    passSaved: Boolean(row?.briefingGmailPassEnc),
    to: row?.briefingTo ?? null,
    naverUser: row?.naverMailUser ?? null,
    naverSaved: Boolean(row?.naverMailPassEnc),
  });
}

/**
 * 설정 저장 + (test: true면) 지금 바로 한 통 보내기.
 * body: { gmailUser?, gmailAppPassword?, to?, enabled?, test? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const data: Record<string, string | boolean | null> = {};
  if (typeof body.gmailUser === "string") data.briefingGmailUser = body.gmailUser.trim() || null;
  if (typeof body.gmailAppPassword === "string" && body.gmailAppPassword.trim()) {
    // 앱 비밀번호는 구글이 4자씩 띄워 보여주는데, 공백은 빼고 저장해야 한다
    data.briefingGmailPassEnc = encrypt(body.gmailAppPassword.replace(/\s+/g, ""));
  }
  if (typeof body.to === "string") data.briefingTo = body.to.trim() || null;
  if (typeof body.enabled === "boolean") data.briefingEnabled = body.enabled;

  if (Object.keys(data).length > 0) {
    await prisma.settings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });
  }

  let test: { ok: boolean; message: string } | null = null;
  if (body.test === true) {
    test = await sendDailyBriefing();
  }

  const row = await prisma.settings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    ok: true,
    enabled: row?.briefingEnabled ?? false,
    gmailUser: row?.briefingGmailUser ?? null,
    passSaved: Boolean(row?.briefingGmailPassEnc),
    to: row?.briefingTo ?? null,
    test,
  });
}
