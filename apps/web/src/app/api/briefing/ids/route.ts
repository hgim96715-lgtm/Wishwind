import { getBriefing } from "@/lib/briefing/api";

/** 브리핑룸 자동 확인용: 지금 올라와 있는 새 소식·브리핑 id만 가볍게 내려 줌 (getBriefing은 1분 캐시) */
export async function GET() {
  try {
    const data = await getBriefing();
    return Response.json({ ids: [...data.news.map((n) => n.id), ...data.posts.map((p) => p.id)] });
  } catch {
    return Response.json({ ids: [] }, { status: 503 });
  }
}
