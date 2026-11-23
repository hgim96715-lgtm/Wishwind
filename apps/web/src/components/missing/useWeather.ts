"use client";

import { useCallback, useEffect, useState } from "react";
import type { Weather, WeatherKind } from "@/lib/weather/types";

const MINE_KEY = "missing-weather-mine";
const REFRESH_MS = 5 * 60 * 1000;
const KINDS: WeatherKind[] = ["clear", "cloudy", "fog", "rain", "snow"];

function readFlag() {
  try {
    return localStorage.getItem(MINE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeFlag(on: boolean) {
  try {
    if (on) localStorage.setItem(MINE_KEY, "1");
    else localStorage.removeItem(MINE_KEY);
  } catch {
    // 저장이 막힌 브라우저면 다음 방문 때 다시 물어봄
  }
}

function position(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      reject,
      { maximumAge: 30 * 60 * 1000, timeout: 8000, enableHighAccuracy: false },
    ),
  );
}

async function load(coords?: { lat: number; lon: number }): Promise<Weather> {
  const q = coords ? `?lat=${coords.lat.toFixed(1)}&lon=${coords.lon.toFixed(1)}` : "";
  const res = await fetch(`/api/weather${q}`);
  if (!res.ok) throw new Error("weather");
  return (await res.json()) as Weather;
}

/**
 * 정원 날씨. 기본은 서울 날씨이고, "내 위치 날씨"를 한 번 허락하면 그다음부터 내 위치 날씨를 씀.
 * 좌표는 소수 첫째 자리로만 보내고 어디에도 저장하지 않음. ?weather=rain 처럼 주소로 미리 볼 수 있음
 */
export function useWeather() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [mine, setMine] = useState(false);

  const refresh = useCallback(async (useMine: boolean) => {
    try {
      setWeather(await load(useMine ? await position() : undefined));
    } catch {
      // 위치를 못 받으면 서울 날씨로
      setWeather(await load().catch(() => null));
    }
  }, []);

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("weather") as WeatherKind | null;
    if (forced && KINDS.includes(forced)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWeather({ kind: forced, intensity: 0.8, place: "미리 보기" });
      return;
    }
    const flag = readFlag() && "geolocation" in navigator;
    setMine(flag);
    void refresh(flag);
    const id = setInterval(() => void refresh(flag), REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  /** 사용자가 버튼을 눌렀을 때만 위치 권한을 물어봄 */
  const askMyLocation = useCallback(async () => {
    if (!("geolocation" in navigator)) return;
    writeFlag(true);
    setMine(true);
    await refresh(true);
  }, [refresh]);

  const backToSeoul = useCallback(async () => {
    writeFlag(false);
    setMine(false);
    await refresh(false);
  }, [refresh]);

  return { weather, mine, askMyLocation, backToSeoul };
}
