-- 사용자 요청(2026-11-19): 다큐 관련 콘텐츠에 넷플릭스 예고편(유튜브)은 넣지 않음. 작품 페이지 링크로 대체
DELETE FROM related_contents WHERE url IN (
  'https://www.youtube.com/watch?v=n1UJgrNRcvI',
  'https://www.youtube.com/watch?v=Mva2nGveYss',
  'https://www.youtube.com/watch?v=Cj6N5aK2qzI',
  'https://www.youtube.com/watch?v=ep8iKiQNSrY',
  'https://www.youtube.com/watch?v=UkoboFsY9_g',
  'https://www.youtube.com/watch?v=B7y6ouwG0q0',
  'https://www.youtube.com/watch?v=Khr7dbuBjuE',
  'https://www.youtube.com/watch?v=ICFZ1wS8Fuc',
  'https://www.youtube.com/watch?v=mLENEDZK3h4',
  'https://www.youtube.com/watch?v=qxgbdYaR_KQ',
  'https://www.youtube.com/watch?v=Bvv97sCcruY',
  'https://www.youtube.com/watch?v=Yonx7CyoK3k',
  'https://www.youtube.com/watch?v=sB7LEqzXl_Y',
  'https://www.youtube.com/watch?v=tBnarCTOiCY'
);
