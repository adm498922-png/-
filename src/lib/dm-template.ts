/**
 * 공구 제안 DM 문구 만들기 (고정 틀).
 *
 * 설정 화면에 저장해 둔 틀에 크리에이터·상품 정보를 끼워 넣는다.
 * 값이 없는 자리는 그 줄을 통째로 뺀다 — "소비자가 -" 같은 어색한 줄이 남지 않게.
 */

export const DEFAULT_DM_TEMPLATE = `안녕하세요 {크리에이터}님 :)
공동구매 제안드리고 싶어 연락드렸습니다.

{브랜드} {상품명}

· 소비자가 {소비자가}
· 크리에이터 수수료 {수수료}
· 진행 기간은 협의 가능합니다

계정 결과 잘 맞을 것 같아 먼저 여쭤봅니다.
관심 있으시면 상세 자료 보내드릴게요!`;

export type DmValues = {
  크리에이터: string | null;
  아이디: string | null;
  상품명: string | null;
  브랜드: string | null;
  소비자가: string | null;
  공급가: string | null;
  수수료: string | null;
  상품메모: string | null;
};

/** 틀에서 쓸 수 있는 자리표시자 목록 (설정 화면 안내에 그대로 보여준다) */
export const DM_PLACEHOLDERS: (keyof DmValues)[] = [
  "크리에이터",
  "아이디",
  "상품명",
  "브랜드",
  "소비자가",
  "공급가",
  "수수료",
  "상품메모",
];

export function fillDmTemplate(template: string, values: DmValues): string {
  const lines = template.split("\n");

  const kept = lines.filter((line) => {
    const used = DM_PLACEHOLDERS.filter((key) => line.includes(`{${key}}`));
    if (used.length === 0) return true;
    // 이 줄이 쓰는 값이 전부 비어 있을 때만 줄을 통째로 뺀다.
    // 일부만 있으면(예: 브랜드는 없고 상품명만 있음) 있는 것만 채워 넣는다.
    return used.some((key) => {
      const v = values[key];
      return v !== null && v !== undefined && String(v).trim() !== "";
    });
  });

  const filled = kept.map((line) => {
    let out = line;
    for (const key of DM_PLACEHOLDERS) {
      out = out.split(`{${key}}`).join(values[key] ?? "");
    }
    // 값이 빠져 생긴 이중 공백·앞뒤 공백 정리
    return out.replace(/[ \t]{2,}/g, " ").trim();
  });

  // 빈 줄이 세 줄 이상 이어지면 두 줄로 줄인다
  return filled
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 인스타 DM 창을 바로 여는 주소. 아이디가 없으면 못 연다. */
export function instagramDmUrl(handle: string | null | undefined): string | null {
  const h = (handle ?? "").trim().replace(/^@/, "");
  if (!h) return null;
  return `https://ig.me/m/${encodeURIComponent(h)}`;
}
