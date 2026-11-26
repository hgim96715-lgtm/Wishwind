"use client";

import { useEffect, useRef, useState } from "react";

/** 탈퇴 전에 한 번 더 묻는 창. 실수로 누르지 않게 '탈퇴하기'를 눌러도 바로 보내지 않음 */
export function WithdrawButton() {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2 py-2 text-xs text-subtle underline underline-offset-2 hover:text-foreground"
      >
        탈퇴하기
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6" onClick={() => setOpen(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="withdraw-title"
            aria-describedby="withdraw-desc"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-xl"
          >
            <h2 id="withdraw-title" className="text-lg font-semibold">
              정말 탈퇴하시겠습니까?
            </h2>
            <p id="withdraw-desc" className="mt-2 text-sm leading-6 text-muted">
              계정 연결 정보가 지워지고 되돌릴 수 없습니다. 남긴 글은 익명 글로 남습니다.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-white"
              >
                취소
              </button>
              <form action="/api/auth/withdraw" method="post">
                <button type="submit" className="rounded-lg bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-[#a3482f]">
                  탈퇴하기
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
