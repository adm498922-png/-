"use client";

import { useState } from "react";
import type { SettingsStatus } from "@/lib/settings";
import { DEFAULT_DM_TEMPLATE, DM_PLACEHOLDERS } from "@/lib/dm-template";

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        ok
          ? "bg-green-500/15 text-green-700"
          : "bg-slate-200 text-slate-500"
      }`}
    >
      {ok ? "설정됨" : "미설정"}
    </span>
  );
}

export default function SettingsForm({
  status,
  suggestedRedirectUri,
  gongguOnly = false,
}: {
  status: SettingsStatus;
  suggestedRedirectUri: string;
  /** 공동구매 전용 사이트에서는 스레드·쿠팡 설정을 감춘다 */
  gongguOnly?: boolean;
}) {
  const [coupangAccessKey, setCoupangAccessKey] = useState("");
  const [coupangSecretKey, setCoupangSecretKey] = useState("");
  const [threadsAppId, setThreadsAppId] = useState(status.threadsAppId ?? "");
  const [threadsAppSecret, setThreadsAppSecret] = useState("");
  const [threadsRedirectUri, setThreadsRedirectUri] = useState(
    status.threadsRedirectUri ?? suggestedRedirectUri
  );
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [igBusinessAccountId, setIgBusinessAccountId] = useState(
    status.igBusinessAccountId ?? ""
  );
  const [igAccessToken, setIgAccessToken] = useState("");
  const [dmTemplate, setDmTemplate] = useState(
    status.dmTemplate ?? DEFAULT_DM_TEMPLATE
  );
  const [autoDailyPostEnabled, setAutoDailyPostEnabled] = useState(
    status.autoDailyPostEnabled
  );
  const [autoDailyPostIncludeProducts, setAutoDailyPostIncludeProducts] = useState(
    status.autoDailyPostIncludeProducts
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [current, setCurrent] = useState(status);
  const [runningTest, setRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function handleRunTest() {
    setRunningTest(true);
    setTestResult(null);
    const res = await fetch("/api/auto-daily-post/run", { method: "POST" });
    const data = await res.json();
    setRunningTest(false);
    if (!res.ok) {
      setTestResult(`실패: ${data.error ?? "알 수 없는 오류"}`);
      return;
    }
    const time = new Date(data.scheduledAt).toLocaleString("ko-KR");
    const detail =
      data.kind === "product"
        ? `쿠팡 상품 소개 글 (${data.category})`
        : `일상글 — 소재: ${data.category} · 말투: ${data.tone}`;
    setTestResult(
      `생성됨 — ${detail} · ${time}에 자동 발행 예정 (글 작성/예약 화면에서 확인하세요)`
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coupangAccessKey,
        coupangSecretKey,
        threadsAppId,
        threadsAppSecret,
        threadsRedirectUri,
        openaiApiKey,
        igBusinessAccountId,
        igAccessToken,
        dmTemplate,
        autoDailyPostEnabled,
        autoDailyPostIncludeProducts,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("저장에 실패했습니다.");
      return;
    }
    const updated = await res.json();
    setCurrent(updated);
    setCoupangAccessKey("");
    setCoupangSecretKey("");
    setThreadsAppSecret("");
    setOpenaiApiKey("");
    setIgAccessToken("");
    setMessage("저장되었습니다.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {!gongguOnly && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-semibold text-slate-900">쿠팡파트너스</h2>
            <StatusBadge ok={current.coupangConfigured} />
          </div>
          <p className="mb-4 text-xs text-slate-500">
            쿠팡Wing &gt; 판매자정보 &gt; 추가판매자정보에서 발급받은 OpenAPI
            Access Key / Secret Key를 입력하세요.
          </p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Access Key
              </label>
              <input
                value={coupangAccessKey}
                onChange={(e) => setCoupangAccessKey(e.target.value)}
                placeholder={
                  current.coupangConfigured
                    ? `현재: ${current.coupangAccessKeyPreview} (변경하려면 입력)`
                    : "예: 1a2b3c4d..."
                }
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Secret Key
              </label>
              <input
                type="password"
                value={coupangSecretKey}
                onChange={(e) => setCoupangSecretKey(e.target.value)}
                placeholder={
                  current.coupangConfigured
                    ? "저장되어 있음 (변경하려면 입력)"
                    : ""
                }
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-semibold text-slate-900">공구 제안 DM 문구</h2>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          크리에이터 화면에서 상품을 고르면 이 틀에 값이 채워져 문구가 만들어집니다.
          중괄호 자리에는 그 사람·그 상품의 값이 들어갑니다.
        </p>
        <p className="mb-3 text-xs text-slate-500">
          쓸 수 있는 자리:{" "}
          {DM_PLACEHOLDERS.map((k) => (
            <code
              key={k}
              className="mr-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700"
            >
              {"{" + k + "}"}
            </code>
          ))}
        </p>
        <p className="mb-3 text-xs text-slate-500">
          값이 없는 자리는 자동으로 비워지고, 그 줄에 다른 값도 없으면 줄째 빠집니다.
          (가격을 안 적어둔 상품이면 &quot;소비자가&quot; 줄이 통째로 사라집니다)
        </p>
        <textarea
          value={dmTemplate}
          onChange={(e) => setDmTemplate(e.target.value)}
          className="min-h-56 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm whitespace-pre-wrap text-slate-900 outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={() => setDmTemplate(DEFAULT_DM_TEMPLATE)}
          className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
        >
          기본 문구로 되돌리기
        </button>
      </section>

      {gongguOnly ? (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-semibold text-slate-900">AI 글 자동 생성 (OpenAI)</h2>
              <StatusBadge ok={current.aiConfigured} />
            </div>
            <p className="mb-4 text-xs text-slate-500">
              인스타 프로필을 붙여넣었을 때 이름 · 팔로워 수 · 소개글을 항목별로
              나눠 담는 데 사용됩니다. platform.openai.com에서 발급받은 API 키를
              입력하세요 (ChatGPT 앱 구독과는 별개의 키입니다). 이 키가 없으면
              붙여넣기 자동 정리를 쓸 수 없습니다.
            </p>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder={
                  current.aiConfigured
                    ? "저장되어 있음 (변경하려면 입력)"
                    : "sk-proj-..."
                }
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-semibold text-slate-900">
                인스타그램 프로필 자동 불러오기
              </h2>
              <StatusBadge ok={current.instagramConfigured} />
            </div>
            <p className="mb-4 text-xs text-slate-500">
              연결하면 &quot;공동구매 › 크리에이터&quot; 화면에서 인스타 아이디만
              넣어도 이름 · 소개글 · 팔로워 수 · 최근 게시물 반응(참여율)이 자동으로
              채워집니다. 선택 사항 — 연결하지 않아도 프로필 화면을 복사해
              붙여넣는 방법으로 쓸 수 있습니다.
            </p>
            <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              연결하려면 <strong className="text-slate-600">내 인스타 계정이
              프로페셔널(비즈니스·크리에이터) 계정</strong>이어야 하고, 페이스북
              페이지와 연결되어 있어야 합니다. 상대방도 프로페셔널 계정일 때만
              정보를 가져올 수 있습니다(개인 계정은 인스타그램이 아예 내주지
              않습니다). 값을 어디서 받는지는 대화창에서 한 단계씩 알려드릴게요.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  인스타그램 비즈니스 계정 ID
                </label>
                <input
                  value={igBusinessAccountId}
                  onChange={(e) => setIgBusinessAccountId(e.target.value)}
                  placeholder="17841400000000000"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  액세스 토큰
                </label>
                <input
                  type="password"
                  value={igAccessToken}
                  onChange={(e) => setIgAccessToken(e.target.value)}
                  placeholder={
                    current.instagramConfigured
                      ? "저장되어 있음 (변경하려면 입력)"
                      : "EAAG..."
                  }
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <details className="group space-y-8 rounded-xl border border-slate-200 bg-slate-50 p-5 [&_section]:bg-white">
            <summary className="cursor-pointer text-sm font-semibold text-slate-600 group-open:mb-4">
              고급 설정 (Threads 앱 등록 · AI 키 · 자동화)
            </summary>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-semibold text-slate-900">Threads 개발자 앱</h2>
              <StatusBadge ok={current.threadsConfigured} />
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Meta 개발자 앱의 App ID / App Secret을 입력하고, 아래 Redirect URI를
              Meta 개발자 콘솔의 Threads &gt; 설정에 동일하게 등록하세요.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  App ID
                </label>
                <input
                  value={threadsAppId}
                  onChange={(e) => setThreadsAppId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  App Secret
                </label>
                <input
                  type="password"
                  value={threadsAppSecret}
                  onChange={(e) => setThreadsAppSecret(e.target.value)}
                  placeholder={
                    current.threadsConfigured
                      ? "저장되어 있음 (변경하려면 입력)"
                      : ""
                  }
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Redirect URI (Meta 콘솔에 그대로 등록)
                </label>
                <input
                  value={threadsRedirectUri}
                  onChange={(e) => setThreadsRedirectUri(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-semibold text-slate-900">AI 글 자동 생성 (OpenAI)</h2>
              <StatusBadge ok={current.aiConfigured} />
            </div>
            <p className="mb-4 text-xs text-slate-500">
              선택한 쿠팡 상품 정보를 바탕으로 AI가 스레드 글 초안을 매번 새로
              써주는 기능에 사용됩니다. platform.openai.com에서 발급받은 API
              키를 입력하세요 (ChatGPT 앱 구독과는 별개의 키입니다). 선택
              사항 — 입력하지 않으면 AI 초안 생성 버튼이 비활성화됩니다.
            </p>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder={
                  current.aiConfigured
                    ? "저장되어 있음 (변경하려면 입력)"
                    : "sk-proj-..."
                }
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-semibold text-slate-900">
                인스타그램 프로필 자동 불러오기
              </h2>
              <StatusBadge ok={current.instagramConfigured} />
            </div>
            <p className="mb-4 text-xs text-slate-500">
              연결하면 &quot;공동구매 › 크리에이터&quot; 화면에서 인스타 아이디만
              넣어도 이름 · 소개글 · 팔로워 수 · 최근 게시물 반응(참여율)이 자동으로
              채워집니다. 선택 사항 — 연결하지 않아도 프로필 화면을 복사해
              붙여넣는 방법으로 쓸 수 있습니다.
            </p>
            <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              연결하려면 <strong className="text-slate-600">내 인스타 계정이
              프로페셔널(비즈니스·크리에이터) 계정</strong>이어야 하고, 페이스북
              페이지와 연결되어 있어야 합니다. 상대방도 프로페셔널 계정일 때만
              정보를 가져올 수 있습니다(개인 계정은 인스타그램이 아예 내주지
              않습니다). 값을 어디서 받는지는 대화창에서 한 단계씩 알려드릴게요.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  인스타그램 비즈니스 계정 ID
                </label>
                <input
                  value={igBusinessAccountId}
                  onChange={(e) => setIgBusinessAccountId(e.target.value)}
                  placeholder="17841400000000000"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  액세스 토큰
                </label>
                <input
                  type="password"
                  value={igAccessToken}
                  onChange={(e) => setIgAccessToken(e.target.value)}
                  placeholder={
                    current.instagramConfigured
                      ? "저장되어 있음 (변경하려면 입력)"
                      : "EAAG..."
                  }
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-semibold text-slate-900">매일 자동 일상글 생성</h2>
              <StatusBadge ok={autoDailyPostEnabled} />
            </div>
            <p className="mb-4 text-xs text-slate-500">
              켜두면 <strong className="text-slate-600">매시 1~19분 사이</strong>{" "}
              (테스트 기간 동안 하루 24개) AI가 소재·말투를 스스로 골라 일상글
              초안을 만들고, <strong className="text-slate-600">1분 뒤</strong>로
              자동 예약해둡니다. 그 사이 &quot;글 작성/예약&quot; 화면에서 확인·
              수정·취소할 수 있고, 아무것도 안 하면 그대로 자동 발행됩니다.
              OpenAI API 키가 설정되어 있어야 동작합니다.
            </p>
            <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={autoDailyPostEnabled}
                onChange={(e) => setAutoDailyPostEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 bg-slate-50"
              />
              매일 자동 생성 켜기
            </label>

            <label className="mb-4 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={autoDailyPostIncludeProducts}
                onChange={(e) => setAutoDailyPostIncludeProducts(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 bg-slate-50"
              />
              자주(약 60%) 쿠팡 상품 소개 글도 섞기
            </label>
            <p className="-mt-3 mb-4 text-xs text-slate-500">
              &quot;쿠팡 링크&quot; 화면에서 직접 검색해 만들어둔 링크 중에서만
              랜덤으로 골라 소개 글을 씁니다. AI가 상품을 스스로 검색해 자동으로
              채워넣지는 않으니, 소개하고 싶은 상품은 미리 직접 등록해두세요.
            </p>

            <div className="border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={handleRunTest}
                disabled={runningTest}
                className="rounded-lg bg-purple-600/20 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-600/30 disabled:opacity-50"
              >
                {runningTest ? "생성 중..." : "✦ 지금 바로 테스트 실행 (설정과 무관하게 1개 생성)"}
              </button>
              {testResult && (
                <p className="mt-2 text-xs text-slate-500">{testResult}</p>
              )}
            </div>
          </section>
          </details>
        </>
      )}

      {message && <p className="text-sm text-blue-600">{message}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
