import Link from "next/link";
import { connection } from "next/server";
import { INVESTIGATION_TECHNIQUES } from "@/lib/briefing/techniques";

/**
 * 홈 하단 '오늘의 추적 지식' 미니 카드: 날짜 기준 하루 하나씩 순환
 */
export async function TodayTechCard() {
  // 오늘 날짜로 고르므로 요청 때마다 계산 (prerender에 굳히지 않음)
  await connection();
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const idx = (kst.getUTCFullYear() * 365 + kst.getUTCMonth() * 30 + kst.getUTCDate()) % INVESTIGATION_TECHNIQUES.length;
  const tech = INVESTIGATION_TECHNIQUES[idx];

  return (
    <section
      aria-label="오늘의 추적 지식"
      className="mt-6 rounded-xl border border-steel/30 bg-steel/5 px-4 py-3 sm:px-5"
    >
      <p className="text-xs font-semibold text-steel-ink">오늘의 추적 지식</p>
      <p className="mt-1 text-sm font-semibold leading-snug">{tech.shortTitle}</p>
      <p className="mt-0.5 line-clamp-2 text-sm text-muted">{tech.definition}</p>
      <Link
        href="/briefing"
        className="mt-2 inline-block text-xs font-medium text-steel-ink transition-opacity hover:opacity-70"
      >
        브리핑룸에서 더 보기 →
      </Link>
    </section>
  );
}
