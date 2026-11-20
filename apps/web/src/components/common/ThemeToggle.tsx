"use client";

import { useEffect, useState } from "react";

export type ThemeChoice = "auto" | "light" | "dark";
export const THEME_KEY = "theme";
const LABEL: Record<ThemeChoice, string> = { auto: "자동", light: "밝게", dark: "어둡게" };

/** 고른 값(자동이면 폰 설정)에 따라 <html data-theme>를 바꿈. layout의 먼저 그리기 스크립트와 같은 규칙 */
function apply(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

/** 밝게·어둡게·자동 전환. 고른 값은 이 브라우저에 기억됨 (처음엔 자동 = 폰 설정 따름) */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [choice, setChoice] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    let saved: ThemeChoice = "auto";
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (v === "light" || v === "dark" || v === "auto") saved = v;
    } catch {
      /* 저장소를 못 쓰면 자동 */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(saved);
  }, []);

  // 자동일 때 폰 설정이 바뀌면 바로 따라감
  useEffect(() => {
    if (choice !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("auto");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  const choose = (next: ThemeChoice) => {
    setChoice(next);
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 이번 화면에서만 적용 */
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="화면 밝기"
      className={`inline-flex items-center rounded-full border border-line bg-surface p-0.5 text-xs ${className}`}
    >
      {(Object.keys(LABEL) as ThemeChoice[]).map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={choice === c}
          onClick={() => choose(c)}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            choice === c ? "bg-foreground text-background" : "text-muted hover:text-foreground"
          }`}
        >
          {LABEL[c]}
        </button>
      ))}
    </div>
  );
}

/** <head>에서 화면을 그리기 전에 실행 → 어두운 화면을 고른 사람에게 밝은 화면이 깜빡이지 않음 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')||'auto';var d=t==='dark'||(t==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;
