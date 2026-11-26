import Link from "next/link";
import { FaInstagram } from "react-icons/fa6";
import { getReelCases } from "@/lib/cases/api";
import { CATEGORY_LABEL } from "@/lib/cases/labels";

/** 릴스를 보고 프로필 링크로 들어온 사람이 방금 본 사건을 바로 열 수 있게 함 (관리실 '인스타 성과'에 사건 주소를 적은 릴스 기준, 최대 6건). 많아지면 옆으로 넘김 */
export async function ReelCases() {
  let items: Awaited<ReturnType<typeof getReelCases>> = [];
  try {
    items = await getReelCases();
  } catch {
    return null;
  }
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="reel-cases-title" className="mb-8">
      <h2 id="reel-cases-title" className="flex items-center gap-2 text-sm font-semibold">
        <FaInstagram aria-hidden className="size-4 text-brand-fg" />
        방금 릴스에서 보셨나요?
      </h2>
      <ul className="-mx-6 mt-3 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((c) => (
          <li key={c.slug} className="flex min-w-[15rem] flex-1 snap-start">
            <Link
              href={`/cases/${c.slug}`}
              className="group flex min-h-[8.5rem] w-full flex-col justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand/50"
            >
              <span className="w-fit rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand-fg">
                {CATEGORY_LABEL[c.category]}
              </span>
              <span className="line-clamp-2 font-semibold leading-snug">{c.title}</span>
              <span className="text-xs text-brand-fg transition-transform group-hover:translate-x-0.5">사건 파일 열기</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
