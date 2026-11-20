-- 최신 사건 추가 시드 (2026-11-19 언론 보도 기준으로 확인). seed.sql과 달리 아래 slug만 지우고 다시 넣음.
-- 다시 실행하면 이 사건들의 형량 투표도 함께 삭제되므로, 투표가 쌓인 뒤에는 실행하지 말 것.
-- 판결이 확정되지 않은 국내 피고인과 국내 최근 사건의 피해자는 실명을 넣지 않음.
BEGIN;

DO $seed$
DECLARE
  item jsonb;
  row_item jsonb;
  sentence_item jsonb;
  new_case uuid;
  new_suspect uuid;
  ord int;
  i int;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements($json$[
  {"slug":"seohyeon-station-attack","title":"서현역 흉기 난동 사건","summary":"차량으로 행인을 들이받은 뒤 백화점에서 흉기를 휘둘러 2명이 숨지고 12명이 다친 사건","overview":"2023년 8월 3일 오후 경기 성남시 분당구 서현역 인근에서 최원종이 차량으로 보행자를 들이받은 뒤 백화점에 들어가 시민들을 흉기로 공격했습니다. 차에 치인 피해자 2명이 끝내 숨졌습니다. 법원은 심신미약을 고려하더라도 사회에서 영구히 격리해야 한다며 무기징역을 선고했습니다.","country":"KR","category":"MURDER","status":"SOLVED","location":"경기도 성남시 분당구 서현역 일대","at":"2023-08-03","precision":"DAY","solved":"2024-11-20",
   "timeline":[["2023-08-03","DAY","서현역 일대 차량 돌진과 흉기 난동","백화점 안팎에서 시민 14명이 피해를 입었습니다."],["2024-02-01","DAY","1심 무기징역","수원지법 성남지원이 무기징역을 선고했습니다."],["2024-08-20","DAY","2심 항소 기각","수원고법이 검찰과 피고인의 항소를 모두 기각했습니다."],["2024-11-20","DAY","대법원 무기징역 확정","위치추적 전자장치 부착 30년도 유지됐습니다."]],
   "victims":[{"alias":"사망 피해자","count":2,"status":"DECEASED"},{"alias":"부상 피해자","count":12,"status":"INJURED"}],
   "suspects":[{"name":"최원종","status":"CONVICTED","charges":"살인, 살인미수, 살인예비","sentences":[{"court":"SUPREME","courtName":"대법원","type":"LIFE","penalty":"무기징역","verdict":"상고를 기각했습니다. 위치추적 전자장치 부착 30년도 유지했습니다.","final":true,"date":"2024-11-20"}]}],
   "questions":["위험 신호를 미리 알아차리려면 무엇이 필요할까요?"]},
  {"slug":"sillim-station-attack","title":"신림역 흉기 난동 사건","summary":"서울 신림역 인근 골목에서 행인을 무차별 공격해 1명이 숨지고 3명이 다친 사건","overview":"2023년 7월 21일 서울 관악구 신림역 인근 상가 골목에서 조선이 처음 보는 남성들을 잇달아 흉기로 공격했습니다. 20대 남성 1명이 숨지고 3명이 다쳤습니다. 검찰은 사형을 구형했지만 1심과 2심 모두 무기징역을 선고했고, 상고 없이 형이 확정된 것으로 보도됐습니다.","country":"KR","category":"MURDER","status":"SOLVED","location":"서울특별시 관악구 신림역 인근","at":"2023-07-21","precision":"DAY","solved":"2024-06-14",
   "timeline":[["2023-07-21","DAY","신림역 인근 무차별 공격","일면식 없는 남성 4명을 공격했습니다."],["2024-01-31","DAY","1심 무기징역","서울중앙지법이 무기징역과 전자장치 부착 30년을 선고했습니다."],["2024-06-14","DAY","2심 무기징역","서울고법이 1심 형량을 유지했습니다."]],
   "victims":[{"alias":"사망 피해자","count":1,"status":"DECEASED","gender":"MALE"},{"alias":"부상 피해자","count":3,"status":"INJURED","gender":"MALE"}],
   "suspects":[{"name":"조선","status":"CONVICTED","charges":"살인, 살인미수","sentences":[{"court":"APPEAL","courtName":"서울고등법원","type":"LIFE","penalty":"무기징역","verdict":"1심 형량을 유지했습니다. 위치추적 전자장치 부착 30년도 명령했습니다.","final":true,"date":"2024-06-14"}]}],
   "questions":["범행 전에 보인 신호를 주변이나 기관이 먼저 알아챌 방법이 있었을까요?","사람이 붐비는 역 근처에서 이런 일이 생기면, 시민은 어떻게 몸을 피하고 서로 도울 수 있을까요?","이 사건 뒤 온라인에 살인 예고 글이 잇따랐습니다. 이런 모방 범죄를 줄이려면 무엇이 필요할까요?","피해자와 유족, 그리고 현장을 목격한 사람들에게는 어떤 지원이 필요할까요?"]},
  {"slug":"busan-peer-murder","title":"부산 또래 여성 살인 사건","summary":"과외 앱으로 접근한 또래 여성을 살해하고 시신을 훼손·유기한 사건","overview":"2023년 5월 26일 정유정은 과외 앱으로 알게 된 또래 여성의 부산 금정구 집을 찾아가 흉기로 살해한 뒤 시신을 훼손해 유기했습니다. 검찰은 사형을 구형했지만 1심과 2심은 무기징역을 선고했고, 대법원이 이를 확정했습니다.","country":"KR","category":"MURDER","status":"SOLVED","location":"부산광역시 금정구","at":"2023-05-26","precision":"DAY","solved":"2024-06-13",
   "timeline":[["2023-05-26","DAY","또래 여성 살해","피해자의 집에 찾아가 살해하고 시신을 훼손·유기했습니다."],["2023-11-24","DAY","1심 무기징역","부산지법이 무기징역을 선고했습니다."],["2024-06-13","DAY","대법원 무기징역 확정","위치추적 전자장치 부착 30년도 확정됐습니다."]],
   "victims":[{"alias":"20대 여성 피해자","count":1,"status":"DECEASED","gender":"FEMALE"}],
   "suspects":[{"name":"정유정","status":"CONVICTED","charges":"살인, 사체손괴, 사체유기","sentences":[{"court":"SUPREME","courtName":"대법원","type":"LIFE","penalty":"무기징역","verdict":"상고를 기각했습니다. 위치추적 전자장치 부착 30년도 유지했습니다.","final":true,"date":"2024-06-13"}]}],
   "questions":["무엇이 그를 이런 범행으로 이끌었을까요?"]},
  {"slug":"sindang-station-stalking-murder","title":"신당역 스토킹 살인 사건","summary":"스토킹 재판 선고를 앞둔 가해자가 역 화장실에서 피해자인 입사 동기를 살해한 사건","overview":"2022년 9월 14일 전주환은 서울 지하철 2호선 신당역 여자화장실에서 근무 중이던 입사 동기를 흉기로 살해했습니다. 그는 피해자를 스토킹하고 불법 촬영물로 협박한 혐의로 재판을 받으며 선고를 앞두고 있었습니다. 사건 뒤 스토킹 피해자 보호 제도의 허점이 큰 논란이 됐습니다.","country":"KR","category":"MURDER","status":"SOLVED","location":"서울특별시 중구 신당역","at":"2022-09-14","precision":"DAY","solved":"2023-10-12",
   "timeline":[["2022-09-14","DAY","신당역 화장실에서 피해자 살해","스토킹 사건 선고 하루 전 범행했습니다."],["2023-10-12","DAY","대법원 무기징역 확정","보복살인 등 사건의 상고를 기각했습니다."]],
   "victims":[{"alias":"역무원 피해자","count":1,"status":"DECEASED","gender":"FEMALE"}],
   "suspects":[{"name":"전주환","status":"CONVICTED","charges":"특정범죄가중처벌법 위반(보복살인) 등","sentences":[{"court":"SUPREME","courtName":"대법원","type":"LIFE","penalty":"무기징역","verdict":"상고를 기각했습니다.","final":true,"date":"2023-10-12"}]}],
   "questions":["재판 중인 스토킹 피해자를 지키려면 무엇이 필요할까요?"]},
  {"slug":"gapyeong-valley-murder","title":"가평 계곡 살인 사건","summary":"보험금을 노리고 수영을 못하는 남편을 계곡에 뛰어들게 한 뒤 구조하지 않아 숨지게 한 사건","overview":"2019년 6월 30일 경기 가평군의 계곡에서 이은해와 공범 조현수는 수영을 못하는 이은해의 남편이 물에 뛰어들게 한 뒤 구조하지 않아 숨지게 했습니다. 앞서 복어 피를 먹이는 등 살해를 시도한 사실도 인정됐습니다. 법원은 심리적 지배에 의한 직접 살인은 인정하지 않았지만 부작위에 의한 살인을 유죄로 판단했습니다.","country":"KR","category":"MURDER","status":"SOLVED","location":"경기도 가평군","at":"2019-06-30","precision":"DAY","solved":"2023-09-21",
   "timeline":[["2019-06-30","DAY","계곡에서 남편 사망","물에 빠진 피해자를 구조하지 않았습니다."],["2022-10-27","DAY","1심 선고","이은해는 무기징역, 조현수는 징역 30년을 선고받았습니다."],["2023-09-21","DAY","대법원 확정","부작위에 의한 살인과 살인미수를 유죄로 확정했습니다."]],
   "victims":[{"alias":"이은해의 남편","count":1,"status":"DECEASED","gender":"MALE"}],
   "suspects":[{"name":"이은해","status":"CONVICTED","charges":"살인, 살인미수","sentences":[{"court":"SUPREME","courtName":"대법원","type":"LIFE","penalty":"무기징역","verdict":"부작위에 의한 살인을 인정했습니다. 위치추적 전자장치 부착 20년도 명령했습니다.","final":true,"date":"2023-09-21"}]},{"name":"조현수","status":"CONVICTED","charges":"살인, 살인미수","sentences":[{"court":"SUPREME","courtName":"대법원","type":"IMPRISONMENT","penalty":"징역 30년","verdict":"부작위에 의한 살인을 인정했습니다. 위치추적 전자장치 부착 20년도 명령했습니다.","final":true,"date":"2023-09-21"}]}],
   "questions":["가스라이팅 피해를 일찍 발견하고 도우려면 무엇이 필요할까요?"]},
  {"slug":"daejeon-elementary-school-murder","title":"대전 초등학생 피살 사건","summary":"초등학교 교사가 학교 안에서 하교 중인 1학년 학생을 유인해 살해한 사건","overview":"2025년 2월 10일 대전 서구의 한 초등학교에서 교사 명재완이 하교하던 학생을 책을 주겠다며 시청각실 창고로 유인해 살해했습니다. 피고인 측은 우울증으로 인한 심신미약을 주장했지만, 법원은 계획적 범행과 은폐 행위 등을 근거로 받아들이지 않았습니다.","country":"KR","category":"MURDER","status":"SOLVED","location":"대전광역시 서구","at":"2025-02-10","precision":"DAY","solved":"2026-04-02",
   "timeline":[["2025-02-10","DAY","학교 안에서 학생 피살","하교하던 학생을 창고로 유인해 살해했습니다."],["2025-10-01","MONTH","1심 무기징역","검찰은 사형을 구형했습니다."],["2026-01-01","MONTH","2심 항소 기각","대전고법이 1심 형량을 유지했습니다."],["2026-04-02","DAY","대법원 무기징역 확정","위치추적 전자장치 부착 30년도 유지됐습니다."]],
   "victims":[{"alias":"초등학교 1학년 학생","count":1,"status":"DECEASED","gender":"FEMALE"}],
   "suspects":[{"name":"명재완","status":"CONVICTED","charges":"특정범죄가중처벌법 위반(영리약취·유인 후 살해) 등","sentences":[{"court":"SUPREME","courtName":"대법원","type":"LIFE","penalty":"무기징역","verdict":"상고를 기각했습니다. 위치추적 전자장치 부착 30년도 유지했습니다.","final":true,"date":"2026-04-02"}]}],
   "questions":["학교 구성원의 이상 행동을 발견했을 때 어떻게 대응해야 할까요?"]},
  {"slug":"suncheon-random-murder","title":"순천 10대 여성 살인 사건","summary":"귀가하던 10대 여성을 약 800m 뒤쫓아가 살해한 무차별 범죄","overview":"2024년 9월 26일 새벽 전남 순천시 조례동에서 박대성이 일면식 없는 10대 여성을 약 800m 뒤쫓아가 흉기로 살해했습니다. 범행 뒤 주점과 노래방을 돌아다니며 추가 범행을 준비한 혐의도 받았습니다. 검찰은 사형을 구형했지만 1심과 2심은 무기징역을 선고했고 대법원이 확정했습니다.","country":"KR","category":"MURDER","status":"SOLVED","location":"전라남도 순천시 조례동","at":"2024-09-26","precision":"DAY","solved":"2025-08-14",
   "timeline":[["2024-09-26","DAY","귀가하던 10대 여성 피살","일면식 없는 피해자를 뒤쫓아가 살해했습니다."],["2025-05-01","MONTH","2심 무기징역","검찰의 항소를 기각했습니다."],["2025-08-14","DAY","대법원 무기징역 확정","상고를 기각했습니다."]],
   "victims":[{"alias":"10대 여성 피해자","count":1,"status":"DECEASED","gender":"FEMALE"}],
   "suspects":[{"name":"박대성","status":"CONVICTED","charges":"살인, 살인예비","sentences":[{"court":"SUPREME","courtName":"대법원","type":"LIFE","penalty":"무기징역","verdict":"상고를 기각했습니다.","final":true,"date":"2025-08-14"}]}],
   "questions":["무차별 범죄를 막으려면 무엇이 달라져야 할까요?"]},
  {"slug":"gwangju-student-murder-2026","title":"광주 여고생 납치 살해 사건","summary":"귀가하던 고등학생을 납치해 살해하고 도우러 온 학생까지 공격한 혐의로 항소심 재판이 진행 중인 사건입니다.","overview":"2026년 5월 5일 새벽 광주 광산구 월계동 거리에서 20대 남성이 귀가하던 고등학생을 납치해 성폭행하려다 살해하고, 비명을 듣고 달려온 남학생에게도 흉기를 휘두른 혐의로 기소됐습니다. 1심은 무기징역을 선고했고 검찰과 피고인이 모두 항소해 재판이 이어지고 있습니다.","country":"KR","category":"MURDER","status":"IN_PROGRESS","location":"광주광역시 광산구 월계동","at":"2026-05-05","precision":"DAY",
   "timeline":[["2026-05-05","DAY","고등학생 납치 살해","도우러 온 남학생도 흉기로 공격당했습니다."],["2026-09-30","DAY","1심 무기징역","광주지법이 전자장치 부착 30년 등을 함께 명령했습니다."],["2026-10-07","DAY","쌍방 항소","검찰이 2일, 피고인이 7일 항소했습니다."]],
   "victims":[{"alias":"고등학생 피해자","count":1,"status":"DECEASED","gender":"FEMALE"},{"alias":"구조에 나선 남학생","count":1,"status":"INJURED","gender":"MALE"}],
   "suspects":[{"alias":"20대 남성 피고인","status":"INDICTED","charges":"성폭력처벌법 위반(강간 등 살인) 등","sentences":[{"court":"FIRST","courtName":"광주지방법원","type":"LIFE","penalty":"무기징역","verdict":"항소심이 진행 중입니다.","final":false,"date":"2026-09-30"}]}],
   "questions":["늦은 시간 귀가하는 청소년의 안전을 지키려면 무엇이 필요할까요?"]},
  {"slug":"gangbuk-motel-drug-murders","title":"강북 모텔 약물 연쇄살인 사건","summary":"약물을 탄 음료로 남성 2명을 숨지게 하고 다른 남성들을 다치게 한 혐의의 사건으로, 항소심이 진행 중입니다.","overview":"20대 여성이 2025년 12월부터 2026년 2월 사이 서울 강북구 모텔 등에서 벤조디아제핀계 약물을 탄 음료를 남성들에게 건네 2명을 숨지게 하고 다른 피해자들을 다치게 한 혐의로 기소됐습니다. 1심은 살인의 미필적 고의를 인정해 무기징역을 선고했고, 피고인 측은 항소심에서도 살해 의도를 부인하고 있습니다.","country":"KR","category":"MURDER","status":"IN_PROGRESS","location":"서울특별시 강북구","at":"2025-12-01","precision":"MONTH",
   "timeline":[["2025-12-01","MONTH","첫 범행","약물을 탄 음료를 남성에게 건넨 혐의를 받습니다."],["2026-08-27","DAY","1심 무기징역","서울북부지법이 전자장치 부착 30년을 함께 명령했습니다. 특수상해 1건은 무죄로 판단했습니다."],["2026-09-02","DAY","쌍방 항소","검찰과 피고인이 모두 항소했습니다."]],
   "victims":[{"alias":"사망 피해자","count":2,"status":"DECEASED","gender":"MALE"},{"alias":"상해 피해자","count":4,"status":"INJURED","gender":"MALE"}],
   "suspects":[{"alias":"20대 여성 피고인","status":"INDICTED","charges":"살인, 특수상해, 마약류관리법 위반","sentences":[{"court":"FIRST","courtName":"서울북부지방법원","type":"LIFE","penalty":"무기징역","verdict":"항소심이 진행 중입니다.","final":false,"date":"2026-08-27"}]}],
   "questions":["약물을 이용한 범죄를 예방하려면 무엇이 필요할까요?"]},
  {"slug":"pocheon-schoolgirl-murder","title":"포천 여중생 살인 사건","summary":"실종 약 석 달 뒤 배수로에서 발견된 여중생의 손발톱에 붉은 매니큐어가 칠해져 있던 미제 사건","overview":"2003년 11월 5일 경기 포천에서 중학생이 곧 집에 돌아가겠다고 어머니에게 연락한 뒤 실종됐습니다. 2004년 2월 8일 포천시 소흘읍 도로변 배수로에서 시신으로 발견됐는데, 평소 쓰지 않던 붉은 매니큐어가 손발톱에 칠해져 있었습니다. 범인은 아직 밝혀지지 않았습니다.","country":"KR","category":"MURDER","status":"UNSOLVED","location":"경기도 포천시 소흘읍","at":"2003-11-05","precision":"DAY",
   "timeline":[["2003-11-05","DAY","귀가 연락 뒤 실종","어머니와 통화한 뒤 연락이 끊겼습니다."],["2004-02-08","DAY","배수로에서 시신 발견","도로변 배수로를 막은 상자를 살피던 중 발견됐습니다."]],
   "victims":[{"alias":"중학생 피해자","count":1,"status":"DECEASED","gender":"FEMALE"}],
   "suspects":[{"alias":"신원 미상","status":"AT_LARGE","charges":"살인"}],
   "questions":["피해자의 손발톱에 매니큐어를 칠한 사람은 누구일까요?","실종 뒤 석 달 동안 피해자는 어디에 있었을까요?"],
   "circumstances":[["붉은 매니큐어","평소 매니큐어를 쓰지 않던 피해자의 손발톱에 칠해져 있었습니다."],["TV 상자로 막힌 배수로","시신이 발견된 배수로 입구를 대형 TV 상자가 막고 있었습니다."]]},
  {"slug":"idaho-student-murders","title":"아이다호 대학생 살인 사건","summary":"미국 아이다호 대학가 주택에서 대학생 4명이 새벽에 살해된 사건","overview":"2022년 11월 13일 새벽 미국 아이다호주 모스코의 대학가 주택에서 아이다호대 학생 4명이 흉기에 살해됐습니다. 범죄학 박사과정생 브라이언 코버거가 체포됐고, 2025년 사형을 피하는 조건으로 유죄를 인정해 가석방 없는 종신형 4회를 선고받았습니다. 범행 동기는 밝혀지지 않았습니다.","country":"US","category":"MURDER","status":"SOLVED","location":"미국 아이다호주 모스코","at":"2022-11-13","precision":"DAY","solved":"2025-07-23",
   "timeline":[["2022-11-13","DAY","대학생 4명 피살","새벽 시간 주택에 침입한 범인에게 살해됐습니다."],["2022-12-30","DAY","펜실베이니아에서 체포","부모 집에서 체포됐습니다."],["2025-07-02","DAY","유죄 인정","사형을 피하는 조건으로 살인 4건과 주거침입을 인정했습니다."],["2025-07-23","DAY","종신형 선고","가석방 없는 종신형 4회와 주거침입 징역 10년을 선고받았습니다."]],
   "victims":[{"name":"Madison Mogen","status":"DECEASED","gender":"FEMALE"},{"name":"Kaylee Goncalves","status":"DECEASED","gender":"FEMALE"},{"name":"Xana Kernodle","status":"DECEASED","gender":"FEMALE"},{"name":"Ethan Chapin","status":"DECEASED","gender":"MALE"}],
   "suspects":[{"name":"Bryan Kohberger","status":"CONVICTED","charges":"1급 살인 4건, 주거침입","sentences":[{"court":"FIRST","courtName":"아이다호주 법원","type":"LIFE","penalty":"가석방 없는 종신형 4회","verdict":"유죄 인정 합의에 따라 항소권을 포기했습니다.","final":true,"date":"2025-07-23"}]}],
   "questions":["혼자 또는 친구들끼리 사는 대학가 주택이 밤사이 더 안전하려면 무엇이 필요할까요?","갑작스럽게 가족과 친구를 잃은 사람들, 함께 지내던 학생들에게는 어떤 지원이 필요할까요?"]},
  {"slug":"gilgo-beach-serial-killings","title":"길고 비치 연쇄살인 사건","summary":"미국 롱아일랜드 해변에서 시신이 잇따라 발견된 뒤 10여 년 만에 범인이 유죄를 인정한 사건","overview":"2010년 12월 미국 뉴욕주 롱아일랜드 길고 비치 일대에서 여성들의 시신이 잇따라 발견됐습니다. 2023년 건축가 렉스 호이어만이 체포됐고, 2026년 4월 7건의 살인에 유죄를 인정하고 기소되지 않은 1건도 시인했습니다. 같은 해 6월 가석방 없는 종신형을 선고받았습니다.","country":"US","category":"MURDER","status":"SOLVED","location":"미국 뉴욕주 롱아일랜드 길고 비치","at":"2010-12-01","precision":"MONTH","solved":"2026-06-17",
   "timeline":[["2010-12-01","MONTH","해변에서 시신 발견","실종 여성을 수색하던 중 시신들이 발견됐습니다."],["2023-07-01","MONTH","렉스 호이어만 체포","건축가인 용의자가 체포됐습니다."],["2026-04-08","DAY","유죄 인정","여성 8명을 살해했다고 시인했습니다."],["2026-06-17","DAY","종신형 선고","가석방 없는 종신형을 선고받았습니다."]],
   "victims":[{"alias":"여성 피해자","count":8,"status":"DECEASED","gender":"FEMALE"}],
   "suspects":[{"name":"Rex Heuermann","status":"CONVICTED","charges":"연쇄살인","sentences":[{"court":"FIRST","courtName":"뉴욕주 서퍽 카운티 법원","type":"LIFE","penalty":"가석방 없는 종신형","verdict":"피고인이 유죄를 인정했습니다.","final":true,"date":"2026-06-17"}]}],
   "questions":["길고 비치에서 발견된 다른 유해의 범인은 누구일까요?"]},
  {"slug":"delphi-murders","title":"델파이 소녀 살인 사건","summary":"미국 인디애나 산책로에서 10대 소녀 2명이 살해된 사건으로, 항소심 판결을 기다리고 있습니다.","overview":"2017년 2월 미국 인디애나주 델파이의 산책로에서 10대 소녀 2명이 살해됐습니다. 피해자의 휴대전화에 남은 영상과 음성이 수사의 핵심 단서가 됐습니다. 리처드 앨런이 2024년 유죄 평결을 받고 징역 130년을 선고받았으며, 인디애나 항소법원이 2026년 9월 구두 변론을 마치고 판단을 앞두고 있습니다.","country":"US","category":"MURDER","status":"IN_PROGRESS","location":"미국 인디애나주 델파이","at":"2017-02-13","precision":"DAY",
   "timeline":[["2017-02-13","DAY","10대 소녀 2명 실종","산책로에 간 뒤 연락이 끊기고 다음 날 시신으로 발견됐습니다."],["2024-11-11","DAY","리처드 앨런 유죄 평결","배심원단이 살인 혐의를 유죄로 판단했습니다."],["2024-12-01","MONTH","징역 130년 선고","피해자 1명당 65년씩 선고됐습니다."],["2026-09-21","DAY","항소심 구두 변론","인디애나 항소법원이 사건을 심리했습니다."]],
   "victims":[{"name":"Abigail Williams","age":13,"status":"DECEASED","gender":"FEMALE"},{"name":"Liberty German","age":14,"status":"DECEASED","gender":"FEMALE"}],
   "suspects":[{"name":"Richard Allen","status":"INDICTED","charges":"살인","sentences":[{"court":"FIRST","courtName":"인디애나주 법원","type":"IMPRISONMENT","penalty":"징역 130년","verdict":"항소심 판결을 기다리고 있습니다.","final":false}]}],
   "questions":["아이들이 위험한 순간에 도움을 요청하고 주변에 알리는 방법은 어떻게 가르쳐야 할까요?","아이들이 자주 다니는 산책로나 외진 장소를 더 안전하게 만들려면 무엇이 필요할까요?","제보가 수천 건씩 몰리는 사건에서 중요한 제보를 놓치지 않으려면 어떤 체계가 필요할까요?","사건에 관심이 몰리면서 온라인 추측과 자료 유출이 이어졌습니다. 이런 일이 수사와 재판, 유족에게 주는 피해를 줄이려면 무엇이 필요할까요?"]},
  {"slug":"kyoto-animation-arson","title":"교토 애니메이션 방화 사건","summary":"애니메이션 스튜디오에 불을 질러 36명이 숨지고 32명이 다친 사건","overview":"2019년 7월 18일 일본 교토시 후시미구의 교토 애니메이션 제1스튜디오에 아오바 신지가 휘발유를 뿌리고 불을 질렀습니다. 직원 36명이 숨지고 32명이 다쳤습니다. 2024년 1심에서 사형을 선고받았고, 2025년 항소를 취하해 형이 확정됐습니다. 오사카고등법원은 2026년 3월 항소 취하가 유효하다고 판단했습니다.","country":"JP","category":"ARSON","status":"SOLVED","location":"일본 교토부 교토시 후시미구","at":"2019-07-18","precision":"DAY","solved":"2025-01-27",
   "timeline":[["2019-07-18","DAY","스튜디오 방화","휘발유를 뿌리고 불을 질러 68명이 피해를 입었습니다."],["2024-01-25","DAY","1심 사형 선고","교토지방재판소가 사형을 선고했습니다."],["2025-01-27","DAY","항소 취하","피고인이 항소를 취하해 사형이 확정됐습니다."],["2026-03-17","DAY","항소 취하 유효 판단","오사카고등재판소가 변호인의 이의를 받아들이지 않았습니다."]],
   "victims":[{"alias":"사망 피해자","count":36,"status":"DECEASED"},{"alias":"부상 피해자","count":32,"status":"INJURED"}],
   "suspects":[{"name":"青葉真司 (아오바 신지)","status":"CONVICTED","charges":"살인, 방화 등","sentences":[{"court":"FIRST","courtName":"교토지방재판소","type":"DEATH","penalty":"사형","verdict":"피고인이 항소를 취하해 확정됐습니다.","final":true,"date":"2024-01-25"}]}],
   "questions":["건물 화재 피해를 줄이려면 어떤 대비가 필요할까요?"]},
  {"slug":"shinzo-abe-assassination","title":"아베 신조 전 총리 피격 사건","summary":"유세 중이던 아베 신조 전 일본 총리가 사제 총에 맞아 숨진 사건으로, 항소심이 진행 중입니다.","overview":"2022년 7월 8일 일본 나라시에서 참의원 선거 지원 유세를 하던 아베 신조 전 총리가 사제 총에 맞아 숨졌습니다. 야마가미 데쓰야는 살인 등의 혐의로 기소됐습니다. 2026년 1월 나라지방재판소는 무기징역을 선고했고, 변호인은 가정 환경과 종교 문제를 충분히 고려하지 않았다며 오사카고등재판소에 항소했습니다.","country":"JP","category":"MURDER","status":"IN_PROGRESS","location":"일본 나라현 나라시","at":"2022-07-08","precision":"DAY",
   "timeline":[["2022-07-08","DAY","유세 현장 피격","사제 총에 맞아 숨졌습니다."],["2026-01-21","DAY","1심 무기징역","나라지방재판소가 무기징역을 선고했습니다."],["2026-02-04","DAY","변호인 항소","오사카고등재판소에 항소했습니다."]],
   "victims":[{"name":"아베 신조","status":"DECEASED","gender":"MALE"}],
   "suspects":[{"name":"山上徹也 (야마가미 데쓰야)","status":"INDICTED","charges":"살인, 총포도검류 소지 위반 등","sentences":[{"court":"FIRST","courtName":"나라지방재판소","type":"LIFE","penalty":"무기징역","verdict":"항소심이 진행 중입니다.","final":false,"date":"2026-01-21"}]}],
   "questions":["공개 행사에서 참석자의 안전을 지키려면 어떤 대비가 필요할까요?"]},
  {"slug":"southport-dance-class-attack","title":"사우스포트 댄스 교실 흉기 난동 사건","summary":"영국 어린이 댄스 교실에서 3명이 숨지고 10명이 다친 사건","overview":"2024년 7월 29일 영국 사우스포트의 어린이 댄스 교실에서 당시 17세였던 액슬 루다쿠바나가 흉기를 휘둘러 어린이 3명이 숨지고 어린이 8명과 어른 2명이 다쳤습니다. 2025년 1월 최소 복역 52년의 종신형을 선고받았고, 사전 위험 신호를 놓친 경위를 조사하는 공개 조사가 진행됐습니다.","country":"GB","category":"MURDER","status":"SOLVED","location":"영국 머지사이드주 사우스포트","at":"2024-07-29","precision":"DAY","solved":"2025-01-23",
   "timeline":[["2024-07-29","DAY","댄스 교실 공격","어린이 3명이 숨지고 10명이 다쳤습니다."],["2025-01-23","DAY","종신형 선고","최소 복역 기간 52년을 선고받았습니다."]],
   "victims":[{"alias":"사망한 어린이","count":3,"status":"DECEASED","gender":"FEMALE"},{"alias":"부상 피해자","count":10,"status":"INJURED"}],
   "suspects":[{"name":"Axel Rudakubana","status":"CONVICTED","charges":"살인 3건, 살인미수 10건 등","sentences":[{"court":"FIRST","courtName":"리버풀 형사법원","type":"LIFE","penalty":"종신형 (최소 복역 52년)","verdict":"피고인이 유죄를 인정했습니다.","final":true,"date":"2025-01-23"}]}],
   "questions":["위험 신고가 반복될 때 기관들은 어떻게 함께 대응해야 할까요?"]},
  {"slug":"madeleine-mccann-disappearance","title":"매들린 매캔 실종 사건","summary":"포르투갈 휴양지에서 세 살 영국 아이가 사라진 뒤 지금까지 행방을 찾지 못한 사건","overview":"2007년 5월 3일 포르투갈 프라이아 다 루스의 휴양지 숙소에서 영국인 아이 매들린 매캔이 사라졌습니다. 독일과 영국 수사당국은 독일인 남성을 용의자로 지목했지만, 그는 이 사건으로 기소된 적이 없고 혐의를 부인하고 있습니다. 아이의 행방은 아직 밝혀지지 않았습니다.","country":"GB","category":"MISSING","status":"UNSOLVED","location":"포르투갈 프라이아 다 루스","at":"2007-05-03","precision":"DAY",
   "timeline":[["2007-05-03","DAY","숙소에서 실종","부모가 근처에서 식사하는 동안 사라졌습니다."],["2026-06-01","MONTH","영국 수사팀에 새 자료 전달","용의자 관련 자료가 전달됐다고 보도됐습니다."]],
   "victims":[{"name":"Madeleine McCann","age":3,"status":"MISSING","gender":"FEMALE"}],
   "suspects":[{"alias":"독일인 남성 (미기소)","status":"SUSPECTED","description":"수사당국이 용의자로 지목했으나 기소되지 않았고 본인은 혐의를 부인했습니다."}],
   "questions":["매들린은 그날 밤 어떻게 사라졌을까요?","수사당국은 기소할 증거를 확보할 수 있을까요?"],
   "circumstances":[["잠긴 숙소에서의 실종","가족이 잠시 자리를 비운 사이 아이가 사라졌습니다."]]},
  {"slug":"baiyin-serial-murders","title":"바이인 연쇄살인 사건","summary":"중국 간쑤성과 내몽골에서 여성 11명을 살해한 범인이 DNA로 28년 만에 붙잡힌 사건","overview":"1988년부터 2002년까지 중국 간쑤성 바이인과 내몽골 바오터우에서 여성 11명이 살해됐습니다. 2016년 8월 26일 범인 가오청융의 친척이 다른 사건으로 DNA를 채취당하면서 단서가 나와 체포됐습니다. 그는 사형을 선고받았고 2019년 1월 3일 형이 집행됐습니다.","country":"CN","category":"MURDER","status":"SOLVED","location":"중국 간쑤성 바이인, 내몽골 바오터우","at":"1988-01-01","precision":"YEAR","solved":"2016-08-26",
   "timeline":[["1988-01-01","YEAR","첫 범행","이후 2002년까지 범행이 이어졌습니다."],["2016-08-26","DAY","가오청융 체포","친척의 DNA를 단서로 붙잡혔습니다."],["2019-01-03","DAY","사형 집행","중국 공안부가 집행 사실을 발표했습니다."]],
   "victims":[{"alias":"여성 피해자","count":11,"status":"DECEASED","gender":"FEMALE"}],
   "suspects":[{"name":"高承勇 (가오청융)","status":"CONVICTED","charges":"강도, 강간, 살인","sentences":[{"court":"FIRST","courtName":"바이인시 중급인민법원","type":"DEATH","penalty":"사형","verdict":"2019년 1월 3일 형이 집행됐습니다.","final":true}]}],
   "questions":["가족 DNA 수사는 어디까지 허용돼야 할까요?"]}
  ]$json$::jsonb) LOOP
    DELETE FROM cases WHERE slug = item->>'slug';

    INSERT INTO cases (id, slug, title, summary, overview, country, category, status, location, occurred_at, occurred_at_precision, solved_at, is_published, review_status, updated_at)
    VALUES (gen_random_uuid(), item->>'slug', item->>'title', item->>'summary', item->>'overview',
      (item->>'country')::"Country", (item->>'category')::"CaseCategory", (item->>'status')::"CaseStatus", item->>'location',
      (item->>'at')::date, (item->>'precision')::"DatePrecision", (item->>'solved')::date, true, 'NEEDS_REVIEW', now())
    RETURNING id INTO new_case;

    ord := 0;
    FOR row_item IN SELECT value FROM jsonb_array_elements(item->'timeline') LOOP
      INSERT INTO timeline_events (id, case_id, occurred_at, occurred_at_precision, title, description, sort_order, updated_at)
      VALUES (gen_random_uuid(), new_case, ((row_item->>0) || ' 12:00:00+09')::timestamptz, (row_item->>1)::"DatePrecision", row_item->>2, row_item->>3, ord, now());
      ord := ord + 1;
    END LOOP;

    ord := 0;
    FOR row_item IN SELECT value FROM jsonb_array_elements(item->'victims') LOOP
      FOR i IN 1..COALESCE((row_item->>'count')::int, 1) LOOP
        INSERT INTO victims (id, case_id, name, alias, age, gender, status, sort_order, updated_at)
        VALUES (gen_random_uuid(), new_case, row_item->>'name',
          CASE WHEN COALESCE((row_item->>'count')::int, 1) > 1 THEN (row_item->>'alias') || ' ' || i ELSE row_item->>'alias' END,
          (row_item->>'age')::smallint, COALESCE(row_item->>'gender', 'UNKNOWN')::"Gender", (row_item->>'status')::"VictimStatus", ord, now());
        ord := ord + 1;
      END LOOP;
    END LOOP;

    ord := 0;
    FOR row_item IN SELECT value FROM jsonb_array_elements(item->'suspects') LOOP
      INSERT INTO suspects (id, case_id, name, alias, description, charges, status, sort_order, updated_at)
      VALUES (gen_random_uuid(), new_case, row_item->>'name', row_item->>'alias', row_item->>'description', row_item->>'charges',
        (row_item->>'status')::"SuspectStatus", ord, now())
      RETURNING id INTO new_suspect;
      FOR sentence_item IN SELECT value FROM jsonb_array_elements(COALESCE(row_item->'sentences', '[]'::jsonb)) LOOP
        INSERT INTO sentences (id, suspect_id, court_level, court_name, type, verdict, penalty, is_final, decided_at, updated_at)
        VALUES (gen_random_uuid(), new_suspect, (sentence_item->>'court')::"CourtLevel", sentence_item->>'courtName',
          (sentence_item->>'type')::"SentenceType", sentence_item->>'verdict', sentence_item->>'penalty',
          (sentence_item->>'final')::boolean, (sentence_item->>'date')::date, now());
      END LOOP;
      ord := ord + 1;
    END LOOP;

    ord := 0;
    FOR row_item IN SELECT value FROM jsonb_array_elements(COALESCE(item->'questions', '[]'::jsonb)) LOOP
      INSERT INTO unsolved_questions (id, case_id, question, sort_order, updated_at)
      VALUES (gen_random_uuid(), new_case, row_item #>> '{}', ord, now());
      ord := ord + 1;
    END LOOP;

    ord := 0;
    FOR row_item IN SELECT value FROM jsonb_array_elements(COALESCE(item->'circumstances', '[]'::jsonb)) LOOP
      INSERT INTO suspicious_circumstances (id, case_id, title, description, sort_order, updated_at)
      VALUES (gen_random_uuid(), new_case, row_item->>0, row_item->>1, ord, now());
      ord := ord + 1;
    END LOOP;
  END LOOP;
END
$seed$;

COMMIT;
