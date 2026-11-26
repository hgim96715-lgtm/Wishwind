-- 이윤희 사건 개요: 아버지를 특정하던 문장을 '가족은 지금도 딸을 찾고 있습니다.'로 바꿈
UPDATE "cases"
SET "overview" = replace("overview", '아버지는 20년 가까이 전단과 등신대를 들고 거리에서 딸을 찾고 있습니다.', '가족은 지금도 딸을 찾고 있습니다.')
WHERE "slug" = 'jeonbuk-vet-student-missing';
