"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CreatorForm, {
  emptyCreatorForm,
  type CreatorFormValues,
} from "./CreatorForm";
import ImportPanel from "./ImportPanel";
import BookmarkletBox from "./BookmarkletBox";
import SalesImportPanel from "./SalesImportPanel";
import {
  CREATOR_COLOR_SWATCH,
  CREATOR_GRADE_CLASS,
  CREATOR_GRADE_LABEL,
  CREATOR_STATUSES,
  CREATOR_STATUS_CLASS,
  CREATOR_STATUS_LABEL,
  PLATFORM_LABEL,
  formatDate,
  formatEngagement,
  formatFollowers,
  formatWon,
  getCreatorGrade,
  resolveCreatorColor,
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
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

type CampaignOption = { id: string; name: string; brand: string; type: string };

export default function CreatorList({
  initialCreators,
  campaigns = [],
  origin,
  autoOpen,
  autoHandle,
  autoPaste,
  autoImage,
  instagramConfigured,
}: {
  initialCreators: CreatorView[];
  campaigns?: CampaignOption[];
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkCsv, setBulkCsv] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const [assignCampaignId, setAssignCampaignId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignNotice, setAssignNotice] = useState<string | null>(null);
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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    const allSelected = visible.length > 0 && visible.every((c) => selected.has(c.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) visible.forEach((c) => next.delete(c.id));
      else visible.forEach((c) => next.add(c.id));
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}명을 삭제할까요?`)) return;
    const ids = Array.from(selected);
    const res = await fetch("/api/creators/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      alert(data?.error ?? "삭제하지 못했습니다.");
      return;
    }
    setCreators((prev) => prev.filter((c) => !selected.has(c.id)));
    setSelected(new Set());
  }

  async function handleAssignToCampaign() {
    if (selected.size === 0 || !assignCampaignId) return;
    setAssigning(true);
    const res = await fetch(`/api/campaigns/${assignCampaignId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorIds: Array.from(selected) }),
    });
    const data = await res.json().catch(() => null);
    setAssigning(false);
    if (!res.ok) {
      alert(data?.error ?? "배정하지 못했습니다.");
      return;
    }
    const camp = campaigns.find((c) => c.id === assignCampaignId);
    setAssignNotice(`${data.added}명을 "${camp?.name ?? "캠페인"}"에 배정했습니다.`);
    setSelected(new Set());
  }

  async function handleBulkImport() {
    if (!bulkCsv.trim()) return;
    setBulkLoading(true);
    setBulkNotice(null);
    const res = await fetch("/api/creators/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: bulkCsv }),
    });
    const data = await res.json().catch(() => null);
    setBulkLoading(false);
    if (!res.ok) {
      setBulkNotice(data?.error ?? "가져오지 못했습니다.");
      return;
    }
    setBulkNotice(
      `${data.added}명 추가됨${data.skipped ? ` · ${data.skipped}명 건너뜀(중복/빈 핸들)` : ""}`
    );
    setBulkCsv("");
    if (data.added > 0) {
      const res2 = await fetch("/api/creators");
      const list = await res2.json().catch(() => null);
      if (Array.isArray(list)) setCreators(list);
    }
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
          className="min-w-48 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
        >
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABEL[k]}
            </option>
          ))}
        </select>
        <button
          onClick={() => setBulkImportOpen((v) => !v)}
          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
        >
          {bulkImportOpen ? "닫기" : "CSV 일괄 추가"}
        </button>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          {adding ? "닫기" : "＋ 크리에이터 추가"}
        </button>
      </div>

      {bulkImportOpen && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 font-semibold text-slate-900">CSV로 여러 명 한번에 추가</h2>
          <p className="mb-3 text-xs text-slate-500">
            한 줄에 한 명씩, 쉼표로 구분해서 붙여넣으세요. 형식:{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
              핸들,팔로워,게시물수,카테고리,소개글,메모
            </code>{" "}
            (핸들만 필수, 나머지는 비워도 됩니다. 헤더 줄이 있어도 됩니다. 이미 있는 핸들은 건너뜁니다.)
          </p>
          <textarea
            className="w-full min-h-32 resize-y rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
            value={bulkCsv}
            onChange={(e) => setBulkCsv(e.target.value)}
            placeholder={
              "handle,followers,postCount,category,bio,notes\ntech_reviewer,15000,320,IT,테크 리뷰와 가젯 소개,빠른 답장\nbeauty_daily,48000,890,뷰티,데일리 메이크업,"
            }
          />
          {bulkNotice && (
            <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
              {bulkNotice}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleBulkImport}
              disabled={bulkLoading || !bulkCsv.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
            >
              {bulkLoading ? "추가하는 중…" : "일괄 추가"}
            </button>
            <button
              onClick={() => setBulkImportOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
            >
              취소
            </button>
          </div>
        </div>
      )}

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
                  ? "bg-blue-600 font-semibold text-white"
                  : "bg-white text-slate-500 hover:text-slate-900"
              }`}
            >
              {s === "ALL" ? "전체" : CREATOR_STATUS_LABEL[s]} {count}
            </button>
          );
        })}
      </div>

      {adding && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-900">새 크리에이터 추가</h2>
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

      <SalesImportPanel />

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5">
          <span className="text-sm font-semibold text-blue-700">{selected.size}명 선택됨</span>
          {campaigns.length > 0 && (
            <>
              <select
                value={assignCampaignId}
                onChange={(e) => setAssignCampaignId(e.target.value)}
                className="rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none"
              >
                <option value="">캠페인에 배정...</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.type === "AD" ? "📢" : "🛒"} {c.name} ({c.brand})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssignToCampaign}
                disabled={!assignCampaignId || assigning}
                className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
              >
                {assigning ? "배정 중…" : "배정"}
              </button>
            </>
          )}
          <button
            onClick={handleBulkDelete}
            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            선택 삭제
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-slate-500 hover:text-slate-900"
          >
            선택 해제
          </button>
        </div>
      )}
      {assignNotice && (
        <p className="rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-700">{assignNotice}</p>
      )}

      {visible.length > 0 && (
        <label className="flex w-fit items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={visible.length > 0 && visible.every((c) => selected.has(c.id))}
            onChange={toggleSelectAllVisible}
            className="h-4 w-4 cursor-pointer accent-blue-600"
          />
          보이는 {visible.length}명 전체 선택
        </label>
      )}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">
            {creators.length === 0
              ? "아직 등록한 크리에이터가 없습니다."
              : "조건에 맞는 크리에이터가 없습니다."}
          </p>
          {creators.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">
              위 ＋ 크리에이터 추가 버튼으로 한 명씩 모아보세요.
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((c) => {
            const s = summarizeDeals(c.deals);
            const grade = getCreatorGrade(c.followers);
            return (
              <li key={c.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggleSelect(c.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
                />
                <Link
                  href={`/creators/${c.id}`}
                  className="block flex-1 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-400"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        CREATOR_COLOR_SWATCH[resolveCreatorColor(c.name, c.color)]
                      }`}
                      title="캘린더 색상"
                    />
                    <span className="font-semibold text-slate-900">{c.name}</span>
                    {c.handle && (
                      <span className="text-xs text-slate-500">@{c.handle}</span>
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] ${
                        CREATOR_STATUS_CLASS[c.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {CREATOR_STATUS_LABEL[c.status] ?? c.status}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[11px] ${CREATOR_GRADE_CLASS[grade]}`}>
                      {CREATOR_GRADE_LABEL[grade]}
                    </span>
                    {c.rating !== null && (
                      <span className="text-[11px] text-amber-700">
                        {"★".repeat(c.rating)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
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
