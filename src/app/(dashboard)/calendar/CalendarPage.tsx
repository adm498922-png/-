"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  source: "event" | "todo" | "deal";
  title: string;
  date: string;
  endDate?: string;
  done?: boolean;
  href?: string;
  memo?: string;
  editable?: boolean;
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
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // 할일은 오른쪽 "오늘 할일" 패널에서 직접 고친다(가로 배치 대신 세로 배치,
  // 아래쪽 대신 옆으로, 저장 버튼 없이 바로바로 저장).
  const todoPanelRef = useRef<HTMLDivElement | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [todoDraft, setTodoDraft] = useState({ title: "", date: "", memo: "" });
  const [todoSaveState, setTodoSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const todoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [todoAddOpen, setTodoAddOpen] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoMemo, setNewTodoMemo] = useState("");
  const [todoAddSaving, setTodoAddSaving] = useState(false);

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

  async function refreshItems() {
    const from = days[0];
    const to = days[days.length - 1];
    const res = await fetch(
      `/api/calendar/combined?from=${from.toISOString()}&to=${to.toISOString()}`
    );
    const data = await res.json().catch(() => null);
    if (Array.isArray(data)) setItems(data);
  }

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

  const todosToday = items
    .filter((i) => i.source === "todo" && toKey(new Date(i.date)) === toKey(new Date()))
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
    if (editingId === item.id) setEditingId(null);
    await fetch(`/api/calendar/events/${item.id}`, { method: "DELETE" });
  }

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        kind,
        date: selected,
        memo,
        endDate: endDate || null,
      }),
    });
    setSaving(false);
    if (!res.ok) return;
    setTitle("");
    setMemo("");
    setEndDate("");
    setFormOpen(false);
    await refreshItems();
  }

  function openEdit(item: Item) {
    if (!item.editable) return; // 공구 기록에서 자동으로 뽑힌 항목은 판매일보에서 고친다
    if (item.source === "todo") {
      openTodoEdit(item);
      return;
    }
    setFormOpen(false);
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditMemo(item.memo ?? "");
    setEditDate(toKey(new Date(item.date)));
    setEditEndDate(item.endDate ? toKey(new Date(item.endDate)) : "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit() {
    if (!editingId || !editTitle.trim()) return;
    setEditSaving(true);
    const res = await fetch(`/api/calendar/events/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        memo: editMemo,
        date: editDate,
        endDate: editEndDate || null,
      }),
    });
    setEditSaving(false);
    if (!res.ok) return;
    setEditingId(null);
    await refreshItems();
  }

  function openTodoEdit(item: Item) {
    if (todoSaveTimer.current) {
      clearTimeout(todoSaveTimer.current);
      todoSaveTimer.current = null;
    }
    setTodoAddOpen(false);
    setEditingTodoId(item.id);
    setTodoDraft({ title: item.title, date: toKey(new Date(item.date)), memo: item.memo ?? "" });
    setTodoSaveState("idle");
    requestAnimationFrame(() => {
      todoPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function closeTodoEdit() {
    if (todoSaveTimer.current) {
      clearTimeout(todoSaveTimer.current);
      todoSaveTimer.current = null;
      if (editingTodoId) flushTodoSave(editingTodoId, todoDraft);
    }
    setEditingTodoId(null);
  }

  async function flushTodoSave(
    id: string,
    draft: { title: string; date: string; memo: string }
  ) {
    if (!draft.title.trim()) return;
    setTodoSaveState("saving");
    const res = await fetch(`/api/calendar/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draft.title, date: draft.date, memo: draft.memo }),
    });
    if (res.ok) {
      setTodoSaveState("saved");
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, title: draft.title, date: keyToDate(draft.date).toISOString(), memo: draft.memo }
            : i
        )
      );
    }
  }

  // 입력할 때마다 잠깐 멈추면(0.6초) 자동으로 저장 — 수정 저장 버튼 없이 바로바로 반영
  function updateTodoDraft(
    id: string,
    patch: Partial<{ title: string; date: string; memo: string }>
  ) {
    const next = { ...todoDraft, ...patch };
    setTodoDraft(next);
    if (todoSaveTimer.current) clearTimeout(todoSaveTimer.current);
    setTodoSaveState("saving");
    todoSaveTimer.current = setTimeout(() => flushTodoSave(id, next), 600);
  }

  function openTodoAdd() {
    setEditingTodoId(null);
    setNewTodoTitle("");
    setNewTodoMemo("");
    setTodoAddOpen((v) => !v);
  }

  async function submitTodo() {
    if (!newTodoTitle.trim()) return;
    setTodoAddSaving(true);
    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTodoTitle, kind: "TODO", date: toKey(new Date()), memo: newTodoMemo }),
    });
    setTodoAddSaving(false);
    if (!res.ok) return;
    setNewTodoTitle("");
    setNewTodoMemo("");
    setTodoAddOpen(false);
    await refreshItems();
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
                      lane.map((bar) => {
                        const barClassName = `mx-px flex items-center truncate px-1.5 text-[11px] font-medium text-white ${
                          bar.item.barClass
                        } ${bar.continuesFromPrev ? "" : "rounded-l"} ${
                          bar.continuesToNext ? "" : "rounded-r"
                        } ${bar.item.done ? "line-through opacity-60" : ""} ${
                          bar.item.editable || bar.item.href ? "cursor-pointer hover:opacity-90" : ""
                        }`;
                        const style = {
                          gridColumn: `${bar.colStart + 1} / span ${bar.span}`,
                          gridRow: li + 2,
                        };
                        const label = (
                          <>
                            {bar.continuesFromPrev ? "◂ " : ""}
                            {bar.item.title}
                            {bar.continuesToNext ? " ▸" : ""}
                          </>
                        );
                        if (bar.item.href) {
                          return (
                            <Link
                              key={bar.item.id}
                              href={bar.item.href}
                              style={style}
                              title={bar.item.title}
                              className={barClassName}
                            >
                              {label}
                            </Link>
                          );
                        }
                        return (
                          <button
                            key={bar.item.id}
                            type="button"
                            onClick={() => openEdit(bar.item)}
                            style={style}
                            title={bar.item.editable ? `${bar.item.title} (눌러서 수정)` : bar.item.title}
                            className={barClassName}
                          >
                            {label}
                          </button>
                        );
                      })
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
                          {list.slice(0, 4).map((it) => {
                            const chipClass = `block w-full truncate rounded px-1.5 py-1 text-left text-xs ${
                              it.colorClass
                            } ${it.done ? "line-through opacity-60" : ""} ${
                              it.editable || it.href ? "pointer-events-auto cursor-pointer hover:opacity-80" : ""
                            }`;
                            if (it.href) {
                              return (
                                <Link key={it.id} href={it.href} className={chipClass}>
                                  {it.title}
                                </Link>
                              );
                            }
                            if (it.editable) {
                              return (
                                <button
                                  key={it.id}
                                  type="button"
                                  onClick={() => openEdit(it)}
                                  className={chipClass}
                                >
                                  {it.title}
                                </button>
                              );
                            }
                            return (
                              <div key={it.id} className={chipClass}>
                                {it.title}
                              </div>
                            );
                          })}
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
                onClick={() => {
                  setEditingId(null);
                  setFormOpen((v) => !v);
                }}
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
                {kind === "EVENT" && (
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-500">
                      종료일 (여러 날에 걸치면)
                    </label>
                    <input
                      type="date"
                      className={inputClass}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={selected}
                    />
                  </div>
                )}
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

            {editingId && (
              <div className="mb-3 space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700">일정 수정</span>
                  <button
                    onClick={cancelEdit}
                    className="text-xs text-slate-500 hover:text-slate-900"
                  >
                    취소
                  </button>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-500">제목</label>
                  <input
                    className={inputClass}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-500">시작일</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-500">
                    종료일 (선택)
                  </label>
                  <input
                    type="date"
                    className={inputClass}
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    min={editDate}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-500">메모</label>
                  <input
                    className={inputClass}
                    value={editMemo}
                    onChange={(e) => setEditMemo(e.target.value)}
                    placeholder="메모 (선택)"
                  />
                </div>
                <button
                  onClick={saveEdit}
                  disabled={editSaving || !editTitle.trim()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {editSaving ? "저장 중…" : "수정 저장"}
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
                    {it.editable && (
                      <button
                        onClick={() => openEdit(it)}
                        className="text-xs text-slate-400 hover:text-blue-600"
                      >
                        수정
                      </button>
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

          <div ref={todoPanelRef} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">오늘 할일</h3>
              <button
                onClick={openTodoAdd}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                {todoAddOpen ? "닫기" : "＋ 추가"}
              </button>
            </div>

            {todoAddOpen && (
              <div className="mb-3 space-y-2 rounded-lg bg-slate-50 p-3">
                <div>
                  <label className="mb-1 block text-[11px] text-slate-500">제목</label>
                  <input
                    className={inputClass}
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    placeholder="예: 정산 처리하기"
                    onKeyDown={(e) => e.key === "Enter" && submitTodo()}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-500">메모</label>
                  <input
                    className={inputClass}
                    value={newTodoMemo}
                    onChange={(e) => setNewTodoMemo(e.target.value)}
                    placeholder="메모 (선택)"
                  />
                </div>
                <button
                  onClick={submitTodo}
                  disabled={todoAddSaving || !newTodoTitle.trim()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {todoAddSaving ? "저장 중…" : "저장"}
                </button>
              </div>
            )}

            {todosToday.length === 0 ? (
              <p className="text-xs text-slate-400">오늘 할일이 없습니다.</p>
            ) : (
              <ul className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                {todosToday.map((it) =>
                  editingTodoId === it.id ? (
                    <li
                      key={it.id}
                      className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-700">할일 수정</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            {todoSaveState === "saving"
                              ? "저장 중…"
                              : todoSaveState === "saved"
                                ? "저장됨"
                                : ""}
                          </span>
                          <button
                            onClick={closeTodoEdit}
                            className="text-xs text-slate-500 hover:text-slate-900"
                          >
                            닫기
                          </button>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={Boolean(it.done)}
                          onChange={() => toggleTodo(it)}
                        />
                        완료
                      </label>
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-500">제목</label>
                        <input
                          className={inputClass}
                          value={todoDraft.title}
                          onChange={(e) => updateTodoDraft(it.id, { title: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-500">날짜</label>
                        <input
                          type="date"
                          className={inputClass}
                          value={todoDraft.date}
                          onChange={(e) => updateTodoDraft(it.id, { date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-500">메모</label>
                        <input
                          className={inputClass}
                          value={todoDraft.memo}
                          onChange={(e) => updateTodoDraft(it.id, { memo: e.target.value })}
                          placeholder="메모 (선택)"
                        />
                      </div>
                      <button
                        onClick={() => deleteItem(it)}
                        className="text-xs text-slate-400 hover:text-red-500"
                      >
                        삭제
                      </button>
                    </li>
                  ) : (
                    <li
                      key={it.id}
                      className="group flex items-start gap-2.5 rounded-lg px-1 py-1 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(it.done)}
                        onChange={() => toggleTodo(it)}
                        className="mt-1"
                      />
                      <button
                        type="button"
                        onClick={() => openTodoEdit(it)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p
                          className={`truncate text-sm text-slate-800 ${
                            it.done ? "text-slate-400 line-through" : ""
                          }`}
                        >
                          {it.title}
                        </p>
                        {it.memo && (
                          <p className="truncate text-[11px] text-slate-400">{it.memo}</p>
                        )}
                      </button>
                      <button
                        onClick={() => deleteItem(it)}
                        className="text-xs text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500"
                      >
                        삭제
                      </button>
                    </li>
                  )
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
