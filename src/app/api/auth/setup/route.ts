import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, COOKIE_NAME, SESSION_DURATION_SECONDS } from "@/lib/session";

export async function POST(req: NextRequest) {
  const existing = await prisma.adminUser.count();
  if (existing > 0) {
    return NextResponse.json(
      { error: "이미 관리자 계정이 존재합니다. 로그인해주세요." },
      { status: 400 }
    );
  }

  const { email, password } = await req.json();
  if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "이메일과 8자 이상의 비밀번호를 입력해주세요." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.adminUser.create({
    data: { email, passwordHash },
  });

  const token = await createSessionToken(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
  return res;
}
