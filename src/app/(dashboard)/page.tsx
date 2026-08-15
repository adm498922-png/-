import Link from "next/link";
import { getDashboardStats } from "@/lib/dashboard-stats";
import WeekBarChart from "./WeekBarChart";
import InsightsRefreshButton from "./InsightsRefreshButton";
import HourlyStatsPanel from "./HourlyStatsPanel";

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="mb-2 text-sm text-neutral-400">{label}</p>
      <p className="text-3xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

export default async function DashboardHomePage() {
  const stats = await getDashboardStats();

  if (stats.accountsCount === 0) {
    return (
      <div>
        <h1 className="mb-1 text-2xl font-bold text-white">대시보드</h1>
        <p className="mb-6 text-sm text-neutral-400">
          연결된 스레드 계정이 없습니다.
        </p>
        <Link
          href="/accounts"
          className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          스레드 계정 연결하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">대시보드</h1>
          <p className="mt-1 text-sm text-neutral-400">
            연결된 계정 {stats.accountsCount}개 기준
          </p>
        </div>
        <InsightsRefreshButton />
      </div>

      <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-neutral-400">최근 7일 포스팅</p>
          <p className="text-2xl font-semibold text-white">
            {stats.last7DaysTotal.toLocaleString("ko-KR")}개
          </p>
        </div>
        <WeekBarChart days={stats.last7Days} />
      </div>

      <div className="mb-6">
        <HourlyStatsPanel />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="오늘 발송 예정 글"
          value={stats.todayScheduledCount.toLocaleString("ko-KR")}
          sub={`전체 예약 ${stats.totalScheduledCount.toLocaleString("ko-KR")}개`}
        />
        <StatTile
          label="오늘 포스팅 완료"
          value={stats.todayPublishedCount.toLocaleString("ko-KR")}
        />
        <StatTile
          label="오늘 올린 글 조회수"
          value={stats.todayViewsTotal.toLocaleString("ko-KR")}
          sub={`${stats.todayPublishedCount}개 중 ${stats.todayViewsConfirmed}개 확인`}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-300">
          계정별 오늘 현황
        </h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-xs text-neutral-500">
                <th className="px-4 py-2 font-medium">계정</th>
                <th className="px-4 py-2 font-medium">오늘 포스팅</th>
                <th className="px-4 py-2 font-medium">오늘 조회수</th>
              </tr>
            </thead>
            <tbody>
              {stats.perAccount.map((account) => (
                <tr
                  key={account.id}
                  className="border-b border-neutral-800 last:border-0"
                >
                  <td className="px-4 py-2.5 text-white">
                    {account.label}
                    <span className="ml-1.5 text-xs text-neutral-500">
                      @{account.username ?? "unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-300">
                    {account.todayPosts.toLocaleString("ko-KR")}개
                  </td>
                  <td className="px-4 py-2.5 font-medium text-neutral-100">
                    {account.todayViews.toLocaleString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
