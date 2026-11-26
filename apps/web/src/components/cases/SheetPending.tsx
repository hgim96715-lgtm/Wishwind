"use client";

import { useLinkStatus } from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LuFolderOpen, LuX } from "react-icons/lu";
import { CaseDetailSkeleton } from "@/components/cases/CaseDetailSkeleton";
import { sheetPending } from "@/components/cases/sheet-pending";

/**
 * 서류철 링크 안에 넣어 두면, 누르는 순간(서버에서 사건 파일을 받아 오는 동안) 빈 시트를 바로 띄움.
 * 진짜 시트가 도착하면 이 임시 시트는 사라지고 같은 자리에서 이어짐 (BottomSheet가 sheetPending을 보고 애니메이션 생략)
 */
export function SheetPending() {
  const { pending } = useLinkStatus();

  useEffect(() => {
    if (!pending) return;
    sheetPending.active = true;
    // 진짜 시트가 뜨지 않는 경우(오류·취소)를 대비해 잠시 뒤 해제
    return () => {
      setTimeout(() => {
        sheetPending.active = false;
      }, 0);
    };
  }, [pending]);

  if (!pending || typeof document === "undefined") return null;

  return (
    <>
      {/* 서류철 링크가 CSS(has)로 '눌린 상태'를 알아보게 하는 표시 */}
      <span hidden data-pending />
      {createPortal(
    <div className="fixed inset-0 z-50" role="status" aria-label="사건 파일을 여는 중">
      <div aria-hidden className="absolute inset-0 bg-[#2f2c28]/40 backdrop-blur-[2px]" />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-t-3xl border border-b-0 border-line bg-paper shadow-[0_-12px_40px_rgb(47_44_40/0.18)]">
        <div className="relative flex h-12 shrink-0 items-center justify-center">
          <span aria-hidden className="pointer-events-none absolute top-1/2 left-6 flex -translate-y-1/2 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-subtle md:left-10">
                <LuFolderOpen className="size-3.5" />
                Case File
              </span>
              <span aria-hidden className="h-1.5 w-12 rounded-full bg-line" />
          <LuX aria-hidden className="absolute top-1/2 right-5 size-5 -translate-y-1/2 text-subtle" />
        </div>
        <div className="overflow-y-auto px-6 pb-12 [scrollbar-width:none] md:px-10 [&::-webkit-scrollbar]:hidden">
          <div className="pt-4">
            <CaseDetailSkeleton />
          </div>
        </div>
      </div>
    </div>,
        document.body,
      )}
    </>
  );
}
