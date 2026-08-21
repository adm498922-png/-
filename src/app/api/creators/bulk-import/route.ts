import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseNumber } from "@/lib/gonggu";

// 쉼표로 구분하되 큰따옴표로 감싼 값 안의 쉼표는 무시한다 (엑셀에서 복사해도 안전하게).
function parseCsvLine(line: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim());
}

/**
 * CSV로 크리에이터를 한 번에 여러 명 추가한다.
 * 형식: handle,followers,postCount,category,bio,notes (한 줄에 한 명, 헤더 줄 있어도 됨)
 * 핸들이 이미 등록되어 있으면 건너뛴다.
 */
export async function POST(req: NextRequest) {
  const input = await req.json().catch(() => null);
  const csv = typeof input?.csv === "string" ? input.csv : "";
  const lines = csv
    .split("\n")
    .map((l: string) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return NextResponse.json({ error: "CSV 내용이 비어 있습니다." }, { status: 400 });
  }

  const existing = await prisma.creator.findMany({ select: { handle: true } });
  const existingHandles = new Set(
    existing.map((c) => (c.handle ?? "").toLowerCase()).filter(Boolean)
  );

  let added = 0;
  let skipped = 0;
  const toCreate: {
    name: string;
    handle: string;
    followers: number | null;
    postCount: number | null;
    category: string | null;
    bio: string | null;
    memo: string | null;
  }[] = [];
  const seenThisBatch = new Set<string>();

  lines.forEach((line: string, idx: number) => {
    if (idx === 0 && /^handle/i.test(line)) return; // 헤더 줄 무시

    const [handleRaw, followersRaw, postCountRaw, category, bio, notes] =
      parseCsvLine(line);
    const handle = (handleRaw || "").replace(/^@/, "").trim();
    if (!handle) {
      skipped++;
      return;
    }
    const key = handle.toLowerCase();
    if (existingHandles.has(key) || seenThisBatch.has(key)) {
      skipped++;
      return;
    }
    seenThisBatch.add(key);

    const followers = parseNumber(followersRaw);
    const postCount = parseNumber(postCountRaw);

    toCreate.push({
      name: handle,
      handle,
      followers: followers === null ? null : Math.round(followers),
      postCount: postCount === null ? null : Math.round(postCount),
      category: category?.trim() || null,
      bio: bio?.trim() || null,
      memo: notes?.trim() || null,
    });
    added++;
  });

  if (toCreate.length > 0) {
    await prisma.creator.createMany({
      data: toCreate.map((c) => ({
        name: c.name,
        handle: c.handle,
        platform: "INSTAGRAM",
        followers: c.followers,
        postCount: c.postCount,
        category: c.category,
        bio: c.bio,
        memo: c.memo,
        status: "LEAD",
      })),
    });
  }

  return NextResponse.json({ ok: true, added, skipped });
}
