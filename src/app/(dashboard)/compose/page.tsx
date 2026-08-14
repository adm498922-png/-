import { prisma } from "@/lib/prisma";
import { getSettingsStatus } from "@/lib/settings";
import Link from "next/link";
import ComposeForm from "./ComposeForm";

export default async function ComposePage() {
  const [accounts, links, posts, settingsStatus] = await Promise.all([
    prisma.threadsAccount.findMany({
      where: { isActive: true },
      orderBy: { connectedAt: "asc" },
    }),
    prisma.coupangLink.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { targets: { include: { threadsAccount: true } } },
    }),
    getSettingsStatus(),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-white">글 작성/예약</h1>
      <p className="mb-6 text-sm text-neutral-400">
        여러 스레드 계정에 동시에 글을 올리고, 발행 직후 자동으로 첫 댓글을
        달 수 있습니다.
      </p>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 p-6 text-sm text-neutral-400">
          먼저{" "}
          <Link href="/accounts" className="text-blue-400 hover:underline">
            스레드 계정
          </Link>
          을 연결해주세요.
        </div>
      ) : (
        <ComposeForm
          accounts={accounts}
          links={links}
          initialPosts={posts}
          aiConfigured={settingsStatus.aiConfigured}
        />
      )}
    </div>
  );
}
