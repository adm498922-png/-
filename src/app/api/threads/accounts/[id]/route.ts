import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { label } = await req.json();
  if (typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ error: "라벨을 입력해주세요." }, { status: 400 });
  }
  const account = await prisma.threadsAccount.update({
    where: { id },
    data: { label: label.trim() },
  });
  return NextResponse.json(account);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.threadsAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
