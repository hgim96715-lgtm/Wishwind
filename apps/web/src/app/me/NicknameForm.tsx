"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/** 계정 닉네임 바꾸기. 실종자들의 정원 캐릭터 이름도 이 닉네임을 씀 */
export function NicknameForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/nickname", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: value }),
      });
      const data = (await res.json()) as { message?: string | string[] };
      if (!res.ok) {
        setMessage(Array.isArray(data.message) ? data.message[0] : (data.message ?? "닉네임을 바꾸지 못했습니다."));
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setMessage("닉네임을 바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 text-xs text-subtle underline underline-offset-2 hover:text-foreground">
        닉네임 바꾸기
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2">
      <input
        value={value}
        maxLength={10}
        onChange={(e) => setValue(e.target.value)}
        aria-label="닉네임"
        placeholder="2~10자"
        className="w-40 rounded-lg border border-line bg-white px-3 py-1.5 text-sm outline-none focus:border-foreground/40"
      />
      <button type="submit" disabled={pending || value.trim().length < 2} className="rounded-lg bg-foreground px-3 py-1.5 text-sm text-surface disabled:opacity-50">
        {pending ? "바꾸는 중입니다" : "바꾸기"}
      </button>
      <button type="button" onClick={() => { setOpen(false); setValue(initial); setMessage(null); }} className="px-2 py-1.5 text-sm text-subtle">
        취소
      </button>
      <p className="w-full text-xs text-subtle">실종자들의 정원에서 바람개비를 꽂을 때도 이 닉네임으로 보입니다.</p>
      {message && <p className="w-full text-xs text-clay-ink-deep">{message}</p>}
    </form>
  );
}
