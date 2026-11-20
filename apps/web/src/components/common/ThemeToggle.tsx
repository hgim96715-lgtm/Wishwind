"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
export const THEME_KEY = "theme";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function savedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/** 바람개비 손잡이. 스위치를 옮길 때 한 바퀴 돎 */
function Pinwheel({ dark }: { dark: boolean }) {
  const blade = dark ? "#f4e7c4" : "#c46a4b";
  const blade2 = dark ? "#c9b98f" : "#e8a24a";
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M12 12 L12 3 Q17 4 12 12Z" fill={blade} />
      <path d="M12 12 L21 12 Q20 17 12 12Z" fill={blade2} />
      <path d="M12 12 L12 21 Q7 20 12 12Z" fill={blade} />
      <path d="M12 12 L3 12 Q4 7 12 12Z" fill={blade2} />
      <circle cx="12" cy="12" r="1.6" fill={dark ? "#1c1a17" : "#fffaf2"} />
    </svg>
  );
}

/** 낮·밤 전환 스위치. 고른 값은 이 브라우저에 기억됨 (고르기 전엔 폰 설정 따름) */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    const id = requestAnimationFrame(() => setAnimate(true));

    // 직접 고르기 전에는 폰 설정이 바뀌면 따라감
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (savedTheme()) return;
      const next = systemTheme();
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    mq.addEventListener("change", onChange);
    return () => {
      cancelAnimationFrame(id);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  const dark = theme === "dark";

  const toggle = () => {
    const next: Theme = dark ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 이번 화면에서만 적용 */
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 text-xs ${className}`}>
      <span className={dark ? "text-subtle" : "font-semibold text-foreground"}>낮</span>
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="밤 화면으로 보기"
        onClick={toggle}
        className={`theme-switch relative h-7 w-[54px] shrink-0 rounded-full border ${
          dark ? "border-[#3d4a63] bg-[#24304a]" : "border-[#e6cfa6] bg-[#f6e3bf]"
        } ${animate ? "transition-colors duration-300" : ""} ${theme ? "" : "invisible"}`}
      >
        {/* 밤에만 보이는 작은 별 */}
        <span
          aria-hidden="true"
          className={`absolute left-2.5 top-2 h-[3px] w-[3px] rounded-full bg-[#f4e7c4] ${
            animate ? "transition-opacity duration-300" : ""
          } ${dark ? "opacity-90" : "opacity-0"}`}
        />
        <span
          aria-hidden="true"
          className={`absolute left-4 top-4 h-[2px] w-[2px] rounded-full bg-[#f4e7c4] ${
            animate ? "transition-opacity duration-300" : ""
          } ${dark ? "opacity-70" : "opacity-0"}`}
        />
        <span
          className={`absolute left-0.5 top-1/2 flex h-6 w-6 items-center justify-center rounded-full shadow-sm ${
            dark ? "bg-[#33405c]" : "bg-[#fffaf2]"
          } ${animate ? "transition-[transform,background-color] duration-500 ease-out motion-reduce:transition-none" : ""}`}
          style={{ transform: `translateY(-50%) translateX(${dark ? 24 : 0}px) rotate(${dark ? 360 : 0}deg)` }}
        >
          <Pinwheel dark={dark} />
        </span>
      </button>
      <span className={dark ? "font-semibold text-foreground" : "text-subtle"}>밤</span>
    </div>
  );
}

/** <head>에서 화면을 그리기 전에 실행 → 밤을 고른 사람에게 밝은 화면이 깜빡이지 않음 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;
