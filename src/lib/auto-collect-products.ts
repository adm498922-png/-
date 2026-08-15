import { prisma } from "./prisma";
import { searchProducts, CoupangApiError } from "./coupang-api";
import { suggestProductKeyword } from "./ai";

const MAX_LINK_POOL = 60;

export type CollectResult =
  | { collected: string; keyword: string; productName: string }
  | { skipped: "pool-full" | "no-new-product" | "coupang-error" | "keyword-error"; detail?: string };

/**
 * 사람이 직접 검색하지 않아도, AI가 고른 인기 상품 키워드로 쿠팡 상품을 검색해
 * 로켓배송 상품 위주로 하나 골라 링크 풀에 자동으로 추가한다.
 */
export async function collectTrendingProduct(params: {
  coupangAccessKey: string;
  coupangSecretKey: string;
  openaiApiKey: string;
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
  try {
    keyword = await suggestProductKeyword({
      apiKey: params.openaiApiKey,
      avoid: recentNames,
    });
  } catch (e) {
    return {
      skipped: "keyword-error",
      detail: e instanceof Error ? e.message : String(e),
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

  return { collected: saved.id, keyword, productName };
}
