import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSettingsStatus } from "@/lib/settings";
import { isGongguOnly } from "@/lib/app-mode";
import SettingsForm from "./SettingsForm";
import AccountRow from "./AccountRow";
import LinkGeneratorForm from "./LinkGeneratorForm";

function getDaysLeft(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const gongguOnly = isGongguOnly();

  // 공동구매 전용 사이트에는 스레드 계정도 쿠팡 링크도 없다. 조회 자체를 건너뛴다.
  const [accounts, links, status] = await Promise.all([
    gongguOnly
      ? []
      : prisma.threadsAccount.findMany({ orderBy: { connectedAt: "asc" } }),
    gongguOnly
      ? []
      : prisma.coupangLink.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    getSettingsStatus(),
  ]);

  const hdrs = await headers();
  const host = hdrs.get("host");
  const protocol =
    host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https";
  const suggestedRedirectUri = `${protocol}://${host}/api/threads/oauth/callback`;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">연결 설정</h1>
      <p className="mb-6 text-sm text-slate-500">
        {gongguOnly
          ? "크리에이터 정보를 자동으로 불러오는 데 쓰는 연결입니다."
          : "스레드 계정 연결부터 쿠팡파트너스 연결, 쿠팡 링크 만들기까지 한 화면에서 이어서 진행하세요."}
      </p>

      {connected && (
        <p className="mb-4 rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-700">
          계정이 연결되었습니다.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {!gongguOnly && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">1. 스레드 계정 연결</h2>
            {status.threadsConfigured ? (
              <a
                href="/api/threads/oauth/start"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                + 계정 연결하기
              </a>
            ) : (
              <span className="text-xs text-slate-500">
                아래 고급 설정에서 Threads 앱 먼저 등록
              </span>
            )}
          </div>

          {accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              아직 연결된 계정이 없습니다.
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
        </section>
      )}

      {!gongguOnly && (
        <h2 className="mb-4 font-semibold text-slate-900">
          2. 쿠팡파트너스 연결 · 자동화
        </h2>
      )}
      <SettingsForm
        status={status}
        suggestedRedirectUri={suggestedRedirectUri}
        gongguOnly={gongguOnly}
      />

      {!gongguOnly && (
        <>
          <h2 className="mb-4 mt-8 font-semibold text-slate-900">
            3. 쿠팡 링크 만들기
          </h2>
          {!status.coupangConfigured ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              위 2번에서 쿠팡파트너스 API 키를 먼저 저장해주세요.
            </p>
          ) : (
            <LinkGeneratorForm initialLinks={links} />
          )}
        </>
      )}
    </div>
  );
}
