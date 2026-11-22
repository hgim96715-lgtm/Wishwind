import Link from "next/link";
import { CHANGE_KIND_LABEL, getTodayChange } from "@/lib/cases/changes";

/**
 * 홈 '알고 계셨나요?': 사건을 계기로 생긴 법·기념일·제도를 하루 하나씩 보여 줌.
 * 오늘이 그 기념일이면 그날의 것을 먼저 보여 줌
 */
export async function DidYouKnow() {
  const picked = await getTodayChange();
  if (!picked) return null;
  const { item, isToday } = picked;
  return (
    <section aria-label="알고 계셨나요" className="mb-6 rounded-xl border border-[#3f8f84]/30 bg-[#3f8f84]/10 px-4 py-3 sm:px-5">
      <p className="text-xs font-semibold text-[#2f7469]">{isToday ? "오늘은" : "알고 계셨나요?"}</p>
      <p className="mt-1 text-sm leading-6">
        <span className="font-semibold">{item.name}</span>
        <span className="text-muted">
          {" — "}
          {item.year ? `${item.year}년, ` : ""}‘{item.case.title}’ 뒤에 생긴 {CHANGE_KIND_LABEL[item.kind]}입니다. {item.description}
        </span>
      </p>
      <div className="mt-2 flex gap-4 text-xs font-medium">
        <Link href={`/cases/${item.case.slug}`} className="text-[#2f7469] transition-opacity hover:opacity-70">
          사건 보기
        </Link>
        <Link href="/changes" className="text-muted transition-colors hover:text-foreground">
          사건이 바꾼 것들 모두 보기
        </Link>
      </div>
    </section>
  );
}
