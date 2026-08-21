"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  source: "event" | "todo" | "deal";
  title: string;
  date: string;
  endDate?: string;
  done?: boolean;
  href?: string;
  colorClass: string;
  barClass: string;
};

type Bar = {
  item: Item;
  colStart: number; // 0~6, 이번 주 안에서 몇 번째 칸부터
  span: number; // 몇 칸을 차지하는지
  continuesFromPrev: boolean; // 지난주부터 이어지는 일정인지
  continuesToNext: boolean; // 다음주로 이어지는 일정인지
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function keyToDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function dateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dayDiff(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}
function monthLabel(d: Date) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}
function isRanged(it: Item): boolean {
  return Boolean(it.endDate);
}
function overlapsDay(it: Item, day: Date): boolean {
  const s = dateOnly(new Date(it.date));
  const e = it.endDate ? dateOnly(new Date(it.endDate)) : s;
  const d = dateOnly(day);
  return d >= s && d <= e;
}
const BAR_LANE_HEIGHT = 21;

/** 이번 주(7일) 안에서 기간이 있는 일정들을 겹치지 않게 줄(레인)로 나눈다 — 구글 캘린더 막대 방식 */
function layoutWeekBars(week: Date[], rangedItems: Item[]): Bar[][] {
  const weekStart = dateOnly(week[0]);
  const weekEnd = dateOnly(week[6]);

  const bars: Bar[] = [];
  for (const it of rangedItems) {
    const s = dateOnly(new Date(it.date));
    const e = dateOnly(new Date(it.endDate!));
    if (e < weekStart || s > weekEnd) continue;
    const colStart = s < weekStart ? 0 : dayDiff(s, weekStart);
    const colEndIdx = e > weekEnd ? 6 : dayDiff(e, weekStart);
    bars.push({
      item: it,
      colStart,
      span: colEndIdx - colStart + 1,
      continuesFromPrev: s < weekStart,
      continuesToNext: e > weekEnd,
    });
  }
  bars.sort((a, b) => a.colStart - b.colStart || b.span - a.span);

  const lanes: Bar[][] = [];
  const laneEnd: number[] = [];
  for (const bar of bars) {
    let placed = false;
    for (let i = 0; i < lanes.length; i++) {
      if (laneEnd[i] < bar.colStart) {
        lanes[i].push(bar);
        laneEnd[i] = bar.colStart + bar.span - 1;
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push([bar]);
      laneEnd.push(bar.colStart + bar.span - 1);
    }
  }
  return lanes;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500";

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(toKey(new Date()));

  const [formOpen, setFormOpen] = useState(false);
  const [kind, setKind] = useState<"EVENT" | "TODO">("EVENT");
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  const gridStart = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(1 - start.getDay());
    return start;
  }, [cursor]);

  const days = useMemo(
    () => Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    }),
    [gridStart]
  );

  const weeks = useMemo(() => {
    const chunks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) chunks.push(days.slice(i, i + 7));
    return chunks;
  }, [days]);

  useEffect(() => {
    let cancelled = false;
    const from = days[0];
    const to = days[days.length - 1];
    fetch(`/api/calendar/combined?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setLoading(false);
        if (Array.isArray(data)) setItems(data);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  // 기간이 있는 일정(여러 날에 걸친 것)은 막대로, 하루짜리는 칸 안에 작은 항목으로 나눠서 그린다.
  const rangedItems = useMemo(() => items.filter(isRanged), [items]);
  const pointItems = useMemo(() => items.filter((it) => !isRanged(it)), [items]);

  const pointByDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of pointItems) {
      const key = toKey(new Date(it.date));
      const list = map.get(key) ?? [];
      list.push(it);
      map.set(key, list);
    }
    return map;
  }, [pointItems]);

  const todosAll = items
    .filter((i) => i.source === "todo")
    .sort((a, b) => a.date.localeCompare(b.date));

  async function toggleTodo(item: Item) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i))
    );
    await fetch(`/api/calendar/events/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done }),
    });
  }

  async function deleteItem(item: Item) {
    if (!confirm(`'${item.title}' 항목을 지울까요?`)) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await fetch(`/api/calendar/events/${item.id}`, { method: "DELETE" });
  }

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, kind, date: selected, memo }),
    });
    setSaving(false);
    if (!res.ok) return;
    const created = await res.json();
    setItems((prev) => [
      ...prev,
      {
        id: created.id,
        source: kind === "TODO" ? "todo" : "event",
        title: created.title,
        date: created.date,
        done: created.done,
        colorClass:
          kind === "TODO" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700",
        barClass: kind === "TODO" ? "bg-amber-500" : "bg-blue-600",
      },
    ]);
    setTitle("");
    setMemo("");
    setFormOpen(false);
  }

  const today = toKey(new Date());
  const selectedItems = useMemo(() => {
    const selDate = keyToDate(selected);
    const point = pointByDay.get(selected) ?? [];
    const ranged = rangedItems.filter((it) => overlapsDay(it, selDate));
    return [...point, ...ranged];
  }, [pointByDay, rangedItems, selected]);

  return (
    // 달력은 다른 화면보다 훨씬 넓게 써야 한눈에 들어와서, 위쪽 메뉴가 잡아둔
    // 가운데 폭 제한(max-w-6xl)을 벗어나 화면 대부분을 쓰도록 만든다.
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen px-4 sm:px-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">일정 · 할일</h1>
        <p className="mb-6 text-sm text-slate-500">
          직접 적은 일정·할일과, 판매일보에 적은 판매 시작·종료·정산예정일이 함께
          보입니다. 여러 날에 걸친 일정은 막대로 이어서 보여줍니다.
        </p>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900"
                >
                  ‹
                </button>
                <h2 className="w-36 text-center text-lg font-semibold text-slate-900">
                  {monthLabel(cursor)}
                </h2>
                <button
                  onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900"
                >
                  ›
                </button>
              </div>
              <button
                onClick={() => {
                  const d = new Date();
                  d.setDate(1);
                  setCursor(d);
                  setSelected(toKey(new Date()));
                }}
                className="text-xs text-slate-500 underline underline-offset-4 hover:text-slate-800"
              >
                오늘로
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="grid grid-cols-7 border-b border-slate-200 text-center text-sm text-slate-500">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-2.5">
                    {w}
                  </div>
                ))}
              </div>
              {weeks.map((week, wi) => {
                const lanes = layoutWeekBars(week, rangedItems);
                // 날짜 숫자 줄 + 막대 레인 줄들 + 하루짜리 항목 줄, 전부 한 grid 안에 명시적인 행으로 둔다.
                // (막대를 절대위치로 겹쳐 그리던 예전 방식은 화면 크기·글꼴에 따라 숫자를 가리는
                // 문제가 있어서, 애초에 겹칠 수 없게 grid 행으로 자리를 나눴다)
                const rowTemplate = [
                  "2.25rem",
                  ...lanes.map(() => `${BAR_LANE_HEIGHT}px`),
                  "minmax(5.5rem, auto)",
                ].join(" ");
                return (
                  <div
                    key={wi}
                    className="grid border-b border-slate-100 last:border-b-0"
                    style={{
                      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                      gridTemplateRows: rowTemplate,
                    }}
                  >
                    {week.map((d, di) => {
                      const key = toKey(d);
                      const isSelected = key === selected;
                      return (
                        <button
                          key={`bg-${key}`}
                          onClick={() => setSelected(key)}
                          aria-label={`${key} 선택`}
                          style={{ gridColumn: di + 1, gridRow: `1 / span ${lanes.length + 2}` }}
                          className={`${di < 6 ? "border-r border-slate-100" : ""} ${
                            isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                          }`}
                        />
                      );
                    })}

                    {week.map((d, di) => {
                      const key = toKey(d);
                      const inMonth = d.getMonth() === cursor.getMonth();
                      const isToday = key === today;
                      return (
                        <div
                          key={`num-${key}`}
                          style={{ gridColumn: di + 1, gridRow: 1 }}
                          className="pointer-events-none p-2"
                        >
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                              isToday
                                ? "bg-blue-600 font-semibold text-white"
                                : inMonth
                                  ? "text-slate-700"
                                  : "text-slate-300"
                            }`}
                          >
                            {d.getDate()}
                          </span>
                        </div>
                      );
                    })}

                    {lanes.map((lane, li) =>
                      lane.map((bar) => (
                        <div
                          key={bar.item.id}
                          style={{
                            gridColumn: `${bar.colStart + 1} / span ${bar.span}`,
                            gridRow: li + 2,
                          }}
                          title={bar.item.title}
                          className={`pointer-events-none mx-px flex items-center truncate px-1.5 text-[11px] font-medium text-white ${
                            bar.item.barClass
                          } ${bar.continuesFromPrev ? "" : "rounded-l"} ${
                            bar.continuesToNext ? "" : "rounded-r"
                          } ${bar.item.done ? "line-through opacity-60" : ""}`}
                        >
                          {bar.continuesFromPrev ? "◂ " : ""}
                          {bar.item.title}
                          {bar.continuesToNext ? " ▸" : ""}
                        </div>
                      ))
                    )}

                    {week.map((d, di) => {
                      const key = toKey(d);
                      const list = pointByDay.get(key) ?? [];
                      return (
                        <div
                          key={`pts-${key}`}
                          style={{ gridColumn: di + 1, gridRow: lanes.length + 2 }}
                          className="pointer-events-none space-y-1 px-2 pb-2 pt-1"
                        >
                          {list.slice(0, 4).map((it) => (
                            <div
                              key={it.id}
                              className={`truncate rounded px-1.5 py-1 text-xs ${it.colorClass} ${
                                it.done ? "line-through opacity-60" : ""
                              }`}
                            >
                              {it.title}
                            </div>
                          ))}
                          {list.length > 4 && (
                            <div className="text-[11px] text-slate-400">
                              +{list.length - 4}개 더
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                {selected.replaceAll("-", ". ")}
              </h3>
              <button
                onClick={() => setFormOpen((v) => !v)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                {formOpen ? "닫기" : "＋ 추가"}
              </button>
            </div>

            {formOpen && (
              <div className="mb-3 space-y-2 rounded-lg bg-slate-50 p-3">
                <div className="flex gap-2">
                  {(["EVENT", "TODO"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={`rounded-full px-3 py-1 text-xs ${
                        kind === k
                          ? "bg-blue-600 font-semibold text-white"
                          : "bg-white text-slate-500"
                      }`}
                    >
                      {k === "EVENT" ? "일정" : "할일"}
                    </button>
                  ))}
                </div>
                <input
                  className={inputClass}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={kind === "EVENT" ? "예: 사라님 미팅" : "예: 정산 처리하기"}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
                <input
                  className={inputClass}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="메모 (선택)"
                />
                <button
                  onClick={submit}
                  disabled={saving || !title.trim()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {saving ? "저장 중…" : "저장"}
                </button>
              </div>
            )}

            {loading ? (
              <p className="text-xs text-slate-400">불러오는 중…</p>
            ) : selectedItems.length === 0 ? (
              <p className="text-xs text-slate-400">이 날은 등록된 항목이 없습니다.</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedItems.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                  >
                    {it.source === "todo" && (
                      <input
                        type="checkbox"
                        checked={Boolean(it.done)}
                        onChange={() => toggleTodo(it)}
                      />
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10.5px] ${it.colorClass}`}
                    >
                      {it.source === "deal" ? "공구" : it.source === "todo" ? "할일" : "일정"}
                    </span>
                    {it.href ? (
                      <Link
                        href={it.href}
                        className={`flex-1 text-sm text-slate-800 hover:text-blue-600 ${
                          it.done ? "line-through text-slate-400" : ""
                        }`}
                      >
                        {it.title}
                      </Link>
                    ) : (
                      <span
                        className={`flex-1 text-sm text-slate-800 ${
                          it.done ? "line-through text-slate-400" : ""
                        }`}
                      >
                        {it.title}
                      </span>
                    )}
                    {it.source !== "deal" && (
                      <button
                        onClick={() => deleteItem(it)}
                        className="text-xs text-slate-400 hover:text-red-500"
                      >
                        삭제
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 font-semibold text-slate-900">이번 달 할일</h3>
            {todosAll.length === 0 ? (
              <p className="text-xs text-slate-400">이번 달 할일이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {todosAll.map((it) => (
                  <li key={it.id} className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={Boolean(it.done)}
                      onChange={() => toggleTodo(it)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm text-slate-800 ${
                          it.done ? "text-slate-400 line-through" : ""
                        }`}
                      >
                        {it.title}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(it.date).toLocaleDateString("ko-KR", {
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
