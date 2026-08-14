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

async function latestViewsByTargetId(targetIds: string[]): Promise<Map<string, number>> {
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
