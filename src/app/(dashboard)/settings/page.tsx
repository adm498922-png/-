import { headers } from "next/headers";
import { getSettingsStatus } from "@/lib/settings";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const status = await getSettingsStatus();
  const hdrs = await headers();
  const host = hdrs.get("host");
  const protocol = host?.startsWith("localhost") || host?.startsWith("127.")
    ? "http"
    : "https";
  const suggestedRedirectUri = `${protocol}://${host}/api/threads/oauth/callback`;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-white">설정</h1>
      <p className="mb-6 text-sm text-neutral-400">
        쿠팡파트너스와 Threads 개발자 앱의 API 키를 입력하세요. 저장된 값은
        암호화되어 저장되며, 여기서는 다시 보여주지 않습니다.
      </p>
      <SettingsForm
        status={status}
        suggestedRedirectUri={suggestedRedirectUri}
      />
    </div>
  );
}
