import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidesGonggu } from "@/lib/app-mode";
import { getSettingsStatus } from "@/lib/settings";
import CreatorList from "./CreatorList";
import type { CreatorView } from "@/lib/gonggu";

export const dynamic = "force-dynamic";

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // 스레드 전용 사이트에서는 공동구매 화면을 열지 않는다.
  if (hidesGonggu()) redirect("/");

  const [creators, params, headerList, settings] = await Promise.all([
    prisma.creator.findMany({
      orderBy: { updatedAt: "desc" },
      include: { deals: true },
    }),
    searchParams,
    headers(),
    getSettingsStatus(),
  ]);

  const one = (key: string) => {
    const v = params[key];
    return typeof v === "string" ? v : undefined;
  };

  // 즐겨찾기 버튼(북마클릿)이 쓸 이 사이트의 주소
  const host = headerList.get("host") ?? "";
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const origin = host ? `${proto}://${host}` : "";

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-white">공구 크리에이터</h1>
      <p className="mb-6 text-sm text-neutral-400">
        공동구매를 함께할 크리에이터를 한곳에 모아두고, 어디까지 이야기가
        진행됐는지와 실제 성과를 기록합니다.
      </p>
      <CreatorList
        initialCreators={creators as unknown as CreatorView[]}
        origin={origin}
        autoOpen={Boolean(one("add"))}
        autoHandle={one("handle")}
        autoPaste={one("paste")}
        autoImage={one("img")}
        instagramConfigured={settings.instagramConfigured}
      />
    </div>
  );
}
