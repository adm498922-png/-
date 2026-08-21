import Link from "next/link";
import { isGongguOnly } from "@/lib/app-mode";
import { getDashboardStats } from "@/lib/dashboard-stats";
import WeekBarChart from "./WeekBarChart";
import InsightsRefreshButton from "./InsightsRefreshButton";
import DashboardHero from "./DashboardHero";
import GongguDashboard from "./GongguDashboard";

export default async function DashboardHomePage() {
  // 공동구매 전용 사이트는 크리에이터/캠페인 통계 대시보드를 보여준다.
  if (isGongguOnly()) return <GongguDashboard />;

  const stats = await getDashboardStats();

  if (stats.accountsCount === 0) {
    return (
      <div>
        <h1 className="mb-1 text-2xl font-bold text-slate-900">대시보드</h1>
        <p className="mb-6 text-sm text-slate-500">
          연결된 스레드 계정이 없습니다.
        </p>
        <Link
          href="/settings"
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
          <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
          <p className="mt-1 text-sm text-slate-500">
            연결된 계정 {stats.accountsCount}개 · 전체 예약 {stats.totalScheduledCount}개
          </p>
        </div>
        <InsightsRefreshButton />
      </div>

      <DashboardHero accounts={stats.perAccount} />

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">최근 7일 포스팅</p>
          <p className="text-sm font-semibold text-slate-600">
            {stats.last7DaysTotal.toLocaleString("ko-KR")}개
          </p>
        </div>
        <WeekBarChart days={stats.last7Days} />
      </div>
    </div>
  );
}
