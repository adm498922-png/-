"use client";

import { useState } from "react";
import type { SettingsStatus } from "@/lib/settings";

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        ok
          ? "bg-green-500/15 text-green-400"
          : "bg-neutral-700 text-neutral-400"
      }`}
    >
      {ok ? "설정됨" : "미설정"}
    </span>
  );
}

export default function SettingsForm({
  status,
  suggestedRedirectUri,
}: {
  status: SettingsStatus;
  suggestedRedirectUri: string;
}) {
  const [coupangAccessKey, setCoupangAccessKey] = useState("");
  const [coupangSecretKey, setCoupangSecretKey] = useState("");
  const [threadsAppId, setThreadsAppId] = useState(status.threadsAppId ?? "");
  const [threadsAppSecret, setThreadsAppSecret] = useState("");
  const [threadsRedirectUri, setThreadsRedirectUri] = useState(
    status.threadsRedirectUri ?? suggestedRedirectUri
  );
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [naverClientId, setNaverClientId] = useState(status.naverClientId ?? "");
  const [naverClientSecret, setNaverClientSecret] = useState("");
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
        naverClientId,
        naverClientSecret,
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
    setNaverClientSecret("");
    setMessage("저장되었습니다.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-semibold text-white">쿠팡파트너스</h2>
          <StatusBadge ok={current.coupangConfigured} />
        </div>
        <p className="mb-4 text-xs text-neutral-500">
          쿠팡Wing &gt; 판매자정보 &gt; 추가판매자정보에서 발급받은 OpenAPI
          Access Key / Secret Key를 입력하세요.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
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
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
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
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-semibold text-white">Threads 개발자 앱</h2>
          <StatusBadge ok={current.threadsConfigured} />
        </div>
        <p className="mb-4 text-xs text-neutral-500">
          Meta 개발자 앱의 App ID / App Secret을 입력하고, 아래 Redirect URI를
          Meta 개발자 콘솔의 Threads &gt; 설정에 동일하게 등록하세요.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              App ID
            </label>
            <input
              value={threadsAppId}
              onChange={(e) => setThreadsAppId(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
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
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              Redirect URI (Meta 콘솔에 그대로 등록)
            </label>
            <input
              value={threadsRedirectUri}
              onChange={(e) => setThreadsRedirectUri(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-semibold text-white">AI 글 자동 생성 (OpenAI)</h2>
          <StatusBadge ok={current.aiConfigured} />
        </div>
        <p className="mb-4 text-xs text-neutral-500">
          선택한 쿠팡 상품 정보를 바탕으로 AI가 스레드 글 초안을 매번 새로
          써주는 기능에 사용됩니다. platform.openai.com에서 발급받은 API
          키를 입력하세요 (ChatGPT 앱 구독과는 별개의 키입니다). 선택
          사항 — 입력하지 않으면 AI 초안 생성 버튼이 비활성화됩니다.
        </p>
        <div>
          <label className="mb-1 block text-xs text-neutral-400">
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
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-semibold text-white">네이버 데이터랩 (검색 트렌드)</h2>
          <StatusBadge ok={current.naverConfigured} />
        </div>
        <p className="mb-4 text-xs text-neutral-500">
          상품 자동 수집 시, AI가 추측만 하지 않고 후보 키워드들을 실제 최근
          7일 검색 트렌드로 비교해서 고르게 됩니다. developers.naver.com →
          Application 등록(검색 API) 후 발급받은 키를 입력하세요. 선택
          사항 — 비워두면 AI 추측만으로 키워드를 정합니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              Client ID
            </label>
            <input
              type="text"
              value={naverClientId}
              onChange={(e) => setNaverClientId(e.target.value)}
              placeholder="네이버 애플리케이션 Client ID"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              Client Secret
            </label>
            <input
              type="password"
              value={naverClientSecret}
              onChange={(e) => setNaverClientSecret(e.target.value)}
              placeholder={
                current.naverConfigured
                  ? "저장되어 있음 (변경하려면 입력)"
                  : "Client Secret"
              }
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-semibold text-white">매일 자동 일상글 생성</h2>
          <StatusBadge ok={autoDailyPostEnabled} />
        </div>
        <p className="mb-4 text-xs text-neutral-500">
          켜두면 <strong className="text-neutral-300">매시 1~19분 사이</strong>{" "}
          (테스트 기간 동안 하루 24개) AI가 소재·말투를 스스로 골라 일상글
          초안을 만들고, <strong className="text-neutral-300">1분 뒤</strong>로
          자동 예약해둡니다. 그 사이 &quot;글 작성/예약&quot; 화면에서 확인·
          수정·취소할 수 있고, 아무것도 안 하면 그대로 자동 발행됩니다.
          OpenAI API 키가 설정되어 있어야 동작합니다.
        </p>
        <label className="mb-2 flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={autoDailyPostEnabled}
            onChange={(e) => setAutoDailyPostEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-700 bg-neutral-950"
          />
          매일 자동 생성 켜기
        </label>

        <label className="mb-4 flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={autoDailyPostIncludeProducts}
            onChange={(e) => setAutoDailyPostIncludeProducts(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-700 bg-neutral-950"
          />
          가끔(약 50%) 쿠팡 상품 소개 글도 섞기
        </label>
        <p className="-mt-3 mb-4 text-xs text-neutral-500">
          &quot;쿠팡 링크&quot; 화면에서 직접 검색해 만들어둔 링크가 있으면
          그중 하나를 랜덤으로 골라 소개 글을 씁니다. 링크를 하나도 안
          만들어놨어도, AI가 인기 있을 만한 상품 키워드로 스스로 검색해서
          로켓배송 상품 위주로 자동으로 링크를 모아둡니다 (직접 검색 안
          하셔도 됩니다). 쿠팡파트너스 API 키가 설정되어 있어야 자동
          수집이 동작합니다.
        </p>

        <div className="border-t border-neutral-800 pt-4">
          <button
            type="button"
            onClick={handleRunTest}
            disabled={runningTest}
            className="rounded-lg bg-purple-600/20 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-600/30 disabled:opacity-50"
          >
            {runningTest ? "생성 중..." : "✦ 지금 바로 테스트 실행 (설정과 무관하게 1개 생성)"}
          </button>
          {testResult && (
            <p className="mt-2 text-xs text-neutral-400">{testResult}</p>
          )}
        </div>
      </section>

      {message && <p className="text-sm text-blue-400">{message}</p>}

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
