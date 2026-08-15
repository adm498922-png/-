import { prisma } from "./prisma";

const KOREAN_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export async function latestViewsByTargetId(targetIds: string[]): Promise<Map<string, number>> {
  if (targetIds.length === 0) return new Map();
  const stats = await prisma.postStat.findMany({
    where: { postTargetId: { in: targetIds } },
    orderBy: { capturedAt: "desc" },
  });
  const map = new Map<string, number>();
  for (const stat of stats) {
    if (!map.has(stat.postTargetId)) {
      map.set(stat.postTargetId, stat.views);
    }
  }
  return map;
}

export async function getDashboardStats() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [accountsCount, totalScheduledCount, todayScheduledCount, accounts] =
    await Promise.all([
      prisma.threadsAccount.count({ where: { isActive: true } }),
      prisma.post.count({ where: { status: "SCHEDULED" } }),
      prisma.post.count({
        where: {
          status: "SCHEDULED",
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.threadsAccount.findMany({
        where: { isActive: true },
        orderBy: { connectedAt: "asc" },
      }),
    ]);

  // 최근 7일 (오늘 포함) 발행 완료 건수
  const sevenDaysAgo = startOfDay(new Date(now.getTime() - 6 * 86400000));
  const recentTargets = await prisma.postTarget.findMany({
    where: {
      status: "DONE",
      publishedAt: { gte: sevenDaysAgo, lte: todayEnd },
    },
    select: { id: true, publishedAt: true, threadsAccountId: true },
  });

  const last7Days: { label: string; date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(todayStart.getTime() - i * 86400000);
    const dayEnd = endOfDay(day);
    const count = recentTargets.filter(
      (t) => t.publishedAt && t.publishedAt >= day && t.publishedAt <= dayEnd
    ).length;
    last7Days.push({
      label: KOREAN_WEEKDAYS[day.getDay()],
      date: day.toISOString(),
      count,
    });
  }
  const last7DaysTotal = recentTargets.length;

  const todayTargets = recentTargets.filter(
    (t) => t.publishedAt && t.publishedAt >= todayStart && t.publishedAt <= todayEnd
  );
  const todayPublishedCount = todayTargets.length;

  const viewsMap = await latestViewsByTargetId(todayTargets.map((t) => t.id));
  const todayViewsTotal = todayTargets.reduce(
    (sum, t) => sum + (viewsMap.get(t.id) ?? 0),
    0
  );
  const todayViewsConfirmed = todayTargets.filter((t) => viewsMap.has(t.id)).length;

  const perAccount = accounts.map((account) => {
    const targetsForAccount = todayTargets.filter(
      (t) => t.threadsAccountId === account.id
    );
    const views = targetsForAccount.reduce(
      (sum, t) => sum + (viewsMap.get(t.id) ?? 0),
      0
    );
    return {
      id: account.id,
      label: account.label,
      username: account.username,
      todayPosts: targetsForAccount.length,
      todayViews: views,
    };
  });

  return {
    accountsCount,
    totalScheduledCount,
    todayScheduledCount,
    todayPublishedCount,
    todayViewsTotal,
    todayViewsConfirmed,
    last7Days,
    last7DaysTotal,
    perAccount,
  };
}

export type HourlyStat = {
  hour: number;
  count: number;
  views: number;
  isBest: boolean;
  scheduledCount: number;
};

/** dateStr: "YYYY-MM-DD" (서버 로컬 타임존 기준). accountId를 주면 해당 계정만 집계 */
export async function getHourlyStats(dateStr: string, accountId?: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayStart = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  const dayEnd = endOfDay(dayStart);

  const targets = await prisma.postTarget.findMany({
    where: {
      status: "DONE",
      publishedAt: { gte: dayStart, lte: dayEnd },
      ...(accountId ? { threadsAccountId: accountId } : {}),
    },
    select: { id: true, publishedAt: true },
  });

  const scheduledTargets = await prisma.postTarget.findMany({
    where: {
      status: { notIn: ["DONE", "FAILED"] },
      ...(accountId ? { threadsAccountId: accountId } : {}),
      post: {
        status: "SCHEDULED",
        scheduledAt: { gte: dayStart, lte: dayEnd },
      },
    },
    select: { id: true, post: { select: { scheduledAt: true } } },
  });

  const viewsMap = await latestViewsByTargetId(targets.map((t) => t.id));

  const hours: { count: number; views: number; scheduledCount: number }[] = Array.from(
    { length: 24 },
    () => ({ count: 0, views: 0, scheduledCount: 0 })
  );
  for (const t of targets) {
    if (!t.publishedAt) continue;
    const hour = t.publishedAt.getHours();
    hours[hour].count += 1;
    hours[hour].views += viewsMap.get(t.id) ?? 0;
  }
  for (const t of scheduledTargets) {
    if (!t.post.scheduledAt) continue;
    const hour = t.post.scheduledAt.getHours();
    hours[hour].scheduledCount += 1;
  }

  const bestHours = new Set(
    hours
      .map((h, hour) => ({ hour, views: h.views }))
      .filter((h) => h.views > 0)
      .sort((a, b) => b.views - a.views)
      .slice(0, 2)
      .map((h) => h.hour)
  );

  const hourly: HourlyStat[] = hours.map((h, hour) => ({
    hour,
    count: h.count,
    views: h.views,
    isBest: bestHours.has(hour),
    scheduledCount: h.scheduledCount,
  }));

  const totalPosts = targets.length;
  const totalViews = hours.reduce((sum, h) => sum + h.views, 0);
  const avgViews = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;

  return { date: dateStr, hourly, totalPosts, totalViews, avgViews };
}
