"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatWon } from "@/lib/gonggu";

type Preview = {
  total: number;
  willCreate: number;
  duplicates: number;
  newCreators: string[];
  newProducts: string[];
  unmatchedHeaders: string[];
  usedSavedHeader: boolean;
  skipped: { lineNo: number; reason: string }[];
  sample: {
    creatorName: string;
    productName: string | null;
    startDate: string | null;
    revenue: number | null;
    settlement: number | null;
    status: string;
  }[];
};

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "예정",
  ONGOING: "진행중",
  CLOSED: "종료",
  CANCELED: "취소",
};

export default function SalesImportPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function run(mode: "preview" | "commit") {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/import/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok) {
      setError(data?.error ?? "가져오지 못했습니다.");
      setPreview(null);
      return;
    }

    if (mode === "preview") {
      setPreview(data);
      return;
    }

    setPreview(null);
    setText("");
    setDone(
      `공구 기록 ${data.createdDeals}건을 등록했습니다.` +
        (data.createdCreators ? ` 크리에이터 ${data.createdCreators}명 새로 만듦.` : "") +
        (data.createdProducts ? ` 상품 ${data.createdProducts}개 새로 만듦.` : "") +
        (data.duplicates ? ` 이미 있던 ${data.duplicates}건은 건너뜀.` : "")
    );
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">판매일보 가져오기</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            구글 시트에서 표를 복사해 붙여넣으면 셀러별 공구 기록으로 나뉘어 들어갑니다.
          </p>
        </div>
        <button
          onClick={() => {
            setOpen((v) => !v);
            setDone(null);
          }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          {open ? "닫기" : "열기"}
        </button>
      </div>

      {done && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
          {done}
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
            <p className="mb-1.5">
              구글 시트에서{" "}
              <strong className="text-slate-700">
                제목 줄(닉네임 · 판매 시작 …)부터 마지막 줄까지
              </strong>{" "}
              드래그해서 복사(Ctrl+C)한 뒤 아래에 붙여넣으세요.
            </p>
            <p className="mb-1.5">
              가장 쉬운 방법은 시트 <strong className="text-slate-700">왼쪽 위 모서리</strong>를
              눌러 전체 선택하는 것입니다. 빈 줄은 알아서 걸러냅니다.
            </p>
            <p className="text-slate-400">
              한 번 제목 줄과 함께 가져오고 나면, 다음부터는 내용 줄만 붙여넣어도 됩니다.
            </p>
          </div>

          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPreview(null);
            }}
            placeholder={"링크 전달\t판매 시작\t판매 종료\t…\t닉네임\t매출\t…"}
            className="min-h-32 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          {!preview ? (
            <button
              onClick={() => run("preview")}
              disabled={busy || !text.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
            >
              {busy ? "읽는 중…" : "먼저 확인해보기"}
            </button>
          ) : (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-900">
                읽은 줄 <strong>{preview.total}</strong>개 중{" "}
                <strong className="text-blue-600">{preview.willCreate}건</strong>을 등록합니다.
                {preview.duplicates > 0 && (
                  <span className="text-slate-500">
                    {" "}
                    이미 있는 {preview.duplicates}건은 건너뜁니다.
                  </span>
                )}
              </p>

              {preview.newCreators.length > 0 && (
                <p className="text-xs text-slate-600">
                  <strong className="text-slate-900">새로 만들 크리에이터</strong>{" "}
                  {preview.newCreators.join(", ")}
                </p>
              )}
              {preview.newProducts.length > 0 && (
                <p className="text-xs text-slate-600">
                  <strong className="text-slate-900">새로 만들 상품</strong>{" "}
                  {preview.newProducts.join(", ")}
                </p>
              )}
              {preview.usedSavedHeader && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  제목 줄이 없어서 <strong>지난번에 쓰던 제목 줄</strong>로 맞췄습니다. 아래 표가
                  맞는지 꼭 확인해주세요.
                </p>
              )}
              {preview.unmatchedHeaders.length > 0 && (
                <p className="text-xs text-amber-800">
                  못 알아본 칸(그냥 넘어갑니다): {preview.unmatchedHeaders.join(", ")}
                </p>
              )}
              {preview.skipped.length > 0 && (
                <p className="text-xs text-amber-800">
                  건너뛴 줄:{" "}
                  {preview.skipped.map((s) => `${s.lineNo}번(${s.reason})`).join(", ")}
                </p>
              )}

              {preview.sample.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-1 pr-3 font-medium">셀러</th>
                        <th className="py-1 pr-3 font-medium">상품</th>
                        <th className="py-1 pr-3 font-medium">시작일</th>
                        <th className="py-1 pr-3 font-medium">매출</th>
                        <th className="py-1 pr-3 font-medium">지급액</th>
                        <th className="py-1 font-medium">상태</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {preview.sample.map((r, i) => (
                        <tr key={i} className="border-t border-slate-200">
                          <td className="py-1 pr-3 font-semibold text-slate-900">
                            {r.creatorName}
                          </td>
                          <td className="py-1 pr-3">{r.productName ?? "-"}</td>
                          <td className="py-1 pr-3">{r.startDate ?? "-"}</td>
                          <td className="py-1 pr-3">{formatWon(r.revenue)}</td>
                          <td className="py-1 pr-3">{formatWon(r.settlement)}</td>
                          <td className="py-1">{STATUS_LABEL[r.status] ?? r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.willCreate > preview.sample.length && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      … 외 {preview.willCreate - preview.sample.length}건
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => run("commit")}
                  disabled={busy || preview.willCreate === 0}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {busy ? "등록 중…" : `${preview.willCreate}건 등록하기`}
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
                >
                  다시 확인
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
