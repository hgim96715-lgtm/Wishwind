/**
 * 구름(응원 메시지) 전용 사전 검사. AI 검사 전에 걸러서 비용과 지연을 줄임.
 * - 목격 제보: 이곳에 남기면 실제 수사에 닿지 않음 → 공식 창구로 안내
 * - 죽음 단정·추모 표현: 가족에게 상처가 됨 → 돌아오길 바라는 말로 안내
 */
const SIGHTING = /(봤(어요|습니다|어|다)|목격|본\s*것\s*같|본\s*적\s*있|마주쳤|보였(어요|습니다)|있는\s*걸\s*봤)/;
const DEATH = /(명복|편히\s*쉬|하늘나라|고인|영면|소천|별이\s*되|무지개\s*다리|rest\s*in\s*peace|\brip\b)/i;

export type CloudFilterResult =
  | { ok: true }
  | { ok: false; category: 'SIGHTING' | 'DEATH'; message: string };

export function filterCloud(body: string): CloudFilterResult {
  if (SIGHTING.test(body)) {
    return {
      ok: false,
      category: 'SIGHTING',
      message: '목격하신 내용은 이곳 대신 182(국내) 또는 FBI 제보 창구로 알려 주세요. 그래야 실제로 찾는 데 쓰입니다.',
    };
  }
  if (DEATH.test(body)) {
    return {
      ok: false,
      category: 'DEATH',
      message: '이곳은 무사히 돌아오길 바라는 마음을 모으는 곳입니다. 돌아오길 바라는 말로 남겨 주세요.',
    };
  }
  return { ok: true };
}
