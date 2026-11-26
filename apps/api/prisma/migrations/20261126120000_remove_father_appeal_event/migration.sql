-- 이윤희 사건 타임라인의 '아버지의 거리 호소 계속' 항목 삭제 (올해 8월 이후 아버지 관련 새 사건이 알려져 부적절)
DELETE FROM "timeline_events"
WHERE "title" = '아버지의 거리 호소 계속'
  AND "case_id" = (SELECT "id" FROM "cases" WHERE "slug" = 'jeonbuk-vet-student-missing');
