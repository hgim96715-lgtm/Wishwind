-- 사용자 지적(2026-11-19): "범인은 왜 이 집을 골랐을까요?"는 범인의 동기를 추측하게 하고 유가족에게 고통을 주는 질문
-- → 재발 방지·지원을 묻는 질문으로 바꾸고, 지원 질문을 하나 더함
BEGIN;
UPDATE unsolved_questions
SET question = '혼자 또는 친구들끼리 사는 대학가 주택이 밤사이 더 안전하려면 무엇이 필요할까요?',
    updated_at = now()
WHERE question = '범인은 왜 이 집을 골랐을까요?'
  AND case_id = (SELECT id FROM cases WHERE slug = 'idaho-student-murders');

INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
SELECT gen_random_uuid(), c.id, '갑작스럽게 가족과 친구를 잃은 사람들, 함께 지내던 학생들에게는 어떤 지원이 필요할까요?', 1, now()
FROM cases c
WHERE c.slug = 'idaho-student-murders'
  AND NOT EXISTS (
    SELECT 1 FROM unsolved_questions q
    WHERE q.case_id = c.id AND q.question = '갑작스럽게 가족과 친구를 잃은 사람들, 함께 지내던 학생들에게는 어떤 지원이 필요할까요?'
  );
COMMIT;
