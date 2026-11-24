import { getAllMissing } from "@/lib/missing/api";

export async function GET() {
  try {
    return Response.json({items:await getAllMissing()});
  } catch {
    return Response.json({message:"실종자 목록을 불러오지 못했음. 잠시 후 다시 시도해 주세요."},{status:503});
  }
}
