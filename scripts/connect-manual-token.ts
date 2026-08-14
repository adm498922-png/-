import "dotenv/config";
import { getDecryptedSettings } from "@/lib/settings";
import { exchangeForLongLivedToken, getMe, ThreadsApiError } from "@/lib/threads-api";
import { saveOrUpdateAccount } from "@/lib/threads-accounts";

const SIXTY_DAYS_SECONDS = 60 * 24 * 60 * 60;

async function main() {
  const token = process.argv[2];
  if (!token) {
    console.error("사용법: npx tsx scripts/connect-manual-token.ts <액세스 토큰>");
    process.exit(1);
  }

  const settings = await getDecryptedSettings();
  if (!settings.threadsAppSecret) {
    console.error("설정에 Threads App Secret이 없습니다. /settings에서 먼저 입력하고 다시 시도하세요.");
    process.exit(1);
  }

  let accessToken = token;
  let expiresIn = SIXTY_DAYS_SECONDS;

  try {
    const longLived = await exchangeForLongLivedToken({
      appSecret: settings.threadsAppSecret,
      shortLivedToken: token,
    });
    accessToken = longLived.access_token;
    expiresIn = longLived.expires_in;
    console.log("단기 토큰 → 장기 토큰 교환 성공.");
  } catch (e) {
    console.log("장기 토큰 교환은 실패했지만, 이미 장기 토큰일 수 있으니 원본 토큰으로 계속 진행합니다.");
    if (e instanceof ThreadsApiError) {
      console.log("(참고용 상세 오류)", JSON.stringify(e.body));
    }
  }

  const me = await getMe(accessToken);
  console.log(`계정 확인됨: @${me.username} (id: ${me.id})`);

  await saveOrUpdateAccount({
    threadsUserId: me.id,
    username: me.username,
    accessToken,
    expiresInSeconds: expiresIn,
  });

  console.log("DB에 저장 완료. 브라우저에서 /accounts 페이지를 새로고침해 확인하세요.");
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e instanceof ThreadsApiError ? JSON.stringify(e.body) : e);
  process.exit(1);
});
