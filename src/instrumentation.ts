export async function register() {
  // Railway 등 대부분의 배포 환경은 서버 시간대가 UTC라, 별도 설정 없이 두면
  // 대시보드 시간대별 통계·자동 발행 스케줄이 실제 한국 시간과 9시간 어긋난다.
  // 서버 전역 시간대를 한국 시간으로 고정해 모든 Date 계산 기준을 통일한다.
  process.env.TZ = "Asia/Seoul";

  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Vercel 등 서버리스 배포에서는 Vercel Cron이 /api/cron/publish-scheduled 를 호출하므로
  // 이 인메모리 스케줄러는 로컬 개발/자체 호스팅(예: PM2, Docker) 환경에서만 사용합니다.
  if (process.env.VERCEL) return;
  // 공동구매 전용 사이트에는 발행할 스레드 글도, 연결된 계정도 없다.
  // 대신 판매일보 구글 시트 자동 동기화만 매시간 돌린다.
  if (process.env.APP_MODE === "gonggu") {
    console.log("[공구 허브] 공동구매 전용 모드 — 스레드 발행 스케줄러는 켜지 않습니다.");
    const globalForGonggu = globalThis as unknown as {
      __gongguSchedulerStarted?: boolean;
    };
    if (globalForGonggu.__gongguSchedulerStarted) return;
    globalForGonggu.__gongguSchedulerStarted = true;

    const cron = await import("node-cron");
    const { syncSalesSheetOnce } = await import("@/lib/sales-sheet-sync");
    const { getDecryptedSettings } = await import("@/lib/settings");
    cron.schedule("7 * * * *", async () => {
      try {
        const settings = await getDecryptedSettings();
        if (!settings.salesSheetUrl?.trim()) return; // 시트를 연결한 경우에만
        await syncSalesSheetOnce();
      } catch (e) {
        console.error("판매일보 시트 자동 동기화 오류", e);
      }
    });
    // 매일 아침 10시(한국 시간) 이메일 브리핑
    const { sendDailyBriefing } = await import("@/lib/daily-briefing");
    const { prisma } = await import("@/lib/prisma");
    cron.schedule("0 10 * * *", async () => {
      try {
        const row = await prisma.settings.findUnique({ where: { id: "singleton" } });
        if (!row?.briefingEnabled) return;
        const result = await sendDailyBriefing();
        if (!result.ok) console.error("아침 브리핑 발송 실패:", result.message);
      } catch (e) {
        console.error("아침 브리핑 오류", e);
      }
    });
    console.log("[공구 허브] 판매일보 시트 동기화(매시간) · 아침 브리핑(10시) 켜짐");
    return;
  }

  const globalForScheduler = globalThis as unknown as {
    __threadsHubSchedulerStarted?: boolean;
  };
  if (globalForScheduler.__threadsHubSchedulerStarted) return;
  globalForScheduler.__threadsHubSchedulerStarted = true;

  const cron = await import("node-cron");
  const { runDueScheduledPosts } = await import("@/lib/scheduler");
  const { collectInsightsForPublishedTargets } = await import("@/lib/insights");
  const { runDailyPostAtRandomMinute } = await import("@/lib/auto-daily-post");
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

  // 매시 정각에 실행 트리거만 걸어두고, 실제 생성은 그 시각의 1~19분 사이
  // 무작위 시점에 한 번 일어나도록 함 (하루 24개, 정각 고정이라 재배포해도
  // 주기가 흐트러지지 않음). 설정에서 켜져 있으면 소재를 스스로 골라 만들고
  // 1분 뒤로 예약(그 사이 검토/취소 가능)한다.
  cron.schedule("0 * * * *", () => {
    runDailyPostAtRandomMinute();
  });

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
    "[threads-hub] 로컬 스케줄러가 시작되었습니다 (예약 발행 매 1분, 조회수 수집 매 10분, 자동 일상글 생성 매시 1~19분 사이(하루 24개), 영상 생성 확인 매 1분)."
  );
}
