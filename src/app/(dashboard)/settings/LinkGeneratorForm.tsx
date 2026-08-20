"use client";

import { useState } from "react";

type CoupangLink = {
  id: string;
  productName: string | null;
  originalUrl: string;
  shortUrl: string;
  createdAt: string | Date;
};

export default function LinkGeneratorForm({
  initialLinks,
}: {
  initialLinks: CoupangLink[];
}) {
  const [url, setUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [links, setLinks] = useState(initialLinks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/coupang/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, productName }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "링크 생성에 실패했습니다.");
      return;
    }
    setLinks((prev) => [data, ...prev]);
    setUrl("");
    setProductName("");
  }

  async function handleCopy(id: string, shortUrl: string) {
    await navigator.clipboard.writeText(shortUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleDelete(id: string) {
    if (!confirm("이 링크를 삭제할까요? (이 링크로 이미 발행된 글은 그대로 남아요)")) {
      return;
    }
    setDeletingId(id);
    const res = await fetch(`/api/coupang/links/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) return;
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="mb-8 space-y-3 rounded-xl border border-slate-200 bg-white p-5"
      >
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            쿠팡 상품 URL
          </label>
          <input
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.coupang.com/vp/products/..."
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            상품명 (선택, 목록 구분용)
          </label>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "생성 중..." : "링크 생성"}
        </button>
      </form>

      <h2 className="mb-3 text-sm font-semibold text-slate-600">
        최근 생성한 링크
      </h2>
      {links.length === 0 ? (
        <p className="text-sm text-slate-500">아직 생성한 링크가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-900">
                  {link.productName || link.originalUrl}
                </p>
                <p className="truncate text-xs text-blue-600">
                  {link.shortUrl}
                </p>
              </div>
              <div className="ml-3 flex shrink-0 gap-2">
                <button
                  onClick={() => handleCopy(link.id, link.shortUrl)}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
                >
                  {copiedId === link.id ? "복사됨" : "복사"}
                </button>
                <button
                  onClick={() => handleDelete(link.id)}
                  disabled={deletingId === link.id}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-red-600 hover:bg-slate-200 disabled:opacity-50"
                >
                  {deletingId === link.id ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
