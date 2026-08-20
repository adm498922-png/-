"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CreatorForm, {
  emptyCreatorForm,
  type CreatorFormValues,
} from "./CreatorForm";
import ImportPanel from "./ImportPanel";
import BookmarkletBox from "./BookmarkletBox";
import {
  CREATOR_STATUSES,
  CREATOR_STATUS_CLASS,
  CREATOR_STATUS_LABEL,
  PLATFORM_LABEL,
  formatDate,
  formatEngagement,
  formatFollowers,
  formatWon,
  summarizeDeals,
  type CreatorView,
} from "@/lib/gonggu";

type SortKey = "recent" | "followers" | "revenue" | "name";

const SORT_LABEL: Record<SortKey, string> = {
  recent: "최근 등록·수정순",
  followers: "팔로워 많은 순",
  revenue: "누적 매출 높은 순",
  name: "이름순",
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-neutral-500">{sub}</p>}
    </div>
  );
}

export default function CreatorList({
  initialCreators,
  origin,
  autoOpen,
  autoHandle,
  autoPaste,
  autoImage,
  instagramConfigured,
}: {
  initialCreators: CreatorView[];
  origin: string;
  /** 즐겨찾기 버튼(북마클릿)으로 넘어왔는지 */
  autoOpen?: boolean;
  autoHandle?: string;
  autoPaste?: string;
  autoImage?: string;
  instagramConfigured?: boolean;
}) {
  const [creators, setCreators] = useState(initialCreators);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sort, setSort] = useState<SortKey>("recent");
  const [adding, setAdding] = useState(Boolean(autoOpen));
  const [form, setForm] = useState<CreatorFormValues>(() => ({
    ...emptyCreatorForm(),
    // 즐겨찾기 버튼이 프로필 사진 주소까지 실어 보낸 경우
    profileImageUrl: autoImage ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 새로고침해도 같은 값이 다시 실행되지 않게 주소창만 깔끔히 되돌린다.
  useEffect(() => {
    if (!autoOpen) return;
    window.history.replaceState(null, "", "/creators");
  }, [autoOpen]);

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let revenue = 0;
    let dealCount = 0;
    for (const c of creators) {
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
      const s = summarizeDeals(c.deals);
      revenue += s.revenue;
      dealCount += s.count;
    }
    return { byStatus, revenue, dealCount };
  }, [creators]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = creators.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [c.name, c.handle, c.category, c.tags, c.memo, c.contact]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "followers") return (b.followers ?? -1) - (a.followers ?? -1);
      if (sort === "revenue")
        return summarizeDeals(b.deals).revenue - summarizeDeals(a.deals).revenue;
      if (sort === "name") return a.name.localeCompare(b.name, "ko-KR");
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return sorted;
  }, [creators, query, statusFilter, sort]);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/creators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(data?.error ?? "저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setCreators((prev) => [{ ...data, deals: data.deals ?? [] }, ...prev]);
    setForm(emptyCreatorForm());
    setAdding(false);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="전체 크리에이터" value={`${creators.length}명`} />
        <StatCard
          label="컨택중"
          value={`${stats.byStatus.CONTACTED ?? 0}명`}
          sub={`후보 ${stats.byStatus.LEAD ?? 0}명`}
        />
        <StatCard
          label="확정 · 진행중"
          value={`${(stats.byStatus.CONFIRMED ?? 0) + (stats.byStatus.ONGOING ?? 0)}명`}
          sub={`완료 ${stats.byStatus.DONE ?? 0}명`}
        />
        <StatCard
          label="누적 공구 매출"
          value={formatWon(stats.revenue)}
          sub={`공구 ${stats.dealCount}건`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 · 아이디 · 메모 검색"
          className="min-w-48 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-blue-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        >
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABEL[k]}
            </option>
          ))}
        </select>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-200"
        >
          {adding ? "닫기" : "＋ 크리에이터 추가"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["ALL", ...CREATOR_STATUSES].map((s) => {
          const active = statusFilter === s;
          const count =
            s === "ALL" ? creators.length : stats.byStatus[s] ?? 0;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs ${
                active
                  ? "bg-white font-semibold text-neutral-900"
                  : "bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
            >
              {s === "ALL" ? "전체" : CREATOR_STATUS_LABEL[s]} {count}
            </button>
          );
        })}
      </div>

      {adding && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="mb-4 font-semibold text-white">새 크리에이터 추가</h2>
          <ImportPanel
            autoHandle={autoHandle}
            autoPaste={autoPaste}
            instagramConfigured={instagramConfigured}
            onPrefill={(prefill) =>
              setForm((prev) => {
                const next = { ...prev };
                // 가져온 값 중 내용이 있는 것만 덮어쓴다.
                for (const [key, value] of Object.entries(prefill)) {
                  if (value) next[key as keyof CreatorFormValues] = value;
                }
                return next;
              })
            }
          />
          <div className="mb-5">
            <BookmarkletBox origin={origin} />
          </div>
          <CreatorForm
            values={form}
            onChange={setForm}
            onSubmit={handleCreate}
            onCancel={() => {
              setAdding(false);
              setError(null);
            }}
            submitLabel="추가하기"
            saving={saving}
            error={error}
          />
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 px-6 py-14 text-center">
          <p className="text-sm text-neutral-400">
            {creators.length === 0
              ? "아직 등록한 크리에이터가 없습니다."
              : "조건에 맞는 크리에이터가 없습니다."}
          </p>
          {creators.length === 0 && (
            <p className="mt-1 text-xs text-neutral-600">
              위 ＋ 크리에이터 추가 버튼으로 한 명씩 모아보세요.
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((c) => {
            const s = summarizeDeals(c.deals);
            return (
              <li key={c.id}>
                <Link
                  href={`/creators/${c.id}`}
                  className="block rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-600"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-white">{c.name}</span>
                    {c.handle && (
                      <span className="text-xs text-neutral-500">@{c.handle}</span>
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] ${
                        CREATOR_STATUS_CLASS[c.status] ?? "bg-neutral-800 text-neutral-300"
                      }`}
                    >
                      {CREATOR_STATUS_LABEL[c.status] ?? c.status}
                    </span>
                    {c.rating !== null && (
                      <span className="text-[11px] text-amber-300">
                        {"★".repeat(c.rating)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
                    <span>{PLATFORM_LABEL[c.platform] ?? c.platform}</span>
                    <span>팔로워 {formatFollowers(c.followers)}</span>
                    {c.engagementRate !== null && (
                      <span>참여율 {formatEngagement(c.engagementRate)}</span>
                    )}
                    {c.category && <span>{c.category}</span>}
                    <span>
                      공구 {s.count}건 · 매출 {formatWon(s.revenue)}
                    </span>
                    {s.lastDealAt && <span>최근 {formatDate(s.lastDealAt)}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
