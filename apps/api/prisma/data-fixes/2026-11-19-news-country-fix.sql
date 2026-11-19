-- 사용자 요청(2026-11-19): 베트남 사파 실종 소식(Vietnam.vn)에 일본 국기가 붙던 것 바로잡음
-- 일본판 Google 뉴스 피드에서 모아 피드 나라(JP)가 그대로 들어갔음. 사건이 일어난 나라(베트남)는 Country에 없어 OTHER로 둠
UPDATE news_items
SET region = 'OTHER'
WHERE id = '01a1f3d4-309e-7778-9ce3-f429550869d3'
  AND region = 'JP';
