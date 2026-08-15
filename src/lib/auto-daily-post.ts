import { prisma } from "./prisma";
import { getDecryptedSettings } from "./settings";
import { generateDailyPostDrafts, generateThreadsPost } from "./ai";
import { collectTrendingProduct } from "./auto-collect-products";
import {
  TOPIC_CATEGORIES,
  TONE_OPTIONS,
  ENGAGEMENT_PROMPTS,
  buildCoupangComment,
} from "./daily-post-options";

const REVIEW_WINDOW_MINUTES = 20;
const PRODUCT_POST_CHANCE = 0.4; // 켜져 있을 때 상품 글이 나올 확률 (나머지는 일상글)
const COLLECT_CHANCE = 0.5; // 상품 링크 풀을 자동으로 채울지 여부 (매 실행마다 시도하진 않음)

// 테스트 기간: 1시간마다. 나중에 실제 운영할 때는 늘려도 됨.
const AUTO_POST_INTERVAL_HOURS = 1;
// 매번 정각(0분)에 딱 맞춰 발행되면 기계적으로 보여서, 몇 분씩 무작위로 어긋나게 함.
const MIN_JITTER_MINUTES = 1;
const MAX_JITTER_MINUTES = 9;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export type AutoDailyPostSkipReason =
  | "disabled"
  | "no-openai-key"
  | "no-active-accounts";

export type AutoDailyPostResult =
  | { skipped: AutoDailyPostSkipReason }
  | {
      created: string;
      kind: "daily" | "product";
      category: string;
      tone?: string;
      scheduledAt: Date;
    };

/**
 * 소재·말투를 스스로 골라 글 초안을 만들고, 사람이 확인할 수 있도록
 * 몇 분 뒤로 예약해둔다 (즉시 발행하지 않음).
 * 설정에 따라 가끔(기본 40%) 이미 저장된 쿠팡 링크로 상품 소개 글을 섞는다.
 */
export async function generateAndScheduleDailyPost(
  options?: { force?: boolean }
): Promise<AutoDailyPostResult> {
  const settings = await getDecryptedSettings();
  if (!settings.autoDailyPostEnabled && !options?.force) {
    return { skipped: "disabled" as const };
  }
  if (!settings.openaiApiKey) {
    return { skipped: "no-openai-key" as const };
  }

  const accounts = await prisma.threadsAccount.findMany({
    where: { isActive: true },
  });
  if (accounts.length === 0) {
    return { skipped: "no-active-accounts" as const };
  }

  const scheduledAt = new Date(Date.now() + REVIEW_WINDOW_MINUTES * 60 * 1000);

  // 쿠팡 상품 글도 섞기로 되어 있으면, 사람이 직접 검색하지 않아도 되도록
  // AI가 고른 키워드로 상품을 자동 수집해 링크 풀을 채워둔다 (실패해도 무시).
  if (
    settings.autoDailyPostIncludeProducts &&
    settings.coupangAccessKey &&
    settings.coupangSecretKey &&
    Math.random() < COLLECT_CHANCE
  ) {
    try {
      await collectTrendingProduct({
        coupangAccessKey: settings.coupangAccessKey,
        coupangSecretKey: settings.coupangSecretKey,
        openaiApiKey: settings.openaiApiKey,
      });
    } catch (e) {
      console.error("상품 자동 수집 실패", e);
    }
  }

  let existingLink = null;
  if (settings.autoDailyPostIncludeProducts && Math.random() < PRODUCT_POST_CHANCE) {
    const links = await prisma.coupangLink.findMany({ take: 100 });
    if (links.length > 0) existingLink = pickRandom(links);
  }

  if (existingLink) {
    const body = await generateThreadsPost({
      apiKey: settings.openaiApiKey,
      productName: existingLink.productName ?? existingLink.originalUrl,
    });
    const commentBody = buildCoupangComment(
      existingLink.shortUrl,
      pickRandom(ENGAGEMENT_PROMPTS)
    );

    const post = await prisma.post.create({
      data: {
        body,
        commentBody,
        coupangLinkId: existingLink.id,
        status: "SCHEDULED",
        scheduledAt,
        targets: {
          create: accounts.map((a) => ({ threadsAccountId: a.id })),
        },
      },
    });

    return {
      created: post.id,
      kind: "product",
      category: existingLink.productName ?? "쿠팡 상품",
      scheduledAt,
    };
  }

  const category = pickRandom(TOPIC_CATEGORIES);
  const tone = pickRandom(TONE_OPTIONS);

  const drafts = await generateDailyPostDrafts({
    apiKey: settings.openaiApiKey,
    category,
    tone,
    count: 1,
  });
  const body = drafts[0];
  const commentBody = pickRandom(ENGAGEMENT_PROMPTS);

  const post = await prisma.post.create({
    data: {
      body,
      commentBody,
      status: "SCHEDULED",
      scheduledAt,
      targets: {
        create: accounts.map((a) => ({ threadsAccountId: a.id })),
      },
    },
  });

  return { created: post.id, kind: "daily", category, tone, scheduledAt };
}

function randomJitterMs(): number {
  const minutes =
    MIN_JITTER_MINUTES +
    Math.floor(Math.random() * (MAX_JITTER_MINUTES - MIN_JITTER_MINUTES + 1));
  return minutes * 60 * 1000;
}

/**
 * 매 시각 정각(0분)에 딱 맞춰 돌지 않도록, 다음 실행까지의 대기 시간에
 * 몇 분씩 무작위 오차를 더해 스스로 다시 예약하는 방식으로 반복 실행한다.
 */
export function startAutoDailyPostScheduler(): void {
  const scheduleNext = () => {
    const delayMs = AUTO_POST_INTERVAL_HOURS * 60 * 60 * 1000 + randomJitterMs();
    setTimeout(async () => {
      try {
        await generateAndScheduleDailyPost();
      } catch (e) {
        console.error("자동 일상글 생성 스케줄러 오류", e);
      }
      scheduleNext();
    }, delayMs);
  };
  scheduleNext();
}
