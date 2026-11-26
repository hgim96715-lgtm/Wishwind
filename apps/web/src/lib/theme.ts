/** 테마 상수. 서버 컴포넌트(layout)에서도 문자열 그대로 쓰도록 "use client" 파일 밖에 둠 */
export const THEME_KEY = "theme";

/** 화면을 그리기 전에 실행 → 저장한 선택(없으면 기기 설정)을 적용. 정원 색상은 별도의 CSS 범위에서 처리 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;
