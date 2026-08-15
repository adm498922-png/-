-- 스레드 발행 시 상품 이미지를 같이 올릴 수 있도록 쿠팡 링크에 이미지 URL 저장
ALTER TABLE "CoupangLink" ADD COLUMN "imageUrl" TEXT;
