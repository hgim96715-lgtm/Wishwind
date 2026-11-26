-- 첫 릴스 3개: 인사이트 화면에서 옮겨 적은 값 (유지 곡선은 그래프에서 읽은 근사값). 이미 있으면 건너뜀
INSERT INTO "instagram_posts" ("id","posted_on","kind","title","reach","likes","views","viewers","avg_watch_sec","duration_sec","skip_rate","src_reels","src_explore","src_profile","retention","note","created_at","updated_at")
SELECT gen_random_uuid(), v.posted_on::date, 'REEL', v.title, v.viewers, v.likes, v.views, v.viewers, v.avg_watch, v.duration, v.skip, v.reels, v.explore, v.profile, v.retention::jsonb, '인사이트 스크린샷 기준. 유지 곡선은 근사값', now(), now()
FROM (VALUES
  ('2026-11-24', 'D.B. 쿠퍼 사건 (비행기에서 20만 달러 받고 뛰어내린 남자)', 109, 1, 116, 3::float8, 17, 85.3::float8, 67.2::float8, 31.9::float8, 0.9::float8,
    '[{"t":0,"p":100},{"t":1,"p":73},{"t":1.9,"p":32},{"t":2.9,"p":19},{"t":4,"p":14},{"t":7,"p":8},{"t":17,"p":5}]'),
  ('2026-11-25', '11월 25일이 전 세계 기념일이 된 이유', 9, 1, 9, 7::float8, 32, 100.0::float8, 44.4::float8, 44.4::float8, 11.1::float8,
    '[{"t":0,"p":100},{"t":1.8,"p":54},{"t":2.8,"p":32},{"t":4.8,"p":28},{"t":6,"p":17},{"t":6.8,"p":10},{"t":11,"p":10},{"t":20,"p":4},{"t":32,"p":3}]'),
  ('2026-11-26', '새벽, 컴퓨터에 112를 검색하고 사라진 대학생', 106, 0, 113, 3::float8, 26, 78.3::float8, 58.4::float8, 41.6::float8, 0::float8,
    '[{"t":0,"p":100},{"t":0.9,"p":60},{"t":1.9,"p":31},{"t":4.9,"p":12},{"t":16,"p":8},{"t":26,"p":3}]')
) AS v(posted_on, title, viewers, likes, views, avg_watch, duration, skip, reels, explore, profile, retention)
WHERE NOT EXISTS (SELECT 1 FROM "instagram_posts" p WHERE p."posted_on" = v.posted_on::date AND p."title" = v.title);
