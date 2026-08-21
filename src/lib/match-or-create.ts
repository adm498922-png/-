import { prisma } from "@/lib/prisma";

const keyOf = (name: string) => name.trim().toLowerCase();

/**
 * 크리에이터를 아이디(우선) 또는 이름으로 찾고, 없으면 새로 만든다.
 * 판매일보 붙여넣기와 직접 입력 화면이 같은 규칙을 쓰도록 여기 하나로 모았다.
 */
export async function matchOrCreateCreator(input: {
  name: string;
  handle?: string | null;
  commissionRate?: number | null;
  isBusiness?: boolean | null;
}): Promise<{ id: string; created: boolean }> {
  const handle = input.handle?.trim() || null;
  const name = input.name.trim();

  const existing = await prisma.creator.findFirst({
    where: handle
      ? { OR: [{ handle: { equals: handle } }, { name: { equals: name } }] }
      : { name: { equals: name } },
  });
  if (existing) return { id: existing.id, created: false };

  const created = await prisma.creator.create({
    data: {
      name,
      handle,
      platform: "INSTAGRAM",
      status: "CONFIRMED",
      commissionRate: input.commissionRate ?? null,
      isBusiness: input.isBusiness ?? null,
    },
  });
  return { id: created.id, created: true };
}

/** 상품을 이름으로 찾고, 없으면 새로 만든다. */
export async function matchOrCreateProduct(input: {
  name: string;
  brand?: string | null;
  commissionRate?: number | null;
}): Promise<{ id: string; created: boolean } | null> {
  const name = input.name.trim();
  if (!name) return null;

  const existing = await prisma.product.findFirst({
    where: { name: { equals: name } },
  });
  if (existing) return { id: existing.id, created: false };

  const created = await prisma.product.create({
    data: { name, brand: input.brand ?? null, commissionRate: input.commissionRate ?? null },
  });
  return { id: created.id, created: true };
}

export { keyOf };
