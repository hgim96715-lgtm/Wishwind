// 경찰청 5대 범죄 발생건수를 공공데이터포털 OpenAPI에서 받아 웹 통계 파일로 저장함
// 사용: pnpm stats:police  (apps/api/.env의 DATA_GO_KR_KEY 필요, 연 1회 갱신 자료라 새 값이 나오는 해에만 실행)
import { writeFileSync } from 'node:fs';

const NAMESPACE = '15083810/v1';
const OUT = new URL('../../web/src/lib/stats/police-counts.json', import.meta.url);
const LABELS = { '살인': '살인', '강도': '강도', '강간 강제추행': '강간·강제추행', '절도': '절도', '폭력': '폭력' };

let key = process.env.DATA_GO_KR_KEY?.trim();
if (!key) {
  console.error('DATA_GO_KR_KEY가 없습니다. apps/api/.env에 넣어 주세요.');
  process.exit(1);
}
// 인코딩된 키(%2B 등)를 그대로 붙여 넣어도 이중으로 인코딩되지 않게 함
if (/%[0-9a-f]{2}/i.test(key)) key = decodeURIComponent(key);

async function getJson(url, what) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${what} 요청 실패: HTTP ${res.status}`);
  return res.json();
}

try {
  // 요청 주소의 고유 번호는 문서(Swagger)에서 읽어 옴
  const oas = await getJson(`https://infuser.odcloud.kr/oas/docs?namespace=${NAMESPACE}`, 'API 문서');
  const path = Object.keys(oas.paths ?? {})[0];
  if (!path) throw new Error('API 문서에서 요청 주소를 찾지 못했습니다.');
  const base = (oas.servers?.[0]?.url ?? 'https://api.odcloud.kr/api').replace(/\/$/, '');
  const query = new URLSearchParams({ page: '1', perPage: '100', returnType: 'JSON', serviceKey: key });
  const body = await getJson(`${base}${path}?${query}`, '경찰청 5대 범죄');

  const rows = (body.data ?? []).map((row) => {
    const label = LABELS[row['구분']] ?? row['구분'];
    const values = Object.fromEntries(Object.entries(row).filter(([k, v]) => /^\d{4}$/.test(k) && typeof v === 'number'));
    return { label, values };
  });
  if (rows.length < 5 || rows.some((r) => Object.keys(r.values).length === 0)) {
    throw new Error(`예상과 다른 응답입니다. (행 ${rows.length}개) 저장하지 않았습니다.`);
  }

  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
  writeFileSync(OUT, `${JSON.stringify({ source: '경찰청 5대 범죄 발생건수(공공데이터포털)', fetchedAt: today, rows }, null, 2)}\n`);
  const years = rows.flatMap((r) => Object.keys(r.values)).sort();
  console.log(`저장했습니다: ${rows.map((r) => r.label).join(', ')} / ${years[0]}~${years.at(-1)}년`);
} catch (error) {
  console.error(`실패했습니다: ${error.cause?.code ?? error.message}`);
  console.error("인터넷 연결과 키, 승인 상태(공공데이터포털 마이페이지)를 확인해 주세요. 기존 파일은 바뀌지 않았습니다.");
  process.exit(1);
}
