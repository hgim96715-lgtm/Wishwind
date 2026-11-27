"use client";
import { useEffect, useState } from "react";
import type { Weather } from "@/lib/weather/types";

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

/** 실제 날씨를 DEV 메뉴에서 고른 값으로 덮어씀 (안 골랐으면 그대로). 카드 위쪽 정원 입구와 걷는 정원이 똑같이 이 훅을 써야 DEV 선택이 양쪽에 다 보임 */
export function useOverriddenWeather(real: Weather): Weather {
  const devWeather = useDevGardenWeather();
  if (devWeather.kind === "clear" || devWeather.kind === "rain" || devWeather.kind === "snow") {
    return { kind: devWeather.kind, intensity: devWeather.kind === "clear" ? 0 : 0.85, place: "정원" };
  }
  return real;
}
