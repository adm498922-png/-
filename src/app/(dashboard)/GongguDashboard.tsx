import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  CREATOR_GRADE_LABEL,
  CREATOR_STATUS_LABEL,
  CREATOR_STATUSES,
  getCreatorGrade,
  type CreatorGrade,
} from "@/lib/gonggu";
import WeeklyRoutine from "./WeeklyRoutine";

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-slate-400">
          {value}명 ({pct}%)
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const GRADE_COLOR: Record<CreatorGrade, string> = {
  micro: "#60a5fa",
  macro: "#4ade80",
  mega: "#fbbf24",
};

const STATUS_COLOR: Record<string, string> = {
  LEAD: "#94a3b8",
  CONTACTED: "#38bdf8",
  CONFIRMED: "#818cf8",
  ONGOING: "#fbbf24",
  DONE: "#22c55e",
  HOLD: "#94a3b8",
  REJECTED: "#f87171",
};

function buildRecentDmDays(sentAssignments: { sentAt: Date | string | null }[]) {
  const now = Date.now();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * 24 * 60 * 60 * 1000);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const count = sentAssignments.filter((a) => {
      if (!a.sentAt) return false;
      const t = new Date(a.sentAt).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    }).length;
    return { label, count };
  });
}

export default async function GongguDashboard() {
  const [creators, activeCampaignCount, sentAssignments, routineItems] = await Promise.all([
    prisma.creator.findMany({ select: { followers: true, status: true } }),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.campaignAssignment.findMany({
      where: { status: "SENT" },
      select: { sentAt: true },
    }),
    prisma.routineItem.findMany({
      orderBy: [{ weekday: "asc" }, { time: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const totalCreators = creators.length || 1;

  const gradeCounts: Record<CreatorGrade, number> = { micro: 0, macro: 0, mega: 0 };
  creators.forEach((c) => {
    gradeCounts[getCreatorGrade(c.followers)]++;
  });

  const statusCounts: Record<string, number> = {};
  creators.forEach((c) => {
    statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;
  });

  const days = buildRecentDmDays(sentAssignments);
  const maxDay = Math.max(...days.map((d) => d.count), 1);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
          <p className="mt-1 text-sm text-slate-500">Y글로벌 현황 한눈에 보기</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href="/creators"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            크리에이터 보러가기
          </Link>
          <a
            href="https://app.notion.com/p/3bc0af65ac928063ad4decf636c6439d"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300"
          >
            노션 정리목록 보러가기
          </a>
        </div>
      </div>

      <WeeklyRoutine initialItems={routineItems} />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-center">
          <div className="text-2xl font-black text-slate-900">{creators.length}</div>
          <div className="mt-1 text-[11px] font-semibold text-slate-400">등록 크리에이터</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-center">
          <div className="text-2xl font-black text-slate-900">{activeCampaignCount}</div>
          <div className="mt-1 text-[11px] font-semibold text-slate-400">진행 중 캠페인</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-center">
          <div className="text-2xl font-black text-slate-900">{sentAssignments.length}</div>
          <div className="mt-1 text-[11px] font-semibold text-slate-400">누적 DM 발송</div>
        </div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-900">등급 분포</h2>
          <div className="space-y-3.5">
            {(["micro", "macro", "mega"] as CreatorGrade[]).map((g) => (
              <Bar
                key={g}
                label={CREATOR_GRADE_LABEL[g]}
                value={gradeCounts[g]}
                total={totalCreators}
                color={GRADE_COLOR[g]}
              />
            ))}
          </div>
          {creators.length === 0 && (
            <p className="mt-3 text-xs text-slate-400">등록된 크리에이터가 없습니다.</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-900">연락 상태</h2>
          <div className="space-y-3.5">
            {CREATOR_STATUSES.map((s) => (
              <Bar
                key={s}
                label={CREATOR_STATUS_LABEL[s]}
                value={statusCounts[s] ?? 0}
                total={totalCreators}
                color={STATUS_COLOR[s] ?? "#94a3b8"}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-900">최근 14일 DM 발송</h2>
        <div className="flex items-end gap-1.5" style={{ height: 140 }}>
          {days.map((d) => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="relative w-full rounded-t"
                  style={{
                    height: `${Math.max(2, (d.count / maxDay) * 100)}%`,
                    background: d.count ? "#2563eb" : "#f1f5f9",
                  }}
                >
                  {d.count > 0 && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-600">
                      {d.count}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[9px] text-slate-400">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
