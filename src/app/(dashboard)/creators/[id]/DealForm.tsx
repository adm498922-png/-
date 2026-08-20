"use client";

import {
  DEAL_STATUSES,
  DEAL_STATUS_LABEL,
  toDateInput,
  type DealView,
  type ProductView,
} from "@/lib/gonggu";

export type DealFormValues = {
  productId: string;
  productName: string;
  status: string;
  startDate: string;
  endDate: string;
  unitsSold: string;
  revenue: string;
  settlement: string;
  memo: string;
};

export function emptyDealForm(): DealFormValues {
  return {
    productId: "",
    productName: "",
    status: "PLANNED",
    startDate: "",
    endDate: "",
    unitsSold: "",
    revenue: "",
    settlement: "",
    memo: "",
  };
}

export function dealToForm(d: DealView): DealFormValues {
  return {
    productId: d.productId ?? "",
    productName: d.productName ?? "",
    status: d.status,
    startDate: toDateInput(d.startDate),
    endDate: toDateInput(d.endDate),
    unitsSold: d.unitsSold === null ? "" : String(d.unitsSold),
    revenue: d.revenue === null ? "" : String(d.revenue),
    settlement: d.settlement === null ? "" : String(d.settlement),
    memo: d.memo ?? "",
  };
}

const inputClass =
  "w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-blue-500";
const labelClass = "mb-1 block text-xs text-neutral-400";

export default function DealForm({
  values,
  products,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  saving,
  error,
}: {
  values: DealFormValues;
  products: ProductView[];
  onChange: (next: DealFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  saving: boolean;
  error?: string | null;
}) {
  const set = (key: keyof DealFormValues) => (value: string) =>
    onChange({ ...values, [key]: value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>상품</label>
          <select
            className={inputClass}
            value={values.productId}
            onChange={(e) => set("productId")(e.target.value)}
          >
            <option value="">직접 입력</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isActive ? "" : " (판매종료)"}
              </option>
            ))}
          </select>
        </div>
        {!values.productId && (
          <div>
            <label className={labelClass}>
              상품명 <span className="ml-1 text-neutral-600">직접 입력</span>
            </label>
            <input
              className={inputClass}
              value={values.productName}
              onChange={(e) => set("productName")(e.target.value)}
              placeholder="예: 유기농 이유식 세트"
            />
          </div>
        )}
        <div>
          <label className={labelClass}>진행 상태</label>
          <select
            className={inputClass}
            value={values.status}
            onChange={(e) => set("status")(e.target.value)}
          >
            {DEAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {DEAL_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>시작일</label>
          <input
            type="date"
            className={inputClass}
            value={values.startDate}
            onChange={(e) => set("startDate")(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>종료일</label>
          <input
            type="date"
            className={inputClass}
            value={values.endDate}
            onChange={(e) => set("endDate")(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>판매 수량</label>
          <input
            className={inputClass}
            value={values.unitsSold}
            onChange={(e) => set("unitsSold")(e.target.value)}
            placeholder="120"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className={labelClass}>매출</label>
          <input
            className={inputClass}
            value={values.revenue}
            onChange={(e) => set("revenue")(e.target.value)}
            placeholder="3600000"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className={labelClass}>
            크리에이터 지급액 <span className="ml-1 text-neutral-600">정산</span>
          </label>
          <input
            className={inputClass}
            value={values.settlement}
            onChange={(e) => set("settlement")(e.target.value)}
            placeholder="360000"
            inputMode="numeric"
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>메모</label>
        <textarea
          className={`${inputClass} min-h-16 resize-y`}
          value={values.memo}
          onChange={(e) => set("memo")(e.target.value)}
          placeholder="반응, 재진행 의사, 특이사항"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-400"
        >
          {saving ? "저장 중…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-sm text-neutral-400 hover:text-white"
        >
          취소
        </button>
      </div>
    </form>
  );
}
