import Link from "next/link";
import { CHANGE_KIND_LABEL, getTodayChange } from "@/lib/cases/changes";

/**
 * 홈 대표 카드: 기념일이 있는 날은 오늘의 기념일, 없는 날은 날짜 기준 공개 사건 순환
 */
export async function DidYouKnow() {
  const picked = await getTodayChange();
  if (!picked) return null;
  const { item, isToday } = picked;
  return (
    <section
      aria-label="오늘의 기억"
      className="mb-6 rounded-xl border border-[#3f8f84]/30 bg-[#3f8f84]/10 px-4 py-3 sm:px-5"
    >
      <p className="text-xs font-semibold text-[#2f7469]">
        {isToday ? "오늘은" : "알고 계셨나요?"}
      </p>
      <p className="mt-1 text-sm font-semibold leading-snug">{item.name}</p>
      <p className="mt-0.5 line-clamp-2 text-sm leading-6 text-muted">
        {item.year ? `${item.year}년, ` : ""}
        &lsquo;{item.case.title}&rsquo; 뒤에 생긴 {CHANGE_KIND_LABEL[item.kind]}입니다.{" "}
        {item.description}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link
          href={`/cases/${item.case.slug}`}
          className="inline-flex items-center gap-1 rounded-md bg-[#2f7469] px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-80"
        >
          사건 보기 →
        </Link>
        <Link
          href="/changes"
          className="text-xs text-muted transition-colors hover:text-foreground"
        >
          사건이 바꾼 것들 모두 보기
        </Link>
      </div>
    </section>
  );
}
