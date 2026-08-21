import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.dmTemplate.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const input = await req.json().catch(() => null);
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  if (!name || !body) {
    return NextResponse.json({ error: "템플릿 이름과 내용을 입력해주세요." }, { status: 400 });
  }
  const existing = await prisma.dmTemplate.findFirst({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: `"${name}" 이름의 템플릿이 이미 있습니다.` }, { status: 400 });
  }
  const template = await prisma.dmTemplate.create({ data: { name, body } });
  return NextResponse.json(template, { status: 201 });
}
