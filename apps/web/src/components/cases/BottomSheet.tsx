"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useDragControls,
  type PanInfo,
} from "motion/react";
import { LuFolderOpen, LuX } from "react-icons/lu";
import { sheetPending } from "@/components/cases/sheet-pending";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 시트 안에서 Tab / Shift+Tab이 처음과 끝을 넘어가면 반대쪽으로 순환시킴 */
function trapTab(e: KeyboardEvent, sheet: HTMLElement) {
  const items = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) =>
    el.checkVisibility(),
  );
  const first = items[0];
  const last = items.at(-1);
  if (!first || !last) {
    e.preventDefault();
    sheet.focus();
    return;
  }
  const active = document.activeElement;
  const outside = !sheet.contains(active);
  if (e.shiftKey && (outside || active === first || active === sheet)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (outside || active === last)) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * 아래에서 올라오는 시트. 인터셉팅 라우트(@modal/(.)[slug])에서 감싸는 용도.
 * - 닫기 = router.back() → URL이 /cases로 돌아가고 브라우저 뒤로가기와도 일치함
 * - 닫힘 애니메이션이 끝난 뒤(onExitComplete)에 back()을 호출해야 시트가 뚝 끊기지 않음
 * - 드래그는 손잡이 영역에서만 시작 → 본문 스크롤과 충돌하지 않음
 * - 열린 동안 포커스를 시트 안에 가두고, 닫히면 시트를 연 서류철로 되돌림
 */
export function BottomSheet({
  label,
  children,
  closeHref,
}: {
  label: string;
  closeHref?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  // 임시 시트(SheetPending)가 이미 떠 있었다면 같은 자리에서 이어받으므로 열림 애니메이션을 건너뜀
  const [takeover] = useState(() => sheetPending.active);
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const close =useCallback(() => setOpen(false), []);

  useEffect(() => {
    const opener = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && sheetRef.current) trapTab(e, sheetRef.current);
    };
    // 시트가 열린 동안 뒤 페이지 스크롤 잠금
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    sheetRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [close]);

  // cacheComponents의 Activity가 닫힌 시트의 state를 보존하므로, 숨겨질 때 다시 열 수 있게 되돌리고
  // 다시 보일 때 본문 스크롤을 맨 위로 초기화함
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    return () => setOpen(true);
  }, []);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) close();
  };

  return (
    <AnimatePresence onExitComplete={() => closeHref ? router.replace(closeHref, { scroll: false }) : router.back()}>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            aria-hidden
            onClick={close}
            initial={{ opacity: takeover ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-[#2f2c28]/40 backdrop-blur-[2px]"
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
            initial={{ y: takeover ? 0 : "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-t-3xl border border-b-0 border-line bg-paper shadow-[0_-12px_40px_rgb(47_44_40/0.18)] outline-none"
          >
            {/* 손잡이: 여기서만 드래그 시작 */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="relative z-20 flex h-12 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
            >
              <span aria-hidden className="pointer-events-none absolute top-1/2 left-6 flex -translate-y-1/2 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-subtle md:left-10">
                <LuFolderOpen className="size-3.5" />
                Case File
              </span>
              <span aria-hidden className="h-1.5 w-12 rounded-full bg-line" />
              <button
                type="button"
                onClick={close}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="닫기"
                className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full p-1.5 text-subtle transition-colors hover:bg-line/60 hover:text-foreground"
              >
                <LuX aria-hidden className="size-5" />
              </button>
            </div>
            {/* tabIndex: 키보드만으로도 본문을 스크롤할 수 있게 함 */}
            {/* 윗 여백을 스크롤 컨테이너에 주면 sticky 탭바가 그만큼 내려와 틈으로 본문이 비침 */}
            <div
              ref={scrollRef}
              tabIndex={0}
              className="overflow-y-auto overscroll-contain px-6 pb-12 [scrollbar-width:none] md:px-10 [&::-webkit-scrollbar]:hidden"
            >
              <div className="pt-4">{children}</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
