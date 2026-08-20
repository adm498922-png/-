import OpenAI from "openai";
import { getDecryptedSettings } from "./settings";
import { extractInstagramHandle } from "./instagram-discovery";
import { cutAtButtons, findLinkInBio, tidyBio, withScheme } from "./profile-text";

/**
 * 인스타그램 앱/웹에서 프로필 화면을 그대로 긁어 복사해 붙여넣은 텍스트에서
 * 이름·아이디·팔로워 수·소개글·분야를 뽑아낸다.
 *
 * 인스타 공식 연결(Business Discovery)이 안 되어 있거나 상대가 개인 계정일 때 쓰는 길이다.
 * 사용자가 직접 복사한 내용을 다루는 것뿐이라 인스타그램을 자동으로 긁지 않는다.
 */

export type ParsedProfile = {
  name: string | null;
  handle: string | null;
  followers: number | null;
  following: number | null;
  postCount: number | null;
  bio: string | null;
  category: string | null;
  profileUrl: string | null;
  linkInBio: string | null;
  tags: string | null;
  isGongguCreator: boolean;
};

const SYSTEM_PROMPT = `너는 인스타그램 프로필 화면에서 복사한 텍스트를 정리하는 도우미다.
주어진 텍스트에서 아래 항목만 뽑아 JSON으로 답한다.

- name: 프로필에 표시된 이름(활동명). 아이디가 아니라 사람이 읽는 이름.
- handle: @ 뒤에 오는 영문 아이디. @는 빼고 아이디만.
- followers: 팔로워 수를 숫자로. "3.2만" → 32000, "1,234" → 1234, "12.5K" → 12500, "1.1M" → 1100000.
- postCount: 게시물 수를 숫자로. 없으면 null.
- following: '팔로우' 수(이 사람이 팔로우하는 수)를 숫자로. 없으면 null.
- bio: 프로필 소개글만. 줄바꿈은 유지.
  ★ 아래는 소개글이 아니므로 절대 넣지 않는다:
    - 맨 윗줄의 브라우저 탭 제목, 아이디(@로 시작하는 본인 계정)
    - "게시물 1816", "팔로워 10만", "팔로우 774" 같은 숫자 줄
    - "팔로잉", "팔로우", "메시지 보내기" 같은 버튼 이름
    - 스토리 하이라이트 이름 목록(공구일정, 이벤트발표 처럼 짧은 단어가 죽 나열된 부분)
- category: 어떤 분야인지 한국어 한 단어로 추측 (예: 육아, 주방, 리빙, 뷰티, 식품, 패션, 반려동물, 여행). 근거가 없으면 null.
- profileUrl: 텍스트 안에 인스타그램 주소가 있으면 그대로. 없으면 null.
- linkInBio: 소개글에 걸린 바깥 링크(인포크링크 link.inpock.co.kr, 링크트리 linktr.ee, 스마트스토어, 블로그 등). 여러 개면 첫 번째. 없으면 null.
- isGongguCreator: 소개글에 공구·공동구매·구매링크·제품정보·공구일정·인포크링크처럼 공동구매를 진행한다는 신호가 있으면 true, 없으면 false.

규칙:
- 확실하지 않은 항목은 지어내지 말고 null을 넣는다.
- 팔로워와 게시물 수를 헷갈리지 않는다. 보통 "게시물 / 팔로워 / 팔로잉" 순서로 붙어 있다.
- 소개글 첫 줄이 "사라 | sara | 인테리어 | 집꾸미기" 처럼 이름과 분야를 |로 나눠 적은 경우,
  맨 앞을 name 후보로, 나머지를 category 근거로 쓴다.
- 맨 윗줄이 "사라 (@_sara_.home) • Instagram 사진 및 동영상" 같은 브라우저 탭 제목이면
  괄호 앞을 name, @ 뒤를 handle로 쓴다. 이 줄 자체는 bio에 넣지 않는다.
- 설명·인사말·코드펜스 없이 JSON만 출력한다.

출력 형식:
{"name":"","handle":"","followers":null,"following":null,"postCount":null,"bio":"","category":null,"profileUrl":null,"linkInBio":null,"isGongguCreator":false}`;

/** OpenAI가 뱉는 영어 오류를 사장님이 읽을 수 있는 말로 바꾼다. */
function friendlyAiError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (/401|invalid_api_key|incorrect api key/i.test(message)) {
    return "AI 키가 올바르지 않습니다. 연결 설정 화면에서 OpenAI 키를 다시 넣어주세요.";
  }
  if (/quota|billing|insufficient_quota/i.test(message)) {
    return "OpenAI 사용 한도가 다 됐거나 결제가 필요합니다. OpenAI 계정을 확인해주세요.";
  }
  if (/429|rate limit/i.test(message)) {
    return "AI 요청이 잠시 몰렸습니다. 몇 초 뒤에 다시 눌러주세요.";
  }
  return "AI에 연결하지 못했습니다. 잠시 후 다시 시도하거나 직접 입력해주세요.";
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

export async function parseProfilePaste(text: string): Promise<ParsedProfile> {
  const trimmed = cutAtButtons(text).trim();
  if (!trimmed) {
    throw new Error("붙여넣은 내용이 비어 있습니다.");
  }

  const settings = await getDecryptedSettings();
  if (!settings.openaiApiKey) {
    throw new Error(
      "AI 키가 없어서 붙여넣기 자동 정리를 쓸 수 없습니다. 연결 설정 화면에서 OpenAI 키를 먼저 넣어주세요."
    );
  }

  const client = new OpenAI({ apiKey: settings.openaiApiKey });

  let response;
  try {
    response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: trimmed.slice(0, 4000) },
      ],
    });
  } catch (err) {
    throw new Error(friendlyAiError(err));
  }

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("AI가 내용을 읽지 못했습니다. 직접 입력해주세요.");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI 응답을 이해하지 못했습니다. 직접 입력해주세요.");
  }

  // 붙여넣은 원문에 주소가 있으면 AI 판단보다 그쪽을 믿는다.
  const handleFromText = extractInstagramHandle(trimmed);

  const handle = toText(parsed.handle)?.replace(/^@/, "") ?? handleFromText;
  const linkInBio = withScheme(toText(parsed.linkInBio) ?? findLinkInBio(trimmed));
  const bio = tidyBio(toText(parsed.bio), handle, linkInBio);
  // AI가 놓쳐도 원문에 공구 신호가 있으면 잡아낸다.
  const gongguSignal =
    parsed.isGongguCreator === true ||
    /공구|공동구매|구매링크|제품정보|inpock|linktr/i.test(trimmed);

  return {
    name: toText(parsed.name),
    handle,
    followers: toNumber(parsed.followers),
    following: toNumber(parsed.following),
    postCount: toNumber(parsed.postCount),
    bio,
    category: toText(parsed.category),
    profileUrl: toText(parsed.profileUrl),
    linkInBio,
    tags: gongguSignal ? "공구진행중" : null,
    isGongguCreator: gongguSignal,
  };
}

