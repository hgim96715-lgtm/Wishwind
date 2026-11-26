-- localhost 페이지에서 눌러 들어온 방문(개발 중 확인)과 같은 방문자 해시의 조회를 분석에서 지움
DELETE FROM "page_views"
WHERE "visitor_hash" IN (
  SELECT "visitor_hash" FROM "page_views"
  WHERE "referrer_host" ~* '^(localhost|127\.0\.0\.1|\[?::1\]?|0\.0\.0\.0|.*\.local)$'
);
