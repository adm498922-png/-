"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "관리자 계정 생성에 실패했습니다.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
    >
      <p className="text-sm text-slate-600">
        처음 실행하셨네요. 이 사이트를 보호할 관리자 계정을 먼저 만들어주세요.
      </p>
      <div>
        <label className="mb-1 block text-xs text-slate-500">이메일</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500">
          비밀번호 (8자 이상)
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? "생성 중..." : "관리자 계정 만들기"}
      </button>
    </form>
  );
}
