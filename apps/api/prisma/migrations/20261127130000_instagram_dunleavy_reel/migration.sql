-- 11/27 재클린 던리비 릴스: 인사이트 화면에서 옮겨 적은 값 (유지 곡선은 근사값). 이미 있으면 건너뜀
INSERT INTO "instagram_posts" ("id","posted_on","kind","title","case_slug","reach","likes","views","duration_sec","skip_rate","src_reels","src_explore","src_profile","src_follow","retention","note","created_at","updated_at")
SELECT gen_random_uuid(), '2026-11-27', 'REEL', '1968년 캐나다 16세 소녀, 58년 만에 찾아냈습니다 (재클린 던리비)', 'jacqueline-dunleavy-murder', 110, 0, 110, 40, 82.4, 55.6, 44.4, 0, 0,
  '[{"t":0,"p":100},{"t":3,"p":17},{"t":40,"p":5}]'::jsonb,
  '게시 1시간 뒤 스크린샷. 반응(좋아요·저장·공유·댓글·리포스트) 0. 비팔로워 100%. 연령 25-34 41%, 18-24·35-44 각 21.5%. 국가 한국 88.9%, 미국 7.4%. 성별 남 53.6/여 46.4. 조회는 첫 1시간에 약 110까지 늘고 정체. 유지 곡선은 근사값',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "instagram_posts" p WHERE p."posted_on" = '2026-11-27'::date AND p."kind" = 'REEL');
