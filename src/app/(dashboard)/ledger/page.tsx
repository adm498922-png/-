import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidesGonggu } from "@/lib/app-mode";
import LedgerPage from "./LedgerPage";
import type { CreatorView, ProductView } from "@/lib/gonggu";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (hidesGonggu()) redirect("/");

  const [deals, creators, products] = await Promise.all([
    prisma.deal.findMany({
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        creator: { select: { id: true, name: true, handle: true } },
        product: { select: { id: true, name: true, brand: true } },
      },
    }),
    prisma.creator.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <LedgerPage
      initialRows={JSON.parse(JSON.stringify(deals))}
      creators={creators as unknown as CreatorView[]}
      products={products as unknown as ProductView[]}
    />
  );
}
