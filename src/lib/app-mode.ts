/**
 * 이 서버를 어떤 모드로 띄울지 (환경변수 APP_MODE).
 *
 * - "full"    : 스레드 발행 + 공동구매 전부 (값을 안 주면 기본값)
 * - "threads" : 스레드 발행만 — 기존 사이트용
 * - "gonggu"  : 공동구매 크리에이터 관리만 — 공구 전용 사이트용
 *
 * 코드는 하나지만 Railway에 두 번 띄우고 APP_MODE와 DATABASE_URL만 다르게 주면
 * 자료가 섞이지 않는 별개의 사이트 두 개가 된다.
 */
export type AppMode = "full" | "threads" | "gonggu";

export function getAppMode(): AppMode {
  const raw = process.env.APP_MODE;
  if (raw === "gonggu" || raw === "threads") return raw;
  return "full";
}

/** 공동구매 화면만 보여주는 사이트인가 */
export function isGongguOnly(): boolean {
  return getAppMode() === "gonggu";
}

/** 공동구매 화면을 감출 사이트인가 */
export function hidesGonggu(): boolean {
  return getAppMode() === "threads";
}

export const APP_TITLE: Record<AppMode, string> = {
  full: "Threads Hub",
  threads: "Threads Hub",
  gonggu: "Y글로벌",
};
