-- 매일 자동 일상글 생성 기능 켜기/끄기 설정 추가
ALTER TABLE "Settings" ADD COLUMN "autoDailyPostEnabled" BOOLEAN NOT NULL DEFAULT false;
