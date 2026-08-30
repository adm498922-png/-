"use client";

import { useRef, useState } from "react";

/**
 * 글쓰기 칸에 사진을 붙일 수 있게 해주는 공용 부품.
 * value는 "/api/assets/…" 주소 목록이고, 저장할 때는 쉼표로 이어붙여 보낸다.
 */
export function splitImages(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinImages(urls: string[]): string {
  return urls.join(",");
}

export default function ImageAttach({
  value,
  onChange,
  small,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  small?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const added: string[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form }).catch(
        () => null
      );
      const data = await res?.json().catch(() => null);
      if (!res?.ok || !data?.url) {
        setError(data?.error ?? "사진을 올리지 못했어요. 다시 시도해주세요.");
        continue;
      }
      added.push(data.url);
    }
    setUploading(false);
    if (added.length > 0) onChange([...value, ...added]);
    if (inputRef.current) inputRef.current.value = "";
  }

  const thumbSize = small ? "h-10 w-10" : "h-14 w-14";

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {value.map((url) => (
            <span key={url} className="group relative inline-block">
              <a href={url} target="_blank" rel="noreferrer">
                {/* 로그인 보호된 내부 주소라 next/image 최적화 없이 그대로 보여준다 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="첨부 사진"
                  className={`${thumbSize} rounded-lg border border-slate-200 object-cover`}
                />
              </a>
              <button
                type="button"
                onClick={() => onChange(value.filter((u) => u !== url))}
                title="사진 빼기"
                className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[10px] leading-none text-white group-hover:flex"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
      >
        {uploading ? "올리는 중…" : "＋ 사진"}
      </button>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => upload(e.target.files)}
      />
    </div>
  );
}
