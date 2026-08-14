export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Vercel 등 서버리스 배포에서는 Vercel Cron이 /api/cron/publish-scheduled 를 호출하므로
  // 이 인메모리 스케줄러는 로컬 개발/자체 호스팅(예: PM2, Docker) 환경에서만 사용합니다.
  if (process.env.VERCEL) return;

  const globalForScheduler = globalThis as unknown as {
    __threadsHubSchedulerStarted?: boolean;
  };
  if (globalForScheduler.__threadsHubSchedulerStarted) return;
  globalForScheduler.__threadsHubSchedulerStarted = true;

  const cron = await import("node-cron");
  const { runDueScheduledPosts } = await import("@/lib/scheduler");
  const { collectInsightsForPublishedTargets } = await import("@/lib/insights");

  cron.schedule("* * * * *", async () => {
    try {
      await runDueScheduledPosts();
    } catch (e) {
      console.error("예약 발행 스케줄러 오류", e);
    }
  });

  cron.schedule("*/10 * * * *", async () => {
    try {
      await collectInsightsForPublishedTargets();
    } catch (e) {
      console.error("조회수 수집 스케줄러 오류", e);
    }
  });

  console.log(
    "[threads-hub] 로컬 스케줄러가 시작되었습니다 (예약 발행 매 1분, 조회수 수집 매 10분)."
  );
}
