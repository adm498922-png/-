-- 쿠팡 상품별 AI(Sora) 생성 홍보 영상 상태/결과 저장
ALTER TABLE "CoupangLink" ADD COLUMN "videoStatus" TEXT;
ALTER TABLE "CoupangLink" ADD COLUMN "videoJobId" TEXT;
ALTER TABLE "CoupangLink" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "CoupangLink" ADD COLUMN "videoError" TEXT;
