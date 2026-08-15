import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const link = await prisma.coupangLink.findUnique({ where: { id } });
  if (!link) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });
  }

  // 이미 이 링크로 만들어진 글이 있어도 삭제는 되게 하되, 그 글들의 링크
  // 연결만 끊어서(과거 글 자체는 그대로 남김) 외래키 오류 없이 지울 수 있게 함.
  await prisma.post.updateMany({
    where: { coupangLinkId: id },
    data: { coupangLinkId: null },
  });
  await prisma.coupangLink.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
