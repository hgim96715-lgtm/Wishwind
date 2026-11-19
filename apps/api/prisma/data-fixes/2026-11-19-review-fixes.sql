BEGIN;
UPDATE unsolved_questions SET question='범행 전에 보인 신호를 주변이나 기관이 먼저 알아챌 방법이 있었을까요?', updated_at=now() WHERE id='30048cb5-6c89-407c-a756-c75258b6b006';
INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
SELECT gen_random_uuid(), base.case_id, v.q, v.o, now()
FROM unsolved_questions base
CROSS JOIN (VALUES
 ('사람이 붐비는 역 근처에서 이런 일이 생기면, 시민은 어떻게 몸을 피하고 서로 도울 수 있을까요?',1),
 ('이 사건 뒤 온라인에 살인 예고 글이 잇따랐습니다. 이런 모방 범죄를 줄이려면 무엇이 필요할까요?',2),
 ('피해자와 유족, 그리고 현장을 목격한 사람들에게는 어떤 지원이 필요할까요?',3)) AS v(q,o)
WHERE base.id='30048cb5-6c89-407c-a756-c75258b6b006'
  AND NOT EXISTS (SELECT 1 FROM unsolved_questions e WHERE e.case_id=base.case_id AND e.question=v.q);
UPDATE unsolved_questions SET question='테러 생존자와 유족에게는 어떤 지원이 오래 필요할까요?', updated_at=now() WHERE id='01a1ef62-8998-732c-8d3a-b592176e98f3';
UPDATE unsolved_questions SET question='연쇄 범죄의 신호를 수사기관이 더 일찍 연결하려면 무엇이 필요할까요?', updated_at=now() WHERE id='01a1ef62-881d-733a-b1c7-9694a3151d04';
UPDATE unsolved_questions SET question='학교에서 위험 신호를 발견했을 때 어떻게 대응해야 할까요?', updated_at=now() WHERE id='01a1ef62-889d-732b-b17e-77ed3dbbfcaf';
UPDATE unsolved_questions SET question='늦은 밤 혼자 귀가하는 사람을 지키려면 무엇이 필요할까요?', updated_at=now() WHERE id='01a1ef72-e678-70b8-9cef-63f278380ce4';
UPDATE unsolved_questions SET question='주변 사람이 사라진 것을 더 일찍 알아차릴 방법은 무엇일까요?', updated_at=now() WHERE id='01a1ef72-e6a9-774f-a89b-f9cca69cb9a4';
UPDATE suspects s SET name_exception_reason='경찰이 공식 진범으로 발표, 공소시효 만료로 기소 불가', name_exception_decided_at='2026-11-19', updated_at=now()
FROM cases c WHERE c.id=s.case_id AND c.slug='hwaseong-serial-murders' AND s.status='SUSPECTED' AND s.name IS NOT NULL;
DELETE FROM case_sources s USING cases c WHERE c.id=s.case_id AND c.review_status='DRAFT'
  AND ((c.slug='tokyo-subway-sarin-attack' AND s.url='https://www.britannica.com/event/Tokyo-subway-attack-of-1995')
    OR (c.slug='jack-the-ripper' AND s.url='https://britannica.com/biography/Jack-the-Ripper'));
UPDATE unsolved_questions SET question='억울한 옥살이를 예방하기 위한 방법은 무엇일까요?', updated_at=now() WHERE id='44144c6a-7765-4e71-bd45-04d300781c96';
UPDATE unsolved_questions SET question='오래된 사건의 증거를 보관했다가 다시 분석하려면 어떤 제도가 필요할까요?', updated_at=now() WHERE id='bf3bfb09-7405-4199-b989-c9e312a3a39b';
UPDATE unsolved_questions SET question='시간이 지난 사건을 다시 수사하려면 어떤 제도가 필요할까요?', updated_at=now() WHERE id='4c1f85d4-4ce8-4922-ab7b-7ddee020d8b0';
UPDATE unsolved_questions SET question='중요 사건 피의자의 출국을 막으려면 어떤 제도가 필요할까요?', updated_at=now() WHERE id='be1ff6fb-a8ae-4d5d-a411-a3d8c47cb661';
UPDATE unsolved_questions SET question='위험 신고가 반복될 때 기관들은 어떻게 함께 대응해야 할까요?', updated_at=now() WHERE id='16664893-2cf8-4427-95cd-17824a9ab5b5';
UPDATE unsolved_questions SET question='반복되는 신고를 위험 신호로 다루려면 무엇이 필요할까요?', updated_at=now() WHERE id='01a1ef62-885e-7421-b405-fba0462e1f09';
UPDATE unsolved_questions SET question='긴급 신고에 더 정확히 대응하려면 무엇이 필요할까요?', updated_at=now() WHERE id='01a1ef62-8871-7662-9fd2-ba1b0b952f27';
UPDATE unsolved_questions SET question='재판 중인 스토킹 피해자를 지키려면 무엇이 필요할까요?', updated_at=now() WHERE id='ffc922cb-0b06-4723-8754-b9e9f713db0e';
UPDATE unsolved_questions SET question='학교 구성원의 이상 행동을 발견했을 때 어떻게 대응해야 할까요?', updated_at=now() WHERE id='29fa7e08-1aa1-4bae-9df3-1c153b1eb5ee';
UPDATE unsolved_questions SET question='아동 학대 신호를 더 일찍 알아차리려면 무엇이 필요할까요?', updated_at=now() WHERE id='01a1ef62-8831-77c9-81ee-5db9153bd54d';
UPDATE unsolved_questions SET question='위험 신호를 미리 알아차리려면 무엇이 필요할까요?', updated_at=now() WHERE id='8a0f8611-28c7-4608-985c-4c4ae7d44851';
UPDATE unsolved_questions SET question='건물 화재 피해를 줄이려면 어떤 대비가 필요할까요?', updated_at=now() WHERE id='cc00ae4f-18a3-4f25-b772-23e21eaad2d0';
UPDATE unsolved_questions SET question='오래된 미제 사건을 다시 풀려면 어떤 수사 체계가 필요할까요?', updated_at=now() WHERE id='ff201ca5-d3e2-46c8-96e8-baa1b727e645';
UPDATE unsolved_questions SET question='장기 도피범을 찾아내려면 어떤 체계가 필요할까요?', updated_at=now() WHERE id='01a1ef62-897e-757b-9b32-70aec9650e50';
UPDATE unsolved_questions SET question='가스라이팅 피해를 일찍 발견하고 도우려면 무엇이 필요할까요?', updated_at=now() WHERE id='382e9bd1-0c8f-451c-908d-e9e0fcebaa29';
UPDATE unsolved_questions SET sort_order=0, updated_at=now() WHERE id='44144c6a-7765-4e71-bd45-04d300781c96';
UPDATE unsolved_questions SET sort_order=1, updated_at=now() WHERE id='bf3bfb09-7405-4199-b989-c9e312a3a39b';
INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
SELECT gen_random_uuid(), base.case_id, v.q, v.o, now()
FROM unsolved_questions base
CROSS JOIN (VALUES ('공소시효가 지난 뒤 진범이 밝혀졌을 때, 피해자와 유족을 위해 무엇을 할 수 있을까요?',2)) AS v(q,o)
WHERE base.id='44144c6a-7765-4e71-bd45-04d300781c96'
  AND NOT EXISTS (SELECT 1 FROM unsolved_questions e WHERE e.case_id=base.case_id AND e.question=v.q);
UPDATE unsolved_questions SET question='혐오에서 비롯된 폭력을 예방하려면 지역사회에 무엇이 필요할까요?', updated_at=now() WHERE id='01a1ef62-88af-76c9-a10c-af416070ff38';
UPDATE unsolved_questions SET question='늦은 시간 귀가하는 청소년의 안전을 지키려면 무엇이 필요할까요?', updated_at=now() WHERE id='017e746c-a14e-4d85-b682-3198b31e6246';
UPDATE unsolved_questions SET question='공개 행사에서 참석자의 안전을 지키려면 어떤 대비가 필요할까요?', updated_at=now() WHERE id='c0767888-0a9e-4e7d-92fa-4a4268cfd6ce';
UPDATE cases SET summary='귀가하던 고등학생을 납치해 살해하고 도우러 온 학생까지 공격한 혐의로 항소심 재판이 진행 중인 사건입니다.', updated_at=now() WHERE id='de391400-1ed4-4e66-adc2-9cf11523d857';
UPDATE cases SET overview=replace(overview, '2022년 7월 8일 일본 나라시에서 참의원 선거 지원 유세를 하던 아베 신조 전 총리가 야마가미 데쓰야가 쏜 사제 총에 맞아 숨졌습니다. 2026년 1월', '2022년 7월 8일 일본 나라시에서 참의원 선거 지원 유세를 하던 아베 신조 전 총리가 사제 총에 맞아 숨졌습니다. 야마가미 데쓰야는 살인 등의 혐의로 기소됐습니다. 2026년 1월'), updated_at=now() WHERE id='f9c85a1a-e6e1-4e41-94d8-f398c8cbe920';
UPDATE unsolved_questions SET question='아이들이 위험한 순간에 도움을 요청하고 주변에 알리는 방법은 어떻게 가르쳐야 할까요?', updated_at=now() WHERE id='02e97c14-8fb1-4b39-8623-4d03b77546cc';
INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
SELECT gen_random_uuid(), base.case_id, v.q, v.o, now()
FROM unsolved_questions base
CROSS JOIN (VALUES ('아이들이 자주 다니는 산책로나 외진 장소를 더 안전하게 만들려면 무엇이 필요할까요?',1),('제보가 수천 건씩 몰리는 사건에서 중요한 제보를 놓치지 않으려면 어떤 체계가 필요할까요?',2),('사건에 관심이 몰리면서 온라인 추측과 자료 유출이 이어졌습니다. 이런 일이 수사와 재판, 유족에게 주는 피해를 줄이려면 무엇이 필요할까요?',3)) AS v(q,o)
WHERE base.id='02e97c14-8fb1-4b39-8623-4d03b77546cc'
  AND NOT EXISTS (SELECT 1 FROM unsolved_questions e WHERE e.case_id=base.case_id AND e.question=v.q);
UPDATE unsolved_questions SET question='약물을 이용한 범죄를 예방하려면 무엇이 필요할까요?', updated_at=now() WHERE id='05d7caf5-795f-47c0-bf17-7749c6a77cb3';
COMMIT;
