"use client";

import { useEffect, useState } from "react";

/**
 * 매일 아침 10시 이메일 브리핑 설정 — 지메일 앱 비밀번호로 발송하고,
 * 받는 주소는 네이버 등 아무 메일이나 가능하다.
 */
export default function BriefingBox() {
  const [enabled, setEnabled] = useState(false);
  const [gmailUser, setGmailUser] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [passSaved, setPassSaved] = useState(false);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(true);

  // 네이버 메일 읽기 (오늘 브리핑의 "오늘 온 메일"용)
  const [naverUser, setNaverUser] = useState("");
  const [naverPassword, setNaverPassword] = useState("");
  const [naverSaved, setNaverSaved] = useState(false);
  const [naverBusy, setNaverBusy] = useState(false);
  const [naverMessage, setNaverMessage] = useState<string | null>(null);

  async function saveNaver(disconnect: boolean) {
    setNaverBusy(true);
    setNaverMessage(null);
    const res = await fetch("/api/briefing/mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        disconnect
          ? { naverUser: "" }
          : { naverUser, naverPassword }
      ),
    }).catch(() => null);
    setNaverBusy(false);
    if (!res?.ok) {
      setNaverMessage("저장에 실패했습니다.");
      return;
    }
    if (disconnect) {
      setNaverSaved(false);
      setNaverUser("");
      setNaverPassword("");
      setNaverMessage("연결을 해제했습니다.");
      return;
    }
    setNaverSaved(true);
    setNaverPassword("");
    setNaverMessage(
      "저장되었습니다. 대시보드의 '오늘 브리핑'에서 메일이 보이는지 확인해보세요."
    );
  }

  useEffect(() => {
    fetch("/api/briefing")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setEnabled(data.enabled);
        setGmailUser(data.gmailUser ?? "");
        setPassSaved(data.passSaved);
        setTo(data.to ?? "");
        setNaverUser(data.naverUser ?? "");
        setNaverSaved(Boolean(data.naverSaved));
      })
      .catch(() => {});
  }, []);

  async function save(withTest: boolean) {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/briefing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gmailUser,
        gmailAppPassword: appPassword,
        to,
        enabled,
        test: withTest,
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok || !data?.ok) {
      setMessageOk(false);
      setMessage("저장에 실패했습니다.");
      return;
    }
    setPassSaved(data.passSaved);
    setAppPassword("");
    if (withTest && data.test) {
      setMessageOk(data.test.ok);
      setMessage(data.test.message);
    } else {
      setMessageOk(true);
      setMessage("저장되었습니다.");
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="font-semibold text-slate-900">☀️ 아침 브리핑 메일</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            enabled && passSaved
              ? "bg-green-500/15 text-green-700"
              : "bg-slate-200 text-slate-500"
          }`}
        >
          {enabled && passSaved ? "켜짐" : "꺼짐"}
        </span>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        매일 아침 10시에 오늘 할일·일정·진행중 공구·정산 예정·팔로업 필요한
        크리에이터를 한 통으로 보내드립니다. 받는 주소는 네이버 메일도 됩니다.
      </p>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">보내는 지메일 주소</label>
          <input
            value={gmailUser}
            onChange={(e) => setGmailUser(e.target.value)}
            placeholder="내지메일@gmail.com"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            지메일 앱 비밀번호{" "}
            {passSaved && <span className="text-green-600">(저장됨 — 바꿀 때만 입력)</span>}
          </label>
          <input
            type="password"
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            placeholder={passSaved ? "저장되어 있습니다" : "16자리 앱 비밀번호"}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            일반 로그인 비밀번호가 아니라, 구글 계정에서 만드는 &lsquo;앱
            비밀번호&rsquo;예요. myaccount.google.com → 검색창에 &lsquo;앱
            비밀번호&rsquo; 검색 → 만들기 (2단계 인증이 켜져 있어야 보여요)
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            받는 주소 <span className="text-slate-400">(비우면 위 지메일로 받아요 — 네이버 주소도 가능)</span>
          </label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="받을주소@naver.com (선택)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          매일 아침 10시에 자동으로 보내기
        </label>

        {message && (
          <p
            className={`rounded-lg px-3 py-2 text-xs ${
              messageOk ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {message}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => save(false)}
            disabled={busy || !gmailUser.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
          >
            {busy ? "저장 중…" : "저장"}
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={busy || !gmailUser.trim()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
          >
            지금 테스트로 한 통 보내보기
          </button>
        </div>

        {/* 오늘 브리핑에 메일함 보여주기 — 네이버 연결 */}
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-700">
            📧 대시보드 &lsquo;오늘 브리핑&rsquo;에 메일함 보여주기
            {naverSaved && (
              <span className="ml-1.5 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-medium text-green-700">
                네이버 연결됨
              </span>
            )}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            지메일은 위 앱 비밀번호로 자동으로 읽어요. 네이버 메일도 같이 보려면:
            네이버 메일(PC) → ⚙️ 환경설정 → <strong>POP3/IMAP 설정</strong> →{" "}
            <strong>IMAP/SMTP 사용</strong>을 &lsquo;사용함&rsquo;으로 저장한 뒤 아래에
            입력하세요. 네이버에 2단계 인증을 켜두셨다면 비밀번호 대신{" "}
            <strong>애플리케이션 비밀번호</strong>(네이버 내정보 → 보안설정에서 발급)를
            넣어야 해요.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={naverUser}
              onChange={(e) => setNaverUser(e.target.value)}
              placeholder="네이버 아이디"
              className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-500"
            />
            <input
              type="password"
              value={naverPassword}
              onChange={(e) => setNaverPassword(e.target.value)}
              placeholder={naverSaved ? "비밀번호 저장됨 — 바꿀 때만" : "네이버 비밀번호"}
              className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-500"
            />
            <button
              type="button"
              onClick={() => saveNaver(false)}
              disabled={naverBusy || !naverUser.trim() || (!naverPassword.trim() && !naverSaved)}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:bg-slate-200 disabled:text-slate-500"
            >
              {naverBusy ? "저장 중…" : "네이버 연결"}
            </button>
            {naverSaved && (
              <button
                type="button"
                onClick={() => saveNaver(true)}
                disabled={naverBusy}
                className="text-xs text-slate-400 hover:text-red-500"
              >
                연결 해제
              </button>
            )}
          </div>
          {naverMessage && (
            <p className="mt-1.5 text-[11px] text-slate-500">{naverMessage}</p>
          )}
        </div>
      </div>
    </section>
  );
}
