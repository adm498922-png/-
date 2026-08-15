export const TOPIC_CATEGORIES = [
  "일상",
  "감정·생각",
  "관계",
  "알바·직장",
  "돈·소비",
  "취미·덕질",
  "건강·운동",
  "음식",
];

export const TONE_OPTIONS = ["반말", "존댓말", "친구처럼", "담백하게", "감성", "유쾌"];

type TimeSlotDef = { start: number; end: number; label: string; hint: string };

const TIME_SLOTS: TimeSlotDef[] = [
  { start: 0, end: 5, label: "새벽", hint: "잠 못 드는 새벽, 혼자만의 조용한 새벽 감성 같은 소재" },
  { start: 5, end: 9, label: "아침", hint: "기상, 아침 준비, 등교·출근길, 아침 컨디션처럼 이른 아침에 어울리는 소재" },
  { start: 9, end: 12, label: "오전", hint: "출근·등교 후 오전 업무나 수업, 카페인 충전처럼 오전 시간대 소재" },
  { start: 12, end: 14, label: "점심", hint: "점심 메뉴, 점심시간에 있었던 일 같은 점심시간 소재" },
  { start: 14, end: 18, label: "오후", hint: "나른한 오후, 업무 중 딴생각, 오후 간식이나 카페 같은 소재" },
  { start: 18, end: 21, label: "저녁", hint: "퇴근길, 저녁 약속이나 집밥, 하루를 마무리하는 저녁 소재" },
  { start: 21, end: 24, label: "밤", hint: "하루를 되돌아보는 밤, 넷플릭스·침대·혼술 같은 늦은 밤 소재" },
];

/** 지금 시각(기본은 현재 시각)에 어울리는 소재 힌트를 골라, 글이 그 시간대 느낌을 자연스럽게 담도록 한다. */
export function getTimeSlot(date: Date = new Date()): { label: string; hint: string } {
  const hour = date.getHours();
  const slot = TIME_SLOTS.find((s) => hour >= s.start && hour < s.end);
  return slot ?? TIME_SLOTS[0];
}

export const ENGAGEMENT_PROMPTS = [
  "다들 이런 거 하나씩 있지 않아?",
  "혹시 더 좋은 거 쓰는 사람 있으면 댓글로 좀 알려줘",
  "나만 이제 알았나 싶어서 올려봄",
  "비슷한 상황이면 진짜 공감될 듯",
];

export const COUPANG_DISCLOSURE =
  "[광고] 📢 이 포스팅은 쿠팡 제휴 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

/** 쿠팡 링크를 댓글에 달 때 쓰는 형식 (고지문구 + 유도문구 + 링크) */
export function buildCoupangComment(shortUrl: string, teaser: string): string {
  return `${COUPANG_DISCLOSURE}\n\n👇👇 ${teaser}\n${shortUrl}`;
}
