import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 발송 완료/미발송 처리 (DM 발송 큐에서 사용) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id: campaignId, assignmentId } = await params;
  const existing = await prisma.campaignAssignment.findUnique({ where: { id: assignmentId } });
  if (!existing || existing.campaignId !== campaignId) {
    return NextResponse.json({ error: "배정 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const input = await req.json().catch(() => null);
  const status = input?.status === "SENT" ? "SENT" : input?.status === "PENDING" ? "PENDING" : null;
  if (!status) {
    return NextResponse.json({ error: "상태 값이 올바르지 않습니다." }, { status: 400 });
  }

  const updated = await prisma.campaignAssignment.update({
    where: { id: assignmentId },
    data: {
      status,
      sentAt: status === "SENT" ? new Date() : null,
    },
    include: { creator: true },
  });

  return NextResponse.json(updated);
}

/** 캠페인 배정에서 제외 (매칭 취소) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id: campaignId, assignmentId } = await params;
  const existing = await prisma.campaignAssignment.findUnique({ where: { id: assignmentId } });
  if (!existing || existing.campaignId !== campaignId) {
    return NextResponse.json({ ok: true });
  }
  await prisma.campaignAssignment.delete({ where: { id: assignmentId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
