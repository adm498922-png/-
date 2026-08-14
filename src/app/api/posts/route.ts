import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishPost } from "@/lib/publish";

export async function GET() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      targets: { include: { threadsAccount: true } },
      coupangLink: true,
    },
  });
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const { body, commentBody, coupangLinkId, accountIds, accountBodies, scheduledAt } =
    await req.json();

  if (typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "본문을 입력해주세요." }, { status: 400 });
  }
  if (!Array.isArray(accountIds) || accountIds.length === 0) {
    return NextResponse.json(
      { error: "발행할 계정을 1개 이상 선택해주세요." },
      { status: 400 }
    );
  }

  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  const isFuture = scheduledDate && scheduledDate.getTime() > Date.now() + 30_000;

  const post = await prisma.post.create({
    data: {
      body,
      commentBody: commentBody || null,
      coupangLinkId: coupangLinkId || null,
      status: "SCHEDULED",
      scheduledAt: isFuture ? scheduledDate : new Date(),
      targets: {
        create: accountIds.map((threadsAccountId: string) => {
          const perAccountBody =
            accountBodies && typeof accountBodies === "object"
              ? accountBodies[threadsAccountId]
              : undefined;
          const trimmed =
            typeof perAccountBody === "string" ? perAccountBody.trim() : "";
          return {
            threadsAccountId,
            body: trimmed && trimmed !== body.trim() ? trimmed : null,
          };
        }),
      },
    },
    include: { targets: true },
  });

  if (!isFuture) {
    await publishPost(post.id);
  }

  const result = await prisma.post.findUnique({
    where: { id: post.id },
    include: { targets: { include: { threadsAccount: true } } },
  });

  return NextResponse.json(result);
}
