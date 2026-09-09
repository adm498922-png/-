import { prisma } from "./prisma";
import { getDecryptedSettings } from "./settings";
import { runDealsImport } from "./deals-import";

/**
 * 판매일보 구글 시트 자동 동기화.
 *
 * 사용자가 "링크가 있는 모든 사용자 - 뷰어"로 공유한 구글 시트 주소를 등록해두면,
 * 매시간 그 시트를 CSV로 내려받아 판매일보 가져오기(runDealsImport)를 돌린다.
 * 이미 들어간 줄은 가져오기가 알아서 건너뛰기 때문에, 시트에 새로 적은 줄만 쌓인다.
 */

/** 구글 시트 주소 → CSV로 내려받는 주소. 구글 시트 링크가 아니면 null. */
export function sheetCsvUrl(url: string): string | null {
  const m = url.match(
    /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
  );
  if (!m) return null;
  const gid = url.match(/[#?&]gid=(\d+)/)?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}

export type SheetSyncOutcome = {
  ok: boolean;
  note: string; // 화면에 보여줄 결과 한 줄
};

/** 등록된 시트를 한 번 동기화하고, 결과를 Settings에 기록한다. */
export async function syncSalesSheetOnce(): Promise<SheetSyncOutcome> {
  const settings = await getDecryptedSettings();
  const url = settings.salesSheetUrl?.trim();
  if (!url) {
    return { ok: false, note: "연결된 구글 시트가 없습니다." };
  }

  const outcome = await doSync(url);
  await prisma.settings.update({
    where: { id: "singleton" },
    data: {
      salesSheetSyncedAt: new Date(),
      salesSheetSyncNote: outcome.note,
    },
  });
  return outcome;
}

async function doSync(url: string): Promise<SheetSyncOutcome> {
  const csvUrl = sheetCsvUrl(url);
  if (!csvUrl) {
    return {
      ok: false,
      note: "구글 시트 주소가 아닙니다. docs.google.com/spreadsheets/… 형태의 링크를 넣어주세요.",
    };
  }

  let res: Response;
  try {
    res = await fetch(csvUrl, { redirect: "follow" });
  } catch {
    return { ok: false, note: "구글 시트에 접속하지 못했습니다. 잠시 후 다시 시도해주세요." };
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || contentType.includes("text/html")) {
    // 권한이 없으면 구글이 로그인 페이지(HTML)를 돌려준다
    return {
      ok: false,
      note:
        "시트를 읽지 못했습니다. 구글 시트에서 공유 → '링크가 있는 모든 사용자'를 '뷰어'로 바꿨는지 확인해주세요.",
    };
  }

  const text = await res.text();
  const result = await runDealsImport(text, "commit");
  if (!result.ok) {
    return { ok: false, note: `시트는 읽었지만 가져오지 못했습니다: ${result.error}` };
  }
  if (result.mode !== "commit") {
    return { ok: false, note: "가져오기 처리 중 오류가 났습니다." };
  }

  const parts: string[] = [];
  parts.push(
    result.createdDeals > 0
      ? `새 기록 ${result.createdDeals}건 등록`
      : "새로 적힌 줄 없음"
  );
  if (result.createdCreators > 0) parts.push(`크리에이터 ${result.createdCreators}명 추가`);
  if (result.createdProducts > 0) parts.push(`상품 ${result.createdProducts}개 추가`);
  if (result.duplicates > 0) parts.push(`이미 있던 ${result.duplicates}건 건너뜀`);
  return { ok: true, note: parts.join(" · ") };
}
