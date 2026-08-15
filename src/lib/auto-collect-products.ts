import { prisma } from "./prisma";
import { searchProducts, CoupangApiError } from "./coupang-api";
import { suggestProductKeyword, suggestProductKeywordCandidates } from "./ai";
import { compareKeywordTrends, NaverDataLabError } from "./naver-datalab";

const MAX_LINK_POOL = 60;

export type CollectResult =
  | { collected: string; keyword: string; productName: string; trendBased: boolean }
  | { skipped: "pool-full" | "no-new-product" | "coupang-error" | "keyword-error"; detail?: string };

/**
 * 검색할 키워드를 정한다. 네이버 데이터랩 키가 있으면 AI가 만든 후보 여러 개를
 * 실제 최근 7일 검색 트렌드로 비교해서 가장 반응 좋은 걸 고르고, 없으면
 * 예전처럼 AI가 하나만 추천한 걸 그대로 쓴다.
 */
async function pickKeyword(params: {
  openaiApiKey: string;
  naverClientId?: string;
  naverClientSecret?: string;
  avoid: string[];
}): Promise<{ keyword: string; trendBased: boolean }> {
  if (params.naverClientId && params.naverClientSecret) {
    const candidates = await suggestProductKeywordCandidates({
      apiKey: params.openaiApiKey,
      avoid: params.avoid,
    });
    try {
      const trends = await compareKeywordTrends({
        clientId: params.naverClientId,
        clientSecret: params.naverClientSecret,
        keywords: candidates,
      });
      const best = [...trends].sort((a, b) => b.score - a.score)[0];
      if (best) {
        return { keyword: best.keyword, trendBased: true };
      }
    } catch (e) {
      // 데이터랩 호출이 실패해도 후보 중 하나로 계속 진행 (수집 자체는 멈추지 않음)
      console.error("네이버 데이터랩 트렌드 비교 실패", e);
    }
    return { keyword: candidates[0], trendBased: false };
  }

  const keyword = await suggestProductKeyword({
    apiKey: params.openaiApiKey,
    avoid: params.avoid,
  });
  return { keyword, trendBased: false };
}

/**
 * 사람이 직접 검색하지 않아도, AI(+네이버 데이터랩)가 고른 인기 상품 키워드로
 * 쿠팡 상품을 검색해 로켓배송 상품 위주로 하나 골라 링크 풀에 자동으로 추가한다.
 */
export async function collectTrendingProduct(params: {
  coupangAccessKey: string;
  coupangSecretKey: string;
  openaiApiKey: string;
  naverClientId?: string;
  naverClientSecret?: string;
}): Promise<CollectResult> {
  const poolSize = await prisma.coupangLink.count();
  if (poolSize >= MAX_LINK_POOL) {
    return { skipped: "pool-full" };
  }

  const recentLinks = await prisma.coupangLink.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { productName: true },
  });
  const recentNames = recentLinks
    .map((l) => l.productName)
    .filter((n): n is string => Boolean(n));

  let keyword: string;
  let trendBased: boolean;
  try {
    const picked = await pickKeyword({
      openaiApiKey: params.openaiApiKey,
      naverClientId: params.naverClientId,
      naverClientSecret: params.naverClientSecret,
      avoid: recentNames,
    });
    keyword = picked.keyword;
    trendBased = picked.trendBased;
  } catch (e) {
    return {
      skipped: "keyword-error",
      detail:
        e instanceof NaverDataLabError || e instanceof Error ? e.message : String(e),
    };
  }

  let results;
  try {
    results = await searchProducts({
      accessKey: params.coupangAccessKey,
      secretKey: params.coupangSecretKey,
      keyword,
      limit: 10,
    });
  } catch (e) {
    return {
      skipped: "coupang-error",
      detail: e instanceof CoupangApiError ? e.message : String(e),
    };
  }

  const sorted = [...results].sort(
    (a, b) => Number(b.isRocket) - Number(a.isRocket)
  );
  const existingUrls = new Set(
    (await prisma.coupangLink.findMany({ select: { originalUrl: true } })).map(
      (l) => l.originalUrl
    )
  );
  const pick = sorted.find((p) => !existingUrls.has(p.productUrl));
  if (!pick) {
    return { skipped: "no-new-product" };
  }

  const productName = `${pick.productName} (${pick.productPrice.toLocaleString("ko-KR")}원)`;
  const saved = await prisma.coupangLink.create({
    data: {
      productName,
      originalUrl: pick.productUrl,
      shortUrl: pick.productUrl,
      imageUrl: pick.productImage,
    },
  });

  return { collected: saved.id, keyword, productName, trendBased };
}
