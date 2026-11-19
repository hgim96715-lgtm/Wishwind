"use client";

import { useEffect, useState } from "react";

const dateFmt = new Intl.DateTimeFormat("ko", { month: "long", day: "numeric", timeZone: "Asia/Seoul" });
const relFmt = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

function relative(iso: string): string {
  const hours = Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
  return Math.abs(hours) < 24 ? relFmt.format(hours, "hour") : relFmt.format(Math.round(hours / 24), "day");
}

/**
 * "3시간 전"처럼 지금 기준 상대 시각.
 * 서버에서 지금 시각을 쓰면 페이지를 캐시할 수 없어서, 서버·첫 화면은 날짜("11월 19일")로 그리고
 * 브라우저에서 상대 시각으로 바꿈 (시간대를 고정해 서버·브라우저 첫 글자가 같음 → 하이드레이션 어긋남 없음)
 */
export function TimeAgo({ iso }: { iso: string }) {
  const [text, setText] = useState(() => dateFmt.format(new Date(iso)));
  useEffect(() => {
    const update = () => setText(relative(iso));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [iso]);
  return (
    <time dateTime={iso} title={dateFmt.format(new Date(iso))} suppressHydrationWarning>
      {text}
    </time>
  );
}
