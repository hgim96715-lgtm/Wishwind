/** 개발 환경에서만 초안을 볼 수 있음. production에서는 SHOW_DRAFTS 값과 무관하게 항상 false */
export function draftsVisible(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV !== 'production' && env.SHOW_DRAFTS === 'true';
}
