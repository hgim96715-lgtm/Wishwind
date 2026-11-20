/** CLAUDE_MODEL이 비었거나 맞지 않을 때 쓰는 모델 */
export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5-5';

/**
 * 글 검사·번역·생각 요약이 쓰는 설정(adaptive thinking, effort, 구조화 출력)을 받는 모델.
 * Haiku 4.5처럼 adaptive thinking·effort를 받지 않는 모델로 보내면 요청이 400으로 실패해
 * 모든 글이 '확인 중'에 멈추므로, 그런 값이면 기본 모델로 돌아감
 */
const SUPPORTED = /^claude-(?:(?:fable|mythos|opus|sonnet|haiku)-5(?:-\d+)?|opus-4-[678]|sonnet-4-6)$/;

/** .env의 CLAUDE_MODEL (예: claude-haiku-5-5). 비었거나 지원하지 않는 값이면 기본 모델 */
export function claudeModel(value = process.env.CLAUDE_MODEL): string {
  const model = value?.trim();
  return model && SUPPORTED.test(model) ? model : DEFAULT_CLAUDE_MODEL;
}

/** 서버 시작 때 한 번 알려 줄 경고 문구. 문제없으면 null */
export function claudeModelWarning(value = process.env.CLAUDE_MODEL): string | null {
  const model = value?.trim();
  if (!model || SUPPORTED.test(model)) return null;
  return `CLAUDE_MODEL=${model}은(는) adaptive thinking·effort를 받지 않아 쓸 수 없습니다. ${DEFAULT_CLAUDE_MODEL}로 동작합니다. claude-haiku-5-5를 권합니다.`;
}
