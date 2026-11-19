import { readdir } from "node:fs/promises";
import path from "node:path";

/**
 * public/models/characters/ 에 넣은 캐릭터 모델(.glb) 목록
 * 파일을 넣고 빼기만 하면 고르기 화면이 따라 바뀜 (코드에 파일 이름을 적지 않음)
 */
export async function GET() {
  const dir = path.join(process.cwd(), "public", "models", "characters");
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith(".glb")).sort();
  } catch {
    // 폴더가 아직 없음 → 빈 목록 (화면은 임시 캐릭터로 동작)
  }
  // Kenney 묶음에는 소품 파일도 섞여 있어 character로 시작하는 파일을 우선 씀
  // 실종방 분위기에 맞지 않는 캐릭터(좀비·무기 든 병사 등)는 뺌
  const excluded = /zombie|soldier|raider|knight/i;
  const characters = (files.some((f) => f.startsWith("character")) ? files.filter((f) => f.startsWith("character")) : files)
    .filter((f) => !excluded.test(f))
    // 사람 캐릭터를 앞에, 로봇·외계인 같은 재미 캐릭터를 뒤에
    .sort((a, b) => Number(/robot|alien/.test(a)) - Number(/robot|alien/.test(b)) || a.localeCompare(b));
  return Response.json({
    characters: characters.map((f) => ({ id: f.replace(/\.glb$/i, ""), url: `/models/characters/${encodeURIComponent(f)}` })),
  });
}
