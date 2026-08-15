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
