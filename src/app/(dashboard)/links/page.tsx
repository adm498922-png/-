import { prisma } from "@/lib/prisma";
import { getSettingsStatus } from "@/lib/settings";
import Link from "next/link";
import LinkGeneratorForm from "./LinkGeneratorForm";
import ConnectionSubNav from "../ConnectionSubNav";

export default async function LinksPage() {
  const settings = await getSettingsStatus();
  const links = await prisma.coupangLink.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-2xl">
      <ConnectionSubNav />
      <h1 className="mb-1 text-2xl font-bold text-white">쿠팡 링크</h1>
      <p className="mb-6 text-sm text-neutral-400">
        쿠팡 상품 URL을 붙여넣으면 파트너스 딥링크로 변환합니다.
      </p>

      {!settings.coupangConfigured ? (
        <div className="rounded-xl border border-dashed border-neutral-800 p-6 text-sm text-neutral-400">
          먼저{" "}
          <Link href="/settings" className="text-blue-400 hover:underline">
            설정
          </Link>
          에서 쿠팡파트너스 API 키를 입력해주세요.
        </div>
      ) : (
        <LinkGeneratorForm initialLinks={links} />
      )}
    </div>
  );
}
