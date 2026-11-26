import Link from "next/link";
import { INVESTIGATION_TECHNIQUES } from "@/lib/briefing/techniques";

/**
 * 홈 하단 '오늘의 추적 지식' 미니 카드: 날짜 기준 하루 하나씩 순환
 */
export function TodayTechCard() {
  const today = new Date();
  const idx = (today.getFullYear() * 365 + today.getMonth() * 30 + today.getDate()) % INVESTIGATION_TECHNIQUES.length;
  const tech = INVESTIGATION_TECHNIQUES[idx];

  return (
    <section
      aria-label="오늘의 추적 지식"
      className="mt-6 rounded-xl border border-[#4f78a8]/30 bg-[#4f78a8]/5 px-4 py-3 sm:px-5"
    >
      <p className="text-xs font-semibold text-[#4f78a8]">오늘의 추적 지식</p>
      <p className="mt-1 text-sm font-semibold leading-snug">{tech.shortTitle}</p>
      <p className="mt-0.5 line-clamp-2 text-sm text-muted">{tech.definition}</p>
      <Link
        href="/briefing"
        className="mt-2 inline-block text-xs font-medium text-[#4f78a8] transition-opacity hover:opacity-70"
      >
        브리핑룸에서 더 보기 →
      </Link>
    </section>
  );
}
