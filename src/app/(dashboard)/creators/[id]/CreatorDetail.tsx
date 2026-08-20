"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CreatorForm, {
  creatorToForm,
  type CreatorFormValues,
} from "../CreatorForm";
import DealForm, {
  dealToForm,
  emptyDealForm,
  type DealFormValues,
} from "./DealForm";
import {
  CREATOR_STATUSES,
  CREATOR_STATUS_CLASS,
  CREATOR_STATUS_LABEL,
  DEAL_STATUS_CLASS,
  DEAL_STATUS_LABEL,
  PLATFORM_LABEL,
  formatDate,
  formatFollowers,
  formatWon,
  summarizeDeals,
  type CreatorView,
  type DealView,
  type ProductView,
} from "@/lib/gonggu";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <span className="w-24 shrink-0 text-neutral-500">{label}</span>
      <span className="min-w-0 flex-1 break-words text-neutral-200">{children}</span>
    </div>
  );
}

export default function CreatorDetail({
  initialCreator,
  products,
}: {
  initialCreator: CreatorView;
  products: ProductView[];
}) {
  const router = useRouter();
  const [creator, setCreator] = useState(initialCreator);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CreatorFormValues>(() =>
    creatorToForm(initialCreator)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [dealForm, setDealForm] = useState<DealFormValues>(emptyDealForm);
  const [dealSaving, setDealSaving] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);

  const summary = summarizeDeals(creator.deals);

  async function patchCreator(patch: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/creators/${creator.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(data?.error ?? "저장하지 못했습니다.");
      return false;
    }
    setCreator(data);
    setForm(creatorToForm(data));
    return true;
  }

  async function handleSaveInfo() {
    const ok = await patchCreator(form);
    if (ok) setEditing(false);
  }

  async function handleDelete() {
    if (
      !confirm(
        `'${creator.name}' 님을 목록에서 지울까요?\n공구 기록도 같이 지워지고, 되돌릴 수 없습니다.`
      )
    )
      return;
    await fetch(`/api/creators/${creator.id}`, { method: "DELETE" });
    router.push("/creators");
    router.refresh();
  }

  function openNewDeal() {
    setEditingDealId(null);
    setDealForm(emptyDealForm());
    setDealError(null);
    setDealFormOpen(true);
  }

  function openEditDeal(deal: DealView) {
    setEditingDealId(deal.id);
    setDealForm(dealToForm(deal));
    setDealError(null);
    setDealFormOpen(true);
  }

  async function handleSaveDeal() {
    setDealSaving(true);
    setDealError(null);
    const url = editingDealId
      ? `/api/deals/${editingDealId}`
      : `/api/creators/${creator.id}/deals`;
    const res = await fetch(url, {
      method: editingDealId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dealForm),
    });
    const data = await res.json().catch(() => null);
    setDealSaving(false);
    if (!res.ok) {
      setDealError(data?.error ?? "저장하지 못했습니다.");
      return;
    }
    setCreator((prev) => ({
      ...prev,
      deals: editingDealId
        ? prev.deals.map((d) => (d.id === editingDealId ? data : d))
        : [data, ...prev.deals],
    }));
    setDealFormOpen(false);
    setEditingDealId(null);
  }

  async function handleDeleteDeal(dealId: string) {
    if (!confirm("이 공구 기록을 지울까요?")) return;
    await fetch(`/api/deals/${dealId}`, { method: "DELETE" });
    setCreator((prev) => ({
      ...prev,
      deals: prev.deals.filter((d) => d.id !== dealId),
    }));
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/creators" className="text-xs text-neutral-500 hover:text-white">
          ← 크리에이터 목록
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-white">{creator.name}</h1>
          {creator.handle && (
            <span className="text-sm text-neutral-500">@{creator.handle}</span>
          )}
          {creator.profileUrl && (
            <a
              href={creator.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-400 underline underline-offset-4 hover:text-blue-300"
            >
              채널 열기
            </a>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <p className="mb-2 text-xs text-neutral-500">진행 상태 — 눌러서 바꿉니다</p>
        <div className="flex flex-wrap gap-1.5">
          {CREATOR_STATUSES.map((s) => {
            const active = creator.status === s;
            return (
              <button
                key={s}
                disabled={saving}
                onClick={() => patchCreator({ status: s })}
                className={`rounded-full px-3 py-1.5 text-xs disabled:opacity-60 ${
                  active
                    ? CREATOR_STATUS_CLASS[s] + " font-semibold"
                    : "bg-neutral-950 text-neutral-500 hover:text-white"
                }`}
              >
                {CREATOR_STATUS_LABEL[s]}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "공구 진행", value: `${summary.count}건` },
          { label: "누적 매출", value: formatWon(summary.revenue) },
          { label: "지급한 금액", value: formatWon(summary.settlement) },
          { label: "판매 수량", value: `${summary.units.toLocaleString("ko-KR")}개` },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
          >
            <p className="text-xs text-neutral-500">{s.label}</p>
            <p className="mt-1 text-lg font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-white">기본 정보</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              수정
            </button>
          )}
        </div>

        {editing ? (
          <CreatorForm
            values={form}
            onChange={setForm}
            onSubmit={handleSaveInfo}
            onCancel={() => {
              setEditing(false);
              setForm(creatorToForm(creator));
              setError(null);
            }}
            submitLabel="저장하기"
            saving={saving}
            error={error}
          />
        ) : (
          <div className="divide-y divide-neutral-800">
            <InfoRow label="채널">
              {PLATFORM_LABEL[creator.platform] ?? creator.platform}
            </InfoRow>
            <InfoRow label="팔로워">{formatFollowers(creator.followers)}</InfoRow>
            <InfoRow label="분야">{creator.category ?? "-"}</InfoRow>
            <InfoRow label="연락처">
              {creator.contact ? (
                <>
                  {creator.contactType && (
                    <span className="mr-1.5 text-neutral-500">
                      {creator.contactType}
                    </span>
                  )}
                  {creator.contact}
                </>
              ) : (
                "-"
              )}
            </InfoRow>
            <InfoRow label="진행비">{formatWon(creator.feeKrw)}</InfoRow>
            <InfoRow label="수수료">
              {creator.commissionRate === null ? "-" : `${creator.commissionRate}%`}
            </InfoRow>
            <InfoRow label="내 평가">
              {creator.rating === null ? "-" : "★".repeat(creator.rating)}
            </InfoRow>
            <InfoRow label="마지막 연락">{formatDate(creator.lastContactAt)}</InfoRow>
            <InfoRow label="태그">{creator.tags ?? "-"}</InfoRow>
            <InfoRow label="메모">
              <span className="whitespace-pre-wrap">{creator.memo ?? "-"}</span>
            </InfoRow>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-white">공구 기록</h2>
          {!dealFormOpen && (
            <button
              onClick={openNewDeal}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-200"
            >
              ＋ 기록 추가
            </button>
          )}
        </div>

        {dealFormOpen && (
          <div className="mb-4 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
            <DealForm
              values={dealForm}
              products={products}
              onChange={setDealForm}
              onSubmit={handleSaveDeal}
              onCancel={() => {
                setDealFormOpen(false);
                setEditingDealId(null);
              }}
              submitLabel={editingDealId ? "수정 저장" : "기록 추가"}
              saving={dealSaving}
              error={dealError}
            />
          </div>
        )}

        {creator.deals.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">
            아직 진행한 공구 기록이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {creator.deals.map((d) => (
              <li
                key={d.id}
                className="rounded-lg border border-neutral-800 bg-neutral-950 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {d.product?.name ?? d.productName ?? "상품 미지정"}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] ${
                      DEAL_STATUS_CLASS[d.status] ?? "bg-neutral-800 text-neutral-300"
                    }`}
                  >
                    {DEAL_STATUS_LABEL[d.status] ?? d.status}
                  </span>
                  <span className="ml-auto flex gap-2 text-[11px] text-neutral-500">
                    <button onClick={() => openEditDeal(d)} className="hover:text-white">
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteDeal(d.id)}
                      className="hover:text-red-300"
                    >
                      삭제
                    </button>
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
                  <span>
                    {formatDate(d.startDate)}
                    {d.endDate ? ` ~ ${formatDate(d.endDate)}` : ""}
                  </span>
                  {d.unitsSold !== null && (
                    <span>{d.unitsSold.toLocaleString("ko-KR")}개</span>
                  )}
                  {d.revenue !== null && <span>매출 {formatWon(d.revenue)}</span>}
                  {d.settlement !== null && <span>지급 {formatWon(d.settlement)}</span>}
                </div>
                {d.memo && (
                  <p className="mt-1.5 whitespace-pre-wrap text-xs text-neutral-500">
                    {d.memo}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        onClick={handleDelete}
        className="text-xs text-neutral-600 underline underline-offset-4 hover:text-red-400"
      >
        이 크리에이터 삭제하기
      </button>
    </div>
  );
}
