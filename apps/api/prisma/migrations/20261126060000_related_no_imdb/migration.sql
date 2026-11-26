-- IMDb·TMDB 주소는 감상처가 아니므로 국내 포털 검색 링크로 바꿈 (항목 자체는 유지)
UPDATE "related_contents"
SET "url" = 'https://search.naver.com/search.naver?query=' || replace("title", ' ', '+'),
    "platform" = CASE WHEN "platform" IN ('IMDb', 'TMDB') THEN '네이버 검색' ELSE "platform" END
WHERE "url" ~* '(imdb\.com|themoviedb\.org)'
  AND NOT EXISTS (
    SELECT 1 FROM "related_contents" r2
    WHERE r2."case_id" = "related_contents"."case_id"
      AND r2."url" = 'https://search.naver.com/search.naver?query=' || replace("related_contents"."title", ' ', '+')
  );

DELETE FROM "related_contents" WHERE "url" ~* '(imdb\.com|themoviedb\.org)';
