"use client";

import { useState } from "react";
import { formatWon, type ProductView } from "@/lib/gonggu";

type FormValues = {
  name: string;
  brand: string;
  retailPrice: string;
  supplyPrice: string;
  commissionRate: string;
  imageUrl: string;
  memo: string;
};

function emptyForm(): FormValues {
  return {
    name: "",
    brand: "",
    retailPrice: "",
    supplyPrice: "",
    commissionRate: "",
    imageUrl: "",
    memo: "",
  };
}

function toForm(p: ProductView): FormValues {
  return {
    name: p.name,
    brand: p.brand ?? "",
    retailPrice: p.retailPrice === null ? "" : String(p.retailPrice),
    supplyPrice: p.supplyPrice === null ? "" : String(p.supplyPrice),
    commissionRate: p.commissionRate === null ? "" : String(p.commissionRate),
    imageUrl: p.imageUrl ?? "",
    memo: p.memo ?? "",
  };
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500";
const labelClass = "mb-1 block text-xs text-slate-500";

export default function ProductList({
  initialProducts,
}: {
  initialProducts: ProductView[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const set = (key: keyof FormValues) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function openEdit(p: ProductView) {
    setEditingId(p.id);
    setForm(toForm(p));
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(
      editingId ? `/api/products/${editingId}` : "/api/products",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(data?.error ?? "저장하지 못했습니다.");
      return;
    }
    setProducts((prev) =>
      editingId ? prev.map((p) => (p.id === editingId ? data : p)) : [data, ...prev]
    );
    setOpen(false);
    setEditingId(null);
  }

  async function toggleActive(p: ProductView) {
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return;
    setProducts((prev) => prev.map((x) => (x.id === p.id ? data : x)));
  }

  async function handleDelete(p: ProductView) {
    if (!confirm(`'${p.name}' 상품을 지울까요?`)) return;
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (data?.softDeleted) {
      setNotice(data.message);
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, isActive: false } : x))
      );
      return;
    }
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => (open ? setOpen(false) : openNew())}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          {open ? "닫기" : "＋ 상품 추가"}
        </button>
      </div>

      {notice && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
          {notice}
        </p>
      )}

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
        >
          <h2 className="font-semibold text-slate-900">
            {editingId ? "상품 수정" : "새 상품 추가"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                상품명 <span className="ml-1 text-slate-400">필수</span>
              </label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="예: 유기농 이유식 세트"
                autoFocus
              />
            </div>
            <div>
              <label className={labelClass}>브랜드</label>
              <input
                className={inputClass}
                value={form.brand}
                onChange={(e) => set("brand")(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>소비자가</label>
              <input
                className={inputClass}
                value={form.retailPrice}
                onChange={(e) => set("retailPrice")(e.target.value)}
                placeholder="30000"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={labelClass}>공급가</label>
              <input
                className={inputClass}
                value={form.supplyPrice}
                onChange={(e) => set("supplyPrice")(e.target.value)}
                placeholder="18000"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={labelClass}>
                크리에이터 수수료 <span className="ml-1 text-slate-400">%</span>
              </label>
              <input
                className={inputClass}
                value={form.commissionRate}
                onChange={(e) => set("commissionRate")(e.target.value)}
                placeholder="10"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className={labelClass}>상품 이미지 주소</label>
              <input
                className={inputClass}
                value={form.imageUrl}
                onChange={(e) => set("imageUrl")(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>메모</label>
            <textarea
              className={`${inputClass} min-h-16 resize-y`}
              value={form.memo}
              onChange={(e) => set("memo")(e.target.value)}
              placeholder="재고, 배송 조건, 주의할 점 등"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
            >
              {saving ? "저장 중…" : editingId ? "수정 저장" : "추가하기"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">아직 등록한 상품이 없습니다.</p>
          <p className="mt-1 text-xs text-slate-400">
            공구 기록을 남길 때 여기 등록한 상품을 골라 쓸 수 있습니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {products.map((p) => (
            <li
              key={p.id}
              className={`rounded-xl border border-slate-200 bg-white p-4 ${
                p.isActive ? "" : "opacity-60"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{p.name}</span>
                {p.brand && <span className="text-xs text-slate-500">{p.brand}</span>}
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] ${
                    p.isActive
                      ? "bg-green-500/15 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {p.isActive ? "공구 가능" : "판매 종료"}
                </span>
                <span className="ml-auto flex gap-2 text-[11px] text-slate-500">
                  <button onClick={() => openEdit(p)} className="hover:text-slate-900">
                    수정
                  </button>
                  <button onClick={() => toggleActive(p)} className="hover:text-slate-900">
                    {p.isActive ? "판매 종료" : "다시 열기"}
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="hover:text-red-700"
                  >
                    삭제
                  </button>
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>소비자가 {formatWon(p.retailPrice)}</span>
                <span>공급가 {formatWon(p.supplyPrice)}</span>
                <span>
                  수수료 {p.commissionRate === null ? "-" : `${p.commissionRate}%`}
                </span>
                <span>진행 {p.deals?.length ?? 0}건</span>
              </div>
              {p.memo && (
                <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-500">
                  {p.memo}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
