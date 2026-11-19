-- 사용자 요청(2026-11-19): Jill Dando 한글 표기 "질 단도" → "질 댄도"
-- jill-dando-murder 사건 하나만 고침. 공개 상태(is_published)·검토 상태(review_status)는 그대로 둠.

UPDATE cases
SET title = REPLACE(title, '단도', '댄도'),
    summary = REPLACE(summary, '단도', '댄도'),
    overview = REPLACE(overview, '단도', '댄도'),
    victim_count_note = REPLACE(victim_count_note, '단도', '댄도'),
    updated_at = now()
WHERE slug = 'jill-dando-murder'
  AND (title || summary || COALESCE(overview, '') || COALESCE(victim_count_note, '')) LIKE '%단도%';

UPDATE victims
SET name = REPLACE(name, '단도', '댄도'),
    alias = REPLACE(alias, '단도', '댄도'),
    description = REPLACE(description, '단도', '댄도'),
    updated_at = now()
WHERE case_id = (SELECT id FROM cases WHERE slug = 'jill-dando-murder')
  AND (COALESCE(name, '') || COALESCE(alias, '') || COALESCE(description, '')) LIKE '%단도%';

UPDATE timeline_events
SET title = REPLACE(title, '단도', '댄도'),
    description = REPLACE(description, '단도', '댄도'),
    updated_at = now()
WHERE case_id = (SELECT id FROM cases WHERE slug = 'jill-dando-murder')
  AND (title || COALESCE(description, '')) LIKE '%단도%';

UPDATE unsolved_questions
SET question = REPLACE(question, '단도', '댄도'),
    description = REPLACE(description, '단도', '댄도'),
    answer = REPLACE(answer, '단도', '댄도'),
    updated_at = now()
WHERE case_id = (SELECT id FROM cases WHERE slug = 'jill-dando-murder')
  AND (question || COALESCE(description, '') || COALESCE(answer, '')) LIKE '%단도%';

UPDATE suspicious_circumstances
SET title = REPLACE(title, '단도', '댄도'),
    description = REPLACE(description, '단도', '댄도'),
    updated_at = now()
WHERE case_id = (SELECT id FROM cases WHERE slug = 'jill-dando-murder')
  AND (title || COALESCE(description, '')) LIKE '%단도%';

UPDATE related_contents
SET title = REPLACE(title, '단도', '댄도'),
    note = REPLACE(note, '단도', '댄도'),
    updated_at = now()
WHERE case_id = (SELECT id FROM cases WHERE slug = 'jill-dando-murder')
  AND (title || COALESCE(note, '')) LIKE '%단도%';
