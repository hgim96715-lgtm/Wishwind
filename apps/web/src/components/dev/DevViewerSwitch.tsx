"use client";

import { useEffect, useState } from "react";

/**
 * 개발 모드에서만 보이는 "다른 사람으로 보기" 버튼.
 * 같은 브라우저에서는 내 글이 '내 노트'로만 보여서, 남에게 어떻게 보이는지(익명 이름·공감해요·잠금 안내) 확인하기 어려움.
 * 누르면 로그인 안 한 새 익명 사용자로 바뀌고(실종방 캐릭터·닉네임도 새로), "내 화면으로"를 누르면 원래대로 돌아옴. 운영 빌드에서는 그려지지 않음
 */
export function DevViewerSwitch() {
  const [viewing, setViewing] = useState<boolean | null>(null);
  useEffect(() => {
    // 쿠키는 마운트 후에만 읽을 수 있음
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewing(document.cookie.split("; ").some((c) => c.startsWith("dev_viewing_as_other=")));
  }, []);

  if (process.env.NODE_ENV !== "development" || viewing === null) return null;

  return (
    <div className="fixed right-3 bottom-3 z-[60] flex flex-col items-end gap-1.5">
      <ThemeSwitch />
    <form
      method="post"
      action="/dev/viewer"
      className="flex items-center gap-1 rounded-full border border-dashed border-[#c46a4b]/60 bg-white/90 p-1 text-xs shadow-sm backdrop-blur"
    >
      <span className="px-2 font-mono text-[10px] text-[#c46a4b]">DEV</span>
      {viewing ? (
        <>
          <span className="px-1 text-muted">다른 사람으로 보는 중</span>
          <button name="action" value="other" className="rounded-full px-2.5 py-1 hover:bg-black/5">
            또 다른 사람
          </button>
          <button name="action" value="back" className="rounded-full bg-foreground px-2.5 py-1 text-surface">
            내 화면으로
          </button>
        </>
      ) : (
        <button name="action" value="other" className="rounded-full px-2.5 py-1 hover:bg-black/5">
          다른 사람으로 보기
        </button>
      )}
    </form>
    </div>
  );
}

type Theme = "light" | "dark" | "system";
const THEME_KEY = "dev-theme";
const THEME_LABEL: Record<Theme, string> = { light: "라이트", dark: "다크", system: "폰 설정" };

/** 개발 중 다크/라이트 미리 보기. <html data-theme>를 바꾸고 이 브라우저에만 기억함 */
function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    let saved: Theme = "light";
    try {
      saved = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "light";
    } catch {
      /* 저장소를 못 쓰면 라이트 */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const choose = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 이번 화면에서만 적용 */
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-dashed border-[#c46a4b]/60 bg-white/90 p-1 text-xs shadow-sm backdrop-blur">
      <span className="px-2 font-mono text-[10px] text-[#c46a4b]">THEME</span>
      {(Object.keys(THEME_LABEL) as Theme[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => choose(t)}
          aria-pressed={theme === t}
          className={`rounded-full px-2.5 py-1 ${theme === t ? "bg-foreground text-surface" : "hover:bg-black/5"}`}
        >
          {THEME_LABEL[t]}
        </button>
      ))}
    </div>
  );
}
