-- 사용자 요청(2026-11-19): 마이카 밀러 사건 다큐 링크가 넷플릭스 기사(Tudum)로 가던 것을 작품 페이지로 바꿈
UPDATE related_contents
SET url = 'https://www.netflix.com/title/81989322',
    title = '목사 아내의 죽음: 진실은 어디에'
WHERE url = 'https://www.netflix.com/tudum/articles/death-of-the-pastors-wife-release-date-news';
