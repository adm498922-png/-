/**
 * 인스타 프로필 화면에서 복사한 글을 다듬는 도구들.
 *
 * AI를 쓰지 않는 순수 계산이라 저장 경로 어디서든 가볍게 부를 수 있다.
 */

/** 인스타 프로필 화면의 버튼 이름들. 여기부터 아래는 소개글이 아니다. */
const UI_LABELS = [
  "팔로잉",
  "팔로우하기",
  "팔로우",
  "메시지 보내기",
  "메시지",
  "친구 추가",
  "Following",
  "Follow",
  "Message",
];

/**
 * 프로필 화면을 통째로 복사하면 소개글 뒤에 버튼(팔로잉·메시지 보내기)과
 * 스토리 하이라이트 이름(공구일정, 이벤트발표 …)까지 딸려온다.
 * 버튼이 처음 나오는 지점에서 잘라내 소개글까지만 남긴다.
 */
export function cutAtButtons(text: string): string {
  const lines = text.split("\n");
  const cut = lines.findIndex((line) => {
    const t = line.trim().replace(/\s+/g, " ");
    if (!t) return false;
    if (UI_LABELS.some((l) => t === l || t === l + " ∨" || t === l + " v")) return true;
    // '팔로잉메시지 보내기+친구' 처럼 붙어서 한 줄로 들어오는 경우
    const squeezed = t.replace(/[\s+]/g, "");
    return (
      squeezed.startsWith("팔로잉메시지") ||
      squeezed.startsWith("팔로우메시지") ||
      squeezed.startsWith("FollowingMessage")
    );
  });
  return cut === -1 ? text : lines.slice(0, cut).join("\n");
}

/**
 * 소개글에서 군더더기 줄(탭 제목·아이디·숫자 줄·버튼 이름·링크)을 걷어낸다.
 * 붙여넣기로 들어올 때뿐 아니라, 저장할 때마다 한 번 더 거른다.
 */
export function cleanProfileBio(
  bio: string | null,
  handle: string | null,
  link: string | null
): string | null {
  if (!bio) return null;
  const bareLink = link ? link.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;
  const drop = (line: string) => {
    const t = line.trim();
    if (!t) return true;
    // 링크는 따로 저장해서 눌러볼 수 있게 보여주므로 소개글에서는 뺀다
    if (bareLink && t.replace(/^https?:\/\//, "").replace(/\/$/, "") === bareLink) return true;
    if (handle && t.replace(/^@/, "") === handle) return true;
    if (/^(게시물|팔로워|팔로우|팔로잉|posts|followers|following)\s*[\d,.만천KkMm]+$/i.test(t)) return true;
    if (UI_LABELS.some((l) => t === l)) return true;
    if (/(instagram\.com|threads\.(net|com))/i.test(t) && t.length < 60) return true;
    if (/•\s*Instagram|Instagram 사진 및 동영상/i.test(t)) return true;
    return false;
  };
  const kept = bio.split("\n").filter((line) => !drop(line));
  const out = kept.join("\n").trim();
  return out ? out : null;
}


/** "link.inpock.co.kr/…" 처럼 http가 빠진 주소도 눌러서 열 수 있게 만든다. */
export function withScheme(url: string | null): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** AI가 링크를 못 뽑았을 때 원문에서 직접 찾는다. 인스타 주소는 제외. */
export function findLinkInBio(text: string): string | null {
  const matches = text.match(/(?:https?:\/\/)?[\w-]+(?:\.[\w-]+)+\/[^\s]*/g);
  if (!matches) return null;
  const external = matches.find((m) => !/instagram\.com|threads\.(net|com)/i.test(m));
  if (!external) return null;
  return external.startsWith("http") ? external : `https://${external}`;
}

/** 저장된 소개글에 아직 군더더기(팔로워 수·버튼 이름 등)가 남아 있는지 */
export function looksDirtyBio(bio: string | null | undefined): boolean {
  if (!bio) return false;
  return bio.split("\n").some((line) => {
    const t = line.trim();
    if (!t) return false;
    if (/^(게시물|팔로워|팔로우|팔로잉)\s*[\d,.만천]+$/.test(t)) return true;
    return UI_LABELS.some((l) => t === l);
  });
}

/**
 * 소개글 한 번에 다듬기 — 버튼 뒤(하이라이트)를 잘라내고 군더더기 줄을 걷어낸다.
 * 붙여넣을 때와 저장할 때 모두 이 함수를 쓴다.
 */
export function tidyBio(
  bio: string | null | undefined,
  handle: string | null,
  link: string | null
): string | null {
  if (!bio) return null;
  return cleanProfileBio(cutAtButtons(bio), handle, link);
}
