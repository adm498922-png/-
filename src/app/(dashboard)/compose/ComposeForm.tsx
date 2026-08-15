"use client";

import { useState } from "react";

type Account = { id: string; label: string; username: string | null };
type CoupangLink = {
  id: string;
  productName: string | null;
  originalUrl: string;
  shortUrl: string;
};
type ProductSearchResult = {
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  isRocket: boolean;
};
type PostTarget = {
  id: string;
  status: string;
  errorMessage: string | null;
  threadsPermalink: string | null;
  threadsAccount: Account;
  body: string | null;
};
type Post = {
  id: string;
  body: string;
  status: string;
  scheduledAt: string | Date | null;
  createdAt: string | Date;
  targets: PostTarget[];
};

const TARGET_STATUS_LABEL: Record<string, string> = {
  PENDING: "대기중",
  PUBLISHING: "발행중",
  PUBLISHED: "발행됨",
  COMMENTING: "댓글 등록중",
  DONE: "완료",
  FAILED: "실패",
};

const POST_STATUS_LABEL: Record<string, string> = {
  DRAFT: "임시저장",
  SCHEDULED: "예약됨",
  PUBLISHING: "발행중",
  PUBLISHED: "발행완료",
  FAILED: "실패",
};

function statusColor(status: string) {
  if (status === "DONE" || status === "PUBLISHED") return "text-green-400";
  if (status === "FAILED") return "text-red-400";
  if (status === "PENDING") return "text-neutral-500";
  return "text-amber-400";
}

export default function ComposeForm({
  accounts,
  links,
  initialPosts,
  aiConfigured,
}: {
  accounts: Account[];
  links: CoupangLink[];
  initialPosts: Post[];
  aiConfigured: boolean;
}) {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    accounts.map((a) => a.id)
  );
  const [bodyText, setBodyText] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [coupangLinkId, setCoupangLinkId] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState(initialPosts);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [links_, setLinks] = useState(links);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ProductSearchResult[] | null>(null);
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<{
    productName: string;
    productPrice: number;
  } | null>(null);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [perAccountBody, setPerAccountBody] = useState<Record<string, string>>({});
  const [generatingVariantFor, setGeneratingVariantFor] = useState<string | null>(null);
  const [dailyTopic, setDailyTopic] = useState("");
  const [generatingDaily, setGeneratingDaily] = useState(false);

  async function handleProductSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchKeyword.trim()) return;
    setSearching(true);
    setSearchError(null);
    const res = await fetch("/api/coupang/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: searchKeyword.trim() }),
    });
    setSearching(false);
    const data = await res.json();
    if (!res.ok) {
      setSearchError(data.error ?? "검색에 실패했습니다.");
      setSearchResults(null);
      return;
    }
    // 로켓배송 상품(대체로 판매량이 검증된 상품)을 우선 표시
    const sorted = [...data.products].sort(
      (a: ProductSearchResult, b: ProductSearchResult) =>
        (b.isRocket ? 1 : 0) - (a.isRocket ? 1 : 0)
    );
    setSearchResults(sorted);
  }

  async function handleSelectProduct(product: ProductSearchResult) {
    setSelectingId(product.productId);
    setSearchError(null);
    const res = await fetch("/api/coupang/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: product.productUrl,
        productName: `${product.productName} (${product.productPrice.toLocaleString("ko-KR")}원)`,
      }),
    });
    setSelectingId(null);
    const data = await res.json();
    if (!res.ok) {
      setSearchError(data.error ?? "링크 생성에 실패했습니다.");
      return;
    }
    setLinks((prev) => [data, ...prev]);
    setCoupangLinkId(data.id);
    setSelectedProduct({
      productName: product.productName,
      productPrice: product.productPrice,
    });
  }

  async function handleGenerateDraft() {
    if (!selectedProduct) return;
    setGeneratingDraft(true);
    setError(null);
    const res = await fetch("/api/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedProduct),
    });
    setGeneratingDraft(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "AI 글 생성에 실패했습니다.");
      return;
    }
    setBodyText(data.body);
  }

  async function handleGenerateDaily(e: React.FormEvent) {
    e.preventDefault();
    if (!dailyTopic.trim()) return;
    setGeneratingDaily(true);
    setError(null);
    const res = await fetch("/api/ai/daily-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: dailyTopic.trim() }),
    });
    setGeneratingDaily(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "AI 글 생성에 실패했습니다.");
      return;
    }
    setBodyText(data.body);
    setSelectedProduct(null);
    setCoupangLinkId("");
  }

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
    setPerAccountBody((prev) => {
      if (prev[id] !== undefined) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: bodyText };
    });
  }

  async function handleGenerateVariant(accountId: string) {
    if (!selectedProduct) return;
    setGeneratingVariantFor(accountId);
    setError(null);
    const res = await fetch("/api/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedProduct),
    });
    setGeneratingVariantFor(null);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "AI 글 생성에 실패했습니다.");
      return;
    }
    setPerAccountBody((prev) => ({ ...prev, [accountId]: data.body }));
  }

  const COUPANG_DISCLOSURE =
    "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

  const ENGAGEMENT_PROMPTS = [
    "다들 이런 거 하나씩 있지 않아?",
    "혹시 더 좋은 거 쓰는 사람 있으면 댓글로 좀 알려줘",
    "나만 이제 알았나 싶어서 올려봄",
    "비슷한 상황이면 진짜 공감될 듯",
  ];

  function insertEngagementPrompt() {
    const candidates = ENGAGEMENT_PROMPTS.filter((p) => !commentBody.includes(p));
    const pool = candidates.length > 0 ? candidates : ENGAGEMENT_PROMPTS;
    const prompt = pool[Math.floor(Math.random() * pool.length)];
    setCommentBody((prev) => (prev.trim() ? `${prev.trim()}\n${prompt}` : prompt));
  }

  function insertSelectedLink() {
    const link = links_.find((l) => l.id === coupangLinkId);
    if (!link) return;
    setBodyText((prev) => {
      const base = prev.trim() ? `${prev.trim()}\n\n${link.shortUrl}` : link.shortUrl;
      return base.includes(COUPANG_DISCLOSURE)
        ? base
        : `${base}\n\n${COUPANG_DISCLOSURE}`;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedAccountIds.length === 0) {
      setError("발행할 계정을 1개 이상 선택해주세요.");
      return;
    }
    if (scheduleMode === "later" && !scheduledAt) {
      setError("예약 시간을 선택해주세요.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: bodyText,
        commentBody: commentBody || undefined,
        coupangLinkId: coupangLinkId || undefined,
        accountIds: selectedAccountIds,
        accountBodies:
          selectedAccountIds.length > 1 ? perAccountBody : undefined,
        scheduledAt:
          scheduleMode === "later"
            ? new Date(scheduledAt).toISOString()
            : undefined,
      }),
    });
    setSubmitting(false);

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "발행 요청에 실패했습니다.");
      return;
    }

    setPosts((prev) => [data, ...prev]);
    setBodyText("");
    setCommentBody("");
    setCoupangLinkId("");
    setPerAccountBody({});
    setScheduleMode("now");
    setScheduledAt("");
  }

  async function handlePublishNow(postId: string) {
    setPublishingId(postId);
    await fetch(`/api/posts/${postId}/publish`, { method: "POST" });
    const res = await fetch(`/api/posts/${postId}`);
    const updated = await res.json();
    setPublishingId(null);
    if (!res.ok) return;
    setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
  }

  return (
    <div className="space-y-8">
      {aiConfigured && (
        <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="text-sm font-semibold text-neutral-200">
            AI로 일상글 쓰기 (쿠팡 상품 없이)
          </h2>
          <p className="text-xs text-neutral-500">
            주제나 키워드만 입력하면 AI가 반말 일상글 초안을 써줘요. 쿠팡
            링크 홍보 글만 반복되면 부자연스러워 보일 수 있어, 계정을
            자연스럽게 보이려면 일상글도 섞는 걸 추천해요.
          </p>
          <form onSubmit={handleGenerateDaily} className="flex gap-2">
            <input
              value={dailyTopic}
              onChange={(e) => setDailyTopic(e.target.value)}
              placeholder="예: 육아템, 오늘 날씨, 아이 어린이집 적응기"
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={generatingDaily}
              className="rounded-lg bg-purple-600/20 px-4 py-2 text-sm text-purple-300 hover:bg-purple-600/30 disabled:opacity-50"
            >
              {generatingDaily ? "AI 작성 중..." : "✦ AI 일상글 생성"}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="text-sm font-semibold text-neutral-200">
          쿠팡파트너스 상품 검색
        </h2>
        <form onSubmit={handleProductSearch} className="flex gap-2">
          <input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="찰옥수수"
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
          >
            {searching ? "검색 중..." : "검색"}
          </button>
        </form>
        {searchError && <p className="text-sm text-red-400">{searchError}</p>}
        {searchResults && (
          <>
            <p className="text-xs text-neutral-500">
              {searchResults.length}개 상품 찾음 · 원하는 상품을 선택하세요
            </p>
            <div className="space-y-2">
              {searchResults.map((product, i) => (
                <div
                  key={`${product.productId}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.productImage}
                    alt={product.productName}
                    className="h-14 w-14 shrink-0 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">
                      {product.productName}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-neutral-400">
                      {product.productPrice.toLocaleString("ko-KR")}원
                      {product.isRocket && (
                        <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-300">
                          로켓배송
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    disabled={selectingId === product.productId}
                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {selectingId === product.productId ? "선택 중..." : "이 상품 선택"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5"
      >
        <div>
          <label className="mb-2 block text-xs text-neutral-400">
            발행할 계정
          </label>
          <div className="flex flex-wrap gap-2">
            {accounts.map((account) => (
              <button
                type="button"
                key={account.id}
                onClick={() => toggleAccount(account.id)}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  selectedAccountIds.includes(account.id)
                    ? "border-blue-500 bg-blue-500/15 text-blue-300"
                    : "border-neutral-700 text-neutral-400"
                }`}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>

        {links_.length > 0 && (
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              쿠팡 링크 삽입 (선택)
            </label>
            <div className="flex gap-2">
              <select
                value={coupangLinkId}
                onChange={(e) => setCoupangLinkId(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="">링크 선택 안함</option>
                {links_.map((link) => (
                  <option key={link.id} value={link.id}>
                    {link.productName || link.originalUrl}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={insertSelectedLink}
                disabled={!coupangLinkId}
                className="rounded-lg bg-neutral-800 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-700 disabled:opacity-40"
              >
                본문에 삽입
              </button>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              쿠팡파트너스 링크와 함께 법적으로 필요한 고지 문구가 자동으로 붙습니다.
            </p>
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs text-neutral-400">본문</label>
            {aiConfigured && selectedProduct && (
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={generatingDraft}
                className="rounded-full bg-purple-600/20 px-2.5 py-1 text-xs text-purple-300 hover:bg-purple-600/30 disabled:opacity-50"
              >
                {generatingDraft ? "AI 작성 중..." : "✦ AI 초안 생성"}
              </button>
            )}
          </div>
          <textarea
            required
            rows={5}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="글 내용을 입력하세요"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>

        {selectedAccountIds.length > 1 && (
          <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
            <p className="text-xs text-neutral-400">
              계정별 문구 (비워두면 위 본문이 그대로 사용됩니다 — 여러 계정에
              똑같은 글이 올라가면 반복 게시처럼 보일 수 있어요)
            </p>
            {selectedAccountIds.map((accountId) => {
              const account = accounts.find((a) => a.id === accountId);
              if (!account) return null;
              return (
                <div key={accountId}>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs text-neutral-400">
                      {account.label}
                    </label>
                    {aiConfigured && selectedProduct && (
                      <button
                        type="button"
                        onClick={() => handleGenerateVariant(accountId)}
                        disabled={generatingVariantFor === accountId}
                        className="rounded-full bg-purple-600/20 px-2.5 py-1 text-xs text-purple-300 hover:bg-purple-600/30 disabled:opacity-50"
                      >
                        {generatingVariantFor === accountId
                          ? "AI 작성 중..."
                          : "✦ AI 변형 생성"}
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={perAccountBody[accountId] ?? ""}
                    onChange={(e) =>
                      setPerAccountBody((prev) => ({
                        ...prev,
                        [accountId]: e.target.value,
                      }))
                    }
                    placeholder="비워두면 위 본문 사용"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
              );
            })}
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs text-neutral-400">
              자동 첫 댓글 (선택)
            </label>
            <button
              type="button"
              onClick={insertEngagementPrompt}
              className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
            >
              참여 유도 문구 추가
            </button>
          </div>
          <textarea
            rows={2}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="본문 발행 직후 자동으로 등록될 댓글"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs text-neutral-400">발행 시점</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm text-neutral-300">
              <input
                type="radio"
                checked={scheduleMode === "now"}
                onChange={() => setScheduleMode("now")}
              />
              즉시 발행
            </label>
            <label className="flex items-center gap-1.5 text-sm text-neutral-300">
              <input
                type="radio"
                checked={scheduleMode === "later"}
                onChange={() => setScheduleMode("later")}
              />
              예약 발행
            </label>
            {scheduleMode === "later" && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
              />
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {submitting
            ? "처리 중..."
            : scheduleMode === "now"
              ? "지금 발행"
              : "예약하기"}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-300">
          최근 글
        </h2>
        {posts.length === 0 ? (
          <p className="text-sm text-neutral-500">아직 작성한 글이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="whitespace-pre-wrap text-sm text-neutral-200">
                    {post.body}
                  </p>
                  <span className={`ml-3 shrink-0 text-xs ${statusColor(post.status)}`}>
                    {POST_STATUS_LABEL[post.status] ?? post.status}
                  </span>
                </div>
                {(post.status === "SCHEDULED" || post.status === "FAILED") && (
                  <button
                    onClick={() => handlePublishNow(post.id)}
                    disabled={publishingId === post.id}
                    className="mb-2 rounded-lg bg-neutral-800 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
                  >
                    {publishingId === post.id
                      ? "처리 중..."
                      : post.status === "FAILED"
                        ? "다시 시도"
                        : "지금 발행"}
                  </button>
                )}
                <div className="flex flex-wrap gap-2">
                  {post.targets.map((t) => (
                    <span
                      key={t.id}
                      title={
                        t.errorMessage ?? (t.body ? `이 계정 전용 문구: ${t.body}` : undefined)
                      }
                      className={`rounded-full border px-2 py-0.5 text-xs ${statusColor(t.status)} ${
                        t.body ? "border-purple-700" : "border-neutral-700"
                      }`}
                    >
                      {t.threadsAccount.label}
                      {t.body ? " ✦" : ""}: {TARGET_STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
