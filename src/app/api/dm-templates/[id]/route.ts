import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.dmTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "템플릿을 찾을 수 없습니다." }, { status: 404 });
  }
  const input = await req.json().catch(() => null);
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  if (!body) {
    return NextResponse.json({ error: "템플릿 내용이 비어있습니다." }, { status: 400 });
  }
  const template = await prisma.dmTemplate.update({ where: { id }, data: { body } });
  return NextResponse.json(template);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.dmTemplate.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
