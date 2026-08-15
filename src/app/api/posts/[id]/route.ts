import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: { targets: { include: { threadsAccount: true } } },
  });
  if (!post) {
    return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(post);
}

const EDITABLE_STATUSES = new Set(["DRAFT", "SCHEDULED", "FAILED"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
  }
  if (!EDITABLE_STATUSES.has(existing.status)) {
    return NextResponse.json(
      { error: "발행 중이거나 이미 발행된 글은 수정할 수 없습니다." },
      { status: 400 }
    );
  }

  const { body, commentBody, scheduledAt, accountBodies } = await req.json();

  if (typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "본문을 입력해주세요." }, { status: 400 });
  }

  await prisma.post.update({
    where: { id },
    data: {
      body,
      commentBody: commentBody || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : existing.scheduledAt,
    },
  });

  if (accountBodies && typeof accountBodies === "object") {
    for (const [threadsAccountId, value] of Object.entries(accountBodies)) {
      const trimmed = typeof value === "string" ? value.trim() : "";
      await prisma.postTarget.updateMany({
        where: { postId: id, threadsAccountId },
        data: { body: trimmed && trimmed !== body.trim() ? trimmed : null },
      });
    }
  }

  const updated = await prisma.post.findUnique({
    where: { id },
    include: { targets: { include: { threadsAccount: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
  }
  if (!EDITABLE_STATUSES.has(existing.status)) {
    return NextResponse.json(
      { error: "발행 중이거나 이미 발행된 글은 삭제할 수 없습니다." },
      { status: 400 }
    );
  }

  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
