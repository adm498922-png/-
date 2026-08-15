"use client";

import { useState } from "react";

type Account = { id: string; label: string; username: string | null };
type PostTarget = {
  id: string;
  status: string;
  errorMessage: string | null;
  threadsPermalink: string | null;
  threadsAccount: Account;
  body: string | null;
  publishedAt: string | Date | null;
};
type Post = {
  id: string;
  body: string;
  commentBody?: string | null;
  status: string;
  scheduledAt: string | Date | null;
  createdAt: string | Date;
  targets: PostTarget[];
  coupangLink?: { imageUrl: string | null } | null;
};

const EDITABLE_STATUSES = new Set(["DRAFT", "SCHEDULED", "FAILED"]);

function toDatetimeLocal(value: string | Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function formatPublishedTime(value: string | Date | null): string {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  });
}

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

export default function PostList({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editCommentBody, setEditCommentBody] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editAccountBodies, setEditAccountBodies] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handlePublishNow(postId: string) {
    setPublishingId(postId);
    await fetch(`/api/posts/${postId}/publish`, { method: "POST" });
    const res = await fetch(`/api/posts/${postId}`);
    const updated = await res.json();
    setPublishingId(null);
    if (!res.ok) return;
    setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
  }

  function handleStartEdit(post: Post) {
    setEditingId(post.id);
    setEditBody(post.body);
    setEditCommentBody(post.commentBody ?? "");
    setEditScheduledAt(toDatetimeLocal(post.scheduledAt));
    const bodies: Record<string, string> = {};
    for (const t of post.targets) {
      if (t.body) bodies[t.threadsAccount.id] = t.body;
    }
    setEditAccountBodies(bodies);
    setEditError(null);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleSaveEdit(postId: string) {
    if (!editBody.trim()) {
      setEditError("본문을 입력해주세요.");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    const res = await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: editBody,
        commentBody: editCommentBody || undefined,
        scheduledAt: editScheduledAt || undefined,
        accountBodies: editAccountBodies,
      }),
    });
    const data = await res.json();
    setSavingEdit(false);
    if (!res.ok) {
      setEditError(data.error ?? "수정에 실패했습니다.");
      return;
    }
    setPosts((prev) => prev.map((p) => (p.id === postId ? data : p)));
    setEditingId(null);
  }

  async function handleDelete(postId: string) {
    if (!confirm("이 글을 삭제할까요?")) return;
    setDeletingId(postId);
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) return;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  if (posts.length === 0) {
    return <p className="text-sm text-neutral-500">아직 작성한 글이 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div
          key={post.id}
          className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
        >
          {editingId === post.id ? (
            <div className="space-y-3">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  댓글 (선택)
                </label>
                <textarea
                  value={editCommentBody}
                  onChange={(e) => setEditCommentBody(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              {post.status === "SCHEDULED" && (
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">
                    예약 시간
                  </label>
                  <input
                    type="datetime-local"
                    value={editScheduledAt}
                    onChange={(e) => setEditScheduledAt(e.target.value)}
                    className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
              )}
              {post.targets.length > 1 && (
                <div className="space-y-2">
                  <p className="text-xs text-neutral-500">
                    계정별 문구 (비워두면 위 본문 사용)
                  </p>
                  {post.targets.map((t) => (
                    <div key={t.id}>
                      <label className="mb-1 block text-xs text-neutral-400">
                        {t.threadsAccount.label}
                      </label>
                      <textarea
                        value={editAccountBodies[t.threadsAccount.id] ?? ""}
                        onChange={(e) =>
                          setEditAccountBodies((prev) => ({
                            ...prev,
                            [t.threadsAccount.id]: e.target.value,
                          }))
                        }
                        rows={2}
                        className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              )}
              {editError && <p className="text-sm text-red-400">{editError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveEdit(post.id)}
                  disabled={savingEdit}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {savingEdit ? "저장 중..." : "저장"}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={savingEdit}
                  className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-700"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {post.coupangLink?.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coupangLink.imageUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <p className="whitespace-pre-wrap text-sm text-neutral-200">
                    {post.body}
                  </p>
                </div>
                <span className={`ml-3 shrink-0 text-xs ${statusColor(post.status)}`}>
                  {POST_STATUS_LABEL[post.status] ?? post.status}
                </span>
              </div>
              <div className="mb-2 flex flex-wrap gap-2">
                {(post.status === "SCHEDULED" || post.status === "FAILED") && (
                  <button
                    onClick={() => handlePublishNow(post.id)}
                    disabled={publishingId === post.id}
                    className="rounded-lg bg-neutral-800 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
                  >
                    {publishingId === post.id
                      ? "처리 중..."
                      : post.status === "FAILED"
                        ? "다시 시도"
                        : "지금 발행"}
                  </button>
                )}
                {EDITABLE_STATUSES.has(post.status) && (
                  <>
                    <button
                      onClick={() => handleStartEdit(post)}
                      className="rounded-lg bg-neutral-800 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={deletingId === post.id}
                      className="rounded-lg bg-neutral-800 px-3 py-1 text-xs text-red-400 hover:bg-neutral-700 disabled:opacity-50"
                    >
                      {deletingId === post.id ? "삭제 중..." : "삭제"}
                    </button>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {post.targets.map((t) => (
                  <span
                    key={t.id}
                    title={t.body ? `이 계정 전용 문구: ${t.body}` : undefined}
                    className={`rounded-full border px-2 py-0.5 text-xs ${statusColor(t.status)} ${
                      t.body ? "border-purple-700" : "border-neutral-700"
                    }`}
                  >
                    {t.threadsAccount.label}
                    {t.body ? " ✦" : ""}: {TARGET_STATUS_LABEL[t.status] ?? t.status}
                    {t.publishedAt && ` (${formatPublishedTime(t.publishedAt)})`}
                  </span>
                ))}
              </div>
              {post.targets
                .filter((t) => t.status === "FAILED" && t.errorMessage)
                .map((t) => (
                  <p key={t.id} className="mt-1 text-xs text-red-400">
                    {t.threadsAccount.label}: {t.errorMessage}
                  </p>
                ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
