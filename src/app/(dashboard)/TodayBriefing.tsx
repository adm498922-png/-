"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatWon } from "@/lib/gonggu";
import type { BriefingData } from "@/lib/daily-briefing";
import type { MailAccountResult } from "@/lib/mail-inbox";

/**
 * 대시보드 맨 위 "오늘 브리핑" — 아침 메일과 같은 내용을 화면에서 바로
 * 체크해서 처리한다: 할일은 체크, 정산은 '정산 완료', 팔로업은 '연락함'.
 */

function fmt(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return sameDay ? hm : `${fmt(iso)} ${hm}`;
}

const MAIL_LABEL: Record<string, string> = { gmail: "지메일", naver: "네이버" };
const MAIL_LINK: Record<string, string> = {
  gmail: "https://mail.google.com",
  naver: "https://mail.naver.com",
};

export default function TodayBriefing() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [mail, setMail] = useState<MailAccountResult[] | null>(null);
  const [mailLoading, setMailLoading] = useState(true);

  useEffect(() => {
    fetch("/api/briefing/today")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {});
    // 메일함 읽기는 몇 초 걸릴 수 있어서 따로 불러온다
    fetch("/api/briefing/mail")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setMail(d?.accounts ?? []))
      .catch(() => setMail([]))
      .finally(() => setMailLoading(false));
  }, []);

  const markDone = (id: string) =>
    setDoneIds((prev) => new Set(prev).add(id));

  // 할일 체크 → 완료 처리 (기존 캘린더 API 그대로 사용)
  async function completeTodo(id: string) {
    markDone(id);
    await fetch(`/api/calendar/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true }),
    }).catch(() => {});
  }

  // 정산 완료 → 오늘 날짜로 정산 완료일 기록
  async function completeSettle(id: string) {
    if (!confirm("이 공구의 정산을 '완료'로 기록할까요? (정산 완료일: 오늘)")) return;
    markDone(id);
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settledAt: key }),
    }).catch(() => {});
  }

  // 연락함 → 팔로업 경고 해제 (파이프라인과 동일)
  async function contacted(id: string) {
    markDone(id);
    await fetch(`/api/creators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastContactAt: new Date().toISOString() }),
    }).catch(() => {});
  }

  if (!data) return null;

  const todosLeft = data.todos.filter((t) => !doneIds.has(t.id));
  const settleLeft = data.settle.filter((s) => !doneIds.has(s.id));
  const followLeft = data.followUps.filter((f) => !doneIds.has(f.id));
  const remaining = todosLeft.length + settleLeft.length + followLeft.length;
  const allClear =
    remaining === 0 && data.events.length === 0 && data.ongoing.length === 0;

  const sectionTitle = "mb-1.5 text-xs font-semibold text-slate-500";
  const doneRow = "text-slate-300 line-through";

  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-slate-900">☀️ 오늘 브리핑</h2>
        <span className="text-xs text-slate-400">{data.dateLabel}</span>
        {remaining > 0 ? (
          <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            처리할 일 {remaining}건
          </span>
        ) : (
          <span className="ml-auto rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
            오늘 처리할 일 끝! 🎉
          </span>
        )}
      </div>

      {allClear ? (
        <p className="text-sm text-slate-500">
          오늘은 할일·일정·정산·팔로업이 모두 비어 있어요. 편안한 하루 되세요!
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* 할일 — 체크하면 완료 */}
          {data.todos.length > 0 && (
            <div>
              <p className={sectionTitle}>✅ 오늘 할일</p>
              <ul className="space-y-1">
                {data.todos.map((t) => {
                  const done = doneIds.has(t.id);
                  return (
                    <li key={t.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={done}
                        disabled={done}
                        onChange={() => completeTodo(t.id)}
                        className="mt-0.5"
                      />
                      <span className={done ? doneRow : "text-slate-700"}>
                        {t.overdue && !done && (
                          <span className="mr-1 rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-600">
                            {fmt(t.date)} 지남
                          </span>
                        )}
                        {t.title}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* 정산 — 버튼으로 완료 처리 */}
          {data.settle.length > 0 && (
            <div>
              <p className={sectionTitle}>💰 정산 챙기기</p>
              <ul className="space-y-1.5">
                {data.settle.map((s) => {
                  const done = doneIds.has(s.id);
                  return (
                    <li key={s.id} className="flex items-center gap-2 text-sm">
                      <span
                        className={
                          done
                            ? doneRow
                            : s.overdue
                              ? "font-semibold text-red-600"
                              : "text-slate-700"
                        }
                      >
                        {s.name} — {fmt(s.dueDate)}
                        {s.overdue && !done ? " 지남!" : " 예정"}
                        {s.settlement !== null && ` (${formatWon(s.settlement)})`}
                      </span>
                      {!done && (
                        <button
                          onClick={() => completeSettle(s.id)}
                          className="shrink-0 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-500 hover:border-green-400 hover:text-green-600"
                        >
                          ✓ 정산 완료
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* 팔로업 — 연락함 버튼 */}
          {data.followUps.length > 0 && (
            <div>
              <p className={sectionTitle}>📢 팔로업 필요</p>
              <ul className="space-y-1.5">
                {data.followUps.map((f) => {
                  const done = doneIds.has(f.id);
                  return (
                    <li key={f.id} className="flex items-center gap-2 text-sm">
                      <Link
                        href={`/creators/${f.id}`}
                        className={
                          done ? doneRow : "text-slate-700 hover:text-blue-600"
                        }
                      >
                        {f.name}{" "}
                        <span className="text-xs text-slate-400">
                          ({f.statusLabel} · {f.days}일째 연락 없음)
                        </span>
                      </Link>
                      {!done && (
                        <button
                          onClick={() => contacted(f.id)}
                          className="shrink-0 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-500 hover:border-blue-400 hover:text-blue-600"
                        >
                          ✓ 연락함
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* 일정·진행중 공구 — 보기만 */}
          {(data.events.length > 0 || data.ongoing.length > 0) && (
            <div>
              {data.events.length > 0 && (
                <>
                  <p className={sectionTitle}>📅 오늘 일정</p>
                  <ul className="mb-3 space-y-1 text-sm text-slate-700">
                    {data.events.map((e) => (
                      <li key={e.id}>
                        {e.title}
                        {e.endDate && (
                          <span className="text-xs text-slate-400">
                            {" "}
                            ({fmt(e.date)}~{fmt(e.endDate)})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {data.ongoing.length > 0 && (
                <>
                  <p className={sectionTitle}>🛒 진행중인 공구</p>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {data.ongoing.map((d) => (
                      <li key={d.id}>
                        {d.name}{" "}
                        <span className="text-xs text-slate-400">
                          ({fmt(d.startDate)}~{fmt(d.endDate)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 오늘 온 메일 — 지메일·네이버 메일함의 최근 24시간 메일 */}
      {(mailLoading || (mail && mail.length > 0)) && (
        <div className="mt-4 border-t border-amber-200/70 pt-3">
          <p className="mb-1.5 text-xs font-semibold text-slate-500">📧 오늘 온 메일</p>
          {mailLoading ? (
            <p className="text-xs text-slate-400">메일함 확인 중…</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {mail!.map((acc) => (
                <div key={acc.kind}>
                  <p className="mb-1 flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="font-semibold">{MAIL_LABEL[acc.kind]}</span>
                    {acc.ok && acc.unreadCount > 0 && (
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        안읽음 {acc.unreadCount}
                      </span>
                    )}
                    <a
                      href={MAIL_LINK[acc.kind]}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto text-[11px] text-slate-400 underline underline-offset-2 hover:text-blue-600"
                    >
                      메일함 열기
                    </a>
                  </p>
                  {!acc.ok ? (
                    <p className="text-[11px] text-red-600">{acc.error}</p>
                  ) : acc.messages.length === 0 ? (
                    <p className="text-[11px] text-slate-400">최근 24시간 새 메일 없음</p>
                  ) : (
                    <ul className="space-y-0.5">
                      {acc.messages.map((m, i) => (
                        <li key={i} className="flex items-baseline gap-2 text-xs">
                          <span
                            className={`min-w-0 flex-1 truncate ${
                              m.unread ? "font-semibold text-slate-800" : "text-slate-500"
                            }`}
                            title={`${m.from} — ${m.subject}`}
                          >
                            {m.unread && <span className="mr-1 text-blue-500">●</span>}
                            {m.subject}
                            <span className="ml-1.5 font-normal text-slate-400">
                              {m.from}
                            </span>
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {fmtTime(m.date)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
