-- TMDB 링크는 바꾸라고 한 적이 없으므로 직전 마이그레이션이 바꾼 1건을 원래대로 되돌림
UPDATE "related_contents"
SET "url" = 'https://www.themoviedb.org/movie/72066',
    "platform" = 'TMDB'
WHERE "title" = '아이들...'
  AND "url" = 'https://search.naver.com/search.naver?query=아이들...'
  AND NOT EXISTS (
    SELECT 1 FROM "related_contents" r2
    WHERE r2."case_id" = "related_contents"."case_id"
      AND r2."url" = 'https://www.themoviedb.org/movie/72066'
  );
