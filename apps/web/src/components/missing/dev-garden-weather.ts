"use client";
import { useEffect, useState } from "react";

/** DEV 메뉴에서 고른 정원 날씨(맑음·비·눈)를 저장하는 키와 변경 알림 이벤트 (개발 모드에서만 씀) */
export const DEV_GARDEN_WEATHER_KEY = "dev_garden_weather";
export const DEV_GARDEN_WEATHER_EVENT = "dev-garden-weather";
export type DevGardenWeather = "" | "clear" | "rain" | "snow";

/** DEV 메뉴에서 고른 날씨를 읽음 (개발 모드에서만 값이 붙음). 카드 화면과 걷는 정원이 같은 값을 씀 */
export function useDevGardenWeather() {
  const [kind, setKind] = useState<DevGardenWeather>("");
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const read = () => { try { setKind((localStorage.getItem(DEV_GARDEN_WEATHER_KEY) as DevGardenWeather) ?? ""); } catch { setKind(""); } };
    read();
    window.addEventListener(DEV_GARDEN_WEATHER_EVENT, read);
    return () => window.removeEventListener(DEV_GARDEN_WEATHER_EVENT, read);
  }, []);
  return { kind };
}
