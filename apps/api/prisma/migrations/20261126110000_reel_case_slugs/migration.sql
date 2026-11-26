-- 첫 릴스 3개에 사건 주소를 연결함 (홈 '릴스에서 본 사건'에 쓰임). 사건 주소가 이미 적혀 있으면 건드리지 않음
UPDATE "instagram_posts" SET "case_slug" = 'db-cooper-hijacking'
  WHERE "kind" = 'REEL' AND "case_slug" IS NULL AND "title" LIKE 'D.B. 쿠퍼 사건%';
UPDATE "instagram_posts" SET "case_slug" = 'mirabal-sisters-murder'
  WHERE "kind" = 'REEL' AND "case_slug" IS NULL AND "title" = '11월 25일이 전 세계 기념일이 된 이유';
UPDATE "instagram_posts" SET "case_slug" = 'jeonbuk-vet-student-missing'
  WHERE "kind" = 'REEL' AND "case_slug" IS NULL AND "title" LIKE '새벽, 컴퓨터에 112를%';
