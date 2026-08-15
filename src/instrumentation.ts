export async function register() {
  // Railway 등 대부분의 배포 환경은 서버 시간대가 UTC라, 별도 설정 없이 두면
  // 대시보드 시간대별 통계·자동 발행 스케줄이 실제 한국 시간과 9시간 어긋난다.
  // 서버 전역 시간대를 한국 시간으로 고정해 모든 Date 계산 기준을 통일한다.
  process.env.TZ = "Asia/Seoul";

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
  const { startAutoDailyPostScheduler } = await import("@/lib/auto-daily-post");
  const { pollPendingVideoJobs } = await import("@/lib/video-gen");
  const { getDecryptedSettings } = await import("@/lib/settings");

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

  // 약 1시간마다(정각이 아니라 몇 분씩 무작위로 어긋난 시각에): 설정에서
  // 켜져 있으면 AI가 소재를 스스로 골라 일상글을 만들어 20분 뒤로 예약
  // (그 사이 검토/취소 가능). 스스로 다음 실행을 다시 예약하는 방식이라
  // 별도 cron 표현식이 아니라 auto-daily-post.ts 안에서 관리된다.
  startAutoDailyPostScheduler();

  // AI 상품 홍보 영상(Sora) 생성 진행 상태를 매 분 확인해서 완료되면 저장
  cron.schedule("* * * * *", async () => {
    try {
      const settings = await getDecryptedSettings();
      await pollPendingVideoJobs(settings.openaiApiKey);
    } catch (e) {
      console.error("영상 생성 상태 확인 스케줄러 오류", e);
    }
  });

  console.log(
    "[threads-hub] 로컬 스케줄러가 시작되었습니다 (예약 발행 매 1분, 조회수 수집 매 10분, 자동 일상글 생성 약 1시간마다(무작위 오차 포함), 영상 생성 확인 매 1분)."
  );
}
