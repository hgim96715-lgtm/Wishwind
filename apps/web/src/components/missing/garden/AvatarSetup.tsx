"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuX } from "react-icons/lu";
import { fetchCharacters, type CharacterOption } from "./Avatar";

// three를 쓰는 미리보기는 고르기 화면이 열릴 때만 받음
const CharacterPreview = dynamic(() => import("./CharacterPreview"), { ssr: false });

export interface AvatarChoice {
  /** 고른 캐릭터 모델 주소 (파일이 없으면 null → 임시 캐릭터) */
  url: string | null;
  nickname: string;
}

const STORAGE_KEY = "missing-garden-avatar-v2";

/** 개발 모드 '다른 사람으로 보기' 중이면 그 사람 몫의 칸을 따로 씀 → 처음 온 사람처럼 캐릭터 고르기가 나옴 */
function storageKey() {
  const viewer = document.cookie.match(/(?:^|; )dev_viewing_as_other=([^;]+)/)?.[1];
  return viewer ? `${STORAGE_KEY}:dev-${viewer}` : STORAGE_KEY;
}
// 연락처·링크를 닉네임에 넣지 못하게 함 (실종자들의 정원은 아이들도 보는 곳)
const BAD = /(https?:|www\.|\.com|\.kr|\d{3,}|카톡|오픈채팅|텔레|line|discord)/i;

export function loadAvatar(): AvatarChoice | null {
  try {
    const v = JSON.parse(localStorage.getItem(storageKey()) ?? "null") as AvatarChoice | null;
    return v && typeof v.nickname === "string" && (v.url === null || typeof v.url === "string") ? v : null;
  } catch {
    return null;
  }
}

function saveAvatar(v: AvatarChoice) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(v));
  } catch {
    /* 저장이 막혀도 이번 방문에서는 그대로 씀 */
  }
}

/** 처음 들어올 때 캐릭터와 닉네임을 고름. 이 브라우저에만 저장 */
export function AvatarSetup({
  initial,
  onDone,
  accountNickname = null,
  forWish = false,
}: {
  initial: AvatarChoice | null;
  onDone: (v: AvatarChoice) => void;
  /** 로그인했으면 계정 닉네임을 그대로 쓰고 여기서는 바꾸지 않음 ('○○님의 기록'에서 바꿈) */
  accountNickname?: string | null;
  /** 닉네임 없이 둘러보다 바람개비를 꽂으려 할 때 */
  forWish?: boolean;
}) {
  const dialog=useRef<HTMLDivElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();return()=>previous?.focus();},[]);
  const [options, setOptions] = useState<CharacterOption[] | null>(null);
  const [index, setIndex] = useState(0);
  const [nickname, setNickname] = useState(initial?.nickname ?? "");

  useEffect(() => {
    let alive = true;
    fetchCharacters().then((list) => {
      if (!alive) return;
      setOptions(list);
      const i = list.findIndex((c) => c.url === initial?.url);
      setIndex(i >= 0 ? i : 0);
    });
    return () => {
      alive = false;
    };
  }, [initial?.url]);

  const current = options?.[index] ?? null;
  const allUrls = useMemo(() => (options ?? []).map((c) => c.url), [options]);
  const count = options?.length ?? 0;
  const step = (d: number) => count && setIndex((i) => (i + d + count) % count);

  const name = (accountNickname ?? nickname).trim();
  // 계정 닉네임은 서버에서 이미 검사했으므로 다시 막지 않음 ('바람 766'의 숫자가 연락처로 오인되던 문제)
  const error = accountNickname
    ? null
    : name.length > 0 && (name.length < 2 ? "두 글자 이상 써 주세요." : BAD.test(name) ? "연락처나 링크는 닉네임에 쓸 수 없습니다." : null);
  const ok = name.length >= 2 && !error;

  /** 닫기(X): 고르던 중이면 그대로 두고, 처음이면 지금 보이는 캐릭터로 이름 없이 둘러봄 (저장하지 않아 다음에 다시 물어봄) */
  const close = () =>
    onDone(initial ?? { url: current?.url ?? null, nickname: accountNickname ?? "" });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <motion.div
      ref={dialog}
      onKeyDown={e=>{if(e.key!=="Tab")return;const nodes=dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input,a[href]');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
      role="dialog"
      aria-modal="true"
      aria-label="캐릭터 고르기"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="garden-avatar-dialog absolute inset-x-4 top-1/2 z-40 mx-auto max-h-[90dvh] max-w-sm -translate-y-1/2 overflow-y-auto rounded-3xl border border-[#f1dfc4] bg-[#fffaf2]/95 p-6 shadow-[0_20px_60px_rgb(120_90_50/0.25)] backdrop-blur"
    >
      <button
        type="button"
        onClick={close}
        aria-label="닫기"
        className="absolute top-4 right-4 rounded-full p-1.5 text-[#9a8a76] hover:bg-black/5 hover:text-[#5b4d3c]"
      >
        <LuX aria-hidden className="size-5" />
      </button>
      <h2 className="pr-8 text-lg font-semibold">{forWish ? "바람개비에 남길 이름을 정해 주세요" : "바람개비 정원에 오신 걸 환영합니다"}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        {forWish
          ? "바람개비를 꽂으면 다른 분들에게 '○○님이 바람개비를 꽂았습니다'로 알려집니다. 닉네임을 정하면 바로 꽂을 수 있습니다."
          : "정원을 걸으며 바람개비에 담긴 이야기를 만나고 응원의 바람을 보내세요. 함께 걸을 캐릭터와 닉네임을 고를 수 있습니다."}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <button type="button" aria-label="이전 캐릭터" onClick={() => step(-1)} disabled={count < 2} className="rounded-full bg-white p-2 shadow-sm disabled:opacity-30">
          <LuChevronLeft aria-hidden className="size-5" />
        </button>
        <div className="garden-avatar-preview h-44 flex-1 overflow-hidden rounded-2xl bg-gradient-to-b from-[#dff0fb] to-[#f3f9e8]">
          {options && <CharacterPreview url={current?.url ?? null} all={allUrls} />}
        </div>
        <button type="button" aria-label="다음 캐릭터" onClick={() => step(1)} disabled={count < 2} className="rounded-full bg-white p-2 shadow-sm disabled:opacity-30">
          <LuChevronRight aria-hidden className="size-5" />
        </button>
      </div>
      <p className="mt-1 text-center text-xs text-subtle" aria-live="polite">
        {options === null ? "캐릭터를 불러오는 중…" : count ? `${index + 1} / ${count}` : "캐릭터 파일이 아직 없어 임시 캐릭터로 걷습니다"}
      </p>

      <label className="mt-4 block text-sm font-medium" htmlFor="nickname">
        닉네임
      </label>
      {accountNickname ? (
        <>
          <p id="nickname" className="mt-1 rounded-xl border border-[#ecdcc4] bg-white/60 px-3 py-2 text-sm">
            {accountNickname}
          </p>
          <p className="mt-1 text-xs text-[#a08b72]">로그인 닉네임입니다. {accountNickname}님의 기록에서 바꿀 수 있습니다.</p>
        </>
      ) : (
        <input
          id="nickname"
          value={nickname}
          maxLength={10}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="2~10자"
          className="mt-1 w-full rounded-xl border border-[#ecdcc4] bg-white px-3 py-2 text-sm outline-none focus:border-[#e9a94f]"
        />
      )}
      {error && <p className="mt-1 text-xs text-[#b5563c]">{error}</p>}
      <button
        type="button"
        disabled={!ok || options === null}
        onClick={() => {
          const v = { url: current?.url ?? null, nickname: name };
          saveAvatar(v);
          onDone(v);
        }}
        className="garden-primary-action mt-5 w-full rounded-full bg-[#e9a94f] py-3 font-medium text-white transition-opacity disabled:opacity-40"
      >
        {forWish ? "바람개비 꽂으러 가기" : "정원으로 가기"}
      </button>
      <LoginHint />
    </motion.div>
  );
}

/** 로그인하지 않은 사람에게만 작게 보여 줌. 로그인은 선택이라 "정원으로 가기"보다 눈에 덜 띄게 */
function LoginHint() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/auth/status", { signal: ac.signal })
      .then((r) => r.json() as Promise<{ loggedIn: boolean }>)
      .then((r) => setLoggedIn(r.loggedIn))
      .catch(() => {});
    return () => ac.abort();
  }, []);
  if (loggedIn !== false) return null;
  return (
    <div className="mt-3 text-center">
      <Link
        href="/login?next=/missing"
        className="flex w-full items-center justify-center rounded-full border border-[#e6d3b3] bg-white/70 py-2.5 text-sm font-medium text-[#9a6a2c] transition-colors hover:bg-white"
      >
        로그인하러 가기
      </Link>
      <p className="mt-2 text-xs break-keep text-[#a08b72]">선택 사항 · 다른 기기에서도 기록이 이어집니다</p>
    </div>
  );
}
