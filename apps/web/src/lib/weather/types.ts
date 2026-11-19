export type WeatherKind = "clear" | "cloudy" | "fog" | "rain" | "snow";

export interface Weather {
  kind: WeatherKind;
  /** 비·눈 세기 0~1 (맑음·흐림은 0) */
  intensity: number;
  /** 화면에 보여 줄 지역 이름 ("서울" 또는 "내 위치") */
  place: string;
}

export const WEATHER_LABEL: Record<WeatherKind, string> = {
  clear: "맑음",
  cloudy: "흐림",
  fog: "안개",
  rain: "비",
  snow: "눈",
};

/** WMO 날씨 코드(Open-Meteo) → 정원 연출 */
export function fromWmo(code: number, precipitation: number): Omit<Weather, "place"> {
  const amount = Math.min(1, Math.max(0.3, precipitation / 4));
  if (code === 45 || code === 48) return { kind: "fog", intensity: 0 };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: "snow", intensity: amount };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { kind: "rain", intensity: amount };
  if (code >= 95) return { kind: "rain", intensity: 1 };
  if (code >= 2) return { kind: "cloudy", intensity: 0 };
  return { kind: "clear", intensity: 0 };
}
