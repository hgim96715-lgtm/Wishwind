import type { CaseChangeWithCase, CaseDetail } from "@/lib/cases/types";

/**
 * 관리실 '인스타 준비'에서 쓰는 글감 만들기.
 * 문구는 사이트와 같은 합니다체. 피해자 사진·실명 강조·자극적인 표현은 쓰지 않음
 */

const BASE_TAGS = ["#Wishwind", "#위시윈드", "#기억"];

/** 사건 제목 → 해시태그 (공백·가운뎃점·괄호 제거) */
export function tagOf(title: string) {
  return `#${title.replace(/\(.*?\)/g, "").replace(/[\s·・,.'"‘’“”]/g, "")}`;
}

function kstToday(now: Date) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

export type UpcomingDay = { item: CaseChangeWithCase; date: Date; daysLeft: number };

/** 앞으로 days일 안에 돌아오는 기념일 (한국 날짜 기준, 가까운 순) */
export function upcomingDays(items: CaseChangeWithCase[], now: Date, days = 60): UpcomingDay[] {
  const today = kstToday(now);
  const out: UpcomingDay[] = [];
  for (const item of items) {
    if (item.kind !== "DAY" || !item.observedOn) continue;
    const [m, d] = item.observedOn.split("-").map(Number);
    let date = new Date(Date.UTC(today.getUTCFullYear(), m - 1, d));
    if (date < today) date = new Date(Date.UTC(today.getUTCFullYear() + 1, m - 1, d));
    const daysLeft = Math.round((date.getTime() - today.getTime()) / 86_400_000);
    if (daysLeft <= days) out.push({ item, date, daysLeft });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function dateLabel(date: Date) {
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
}

/** 기념일 당일에 올릴 글 */
export function dayCaption({ item, date }: UpcomingDay) {
  return [
    `오늘 ${dateLabel(date)}은 ${item.name}입니다.`,
    "",
    item.description,
    "",
    `이날이 생기게 된 ${item.case.title}의 기록과 출처는 프로필 링크의 Wishwind에서 볼 수 있습니다.`,
    "",
    [...BASE_TAGS, "#사건이바꾼것", tagOf(item.case.title)].join(" "),
  ].join("\n");
}

/** 사건 하나를 소개하는 글 */
export function caseCaption(data: CaseDetail) {
  const question = data.unsolvedQuestions[0]?.question;
  const summary = data.summary.endsWith(".") ? data.summary : `${data.summary}.`;
  return [
    data.title,
    "",
    summary,
    ...(question ? ["", "함께 생각해 볼 질문", question] : []),
    "",
    "타임라인과 출처는 프로필 링크의 Wishwind에서 볼 수 있습니다.",
    "",
    [...BASE_TAGS, "#사건기록", tagOf(data.title)].join(" "),
  ].join("\n");
}

/** 법·제도 하나를 소개하는 글 ('알고 계셨나요?' 형식) */
export function changeCaption(item: CaseChangeWithCase) {
  return [
    `알고 계셨나요? ${item.name}${item.year ? `(${item.year}년)` : ""}`,
    "",
    item.description,
    "",
    `이 ${item.kind === "LAW" ? "법은" : "제도는"} ${item.case.title} 뒤에 생겼습니다. 사건 기록은 프로필 링크의 Wishwind에서 볼 수 있습니다.`,
    "",
    [...BASE_TAGS, "#사건이바꾼것", tagOf(item.case.title)].join(" "),
  ].join("\n");
}

/** 날짜에 따라 법·제도 두 개를 돌아가며 고름 (날마다 다른 글감) */
export function pickChanges(items: CaseChangeWithCase[], now: Date) {
  const day = Math.floor(now.getTime() / 86_400_000);
  return [items[day % items.length], items[(day + 7) % items.length]].filter((c, i, a) => a.indexOf(c) === i);
}
