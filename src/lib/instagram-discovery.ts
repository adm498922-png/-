import { getDecryptedSettings } from "./settings";

/**
 * 인스타그램 "비즈니스 디스커버리"로 다른 사람의 공개 프로필을 읽어온다.
 *
 * 되는 것: 상대가 비즈니스/크리에이터(프로페셔널) 계정이면 이름·소개글·팔로워 수·
 *          게시물 수·프로필 사진과 최근 게시물의 좋아요/댓글 수까지.
 * 안 되는 것: 개인(일반) 계정, 비공개 계정, 이메일·전화번호 같은 연락처, 팔로워 명단.
 *            이건 인스타그램이 아예 안 내주는 값이라 우회 방법이 없다.
 */

export type InstagramProfile = {
  igUserId: string | null;
  username: string;
  name: string | null;
  bio: string | null;
  website: string | null;
  profileImageUrl: string | null;
  followers: number | null;
  postCount: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  engagementRate: number | null;
  recentPostCount: number;
};

export class InstagramLookupError extends Error {
  code: "NOT_CONFIGURED" | "NOT_FOUND" | "NOT_PROFESSIONAL" | "FAILED";
  constructor(
    code: InstagramLookupError["code"],
    message: string
  ) {
    super(message);
    this.code = code;
  }
}

/** "@id", "instagram.com/id/", "https://www.instagram.com/id?igsh=..." 등에서 아이디만 뽑아낸다. */
export function extractInstagramHandle(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const urlMatch = raw.match(
    /instagram\.com\/([A-Za-z0-9._]+)(?:[/?#]|$)/i
  );
  if (urlMatch) {
    const handle = urlMatch[1];
    // /p/, /reel/ 같은 게시물 주소는 아이디가 아니다
    if (["p", "reel", "reels", "stories", "explore", "tv"].includes(handle.toLowerCase())) {
      return null;
    }
    return handle;
  }

  const plain = raw.replace(/^@/, "").trim();
  if (/^[A-Za-z0-9._]{1,30}$/.test(plain)) return plain;
  return null;
}

const FIELDS = [
  "id",
  "username",
  "name",
  "biography",
  "website",
  "profile_picture_url",
  "followers_count",
  "media_count",
  "media.limit(12){like_count,comments_count,timestamp}",
].join(",");

type GraphMedia = {
  like_count?: number;
  comments_count?: number;
};

type GraphDiscovery = {
  id?: string;
  username?: string;
  name?: string;
  biography?: string;
  website?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
  media?: { data?: GraphMedia[] };
};

// 메타 앱을 어떤 방식으로 연결했는지(페이스북 로그인 / 인스타그램 로그인)에 따라
// 주소가 다르다. 사용자가 어느 쪽인지 몰라도 되도록 둘 다 시도한다.
const HOSTS = ["https://graph.facebook.com", "https://graph.instagram.com"];
const API_VERSION = "v21.0";

export async function fetchInstagramProfile(
  handle: string
): Promise<InstagramProfile> {
  const settings = await getDecryptedSettings();
  if (!settings.igBusinessAccountId || !settings.igAccessToken) {
    throw new InstagramLookupError(
      "NOT_CONFIGURED",
      "인스타그램 연결이 아직 안 되어 있습니다. 연결 설정 화면에서 먼저 연결해주세요."
    );
  }

  let lastMessage = "";
  for (const host of HOSTS) {
    const url = new URL(
      `${host}/${API_VERSION}/${settings.igBusinessAccountId}`
    );
    url.searchParams.set(
      "fields",
      `business_discovery.username(${handle}){${FIELDS}}`
    );
    url.searchParams.set("access_token", settings.igAccessToken);

    let res: Response;
    try {
      res = await fetch(url, { cache: "no-store" });
    } catch {
      lastMessage = "인스타그램 서버에 연결하지 못했습니다.";
      continue;
    }

    const json = (await res.json().catch(() => null)) as
      | { business_discovery?: GraphDiscovery; error?: { message?: string; code?: number } }
      | null;

    if (res.ok && json?.business_discovery) {
      return normalize(json.business_discovery, handle);
    }

    const message = json?.error?.message ?? `요청이 실패했습니다 (${res.status})`;
    lastMessage = message;

    // 아이디가 없거나 개인 계정이면 다른 주소로 다시 시도해도 결과가 같다.
    if (/does not exist|cannot be found|not found/i.test(message)) {
      throw new InstagramLookupError(
        "NOT_FOUND",
        `'@${handle}' 계정을 찾지 못했습니다. 아이디를 다시 확인해주세요.`
      );
    }
    if (/business account|professional|not a business/i.test(message)) {
      throw new InstagramLookupError(
        "NOT_PROFESSIONAL",
        `'@${handle}' 님은 개인 계정이라 인스타그램이 정보를 내주지 않습니다. 아래 '프로필 복사해서 붙여넣기'를 써주세요.`
      );
    }
  }

  throw new InstagramLookupError("FAILED", friendlyFailure(lastMessage));
}


/** 메타가 주는 영어 오류 메시지를 사장님이 읽을 수 있는 말로 바꾼다. */
function friendlyFailure(message: string): string {
  if (!message) return "인스타그램에서 정보를 불러오지 못했습니다.";

  if (/expired|invalid oauth|access token|session has expired|code 190/i.test(message)) {
    return "인스타그램 연결이 만료됐거나 토큰이 잘못됐습니다. 연결 설정 화면에서 토큰을 다시 넣어주세요.";
  }
  if (/rate limit|too many|request limit|reduce the amount/i.test(message)) {
    return "인스타그램이 잠시 요청을 막았습니다. 몇 분 뒤에 다시 시도해주세요.";
  }
  if (/permission|scope|not authorized|insufficient/i.test(message)) {
    return "인스타그램 앱에 필요한 권한이 없습니다. 연결 설정을 다시 확인해주세요. (권한: instagram_basic)";
  }
  if (/\(40[13]\)/.test(message)) {
    return "인스타그램이 요청을 거절했습니다. 토큰이 만료됐거나 계정 ID가 맞지 않을 수 있습니다. 연결 설정 화면에서 다시 확인해주세요.";
  }
  if (/연결하지 못했습니다/.test(message)) {
    return "인스타그램 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.";
  }
  return `인스타그램에서 정보를 불러오지 못했습니다. (${message})`;
}

function normalize(d: GraphDiscovery, fallbackHandle: string): InstagramProfile {
  const posts = d.media?.data ?? [];
  const withCounts = posts.filter(
    (p) => typeof p.like_count === "number" || typeof p.comments_count === "number"
  );

  const avg = (pick: (p: GraphMedia) => number | undefined) => {
    if (withCounts.length === 0) return null;
    const sum = withCounts.reduce((acc, p) => acc + (pick(p) ?? 0), 0);
    return Math.round(sum / withCounts.length);
  };

  const avgLikes = avg((p) => p.like_count);
  const avgComments = avg((p) => p.comments_count);
  const followers = d.followers_count ?? null;

  // 참여율 = (평균 좋아요 + 평균 댓글) ÷ 팔로워 × 100.
  // 공구에서는 팔로워 수보다 이 숫자가 실제 판매량에 더 가깝다.
  const engagementRate =
    followers && followers > 0 && (avgLikes !== null || avgComments !== null)
      ? Math.round((((avgLikes ?? 0) + (avgComments ?? 0)) / followers) * 1000) / 10
      : null;

  return {
    igUserId: d.id ?? null,
    username: d.username ?? fallbackHandle,
    name: d.name ?? null,
    bio: d.biography ?? null,
    website: d.website ?? null,
    profileImageUrl: d.profile_picture_url ?? null,
    followers,
    postCount: d.media_count ?? null,
    avgLikes,
    avgComments,
    engagementRate,
    recentPostCount: withCounts.length,
  };
}
