-- AI 글 생성 제공자를 Anthropic에서 OpenAI로 변경
ALTER TABLE "Settings" ADD COLUMN "openaiApiKeyEnc" TEXT;
ALTER TABLE "Settings" DROP COLUMN "anthropicApiKeyEnc";
