-- 개발용 시드 데이터. 공개된 사실 위주로 최소한만 넣음 (운영 반영 전 출처 대조 필요).
-- 여러 번 실행해도 같은 결과가 되도록 같은 slug를 먼저 지우고 다시 넣음 (하위 데이터는 Cascade로 함께 삭제).
BEGIN;

DELETE FROM cases WHERE slug IN ('daegu-frog-boys', 'zodiac-killer', 'setagaya-family-murder');

-- ─── 1. 대구 개구리 소년 사건 ───
WITH c AS (
  INSERT INTO cases (id, slug, title, summary, overview, country, category, status, location, occurred_at, occurred_at_precision, updated_at)
  VALUES (gen_random_uuid(), 'daegu-frog-boys', '대구 개구리 소년 사건',
    '도롱뇽 알을 주우러 산에 간 초등학생 5명이 실종되고, 11년 뒤 유골로 발견된 사건',
    '1991년 3월 26일, 대구 달서구의 초등학생 5명이 집 근처 와룡산에 도롱뇽 알을 주우러 간다며 나간 뒤 돌아오지 않았습니다. 대규모 수색에도 흔적을 찾지 못했고, 2002년 9월 와룡산 중턱에서 아이들의 유골이 발견됐습니다. 법의학 감정에서 타살로 결론이 났지만 범인은 밝혀지지 않았고, 2006년 공소시효가 만료됐습니다.',
    'KR', 'MURDER', 'UNSOLVED', '대구광역시 달서구 와룡산', '1991-03-26', 'DAY', now())
  RETURNING id
), t AS (
  INSERT INTO timeline_events (id, case_id, occurred_at, occurred_at_precision, title, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.at::timestamptz, v.p::"DatePrecision", v.title, v.descr, v.ord, now()
  FROM c, (VALUES
    ('1991-03-26', 'DAY', '아이들 5명 실종', '와룡산에 도롱뇽 알을 주우러 간다며 집을 나선 뒤 연락이 끊겼습니다.', 0),
    ('2002-09-26', 'DAY', '와룡산 중턱에서 유골 발견', '실종 11년 6개월 만에 5명의 유골이 함께 발견됐습니다.', 1),
    ('2002-11-01', 'MONTH', '법의학 감정 결과 타살로 결론', '두개골 손상 흔적 등을 근거로 타살로 판단했습니다.', 2),
    ('2006-03-25', 'DAY', '공소시효 만료', '범인을 특정하지 못한 채 공소시효(15년)가 끝났습니다.', 3)
  ) AS v(at, p, title, descr, ord)
), vi AS (
  INSERT INTO victims (id, case_id, name, age, gender, status, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.name, v.age, 'MALE', 'DECEASED', v.ord, now()
  FROM c, (VALUES ('우철원', 13, 0), ('조호연', 12, 1), ('김영규', 11, 2), ('박찬인', 10, 3), ('김종식', 9, 4)) AS v(name, age, ord)
), q AS (
  INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.q, v.ord, now()
  FROM c, (VALUES
    ('아이들을 해친 사람은 누구이고, 이유는 무엇이었을까요?', 0),
    ('대규모 수색에도 유골이 11년 동안 발견되지 않은 이유는 무엇일까요?', 1)
  ) AS v(q, ord)
)
INSERT INTO suspicious_circumstances (id, case_id, title, description, sort_order, updated_at)
SELECT gen_random_uuid(), c.id, v.title, v.descr, v.ord, now()
FROM c, (VALUES
  ('유골에 남은 두개골 손상 흔적', '감정 결과 둔기 등에 의한 손상으로 보는 견해가 나왔습니다.', 0),
  ('발견 장소가 마을에서 멀지 않은 산 중턱', '아이들이 오갈 수 있는 거리였다는 점에서 수색 범위와 방식에 의문이 남았습니다.', 1)
) AS v(title, descr, ord);

-- ─── 2. 조디악 킬러 사건 ───
WITH c AS (
  INSERT INTO cases (id, slug, title, summary, overview, country, category, status, location, occurred_at, occurred_at_precision, updated_at)
  VALUES (gen_random_uuid(), 'zodiac-killer', '조디악 킬러 사건',
    '암호문을 보내며 경찰과 언론을 조롱한 미국 캘리포니아의 연쇄살인범',
    '1968~1969년 미국 캘리포니아 북부에서 연인과 택시 기사 등을 공격한 연쇄살인범이 스스로를 "조디악"이라 부르며 언론사에 편지와 암호문을 보냈습니다. 확인된 피해자는 사망 5명, 생존 2명입니다. 수많은 용의자가 거론됐지만 범인은 공식적으로 특정되지 않았습니다.',
    'US', 'MURDER', 'UNSOLVED', '미국 캘리포니아주 베이 에어리어', '1968-12-20', 'DAY', now())
  RETURNING id
), t AS (
  INSERT INTO timeline_events (id, case_id, occurred_at, occurred_at_precision, title, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.at::timestamptz, v.p::"DatePrecision", v.title, v.descr, v.ord, now()
  FROM c, (VALUES
    ('1968-12-20', 'DAY', '레이크 허먼 로드 사건', '차 안에 있던 10대 연인이 총격으로 숨졌습니다.', 0),
    ('1969-07-04', 'DAY', '블루 록 스프링스 사건', '연인이 총격을 당해 1명이 숨지고 1명이 살아남았습니다.', 1),
    ('1969-08-01', 'MONTH', '언론사에 첫 편지와 암호문 도착', '샌프란시스코 지역 신문사 3곳에 암호문을 나눠 보냈습니다.', 2),
    ('1969-09-27', 'DAY', '베리에사 호수 사건', '흉기 공격으로 1명이 숨지고 1명이 살아남았습니다.', 3),
    ('1969-10-11', 'DAY', '샌프란시스코 택시 기사 피살', '범인이 피해자의 셔츠 조각을 이후 편지에 동봉했습니다.', 4),
    ('2020-12-01', 'MONTH', '340자 암호문 해독', '민간 암호 해독가들이 51년 만에 해독했으나 범인 신원은 드러나지 않았습니다.', 5)
  ) AS v(at, p, title, descr, ord)
), vi AS (
  INSERT INTO victims (id, case_id, name, age, gender, status, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.name, v.age, v.g::"Gender", v.s::"VictimStatus", v.ord, now()
  FROM c, (VALUES
    ('Betty Lou Jensen', 16, 'FEMALE', 'DECEASED', 0),
    ('David Faraday', 17, 'MALE', 'DECEASED', 1),
    ('Darlene Ferrin', 22, 'FEMALE', 'DECEASED', 2),
    ('Michael Mageau', 19, 'MALE', 'INJURED', 3),
    ('Cecelia Shepard', 22, 'FEMALE', 'DECEASED', 4),
    ('Bryan Hartnell', 20, 'MALE', 'INJURED', 5),
    ('Paul Stine', 29, 'MALE', 'DECEASED', 6)
  ) AS v(name, age, g, s, ord)
), s AS (
  INSERT INTO suspects (id, case_id, alias, description, charges, status, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, '조디악 (신원 미상)', '편지에서 스스로를 "조디악"이라 칭했습니다. 생존자 증언과 몽타주가 남아 있습니다.', '연쇄살인', 'AT_LARGE', 0, now()
  FROM c
), q AS (
  INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.q, v.ord, now()
  FROM c, (VALUES
    ('조디악의 정체는 누구일까요?', 0),
    ('아직 해독되지 않은 나머지 암호문에는 무엇이 적혀 있을까요?', 1),
    ('편지에서 주장한 것보다 실제 피해자는 더 많았을까요?', 2)
  ) AS v(q, ord)
)
INSERT INTO suspicious_circumstances (id, case_id, title, description, sort_order, updated_at)
SELECT gen_random_uuid(), c.id, v.title, v.descr, v.ord, now()
FROM c, (VALUES
  ('범행 직후 언론사로 보낸 편지', '범인만 알 수 있는 내용이 담겨 있어 편지가 진짜임을 뒷받침했습니다.', 0),
  ('피해자 셔츠 조각 동봉', '택시 기사 사건 이후 피해자의 셔츠 조각을 편지에 넣어 보냈습니다.', 1)
) AS v(title, descr, ord);

-- ─── 3. 세타가야 일가족 살인 사건 ───
WITH c AS (
  INSERT INTO cases (id, slug, title, summary, overview, country, category, status, location, occurred_at, occurred_at_precision, updated_at)
  VALUES (gen_random_uuid(), 'setagaya-family-murder', '세타가야 일가족 살인 사건',
    '범인이 지문과 유류품을 잔뜩 남겼는데도 20년 넘게 잡히지 않은 일본 도쿄의 일가족 살인',
    '2000년 12월 30일 밤, 도쿄 세타가야구의 주택에서 일가족 4명이 살해됐습니다. 범인은 범행 뒤에도 집에 머무르며 음식을 먹고 컴퓨터를 사용한 흔적을 남겼고, 지문·혈흔·의류 등 유류품도 많았습니다. 그럼에도 범인은 특정되지 않았습니다. 일본은 2010년 살인죄 공소시효를 폐지해 수사가 계속되고 있습니다.',
    'JP', 'MURDER', 'UNSOLVED', '일본 도쿄도 세타가야구', '2000-12-30', 'DAY', now())
  RETURNING id
), t AS (
  INSERT INTO timeline_events (id, case_id, occurred_at, occurred_at_precision, title, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.at::timestamptz, v.p::"DatePrecision", v.title, v.descr, v.ord, now()
  FROM c, (VALUES
    ('2000-12-30', 'DAY', '일가족 4명 피살', '밤사이 자택에서 부부와 자녀 2명이 살해됐습니다.', 0),
    ('2000-12-31', 'DAY', '이웃에 사는 친척이 발견', '다음 날 오전 연락이 닿지 않아 찾아간 친척이 발견했습니다.', 1),
    ('2010-04-27', 'DAY', '일본, 살인죄 공소시효 폐지', '이 사건도 시효 없이 계속 수사할 수 있게 됐습니다.', 2)
  ) AS v(at, p, title, descr, ord)
), vi AS (
  INSERT INTO victims (id, case_id, alias, age, gender, status, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.alias, v.age, v.g::"Gender", 'DECEASED', v.ord, now()
  FROM c, (VALUES
    ('아버지 (미야자와 미키오)', 44, 'MALE', 0),
    ('어머니 (미야자와 야스코)', 41, 'FEMALE', 1),
    ('장녀', 8, 'FEMALE', 2),
    ('장남', 6, 'MALE', 3)
  ) AS v(alias, age, g, ord)
), s AS (
  INSERT INTO suspects (id, case_id, alias, description, charges, status, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, '신원 미상 범인', '지문과 DNA가 확보됐지만 일치하는 기록이 없습니다.', '살인', 'AT_LARGE', 0, now()
  FROM c
), q AS (
  INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.q, v.ord, now()
  FROM c, (VALUES
    ('증거가 이렇게 많은데 왜 범인을 특정하지 못했을까요?', 0),
    ('범인은 왜 범행 후에도 오랜 시간 집에 머물렀을까요?', 1)
  ) AS v(q, ord)
)
INSERT INTO suspicious_circumstances (id, case_id, title, description, sort_order, updated_at)
SELECT gen_random_uuid(), c.id, v.title, v.descr, v.ord, now()
FROM c, (VALUES
  ('범행 뒤 집 안에서 음식을 먹은 흔적', '냉장고 음식을 꺼내 먹은 흔적이 발견됐습니다.', 0),
  ('범행 뒤 컴퓨터를 사용한 기록', '범행 시각 이후 집 컴퓨터가 사용된 기록이 남아 있습니다.', 1),
  ('다수의 유류품', '지문, 혈흔, 의류, 모자 등을 현장에 남기고 갔습니다.', 2)
) AS v(title, descr, ord);


-- ════════ 2차 추가 (7건) ════════
DELETE FROM cases WHERE slug IN ('lee-hyeongho-kidnapping', 'hwaseong-serial-murders', 'itaewon-burger-king-murder', 'jonbenet-ramsey', 'black-dahlia', 'golden-state-killer', 'glico-morinaga');

-- ─── 4. 이형호 유괴 살인 사건 ───
WITH c AS (
  INSERT INTO cases (id, slug, title, summary, overview, country, category, status, location, occurred_at, occurred_at_precision, solved_at, updated_at)
  VALUES (gen_random_uuid(), 'lee-hyeongho-kidnapping', '이형호 유괴 살인 사건',
    '범인이 40여 일 동안 협박 전화를 걸었지만 끝내 잡히지 않은 9세 아이 유괴 살인',
    '1991년 1월 29일 서울 압구정동에서 9세 이형호 군이 유괴됐습니다. 범인은 40여 일 동안 가족에게 수십 차례 전화를 걸어 몸값을 요구했지만 돈을 받으러 나타나지 않았고, 아이는 그해 3월 한강 배수로에서 숨진 채 발견됐습니다. 경찰은 범인의 녹음된 목소리를 공개했지만 신원을 밝히지 못했고, 2006년 공소시효가 만료됐습니다.',
    'KR', 'KIDNAPPING', 'UNSOLVED', '서울특별시 강남구 압구정동', '1991-01-29', 'DAY', NULL, now())
  RETURNING id
), t AS (
  INSERT INTO timeline_events (id, case_id, occurred_at, occurred_at_precision, title, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.at::timestamptz, v.p::"DatePrecision", v.title, v.descr, v.ord, now()
  FROM c, (VALUES
    ('1991-01-29', 'DAY', '이형호 군 실종·유괴', '집 근처 놀이터에 나간 뒤 연락이 끊겼습니다. 이후 범인의 협박 전화가 시작됐습니다.'::text, 0),
    ('1991-03-01', 'MONTH', '한강 배수로에서 시신 발견', '유괴 40여 일 만에 숨진 채 발견됐습니다.'::text, 1),
    ('1991-03-01', 'MONTH', '범인 목소리 공개', '녹음된 협박 전화 음성을 공개하고 제보를 받았습니다.'::text, 2),
    ('2006-01-29', 'DAY', '공소시효 만료', '범인을 특정하지 못한 채 공소시효(15년)가 끝났습니다.'::text, 3)
  ) AS v(at, p, title, descr, ord)
), vi AS (
  INSERT INTO victims (id, case_id, name, alias, age, gender, status, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.name, v.alias, v.age, v.g::"Gender", v.s::"VictimStatus", v.descr, v.ord, now()
  FROM c, (VALUES
    ('이형호'::text, NULL::text, 9::smallint, 'MALE', 'DECEASED', NULL::text, 0)
  ) AS v(name, alias, age, g, s, descr, ord)
), s0 AS (
  INSERT INTO suspects (id, case_id, name, alias, description, charges, status, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, NULL, '협박 전화 속 남성 (신원 미상)', '차분한 말투의 성인 남성 목소리였습니다. 가족의 사정을 잘 아는 듯한 내용이 있었습니다.', '유괴, 살인', 'AT_LARGE', 0, now()
  FROM c
  RETURNING id
), q AS (
  INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.q, v.ord, now()
  FROM c, (VALUES ('범인은 왜 몸값을 받으러 나타나지 않았을까요?', 0), ('가족 사정을 잘 아는 듯한 범인은 주변 인물이었을까요?', 1)) AS v(q, ord)
)
INSERT INTO suspicious_circumstances (id, case_id, title, description, sort_order, updated_at)
SELECT gen_random_uuid(), c.id, v.title, v.descr, v.ord, now()
FROM c, (VALUES
  ('수십 차례 걸려온 협박 전화', '범인 목소리가 녹음으로 남아 있습니다.', 0),
  ('몸값 전달 장소를 여러 번 바꿨습니다.', '경찰의 움직임을 지켜보는 듯한 행동을 보였습니다.', 1)
) AS v(title, descr, ord);

-- ─── 5. 화성 연쇄살인 사건 (이춘재 연쇄살인 사건) ───
WITH c AS (
  INSERT INTO cases (id, slug, title, summary, overview, country, category, status, location, occurred_at, occurred_at_precision, solved_at, updated_at)
  VALUES (gen_random_uuid(), 'hwaseong-serial-murders', '화성 연쇄살인 사건 (이춘재 연쇄살인 사건)',
    '33년 동안 미제였다가 DNA 재감정으로 진범이 밝혀진 한국의 대표적인 연쇄살인 사건',
    '1986년부터 1991년까지 경기도 화성 일대에서 여성 10명이 살해됐습니다. 당시 수사로는 범인을 찾지 못해 대표적인 미제 사건으로 남았습니다. 2019년 경찰이 보관 증거를 DNA로 재감정해 다른 사건으로 수감 중이던 이춘재를 진범으로 특정했고, 이춘재는 범행을 자백했습니다. 공소시효가 이미 끝나 처벌은 할 수 없었습니다. 8차 사건 범인으로 몰려 20년 가까이 복역한 윤성여 씨는 2020년 재심에서 무죄를 선고받았습니다.',
    'KR', 'MURDER', 'SOLVED', '경기도 화성군 (현 화성시) 일대', '1986-09-15', 'DAY', '2019-10-01', now())
  RETURNING id
), t AS (
  INSERT INTO timeline_events (id, case_id, occurred_at, occurred_at_precision, title, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.at::timestamptz, v.p::"DatePrecision", v.title, v.descr, v.ord, now()
  FROM c, (VALUES
    ('1986-09-15', 'DAY', '첫 번째 사건 발생', '이후 1991년까지 같은 지역에서 사건이 이어졌습니다.'::text, 0),
    ('1991-04-03', 'DAY', '마지막(10차) 사건 발생', NULL::text, 1),
    ('2006-04-02', 'DAY', '마지막 사건 공소시효 만료', NULL::text, 2),
    ('2019-09-18', 'DAY', '경찰, DNA로 유력 용의자 특정 발표', '보관 증거물에서 나온 DNA가 수감 중인 이춘재와 일치했습니다.'::text, 3),
    ('2019-10-01', 'MONTH', '이춘재 범행 자백', NULL::text, 4),
    ('2020-12-17', 'DAY', '8차 사건 윤성여 씨 재심 무죄', '억울하게 복역한 사실이 법원에서 인정됐습니다.'::text, 5)
  ) AS v(at, p, title, descr, ord)
), vi AS (
  INSERT INTO victims (id, case_id, name, alias, age, gender, status, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.name, v.alias, v.age, v.g::"Gender", v.s::"VictimStatus", v.descr, v.ord, now()
  FROM c, (VALUES
    (NULL::text, '피해 여성 10명'::text, NULL::smallint, 'FEMALE', 'DECEASED', '1986~1991년 사이 화성 일대에서 희생됐습니다.'::text, 0)
  ) AS v(name, alias, age, g, s, descr, ord)
), s0 AS (
  INSERT INTO suspects (id, case_id, name, alias, description, charges, status, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, '이춘재', NULL, '경찰이 진범으로 결론 내렸고 본인도 자백했습니다. 공소시효 만료로 이 사건으로는 기소되지 않았습니다. 1994년 다른 살인 사건으로 무기징역을 선고받아 복역 중입니다.', '연쇄살인 (공소시효 만료)', 'SUSPECTED', 0, now()
  FROM c
  RETURNING id
), q AS (
  INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.q, v.ord, now()
  FROM c, (VALUES ('억울한 옥살이를 예방하기 위한 방법은 무엇일까요?', 0), ('오래된 사건의 증거를 보관했다가 다시 분석하려면 어떤 제도가 필요할까요?', 1), ('공소시효가 지난 뒤 진범이 밝혀졌을 때, 피해자와 유족을 위해 무엇을 할 수 있을까요?', 2)) AS v(q, ord)
)
INSERT INTO suspicious_circumstances (id, case_id, title, description, sort_order, updated_at)
SELECT gen_random_uuid(), c.id, v.title, v.descr, v.ord, now()
FROM c, (VALUES
  ('사건 현장의 보관 증거물', '30여 년 뒤 DNA 재감정의 결정적 단서가 됐습니다.', 0),
  ('8차 사건의 강압 수사', '윤성여 씨가 범인으로 몰려 복역한 사실이 재심으로 드러났습니다.', 1)
) AS v(title, descr, ord);

-- ─── 6. 이태원 살인 사건 ───
WITH c AS (
  INSERT INTO cases (id, slug, title, summary, overview, country, category, status, location, occurred_at, occurred_at_precision, solved_at, updated_at)
  VALUES (gen_random_uuid(), 'itaewon-burger-king-murder', '이태원 살인 사건',
    '패스트푸드점 화장실에서 대학생이 살해되고, 20년 만에 진범이 단죄된 사건',
    '1997년 4월 3일 서울 이태원의 한 패스트푸드점 화장실에서 대학생 조중필 씨가 흉기에 찔려 숨졌습니다. 현장에 있던 미국인 10대 2명이 서로를 범인으로 지목했습니다. 한 명은 기소됐다가 대법원에서 무죄가 확정됐고, 다른 한 명은 출국해 버렸습니다. 이후 재수사와 범죄인 인도 끝에 아서 패터슨이 다시 재판을 받아 2017년 징역 20년이 확정됐습니다.',
    'KR', 'MURDER', 'SOLVED', '서울특별시 용산구 이태원동', '1997-04-03', 'DAY', '2017-01-25', now())
  RETURNING id
), t AS (
  INSERT INTO timeline_events (id, case_id, occurred_at, occurred_at_precision, title, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.at::timestamptz, v.p::"DatePrecision", v.title, v.descr, v.ord, now()
  FROM c, (VALUES
    ('1997-04-03', 'DAY', '패스트푸드점 화장실에서 피살', NULL::text, 0),
    ('1998-09-01', 'MONTH', '첫 기소된 인물, 대법원에서 무죄 취지 판결', NULL::text, 1),
    ('2015-09-23', 'DAY', '아서 패터슨, 미국에서 국내로 송환', NULL::text, 2),
    ('2016-01-29', 'DAY', '패터슨 1심 징역 20년', NULL::text, 3),
    ('2017-01-25', 'DAY', '대법원, 징역 20년 확정', '사건 발생 20년 만에 진범이 단죄됐습니다.'::text, 4)
  ) AS v(at, p, title, descr, ord)
), vi AS (
  INSERT INTO victims (id, case_id, name, alias, age, gender, status, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.name, v.alias, v.age, v.g::"Gender", v.s::"VictimStatus", v.descr, v.ord, now()
  FROM c, (VALUES
    ('조중필'::text, NULL::text, 22::smallint, 'MALE', 'DECEASED', '대학생입니다.'::text, 0)
  ) AS v(name, alias, age, g, s, descr, ord)
), s0 AS (
  INSERT INTO suspects (id, case_id, name, alias, description, charges, status, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, '아서 패터슨 (Arthur Patterson)', NULL, '사건 당시 10대 미국인이었습니다. 재수사 후 송환돼 재판을 받았습니다.', '살인', 'CONVICTED', 0, now()
  FROM c
  RETURNING id
), sen0 AS (
  INSERT INTO sentences (id, suspect_id, court_level, court_name, type, penalty, is_final, decided_at, updated_at)
  SELECT gen_random_uuid(), s0.id, v.lv::"CourtLevel", v.court, v.ty::"SentenceType", v.pen, v.fin, v.at::date, now()
  FROM s0, (VALUES
    ('FIRST', '서울중앙지방법원', 'IMPRISONMENT', '징역 20년', false, '2016-01-29'),
    ('SUPREME', '대법원', 'IMPRISONMENT', '징역 20년', true, '2017-01-25')
  ) AS v(lv, court, ty, pen, fin, at)
), s1 AS (
  INSERT INTO suspects (id, case_id, name, alias, description, charges, status, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, '에드워드 리 (Edward Lee)', '함께 있던 다른 10대', '처음 범인으로 기소됐으나 무죄가 확정됐습니다.', '살인 (무죄)', 'ACQUITTED', 1, now()
  FROM c
  RETURNING id
), q AS (
  INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.q, v.ord, now()
  FROM c, (VALUES ('시간이 지난 사건을 다시 수사하려면 어떤 제도가 필요할까요?', 0), ('중요 사건 피의자의 출국을 막으려면 어떤 제도가 필요할까요?', 1)) AS v(q, ord)
)
INSERT INTO suspicious_circumstances (id, case_id, title, description, sort_order, updated_at)
SELECT gen_random_uuid(), c.id, v.title, v.descr, v.ord, now()
FROM c, (VALUES
  ('두 사람이 서로를 범인으로 지목', '진술이 엇갈리며 첫 수사가 혼선을 겪었습니다.', 0),
  ('출국정지 기간 만료', '재판 중 출국정지가 연장되지 않아 패터슨이 출국했습니다.', 1)
) AS v(title, descr, ord);

-- ─── 7. 존베넷 램지 사건 ───
WITH c AS (
  INSERT INTO cases (id, slug, title, summary, overview, country, category, status, location, occurred_at, occurred_at_precision, solved_at, updated_at)
  VALUES (gen_random_uuid(), 'jonbenet-ramsey', '존베넷 램지 사건',
    '크리스마스 다음 날 자택 지하실에서 6세 소녀가 숨진 채 발견된 사건',
    '1996년 12월 26일, 6세 존베넷 램지가 콜로라도주 볼더의 자택에서 실종됐다는 신고가 들어왔고, 집 안에서는 몸값을 요구하는 긴 쪽지가 발견됐습니다. 같은 날 아이는 자택 지하실에서 숨진 채 발견됐습니다. 오랫동안 가족이 의심을 받았지만 2008년 검찰은 DNA 분석을 근거로 가족의 혐의를 공식적으로 벗겨 줬습니다. 범인은 아직 밝혀지지 않았습니다.',
    'US', 'MURDER', 'UNSOLVED', '미국 콜로라도주 볼더', '1996-12-26', 'DAY', NULL, now())
  RETURNING id
), t AS (
  INSERT INTO timeline_events (id, case_id, occurred_at, occurred_at_precision, title, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.at::timestamptz, v.p::"DatePrecision", v.title, v.descr, v.ord, now()
  FROM c, (VALUES
    ('1996-12-26', 'DAY', '실종 신고와 몸값 요구 쪽지 발견', NULL::text, 0),
    ('1996-12-26', 'DAY', '자택 지하실에서 시신 발견', '신고 몇 시간 뒤 아버지가 지하실에서 발견했습니다.'::text, 1),
    ('2008-07-01', 'MONTH', '검찰, 가족 혐의 공식 해소', '새 DNA 분석 결과를 근거로 했습니다.'::text, 2)
  ) AS v(at, p, title, descr, ord)
), vi AS (
  INSERT INTO victims (id, case_id, name, alias, age, gender, status, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.name, v.alias, v.age, v.g::"Gender", v.s::"VictimStatus", v.descr, v.ord, now()
  FROM c, (VALUES
    ('JonBenét Ramsey'::text, NULL::text, 6::smallint, 'FEMALE', 'DECEASED', NULL::text, 0)
  ) AS v(name, alias, age, g, s, descr, ord)
), s0 AS (
  INSERT INTO suspects (id, case_id, name, alias, description, charges, status, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, NULL, '신원 미상 범인', '현장 DNA와 일치하는 인물이 확인되지 않았습니다.', '살인', 'AT_LARGE', 0, now()
  FROM c
  RETURNING id
), q AS (
  INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.q, v.ord, now()
  FROM c, (VALUES ('몸값 쪽지는 누가, 왜 집 안에서 썼을까요?', 0), ('외부 침입 흔적은 충분했을까요?', 1)) AS v(q, ord)
)
INSERT INTO suspicious_circumstances (id, case_id, title, description, sort_order, updated_at)
SELECT gen_random_uuid(), c.id, v.title, v.descr, v.ord, now()
FROM c, (VALUES
  ('집 안에서 쓰인 긴 몸값 요구 쪽지', '집에 있던 종이와 펜으로 쓴 것으로 알려졌습니다.', 0),
  ('초기 현장 보존 실패', '신고 직후 여러 사람이 집을 드나들었습니다.', 1)
) AS v(title, descr, ord);

-- ─── 8. 블랙 달리아 사건 ───
WITH c AS (
  INSERT INTO cases (id, slug, title, summary, overview, country, category, status, location, occurred_at, occurred_at_precision, solved_at, updated_at)
  VALUES (gen_random_uuid(), 'black-dahlia', '블랙 달리아 사건',
    '1947년 로스앤젤레스 공터에서 훼손된 시신으로 발견된 22세 여성 엘리자베스 쇼트 사건',
    '1947년 1월 15일 로스앤젤레스 레이머트 파크의 공터에서 22세 엘리자베스 쇼트의 시신이 발견됐습니다. 언론은 그녀를 "블랙 달리아"라고 불렀고 사건은 큰 관심을 모았습니다. 수많은 사람이 용의선상에 오르고 거짓 자백도 이어졌지만 범인은 밝혀지지 않았습니다.',
    'US', 'MURDER', 'UNSOLVED', '미국 캘리포니아주 로스앤젤레스', '1947-01-15', 'DAY', NULL, now())
  RETURNING id
), t AS (
  INSERT INTO timeline_events (id, case_id, occurred_at, occurred_at_precision, title, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.at::timestamptz, v.p::"DatePrecision", v.title, v.descr, v.ord, now()
  FROM c, (VALUES
    ('1947-01-15', 'DAY', '레이머트 파크 공터에서 시신 발견', NULL::text, 0),
    ('1947-01-01', 'MONTH', '신문사로 피해자 소지품 우편 도착', '범인으로 보이는 인물이 보낸 것으로 추정됐습니다.'::text, 1)
  ) AS v(at, p, title, descr, ord)
), vi AS (
  INSERT INTO victims (id, case_id, name, alias, age, gender, status, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.name, v.alias, v.age, v.g::"Gender", v.s::"VictimStatus", v.descr, v.ord, now()
  FROM c, (VALUES
    ('Elizabeth Short'::text, NULL::text, 22::smallint, 'FEMALE', 'DECEASED', NULL::text, 0)
  ) AS v(name, alias, age, g, s, descr, ord)
), s0 AS (
  INSERT INTO suspects (id, case_id, name, alias, description, charges, status, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, NULL, '신원 미상 범인', '수십 명이 용의선상에 올랐지만 특정되지 않았습니다.', '살인', 'AT_LARGE', 0, now()
  FROM c
  RETURNING id
), q AS (
  INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.q, v.ord, now()
  FROM c, (VALUES ('범인은 피해자와 아는 사이였을까요?', 0), ('언론에 소지품을 보낸 사람은 진범이었을까요?', 1)) AS v(q, ord)
)
INSERT INTO suspicious_circumstances (id, case_id, title, description, sort_order, updated_at)
SELECT gen_random_uuid(), c.id, v.title, v.descr, v.ord, now()
FROM c, (VALUES
  ('언론사로 보내진 소지품', '범인이 언론을 의식했을 가능성이 있습니다.', 0),
  ('수많은 거짓 자백', '수사에 혼선을 줬습니다.', 1)
) AS v(title, descr, ord);

-- ─── 9. 골든 스테이트 킬러 사건 ───
WITH c AS (
  INSERT INTO cases (id, slug, title, summary, overview, country, category, status, location, occurred_at, occurred_at_precision, solved_at, updated_at)
  VALUES (gen_random_uuid(), 'golden-state-killer', '골든 스테이트 킬러 사건',
    '40여 년 미제였다가 가계도 DNA 분석으로 붙잡힌 캘리포니아 연쇄살인·성폭행범',
    '1970~80년대 캘리포니아 곳곳에서 살인 13건과 수십 건의 성폭행, 수많은 주거 침입을 저지른 범인이 수십 년 동안 잡히지 않았습니다. 2018년 수사기관은 현장 DNA를 일반인 가계도 DNA 데이터베이스와 비교하는 방식으로 전직 경찰관 조지프 제임스 디앤젤로를 특정해 체포했습니다. 디앤젤로는 2020년 유죄를 인정했고 가석방 없는 종신형을 선고받았습니다.',
    'US', 'MURDER', 'SOLVED', '미국 캘리포니아주 일대', '1974-01-01', 'YEAR', '2018-04-24', now())
  RETURNING id
), t AS (
  INSERT INTO timeline_events (id, case_id, occurred_at, occurred_at_precision, title, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.at::timestamptz, v.p::"DatePrecision", v.title, v.descr, v.ord, now()
  FROM c, (VALUES
    ('1974-01-01', 'YEAR', '첫 범행 시작으로 추정', '주거 침입 사건이 이어졌습니다.'::text, 0),
    ('1986-01-01', 'YEAR', '마지막으로 알려진 살인', NULL::text, 1),
    ('2018-04-24', 'DAY', '디앤젤로 체포', '가계도 DNA 분석으로 특정했습니다.'::text, 2),
    ('2020-06-29', 'DAY', '피고인이 유죄를 인정했습니다.', NULL::text, 3),
    ('2020-08-21', 'DAY', '가석방 없는 종신형 선고', NULL::text, 4)
  ) AS v(at, p, title, descr, ord)
), vi AS (
  INSERT INTO victims (id, case_id, name, alias, age, gender, status, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.name, v.alias, v.age, v.g::"Gender", v.s::"VictimStatus", v.descr, v.ord, now()
  FROM c, (VALUES
    (NULL::text, '살인 피해자 13명'::text, NULL::smallint, 'UNKNOWN', 'DECEASED', '이 외에 성폭행 피해자가 수십 명 있습니다.'::text, 0)
  ) AS v(name, alias, age, g, s, descr, ord)
), s0 AS (
  INSERT INTO suspects (id, case_id, name, alias, description, charges, status, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, 'Joseph James DeAngelo', NULL, '전직 경찰관입니다. 체포 당시 72세였습니다.', '살인, 납치 등', 'CONVICTED', 0, now()
  FROM c
  RETURNING id
), sen0 AS (
  INSERT INTO sentences (id, suspect_id, court_level, court_name, type, penalty, is_final, decided_at, updated_at)
  SELECT gen_random_uuid(), s0.id, v.lv::"CourtLevel", v.court, v.ty::"SentenceType", v.pen, v.fin, v.at::date, now()
  FROM s0, (VALUES
    ('FIRST', '새크라멘토 카운티 법원', 'LIFE', '가석방 없는 종신형 (범행마다 선고된 종신형을 이어서 복역)', true, '2020-08-21')
  ) AS v(lv, court, ty, pen, fin, at)
), q AS (
  INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.q, v.ord, now()
  FROM c, (VALUES ('오래된 미제 사건을 다시 풀려면 어떤 수사 체계가 필요할까요?', 0), ('가계도 DNA 수사는 어디까지 허용돼야 할까요?', 1)) AS v(q, ord)
)
INSERT INTO suspicious_circumstances (id, case_id, title, description, sort_order, updated_at)
SELECT gen_random_uuid(), c.id, v.title, v.descr, v.ord, now()
FROM c, (VALUES
  ('전직 경찰관 경력', '수사 방식을 잘 알았을 가능성이 있습니다.', 0),
  ('현장에 남은 DNA', '수십 년 뒤 신원 특정의 결정적 단서가 됐습니다.', 1)
) AS v(title, descr, ord);

-- ─── 10. 그리코·모리나가 사건 ───
WITH c AS (
  INSERT INTO cases (id, slug, title, summary, overview, country, category, status, location, occurred_at, occurred_at_precision, solved_at, updated_at)
  VALUES (gen_random_uuid(), 'glico-morinaga', '그리코·모리나가 사건',
    '"괴인 21면상"을 자칭한 범인이 제과 회사 사장을 납치하고 독극물 과자로 기업들을 협박한 사건',
    '1984년 3월 18일 에자키 그리코 사장이 자택에서 납치됐다가 사흘 뒤 스스로 탈출했습니다. 이후 "괴인 21면상"을 자칭한 범인은 그리코, 모리나가 등 식품 회사들을 협박하고, 독극물을 넣은 과자를 매장에 두겠다고 위협했습니다. 언론과 경찰을 조롱하는 편지를 여러 차례 보냈지만, 1985년 갑자기 활동 종료를 선언했습니다. 2000년 공소시효가 모두 만료됐습니다.',
    'JP', 'KIDNAPPING', 'UNSOLVED', '일본 오사카부·효고현 일대', '1984-03-18', 'DAY', NULL, now())
  RETURNING id
), t AS (
  INSERT INTO timeline_events (id, case_id, occurred_at, occurred_at_precision, title, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.at::timestamptz, v.p::"DatePrecision", v.title, v.descr, v.ord, now()
  FROM c, (VALUES
    ('1984-03-18', 'DAY', '에자키 그리코 사장 납치', NULL::text, 0),
    ('1984-03-21', 'DAY', '사장 스스로 탈출', NULL::text, 1),
    ('1984-10-01', 'MONTH', '독극물 과자 협박', '청산가리를 넣은 과자가 매장에서 발견됐습니다.'::text, 2),
    ('1985-08-12', 'DAY', '범인, 활동 종료 선언 편지', NULL::text, 3),
    ('2000-02-13', 'DAY', '공소시효 만료', NULL::text, 4)
  ) AS v(at, p, title, descr, ord)
), vi AS (
  INSERT INTO victims (id, case_id, name, alias, age, gender, status, description, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.name, v.alias, v.age, v.g::"Gender", v.s::"VictimStatus", v.descr, v.ord, now()
  FROM c, (VALUES
    (NULL::text, '에자키 그리코 사장'::text, NULL::smallint, 'MALE', 'FOUND_ALIVE', '납치됐다가 스스로 탈출했습니다.'::text, 0)
  ) AS v(name, alias, age, g, s, descr, ord)
), s0 AS (
  INSERT INTO suspects (id, case_id, name, alias, description, charges, status, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, NULL, '괴인 21면상 (신원 미상)', '"여우 눈의 남자"로 불린 인물이 수사선상에 올랐으나 특정되지 않았습니다.', '납치, 협박', 'AT_LARGE', 0, now()
  FROM c
  RETURNING id
), q AS (
  INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
  SELECT gen_random_uuid(), c.id, v.q, v.ord, now()
  FROM c, (VALUES ('범인 집단의 정체와 진짜 목적은 무엇이었을까요?', 0), ('왜 갑자기 활동을 끝냈을까요?', 1)) AS v(q, ord)
)
INSERT INTO suspicious_circumstances (id, case_id, title, description, sort_order, updated_at)
SELECT gen_random_uuid(), c.id, v.title, v.descr, v.ord, now()
FROM c, (VALUES
  ('언론과 경찰을 조롱하는 편지', '수십 통을 보냈습니다.', 0),
  ('"여우 눈의 남자" 목격', '여러 현장에서 비슷한 인물이 목격됐습니다.', 1)
) AS v(title, descr, ord);

-- 시드 사건은 출처 확인 전이므로 공개하되 검토 필요로 표시함
UPDATE cases SET is_published = true, review_status = 'NEEDS_REVIEW' WHERE slug IN ('daegu-frog-boys','zodiac-killer','setagaya-family-murder','lee-hyeongho-kidnapping','hwaseong-serial-murders','itaewon-burger-king-murder','jonbenet-ramsey','black-dahlia','golden-state-killer','glico-morinaga');

COMMIT;
