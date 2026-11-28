"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LuHeartHandshake } from "react-icons/lu";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { RoomGrid } from "@/components/home/RoomGrid";
import { INSTAGRAM_URL } from "@/lib/site";

type Lang = "ko" | "en";

const KO = {
  headline: (
    <>
      작은 바람이 모이면,
      <br />
      바람개비가 돕니다.
    </>
  ),
  body: "지난 사건을 함께 기억하고, 실종된 사람이 돌아오기를, 같은 일이 다시 없기를 바랍니다.",
  tagline: "Wishwind는 바람(wind)과 바람(wish)을 함께 담은 이름입니다.",
  helpTitle: "도움이 필요할 때",
  helpSub: "신고·상담 번호를 상황별로 모았습니다",
  helpCTA: "도움받는 곳",
  emergencyLabel: "긴급",
  missingLabel: "실종",
  mentalLabel: "마음",
  instagram: "인스타그램 @wishwind.official",
};

const EN = {
  headline: (
    <>
      When small wishes gather,
      <br />
      the windmill turns.
    </>
  ),
  body: "We remember past incidents together, and wish for the missing to return — and for such things never to happen again.",
  tagline: "Wishwind holds both wind and wish in its name.",
  helpTitle: "Need help?",
  helpSub: "Emergency and support numbers, by situation",
  helpCTA: "Get help",
  emergencyLabel: "Emergency",
  missingLabel: "Missing",
  mentalLabel: "Crisis",
  instagram: "Instagram @wishwind.official",
};

function LangToggle({ lang, onToggle }: { lang: Lang; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={lang === "ko" ? "Switch to English" : "한국어로 보기"}
      className="inline-flex items-center rounded-full border border-line bg-transparent px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      {lang === "ko" ? "EN" : "한국어"}
    </button>
  );
}

export function HomeContent({ children, accountLink }: { children: React.ReactNode; accountLink?: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("ko");
  const t = lang === "ko" ? KO : EN;

  return (
    <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-16 pt-24">
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <LangToggle lang={lang} onToggle={() => setLang(lang === "ko" ? "en" : "ko")} />
        <ThemeToggle />
        {accountLink}
      </div>

      {/* Hero */}
      <section className="mb-10">
        <Image src="/wishwind-logo.png" alt="Wishwind" width={720} height={240} priority className="brand-logo h-12 w-auto md:h-14" />
        <h1 className="mt-4 text-3xl font-bold leading-snug tracking-tight md:text-4xl md:leading-tight">
          {t.headline}
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-muted">{t.body}</p>
        <p className="mt-2 text-xs text-subtle">{t.tagline}</p>
      </section>

      {children}

      {/* 3개 방 카드 */}
      <RoomGrid lang={lang} />

      {/* Help banner */}
      <div className="mt-10 flex flex-col gap-3 rounded-xl border border-[#d9cdb8] bg-[#fbf6ea] px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
        <Link href="/help" className="group flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-jade/15 text-jade-ink">
            <LuHeartHandshake aria-hidden className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold transition-colors group-hover:text-jade-ink">{t.helpTitle}</span>
            <span className="block text-xs text-muted">{t.helpSub}</span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { label: t.emergencyLabel, n: "112" },
            { label: t.missingLabel, n: "182" },
            { label: t.mentalLabel, n: "109" },
          ].map((c) => (
            <a
              key={c.n}
              href={`tel:${c.n}`}
              aria-label={`${c.label} ${c.n}`}
              className="rounded-full border border-jade/30 bg-white/70 px-2.5 py-1 text-jade-ink hover:bg-white"
            >
              {c.label} <span className="font-semibold tabular-nums">{c.n}</span>
            </a>
          ))}
          <Link
            href="/help"
            className="ml-auto inline-flex items-center gap-1 pl-1 font-medium text-jade-ink transition-opacity hover:opacity-70 sm:ml-2"
          >
            {t.helpCTA}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-10 flex justify-center border-t border-line pt-5 text-sm text-muted">
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener" className="transition-colors hover:text-foreground">
          {t.instagram}
        </a>
      </footer>
    </main>
  );
}
