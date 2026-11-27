"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LuChevronDown, LuMapPin } from "react-icons/lu";
import type { RegionGroup } from "@/lib/missing/regions";

/** 나라 이름을 뗀 짧은 지역 이름 ("대한민국 · 서울" → "서울", "대한민국 · 미상" → "지역 미상") */
function shortName(label: string) {
  const name = label.split(" · ").slice(1).join(" · ") || label;
  return name === "미상" ? "지역 미상" : name;
}

/**
 * 지역 고르기: 브라우저 기본 목록 대신 정원 종이 느낌의 판을 펼쳐 나라별로 지역 칩을 보여 줌.
 * 바깥을 누르거나 Esc를 누르면 닫힘.
 */
export function RegionPicker({ value, choices, onChange }: { value: string; choices: RegionGroup[]; onChange: (region: string) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const countries = [
    { key: "KR", name: "대한민국", items: choices.filter(c => c.region.startsWith("KR")) },
    { key: "US", name: "미국", items: choices.filter(c => c.region.startsWith("US")) },
    { key: "ETC", name: "그 밖의 곳", items: choices.filter(c => !c.region.startsWith("KR") && !c.region.startsWith("US")) },
  ].filter(c => c.items.length > 0);
  const current = choices.find(c => c.region === value);
  const pick = (region: string) => { onChange(region); setOpen(false); };

  return (
    <div className="region-picker" ref={box}>
      <button type="button" className="region-trigger" aria-label="내 지역 선택" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(v => !v)}>
        <LuMapPin aria-hidden="true" />
        <span>{current ? current.label : "모든 지역"}</span>
        <LuChevronDown aria-hidden="true" className="region-caret" />
      </button>
      {open && (
        <div id={panelId} className="region-panel" role="dialog" aria-label="지역 고르기">
          <button type="button" className="region-chip region-all" aria-pressed={!value} onClick={() => pick("")}>모든 지역</button>
          {countries.map(c => (
            <section key={c.key}>
              <h3>{c.name}</h3>
              <div className="region-chips">
                {c.items.map(it => (
                  <button key={it.region} type="button" className="region-chip" aria-pressed={value === it.region} onClick={() => pick(it.region)}>
                    {shortName(it.label)}<small>{it.people.length}</small>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
