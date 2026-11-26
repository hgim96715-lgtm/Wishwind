import Link from "next/link";
import type { Briefing } from "@/lib/briefing/api";

/** 참여가 0건이어도 비어 보이지 않게, 공개된 사건 수로 초대하는 문구를 보여 줌 */
export function ParticipationBanner({
  participation,
  caseCount,
}: {
  participation: Briefing["participation"];
  caseCount: number;
}) {
  const notes = participation.answers + participation.questions;
  const total = notes + participation.votes + participation.clouds;
  return (
    <section className="mt-8 flex flex-col items-start gap-3 rounded-xl border border-dashed border-line bg-surface/70 p-5 sm:flex-row sm:items-center">
      <p className="flex-1 text-sm leading-6">
        {total === 0 ? (
          <>공개된 사건 {caseCount}건이 첫 번째 기억을 기다리고 있습니다. 사건 하나를 열어 &lsquo;함께 기억하기&rsquo;를 눌러 주세요.</>
        ) : (
          <>
            지금까지 수사 노트 {notes}개, 형량 의견 {participation.votes}개, 실종자들의 정원 응원 {participation.clouds}개가 모였습니다.
          </>
        )}
      </p>
      <Link href="/cases" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-surface">
        사건방 가기
      </Link>
    </section>
  );
}
