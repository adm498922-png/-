/**
 * 캠페인 DM 발송 큐 전용 문구 만들기.
 *
 * 크리에이터 상세 화면의 공구 제안 DM(dm-template.ts)과는 자리표시자 구성이 달라서
 * (캠페인·광고 관련 항목이 더 많다) 따로 둔다. 기존 dm-template.ts는 그대로 둔다.
 */

export type CampaignDmValues = {
  핸들: string | null;
  이름: string | null;
  팔로워: string | null;
  게시물수: string | null;
  참여율: string | null;
  캠페인명: string | null;
  브랜드: string | null;
  카테고리: string | null;
  혜택: string | null;
  광고비: string | null;
  업로드기간: string | null;
  제품제공: string | null;
  이차활용: string | null;
  판매가: string | null;
  수수료: string | null;
  목표수량: string | null;
  진행기간: string | null;
};

const PLACEHOLDER_KEY: Record<keyof CampaignDmValues, string> = {
  핸들: "핸들",
  이름: "이름",
  팔로워: "팔로워",
  게시물수: "게시물수",
  참여율: "참여율",
  캠페인명: "캠페인명",
  브랜드: "브랜드",
  카테고리: "카테고리",
  혜택: "혜택",
  광고비: "광고비",
  업로드기간: "업로드기간",
  제품제공: "제품제공",
  이차활용: "2차활용",
  판매가: "판매가",
  수수료: "수수료",
  목표수량: "목표수량",
  진행기간: "진행기간",
};

export const DM_QUEUE_PLACEHOLDERS = Object.values(PLACEHOLDER_KEY);

export function fillCampaignDmTemplate(template: string, values: CampaignDmValues): string {
  let out = template;
  for (const key of Object.keys(PLACEHOLDER_KEY) as (keyof CampaignDmValues)[]) {
    const token = `{${PLACEHOLDER_KEY[key]}}`;
    out = out.split(token).join(values[key] ?? "");
  }
  return out
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function estimateAdFee(followers: number | null | undefined): string {
  const f = followers ?? 0;
  if (f >= 300000) return "약 70만원 이상";
  if (f >= 100000) return "약 30만원";
  if (f >= 10000) return "약 10만원";
  return "협의";
}

export const DM_QUEUE_PRESETS = {
  general: `안녕하세요 {핸들}님! 👋

{카테고리} 콘텐츠 너무 잘 보고 있어요.
팔로워 {팔로워}명과 함께하시는 모습이 인상적입니다.

저희와 협업 제안드리고 싶어 연락드렸는데,
편하신 시간에 답장 주시면 자세히 설명드리겠습니다.

감사합니다!`,

  ad: `안녕하세요 {핸들}님 👋

{브랜드}의 [{캠페인명}] 광고 캠페인으로 연락드립니다.

· 광고비: {광고비}
· 업로드 기간: {업로드기간}
· {제품제공}
{2차활용}

{핸들}님의 {카테고리} 콘텐츠가 저희 브랜드와 잘 맞을 것 같아 제안드립니다.
관심 있으시면 답장 주세요 🙌`,

  collab: `안녕하세요 {핸들}님! 🙌

{브랜드} [{캠페인명}] 공구/협업 제안드립니다.

· 판매가: {판매가}
· 수수료: {수수료}
· 진행 기간: {진행기간}
· 혜택: {혜택}

팔로워 {팔로워}명과 함께 좋은 성과 기대됩니다.
관심 있으시면 편하게 답장 주세요!`,
} as const;

export function instagramDmUrl(handle: string | null | undefined): string | null {
  const h = (handle ?? "").trim().replace(/^@/, "");
  if (!h) return null;
  return `https://ig.me/m/${encodeURIComponent(h)}`;
}
