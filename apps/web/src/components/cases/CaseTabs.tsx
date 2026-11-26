"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";

export interface CaseTab {
  id: string;
  label: string;
  /** 탭 옆 숫자 배지. 개요처럼 개수가 의미 없는 탭은 생략 */
  count?: number;
  /** 서버 컴포넌트에서 렌더링된 패널. 클라이언트로는 결과 HTML/RSC 페이로드만 넘어옴 */
  panel: React.ReactNode;
}

/**
 * WAI-ARIA Tabs 패턴.
 * - ←/→, Home/End로 탭 이동 (roving tabindex: 선택된 탭만 Tab 순서에 들어감)
 * - 패널은 전부 서버에서 렌더링해 두고 hidden으로 토글 → 탭 전환 시 추가 요청 없음
 */
export function CaseTabs({ tabs }: { tabs: CaseTab[] }) {
  const firstTabId = tabs[0]?.id;
  const [active, setActive] = useState(firstTabId);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const topRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);

  // cacheComponents의 Activity가 닫힌 시트의 state를 보존하므로, 다시 열 때 첫 탭으로 시작하게 되돌림
  useLayoutEffect(() => {
    if (tabListRef.current) tabListRef.current.scrollLeft = 0;
    return () => setActive(firstTabId);
  }, [firstTabId]);

  // 탭바가 붙은 채로 탭을 바꾸면 새 패널의 시작이 위로 잘리므로 패널 맨 위로 되돌림
  useLayoutEffect(() => {
    const top = topRef.current;
    const bar = barRef.current;
    if (top && bar && top.getBoundingClientRect().top < bar.getBoundingClientRect().top - 1) {
      top.scrollIntoView({ block: "start" });
    }
  }, [active]);

  const select =(index: number) => {
    const next = (index + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const keyMap: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    if (e.key in keyMap) {
      e.preventDefault();
      select(keyMap[e.key]);
    }
  };

  return (
    <div>
      <div ref={topRef} aria-hidden />
      {/* 시트 안에서 스크롤해도 탭은 위에 붙어 있음 */}
      <div
        ref={barRef}
        className="sticky top-0 z-10 -mx-6 bg-background/95 px-6 backdrop-blur md:-mx-10 md:px-10"
      >
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="사건 파일 항목"
          className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]"
        >
          {tabs.map((tab, i) => {
            const selected = tab.id === active;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(tab.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`relative shrink-0 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  selected ? "text-foreground" : "text-subtle hover:text-muted"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 font-mono text-xs ${selected ? "text-brand-fg" : "text-subtle"}`}
                  >
                    {tab.count}
                  </span>
                )}
                {selected && (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className="pt-6 outline-none"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
