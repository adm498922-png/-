import crypto from "crypto";

const DOMAIN = "https://api-gateway.coupang.com";
const DEEPLINK_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";

function formatSignedDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mi = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return `${yy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function buildAuthorizationHeader(params: {
  method: string;
  path: string;
  query?: string;
  accessKey: string;
  secretKey: string;
}): string {
  const signedDate = formatSignedDate(new Date());
  const message = `${signedDate}${params.method}${params.path}${params.query ?? ""}`;
  const signature = crypto
    .createHmac("sha256", params.secretKey)
    .update(message)
    .digest("hex");

  return `CEA algorithm=HmacSHA256, access-key=${params.accessKey}, signed-date=${signedDate}, signature=${signature}`;
}

export class CoupangApiError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
  }
}

export type DeeplinkResult = {
  originalUrl: string;
  shortenUrl: string;
  landingUrl?: string;
};

const SEARCH_PATH =
  "/v2/providers/affiliate_open_api/apis/openapi/products/search";

export type ProductSearchResult = {
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  isRocket: boolean;
  isFreeShipping: boolean;
};

export async function searchProducts(params: {
  accessKey: string;
  secretKey: string;
  keyword: string;
  limit?: number;
}): Promise<ProductSearchResult[]> {
  const query = `keyword=${encodeURIComponent(params.keyword)}&limit=${params.limit ?? 10}`;
  const authorization = buildAuthorizationHeader({
    method: "GET",
    path: SEARCH_PATH,
    query,
    accessKey: params.accessKey,
    secretKey: params.secretKey,
  });

  const res = await fetch(`${DOMAIN}${SEARCH_PATH}?${query}`, {
    method: "GET",
    headers: { Authorization: authorization },
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!res.ok) {
    throw new CoupangApiError(
      `쿠팡파트너스 API 오류 (${res.status})`,
      res.status,
      json
    );
  }

  const parsed = json as {
    rCode?: string;
    rMessage?: string;
    data?: { productData?: ProductSearchResult[] };
  };
  if (parsed.rCode && parsed.rCode !== "0") {
    throw new CoupangApiError(
      parsed.rMessage || "쿠팡파트너스 API 응답 오류",
      res.status,
      json
    );
  }

  return parsed.data?.productData ?? [];
}

export async function createDeeplinks(params: {
  accessKey: string;
  secretKey: string;
  coupangUrls: string[];
  subId?: string;
}): Promise<DeeplinkResult[]> {
  const authorization = buildAuthorizationHeader({
    method: "POST",
    path: DEEPLINK_PATH,
    accessKey: params.accessKey,
    secretKey: params.secretKey,
  });

  const res = await fetch(`${DOMAIN}${DEEPLINK_PATH}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify({
      coupangUrls: params.coupangUrls,
      subId: params.subId ?? "",
    }),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!res.ok) {
    throw new CoupangApiError(
      `쿠팡파트너스 API 오류 (${res.status})`,
      res.status,
      json
    );
  }

  const parsed = json as { rCode?: string; rMessage?: string; data?: DeeplinkResult[] };
  if (parsed.rCode && parsed.rCode !== "0") {
    throw new CoupangApiError(
      parsed.rMessage || "쿠팡파트너스 API 응답 오류",
      res.status,
      json
    );
  }

  return parsed.data ?? [];
}
