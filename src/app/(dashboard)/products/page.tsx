import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidesGonggu } from "@/lib/app-mode";
import ProductList from "./ProductList";
import type { ProductView } from "@/lib/gonggu";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  if (hidesGonggu()) redirect("/");

  const products = await prisma.product.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: { deals: { select: { id: true } } },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-white">공구 상품</h1>
      <p className="mb-6 text-sm text-neutral-400">
        크리에이터에게 제안할 상품을 정리해 둡니다. 공구 기록을 남길 때 여기서
        고르면 상품별 성과가 자동으로 쌓입니다.
      </p>
      <ProductList initialProducts={products as unknown as ProductView[]} />
    </div>
  );
}
