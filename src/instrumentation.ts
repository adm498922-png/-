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
  const { generateAndScheduleDailyPost } = await import("@/lib/auto-daily-post");

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

  // 2시간마다(서버 로컬 시간, 00/02/04...22시): 설정에서 켜져 있으면 AI가
  // 소재를 스스로 골라 일상글을 만들어 1시간 뒤로 예약 (그 사이 검토/취소 가능)
  cron.schedule("0 */2 * * *", async () => {
    try {
      await generateAndScheduleDailyPost();
    } catch (e) {
      console.error("자동 일상글 생성 스케줄러 오류", e);
    }
  });

  console.log(
    "[threads-hub] 로컬 스케줄러가 시작되었습니다 (예약 발행 매 1분, 조회수 수집 매 10분, 자동 일상글 생성 2시간마다)."
  );
}
