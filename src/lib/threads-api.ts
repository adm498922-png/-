const THREADS_AUTH_BASE = "https://threads.net/oauth/authorize";
const GRAPH_BASE = "https://graph.threads.net";

export const THREADS_SCOPES = [
  "threads_basic",
  "threads_content_publish",
  "threads_manage_insights",
  "threads_manage_replies",
].join(",");

export function buildAuthorizeUrl(params: {
  appId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL(THREADS_AUTH_BASE);
  url.searchParams.set("client_id", params.appId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", THREADS_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", params.state);
  return url.toString();
}

class ThreadsApiError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
  }
}

async function parseOrThrow(res: Response) {
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new ThreadsApiError(
      `Threads API error (${res.status})`,
      res.status,
      json
    );
  }
  return json;
}

export async function exchangeCodeForShortLivedToken(params: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{ access_token: string; user_id: string }> {
  const body = new URLSearchParams({
    client_id: params.appId,
    client_secret: params.appSecret,
    grant_type: "authorization_code",
    redirect_uri: params.redirectUri,
    code: params.code,
  });
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return parseOrThrow(res) as Promise<{ access_token: string; user_id: string }>;
}

export async function exchangeForLongLivedToken(params: {
  appSecret: string;
  shortLivedToken: string;
}): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL(`${GRAPH_BASE}/access_token`);
  url.searchParams.set("grant_type", "th_exchange_token");
  url.searchParams.set("client_secret", params.appSecret);
  url.searchParams.set("access_token", params.shortLivedToken);
  const res = await fetch(url.toString());
  return parseOrThrow(res) as Promise<{ access_token: string; expires_in: number }>;
}

export async function refreshLongLivedToken(
  accessToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL(`${GRAPH_BASE}/refresh_access_token`);
  url.searchParams.set("grant_type", "th_refresh_token");
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url.toString());
  return parseOrThrow(res) as Promise<{ access_token: string; expires_in: number }>;
}

export async function getMe(
  accessToken: string
): Promise<{ id: string; username: string }> {
  const url = new URL(`${GRAPH_BASE}/v1.0/me`);
  url.searchParams.set("fields", "id,username");
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url.toString());
  return parseOrThrow(res) as Promise<{ id: string; username: string }>;
}

export async function createTextContainer(params: {
  accessToken: string;
  threadsUserId: string;
  text: string;
  replyToId?: string;
}): Promise<{ id: string }> {
  const url = new URL(`${GRAPH_BASE}/v1.0/${params.threadsUserId}/threads`);
  url.searchParams.set("media_type", "TEXT");
  url.searchParams.set("text", params.text);
  if (params.replyToId) {
    url.searchParams.set("reply_to_id", params.replyToId);
  }
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url.toString(), { method: "POST" });
  return parseOrThrow(res) as Promise<{ id: string }>;
}

export async function createImageContainer(params: {
  accessToken: string;
  threadsUserId: string;
  imageUrl: string;
  text?: string;
  replyToId?: string;
  isCarouselItem?: boolean;
}): Promise<{ id: string }> {
  const url = new URL(`${GRAPH_BASE}/v1.0/${params.threadsUserId}/threads`);
  url.searchParams.set("media_type", "IMAGE");
  url.searchParams.set("image_url", params.imageUrl);
  if (params.text) {
    url.searchParams.set("text", params.text);
  }
  if (params.replyToId) {
    url.searchParams.set("reply_to_id", params.replyToId);
  }
  if (params.isCarouselItem) {
    url.searchParams.set("is_carousel_item", "true");
  }
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url.toString(), { method: "POST" });
  return parseOrThrow(res) as Promise<{ id: string }>;
}

export async function createVideoContainer(params: {
  accessToken: string;
  threadsUserId: string;
  videoUrl: string;
  text?: string;
  replyToId?: string;
  isCarouselItem?: boolean;
}): Promise<{ id: string }> {
  const url = new URL(`${GRAPH_BASE}/v1.0/${params.threadsUserId}/threads`);
  url.searchParams.set("media_type", "VIDEO");
  url.searchParams.set("video_url", params.videoUrl);
  if (params.text) {
    url.searchParams.set("text", params.text);
  }
  if (params.replyToId) {
    url.searchParams.set("reply_to_id", params.replyToId);
  }
  if (params.isCarouselItem) {
    url.searchParams.set("is_carousel_item", "true");
  }
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url.toString(), { method: "POST" });
  return parseOrThrow(res) as Promise<{ id: string }>;
}

export async function createCarouselContainer(params: {
  accessToken: string;
  threadsUserId: string;
  childrenIds: string[];
  text?: string;
  replyToId?: string;
}): Promise<{ id: string }> {
  const url = new URL(`${GRAPH_BASE}/v1.0/${params.threadsUserId}/threads`);
  url.searchParams.set("media_type", "CAROUSEL");
  url.searchParams.set("children", params.childrenIds.join(","));
  if (params.text) {
    url.searchParams.set("text", params.text);
  }
  if (params.replyToId) {
    url.searchParams.set("reply_to_id", params.replyToId);
  }
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url.toString(), { method: "POST" });
  return parseOrThrow(res) as Promise<{ id: string }>;
}

export async function getContainerStatus(params: {
  accessToken: string;
  containerId: string;
}): Promise<{ status: string; error_message?: string }> {
  const url = new URL(`${GRAPH_BASE}/v1.0/${params.containerId}`);
  url.searchParams.set("fields", "status,error_message");
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url.toString());
  return parseOrThrow(res) as Promise<{ status: string; error_message?: string }>;
}

/** 영상/캐러셀 컨테이너는 처리에 시간이 걸려, FINISHED 상태가 될 때까지 기다렸다가 발행해야 한다. */
export async function waitUntilContainerReady(params: {
  accessToken: string;
  containerId: string;
  maxAttempts?: number;
  intervalMs?: number;
}): Promise<void> {
  const maxAttempts = params.maxAttempts ?? 30;
  const intervalMs = params.intervalMs ?? 10_000;

  for (let i = 0; i < maxAttempts; i++) {
    const { status, error_message } = await getContainerStatus({
      accessToken: params.accessToken,
      containerId: params.containerId,
    });
    if (status === "FINISHED" || status === "PUBLISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new ThreadsApiError(
        `미디어 처리 실패: ${error_message ?? status}`,
        502,
        { status, error_message }
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new ThreadsApiError("미디어 처리 시간이 초과되었습니다.", 504, {
    containerId: params.containerId,
  });
}

export async function publishContainer(params: {
  accessToken: string;
  threadsUserId: string;
  creationId: string;
}): Promise<{ id: string }> {
  const url = new URL(
    `${GRAPH_BASE}/v1.0/${params.threadsUserId}/threads_publish`
  );
  url.searchParams.set("creation_id", params.creationId);
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url.toString(), { method: "POST" });
  return parseOrThrow(res) as Promise<{ id: string }>;
}

export async function getMediaPermalink(params: {
  accessToken: string;
  mediaId: string;
}): Promise<{ permalink?: string }> {
  const url = new URL(`${GRAPH_BASE}/v1.0/${params.mediaId}`);
  url.searchParams.set("fields", "permalink");
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url.toString());
  return parseOrThrow(res) as Promise<{ permalink?: string }>;
}

export type ThreadsInsights = {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
};

export async function getMediaInsights(params: {
  accessToken: string;
  mediaId: string;
}): Promise<ThreadsInsights> {
  const url = new URL(`${GRAPH_BASE}/v1.0/${params.mediaId}/insights`);
  url.searchParams.set("metric", "views,likes,replies,reposts,quotes");
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url.toString());
  const json = (await parseOrThrow(res)) as {
    data: { name: string; values?: { value: number }[]; total_value?: { value: number } }[];
  };

  const result: ThreadsInsights = {
    views: 0,
    likes: 0,
    replies: 0,
    reposts: 0,
    quotes: 0,
  };
  for (const metric of json.data ?? []) {
    const value =
      metric.total_value?.value ?? metric.values?.[0]?.value ?? 0;
    if (metric.name in result) {
      (result as unknown as Record<string, number>)[metric.name] = value;
    }
  }
  return result;
}

/** Meta 쪽에서 세션(토큰)이 무효화됐다는 뜻인지 판별 (재연결이 필요한 경우) */
export function isSessionExpiredError(e: unknown): boolean {
  if (!(e instanceof ThreadsApiError)) return false;
  const body = e.body as { error?: { type?: string; code?: number } } | undefined;
  return body?.error?.type === "OAuthException" || body?.error?.code === 190;
}

export { ThreadsApiError };
