"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { DEV_GARDEN_TIME_KEY } from "@/components/missing/dev-garden-time";

/** 실종방 하늘 미리 보기용 시각 (time-of-day.ts의 시간대와 맞춤) */
const GARDEN_TIMES: [string, string][] = [
  ["", "실제 시각"],
  ["5.5", "해 뜰 녘 5:30"],
  ["8.5", "아침 8:30"],
  ["13", "한낮 1:00"],
  ["16.5", "오후 4:30"],
  ["18.3", "노을 6:20"],
  ["19.7", "해 질 녘 7:40"],
  ["22", "밤 10:00"],
];

/**
 * 개발 모드에서만 보이는 "다른 사람으로 보기" 버튼.
 * 같은 브라우저에서는 내 글이 '내 노트'로만 보여서, 남에게 어떻게 보이는지(익명 이름·공감해요·잠금 안내) 확인하기 어려움.
 * 누르면 로그인 안 한 새 익명 사용자로 바뀌고(실종방 캐릭터·닉네임도 새로), "내 화면으로"를 누르면 원래대로 돌아옴. 운영 빌드에서는 그려지지 않음
 */
export function DevViewerSwitch() {
  const [viewing, setViewing] = useState<boolean | null>(null);
  const [gardenTime, setGardenTime] = useState("");
  const pathname = usePathname();
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGardenTime(localStorage.getItem(DEV_GARDEN_TIME_KEY) ?? "");
    } catch {
      /* 무시 */
    }
    // 쿠키는 마운트 후에만 읽을 수 있음
    setViewing(document.cookie.split("; ").some((c) => c.startsWith("dev_viewing_as_other=")));
  }, []);

  if (process.env.NODE_ENV !== "development" || viewing === null) return null;

  return (
    // 실종방에서는 오른쪽 아래 '바람개비 꽂기' 버튼을 가리지 않게 위 가운데에 둠
    <div
      className={`fixed z-[60] flex flex-col gap-1.5 ${
        pathname === "/missing" ? "top-3 left-1/2 -translate-x-1/2 items-center" : "right-3 bottom-3 items-end"
      }`}
    >
    {pathname === "/missing" && (
      <label className="flex items-center gap-1 rounded-full border border-dashed border-[#c46a4b]/60 bg-white/90 py-1 pr-2 pl-1 text-xs shadow-sm backdrop-blur">
        <span className="px-2 font-mono text-[10px] text-[#c46a4b]">DEV</span>
        <span className="text-muted">언덕 시각</span>
        <select
          value={gardenTime}
          onChange={(e) => {
            try {
              if (e.target.value) localStorage.setItem(DEV_GARDEN_TIME_KEY, e.target.value);
              else localStorage.removeItem(DEV_GARDEN_TIME_KEY);
            } catch {
              /* 무시 */
            }
            // 하늘·안내판 색은 1분마다 갱신되므로 바로 보려면 새로 고침
            window.location.reload();
          }}
          className="bg-transparent text-[#5b4d3c] outline-none"
        >
          {GARDEN_TIMES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>
    )}
    <form
      method="post"
      action="/dev/viewer"
      className="flex items-center gap-1 rounded-full border border-dashed border-[#c46a4b]/60 bg-white/90 p-1 text-xs shadow-sm backdrop-blur"
    >
      <span className="px-2 font-mono text-[10px] text-[#c46a4b]">DEV</span>
      {viewing ? (
        <>
          <span className="px-1 text-muted">다른 사람으로 보는 중</span>
          <button name="action" value="other" className="rounded-full px-2.5 py-1 hover:bg-black/5">
            또 다른 사람
          </button>
          <button name="action" value="back" className="rounded-full bg-foreground px-2.5 py-1 text-surface">
            내 화면으로
          </button>
        </>
      ) : (
        <button name="action" value="other" className="rounded-full px-2.5 py-1 hover:bg-black/5">
          다른 사람으로 보기
        </button>
      )}
    </form>
    </div>
  );
}

