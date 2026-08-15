-- 상품 자동 수집 시 AI가 추측만 하지 않고, 네이버 데이터랩 실제 검색 트렌드로 후보 키워드를 비교하기 위한 키
ALTER TABLE "Settings" ADD COLUMN "naverClientId" TEXT;
ALTER TABLE "Settings" ADD COLUMN "naverClientSecretEnc" TEXT;
