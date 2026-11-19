-- 사용자 지적(2026-11-19): 약촌오거리 사건은 이미 2016년 재심으로 무죄가 나왔으므로
-- "다시 살펴보게 하는 장치가 있어야 하지 않을까요?"는 사실과 맞지 않음 → 13년 걸린 재심 과정에 맞춘 질문으로 바꿈
UPDATE unsolved_questions
SET question = '진범의 자백이 나온 2003년부터 재심 무죄까지 13년이 걸렸습니다. 잘못된 판결을 더 빨리 바로잡으려면 무엇이 달라져야 할까요?'
WHERE question = '수사 중 진범의 자백이 나왔을 때 이미 끝난 사건을 다시 살펴보게 하는 장치가 있어야 하지 않을까요?'
  AND case_id = (SELECT id FROM cases WHERE slug = 'yakchon-ogeori-taxi-murder');
