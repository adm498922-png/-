-- 자동 일상글 생성 시 쿠팡 상품 소개 글도 가끔 섞을지 여부
ALTER TABLE "Settings" ADD COLUMN "autoDailyPostIncludeProducts" BOOLEAN NOT NULL DEFAULT false;
