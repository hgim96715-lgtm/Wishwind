import { getReelCases } from "@/lib/cases/api";
import { ReelCasesDisplay } from "@/components/home/ReelCasesDisplay";

/** 릴스를 보고 프로필 링크로 들어온 사람이 방금 본 사건을 바로 열 수 있게 함 (관리실 '인스타 성과'에 사건 주소를 적은 릴스 기준, 최대 6건). 많아지면 옆으로 넘김 */
export async function ReelCases() {
  let items: Awaited<ReturnType<typeof getReelCases>> = [];
  try {
    items = await getReelCases();
  } catch {
    return null;
  }
  if (items.length === 0) return null;

  return <ReelCasesDisplay items={items} />;
}
