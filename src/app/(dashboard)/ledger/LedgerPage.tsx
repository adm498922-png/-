"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { formatDate, formatWon, type CreatorView, type ProductView } from "@/lib/gonggu";
import DealForm, {
  dealToForm,
  emptyDealForm,
  type DealFormValues,
} from "../creators/[id]/DealForm";

type Row = {
  id: string;
  creatorId: string;
  creator: { id: string; name: string; handle: string | null };
  productId: string | null;
  product: { id: string; name: string; brand: string | null } | null;
  productName: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  unitsSold: number | null;
  revenue: number | null;
  commissionRate: number | null;
  salesCommission: number | null;
  contentFee: number | null;
  settlement: number | null;
  agencyRate: number | null;
  agencyFee: number | null;
  settleDueDate: string | null;
  settledAt: string | null;
  linkSent: boolean;
  taxReported: boolean;
  statementIssued: boolean;
  memo: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "예정",
  ONGOING: "진행중",
  CLOSED: "종료",
  CANCELED: "취소",
};
const STATUS_CLASS: Record<string, string> = {
  PLANNED: "bg-sky-100 text-sky-700",
  ONGOING: "bg-amber-100 text-amber-800",
  CLOSED: "bg-green-100 text-green-700",
  CANCELED: "bg-slate-100 text-slate-500",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500";
const label = "mb-1 block text-xs text-slate-500";

function emptyForm() {
  return {
    creatorName: "",
    handle: "",
    brand: "",
    productName: "",
    startDate: "",
    endDate: "",
    revenue: "",
    commissionRate: "",
    salesCommission: "",
    contentFee: "",
    settlement: "",
    agencyRate: "",
    agencyFee: "",
    settleDueDate: "",
    settledAt: "",
    linkSent: false,
    taxReported: false,
    statementIssued: false,
    memo: "",
  };
}

export default function LedgerPage({
  initialRows,
  creators,
  products,
}: {
  initialRows: Row[];
  creators: CreatorView[];
  products: ProductView[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<DealFormValues>(emptyDealForm());
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEdit(row: Row) {
    setOpen(false);
    setEditingId(row.id);
    setEditValues(dealToForm(row));
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function submitEdit() {
    if (!editingId) return;
    setEditSaving(true);
    setEditError(null);
    const res = await fetch(`/api/deals/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editValues),
    });
    const data = await res.json().catch(() => null);
    setEditSaving(false);
    if (!res.ok) {
      setEditError(data?.error ?? "저장하지 못했습니다.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...data } : r)));
    setEditingId(null);
  }

  async function deleteRow(row: Row) {
    if (!confirm(`'${row.creator.name}' 항목을 지울까요?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    if (editingId === row.id) setEditingId(null);
    await fetch(`/api/deals/${row.id}`, { method: "DELETE" });
  }

  const set = (key: keyof ReturnType<typeof emptyForm>) => (value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(data?.error ?? "저장하지 못했습니다.");
      return;
    }
    setRows((prev) => [data.deal, ...prev]);
    setNotice(
      [
        "저장했습니다.",
        data.creatorCreated ? "새 크리에이터로 등록됨." : null,
        data.productCreated ? "새 상품으로 등록됨." : null,
      ]
        .filter(Boolean)
        .join(" ")
    );
    setForm(emptyForm());
  }

  return (
    <div className="max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">판매일보</h1>
      <p className="mb-6 text-sm text-slate-500">
        구글 시트 대신 여기서 바로 씁니다. 크리에이터·상품 이름을 적으면 기존
        것과 자동으로 맞춰지고, 없으면 새로 만들어집니다.
      </p>

      <div className="mb-5 flex justify-end">
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          {open ? "닫기" : "＋ 새 항목 작성"}
        </button>
      </div>

      {notice && (
        <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
          {notice}
        </p>
      )}

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={label}>크리에이터 · 닉네임 (필수)</label>
              <input
                list="ledger-creators"
                className={inputClass}
                value={form.creatorName}
                onChange={(e) => set("creatorName")(e.target.value)}
                placeholder="사라"
                autoFocus
              />
              <datalist id="ledger-creators">
                {creators.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={label}>인스타 아이디</label>
              <input
                className={inputClass}
                value={form.handle}
                onChange={(e) => set("handle")(e.target.value)}
                placeholder="_sara_.home"
              />
            </div>
            <div>
              <label className={label}>브랜드</label>
              <input
                className={inputClass}
                value={form.brand}
                onChange={(e) => set("brand")(e.target.value)}
                placeholder="바이탈플랜트"
              />
            </div>
            <div>
              <label className={label}>제품</label>
              <input
                className={inputClass}
                value={form.productName}
                onChange={(e) => set("productName")(e.target.value)}
                placeholder="롤팬"
              />
            </div>
            <div>
              <label className={label}>판매 시작</label>
              <input
                type="date"
                className={inputClass}
                value={form.startDate}
                onChange={(e) => set("startDate")(e.target.value)}
              />
            </div>
            <div>
              <label className={label}>판매 종료</label>
              <input
                type="date"
                className={inputClass}
                value={form.endDate}
                onChange={(e) => set("endDate")(e.target.value)}
              />
            </div>
            <div>
              <label className={label}>정산예정일</label>
              <input
                type="date"
                className={inputClass}
                value={form.settleDueDate}
                onChange={(e) => set("settleDueDate")(e.target.value)}
              />
            </div>
            <div>
              <label className={label}>정산 완료일</label>
              <input
                type="date"
                className={inputClass}
                value={form.settledAt}
                onChange={(e) => set("settledAt")(e.target.value)}
              />
            </div>
            <div>
              <label className={label}>매출</label>
              <input
                className={inputClass}
                value={form.revenue}
                onChange={(e) => set("revenue")(e.target.value)}
                placeholder="3,290,000"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={label}>인플루언서 수수료율 %</label>
              <input
                className={inputClass}
                value={form.commissionRate}
                onChange={(e) => set("commissionRate")(e.target.value)}
                placeholder="15"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className={label}>판매 수수료(세전)</label>
              <input
                className={inputClass}
                value={form.salesCommission}
                onChange={(e) => set("salesCommission")(e.target.value)}
                placeholder="493500"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={label}>콘텐츠 제작비</label>
              <input
                className={inputClass}
                value={form.contentFee}
                onChange={(e) => set("contentFee")(e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={label}>실 지급 정산금</label>
              <input
                className={inputClass}
                value={form.settlement}
                onChange={(e) => set("settlement")(e.target.value)}
                placeholder="477215"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={label}>우리 수수료율 %</label>
              <input
                className={inputClass}
                value={form.agencyRate}
                onChange={(e) => set("agencyRate")(e.target.value)}
                placeholder="10"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className={label}>우리 수수료 금액</label>
              <input
                className={inputClass}
                value={form.agencyFee}
                onChange={(e) => set("agencyFee")(e.target.value)}
                placeholder="329000"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-slate-700">
            {(
              [
                ["linkSent", "링크 전달"],
                ["taxReported", "세금신고"],
                ["statementIssued", "간이지급명세서"],
              ] as const
            ).map(([key, text]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => set(key)(e.target.checked)}
                />
                {text}
              </label>
            ))}
          </div>

          <div>
            <label className={label}>메모</label>
            <input
              className={inputClass}
              value={form.memo}
              onChange={(e) => set("memo")(e.target.value)}
              placeholder="재진행 희망 등"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
          >
            {saving ? "저장 중…" : "저장하기"}
          </button>
        </form>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">아직 작성한 판매일보가 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2.5 font-medium">크리에이터</th>
                <th className="px-3 py-2.5 font-medium">상품</th>
                <th className="px-3 py-2.5 font-medium">기간</th>
                <th className="px-3 py-2.5 font-medium">매출</th>
                <th className="px-3 py-2.5 font-medium">지급액</th>
                <th className="px-3 py-2.5 font-medium">정산</th>
                <th className="px-3 py-2.5 font-medium">상태</th>
                <th className="px-3 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/creators/${r.creator.id}`}
                        className="font-semibold text-slate-900 hover:text-blue-600"
                      >
                        {r.creator.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {r.product?.name ?? r.productName ?? "-"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {formatDate(r.startDate)}
                      {r.endDate ? ` ~ ${formatDate(r.endDate)}` : ""}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{formatWon(r.revenue)}</td>
                    <td className="px-3 py-2.5 text-slate-700">{formatWon(r.settlement)}</td>
                    <td className="px-3 py-2.5">
                      {r.settledAt ? (
                        <span className="text-green-700">완료 {formatDate(r.settledAt)}</span>
                      ) : r.settleDueDate ? (
                        <span className="text-slate-500">예정 {formatDate(r.settleDueDate)}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] ${
                          STATUS_CLASS[r.status] ?? "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          editingId === r.id ? cancelEdit() : openEdit(r)
                        }
                        className="mr-2 text-slate-500 hover:text-blue-600"
                      >
                        {editingId === r.id ? "닫기" : "수정"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRow(r)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                  {editingId === r.id && (
                    <tr className="border-b border-slate-100 last:border-0 bg-slate-50">
                      <td colSpan={8} className="px-4 py-4">
                        <DealForm
                          values={editValues}
                          products={products}
                          onChange={setEditValues}
                          onSubmit={submitEdit}
                          onCancel={cancelEdit}
                          submitLabel="수정 저장"
                          saving={editSaving}
                          error={editError}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
