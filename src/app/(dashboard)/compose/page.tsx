import { redirect } from "next/navigation";
import { isGongguOnly } from "@/lib/app-mode";
import { prisma } from "@/lib/prisma";
import { getSettingsStatus } from "@/lib/settings";
import Link from "next/link";
import ComposeForm from "./ComposeForm";

export default async function ComposePage() {
  // 공동구매 전용 사이트에는 스레드 화면이 없다.
  if (isGongguOnly()) redirect("/creators");

  const [accounts, links, settingsStatus] = await Promise.all([
    prisma.threadsAccount.findMany({
      where: { isActive: true },
      orderBy: { connectedAt: "asc" },
    }),
    prisma.coupangLink.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    getSettingsStatus(),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">글쓰기</h1>
      <p className="mb-6 text-sm text-slate-500">
        여러 스레드 계정에 동시에 글을 올리고, 발행 직후 자동으로 첫 댓글을
        달 수 있습니다.
      </p>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          먼저{" "}
          <Link href="/settings" className="text-blue-600 hover:underline">
            스레드 계정
          </Link>
          을 연결해주세요.
        </div>
      ) : (
        <ComposeForm
          accounts={accounts}
          links={links}
          aiConfigured={settingsStatus.aiConfigured}
        />
      )}
    </div>
  );
}
