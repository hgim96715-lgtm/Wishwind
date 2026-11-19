import { fromWmo, type Weather } from "@/lib/weather/types";

/** 위치를 주지 않으면 서울 날씨 */
const SEOUL = { lat: 37.57, lon: 126.98 };

// 좌표는 소수 첫째 자리(약 10km)로 뭉뚱그려서만 씀. 저장하지 않음
function coord(raw: string | null, limit: number) {
  if (raw === null || raw.trim() === "") return null;
  const v = Number(raw);
  return Number.isFinite(v) && Math.abs(v) <= limit ? Math.round(v * 10) / 10 : null;
}

function parseCurrent(body: unknown): { code: number; precipitation: number } | null {
  const current = (body as { current?: { weather_code?: unknown; precipitation?: unknown } } | null)?.current;
  if (!current || typeof current.weather_code !== "number") return null;
  return { code: current.weather_code, precipitation: typeof current.precipitation === "number" ? current.precipitation : 0 };
}

/**
 * 실종방 정원 날씨 (Open-Meteo, 키 없음). 15분 동안 같은 좌표는 캐시
 * 브라우저 위치는 사용자가 "내 위치 날씨"를 눌러 허락했을 때만 받음
 */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const la = coord(sp.get("lat"), 90);
  const lo = coord(sp.get("lon"), 180);
  const mine = la !== null && lo !== null;
  const { lat, lon } = mine ? { lat: la, lon: lo } : SEOUL;
  try {
    const q = new URLSearchParams({ latitude: String(lat), longitude: String(lon), current: "weather_code,precipitation" });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, { next: { revalidate: 900 } });
    const current = parseCurrent(await res.json());
    if (!res.ok || !current) throw new Error("weather");
    const weather: Weather = { ...fromWmo(current.code, current.precipitation), place: mine ? "내 위치" : "서울" };
    return Response.json(weather, { headers: { "cache-control": "private, max-age=900" } });
  } catch {
    // 날씨를 못 받아도 정원은 맑은 하늘로 그대로 보여 줌
    return Response.json({ kind: "clear", intensity: 0, place: mine ? "내 위치" : "서울" } satisfies Weather);
  }
}
