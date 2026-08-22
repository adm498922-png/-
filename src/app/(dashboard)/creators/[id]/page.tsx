import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDecryptedSettings } from "@/lib/settings";
import CreatorDetail from "./CreatorDetail";
import { todayInKorea, type CreatorView, type ProductView } from "@/lib/gonggu";

export const dynamic = "force-dynamic";

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [creator, products, settings] = await Promise.all([
    prisma.creator.findUnique({
      where: { id },
      include: {
        deals: { include: { product: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    getDecryptedSettings(),
  ]);

  if (!creator) notFound();

  return (
    <CreatorDetail
      initialCreator={creator as unknown as CreatorView}
      products={products as unknown as ProductView[]}
      today={todayInKorea()}
      dmTemplate={settings.dmTemplate}
    />
  );
}
