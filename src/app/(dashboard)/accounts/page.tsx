import { prisma } from "@/lib/prisma";
import { getSettingsStatus } from "@/lib/settings";
import Link from "next/link";
import AccountRow from "./AccountRow";

function getDaysLeft(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const accounts = await prisma.threadsAccount.findMany({
    orderBy: { connectedAt: "asc" },
  });
  const settings = await getSettingsStatus();

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">스레드 계정</h1>
          <p className="mt-1 text-sm text-neutral-400">
            여러 개의 스레드 계정을 연결해서 한 번에 관리하세요.
          </p>
        </div>
        {settings.threadsConfigured ? (
          <a
            href="/api/threads/oauth/start"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            + 계정 연결하기
          </a>
        ) : (
          <Link
            href="/settings"
            className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700"
          >
            설정에서 Threads 앱 먼저 등록
          </Link>
        )}
      </div>

      {connected && (
        <p className="mb-4 rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
          계정이 연결되었습니다.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
          아직 연결된 계정이 없습니다. 위 버튼으로 첫 계정을 연결해보세요.
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((account, i) => (
            <AccountRow
              key={account.id}
              account={account}
              daysLeft={getDaysLeft(account.tokenExpiresAt)}
              index={i + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
