const DATALAB_URL = "https://openapi.naver.com/v1/datalab/search";

export class NaverDataLabError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export type KeywordTrend = { keyword: string; score: number };

function todayStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 후보 키워드들의 최근 7일 검색량 추이를 네이버 데이터랩으로 비교해,
 * 각 키워드의 가장 최근 상대 검색량(ratio, 0~100)을 반환한다.
 * (네이버 API는 "요즘 인기있는 키워드"를 알려주지 않고, 준 키워드끼리
 * 상대 비교만 해주므로 후보 목록은 호출하는 쪽에서 준비해야 한다.)
 */
export async function compareKeywordTrends(params: {
  clientId: string;
  clientSecret: string;
  keywords: string[];
}): Promise<KeywordTrend[]> {
  if (params.keywords.length === 0) return [];

  const end = new Date();
  const start = new Date(end.getTime() - 6 * 86400000);

  const res = await fetch(DATALAB_URL, {
    method: "POST",
    headers: {
      "X-Naver-Client-Id": params.clientId,
      "X-Naver-Client-Secret": params.clientSecret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: todayStr(start),
      endDate: todayStr(end),
      timeUnit: "date",
      keywordGroups: params.keywords.map((k) => ({
        groupName: k,
        keywords: [k],
      })),
    }),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!res.ok) {
    const message =
      typeof json === "object" && json !== null && "message" in json
        ? String((json as { message?: unknown }).message)
        : String(json).slice(0, 200);
    throw new NaverDataLabError(`네이버 데이터랩 API 오류: ${message}`, res.status);
  }

  const parsed = json as {
    results?: { title: string; data: { period: string; ratio: number }[] }[];
  };

  return (parsed.results ?? []).map((r) => {
    const last = r.data[r.data.length - 1];
    return { keyword: r.title, score: last?.ratio ?? 0 };
  });
}
