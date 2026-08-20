"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CreatorFormValues } from "./CreatorForm";

type Prefill = Partial<Record<keyof CreatorFormValues, string>>;

const inputClass =
  "w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-blue-500";

export default function ImportPanel({
  onPrefill,
  autoHandle,
  autoPaste,
}: {
  onPrefill: (prefill: Prefill) => void;
  /** 북마클릿으로 넘어왔을 때 자동으로 채워서 바로 불러온다 */
  autoHandle?: string;
  autoPaste?: string;
}) {
  const [handle, setHandle] = useState(autoHandle ?? "");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState(autoPaste ?? "");
  const [pasteLoading, setPasteLoading] = useState(false);
  const autoRan = useRef(false);

  const handleLookup = useCallback(
    async (override?: string): Promise<boolean> => {
    const target = (override ?? handle).trim();
    if (!target) return false;
    setLoading(true);
    setNotice(null);
    setWarn(null);
    const res = await fetch("/api/creators/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: target }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setWarn(data?.error ?? "불러오지 못했습니다.");
      return false;
    }

    if (data.prefill) onPrefill(data.prefill);

    if (data.ok) {
      const s = data.summary ?? {};
      const bits = [
        s.followers !== null && s.followers !== undefined
          ? `팔로워 ${s.followers.toLocaleString("ko-KR")}명`
          : null,
        s.engagementRate !== null && s.engagementRate !== undefined
          ? `참여율 ${s.engagementRate}%`
          : null,
      ].filter(Boolean);
      setNotice(
        `인스타그램에서 정보를 가져왔습니다. ${bits.join(" · ")}`.trim()
      );
      setPasteOpen(false);
      return true;
    }

    setWarn(data.error);
    // 자동으로 못 가져오는 경우엔 붙여넣기 칸을 열어준다.
    setPasteOpen(true);
    return false;
    },
    [handle, onPrefill]
  );

  const handlePaste = useCallback(
    async (override?: string) => {
    const target = (override ?? pasteText).trim();
    if (!target) return;
    setPasteLoading(true);
    setNotice(null);
    setWarn(null);
    const res = await fetch("/api/creators/paste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: target }),
    });
    const data = await res.json().catch(() => null);
    setPasteLoading(false);
    if (!res.ok) {
      setWarn(data?.error ?? "내용을 읽지 못했습니다.");
      return;
    }
    onPrefill(data.prefill);
    setNotice(
      data.isGongguCreator
        ? "붙여넣은 내용을 아래 칸에 채웠습니다. 공구를 진행하는 계정으로 보여 '공구진행중' 태그를 달아뒀습니다."
        : "붙여넣은 내용을 아래 칸에 채웠습니다. 틀린 곳이 있으면 고쳐주세요."
    );
    },
    [pasteText, onPrefill]
  );

  // 북마클릿에서 넘어온 경우: 아이디로 먼저 시도하고, 안 되면 붙여넣은 내용으로 채운다.
  useEffect(() => {
    if (autoRan.current) return;
    if (!autoHandle && !autoPaste) return;
    autoRan.current = true;
    (async () => {
      let done = false;
      if (autoHandle) done = await handleLookup(autoHandle);
      if (!done && autoPaste) {
        setPasteOpen(true);
        await handlePaste(autoPaste);
      }
    })();
  }, [autoHandle, autoPaste, handleLookup, handlePaste]);

  return (
    <div className="mb-5 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
      <p className="mb-1 text-sm font-semibold text-white">
        인스타그램에서 정보 가져오기
      </p>
      <p className="mb-3 text-xs text-neutral-500">
        아이디나 프로필 주소를 넣으면 이름 · 소개글 · 팔로워 수 · 참여율까지
        아래 칸에 자동으로 채워집니다.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          className={`${inputClass} min-w-48 flex-1`}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleLookup();
            }
          }}
          placeholder="@아이디 또는 https://instagram.com/아이디"
        />
        <button
          type="button"
          onClick={() => handleLookup()}
          disabled={loading || !handle.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-400"
        >
          {loading ? "가져오는 중…" : "가져오기"}
        </button>
      </div>

      {notice && (
        <p className="mt-2 rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-300">
          {notice}
        </p>
      )}
      {warn && (
        <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {warn}
        </p>
      )}

      <div className="mt-3 border-t border-neutral-800 pt-3">
        {!pasteOpen ? (
          <button
            type="button"
            onClick={() => setPasteOpen(true)}
            className="text-xs text-neutral-400 underline underline-offset-4 hover:text-neutral-200"
          >
            자동으로 안 될 때 — 프로필 화면 복사해서 붙여넣기
          </button>
        ) : (
          <div>
            <p className="mb-1 text-xs text-neutral-400">
              인스타 프로필 화면의 글자를 드래그해서 복사한 뒤 그대로 붙여넣으세요.
              이름 · 팔로워 수 · 소개글을 알아서 나눠 담습니다.
            </p>
            <textarea
              className={`${inputClass} min-h-24 resize-y`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"초코맘\n@choco_mom\n게시물 482  팔로워 3.2만  팔로우 512\n두 아이 키우는 워킹맘 · 이유식 공구 문의는 DM"}
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePaste()}
                disabled={pasteLoading || !pasteText.trim()}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-200 disabled:bg-neutral-700 disabled:text-neutral-400"
              >
                {pasteLoading ? "읽는 중…" : "붙여넣은 내용 정리하기"}
              </button>
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                className="text-xs text-neutral-500 hover:text-white"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
