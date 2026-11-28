"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ko" | "en";

const LANG_KEY = "ww-lang";

interface LangCtxValue {
  lang: Lang;
  toggle: () => void;
}

const LangCtx = createContext<LangCtxValue>({ lang: "ko", toggle: () => {} });

export function HomeLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ko");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "ko" || saved === "en") setLang(saved);
    } catch {}
  }, []);

  const toggle = () =>
    setLang((l) => {
      const next: Lang = l === "ko" ? "en" : "ko";
      try {
        localStorage.setItem(LANG_KEY, next);
      } catch {}
      return next;
    });

  return <LangCtx.Provider value={{ lang, toggle }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);
