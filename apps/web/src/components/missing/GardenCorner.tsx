"use client";

import { useEffect, useState } from "react";
import { LuCloud, LuCloudRain, LuCloudSun, LuMoon, LuMusic2, LuSnowflake, LuSun, LuVolumeX } from "react-icons/lu";
import type { Weather } from "@/lib/weather/types";
import { currentHour } from "./time-of-day";
import "./garden-corner.css";

/**
 * 화면 오른쪽 위 모서리: 정원 시계 + 소리 켜고 끄기.
 * 사진첩(카드 화면)과 걷는 정원 어디서든 같은 자리에 있어서, 카드를 보면서도 정원 소리를 들을 수 있음.
 */
const WEATHER_LABEL: Record<string, string> = { clear: "맑음", cloudy: "구름", fog: "안개", rain: "비", snow: "눈" };
function WeatherGlyph({ kind, night }: { kind: string; night: boolean }) {
  if (kind === "rain") return <LuCloudRain aria-hidden="true" />;
  if (kind === "snow") return <LuSnowflake aria-hidden="true" />;
  if (kind === "fog" || kind === "cloudy") return <LuCloud aria-hidden="true" />;
  return night ? <LuMoon aria-hidden="true" /> : <LuSun aria-hidden="true" />;
}

export interface WeatherApi { weather: Weather; mine: boolean; loading: boolean; askMyLocation: () => void; clearWeather: () => void; }

export function GardenCorner({ sound, weather, className = "" }: { sound: { on: boolean; toggle: () => void }; weather?: WeatherApi; className?: string }) {
  const [weatherMenu, setWeatherMenu] = useState(false);
  const [clock, setClock] = useState("");
  const [night, setNight] = useState(false);
  useEffect(() => {
    const tick = () => {
      const h = currentHour();
      const hh = Math.floor(h) % 24;
      const mm = Math.floor((h - Math.floor(h)) * 60);
      setClock(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
      setNight(h < 5.5 || h >= 19.7);
    };
    const first = requestAnimationFrame(tick);
    const id = setInterval(tick, 20000);
    return () => { cancelAnimationFrame(first); clearInterval(id); };
  }, []);
  return (
    <div className={`garden-corner-wrap ${className}`}>
      <div className="garden-corner">
        <span className="garden-clock" aria-label={`정원 시각 ${clock}`}>{night ? <LuMoon aria-hidden="true" /> : <LuSun aria-hidden="true" />}<span>{clock}</span></span>
        {weather && (
          <button type="button" className="garden-sound" aria-label="날씨" aria-expanded={weatherMenu} title="날씨" onClick={() => setWeatherMenu(v => !v)}>
            <LuCloudSun aria-hidden="true" />
          </button>
        )}
        <button type="button" className="garden-sound" aria-label="정원의 파도와 바람종 소리" aria-pressed={sound.on} title={sound.on ? "소리 끄기" : "소리 켜기"} onClick={sound.toggle}>
          {sound.on ? <LuMusic2 aria-hidden="true" /> : <LuVolumeX aria-hidden="true" />}
        </button>
      </div>
      {weather && weatherMenu && (
        <div role="dialog" aria-label="날씨" className="garden-weather-panel">
          <WeatherGlyph kind={weather.weather.kind} night={night} />
          <p className="garden-weather-label">{WEATHER_LABEL[weather.weather.kind] ?? "맑음"}<span>{weather.mine ? "내 위치" : "정원"}</span></p>
          <button type="button" disabled={weather.loading} className="garden-weather-btn" onClick={() => (weather.mine ? weather.clearWeather() : weather.askMyLocation())}>
            {weather.loading ? "날씨 확인 중" : weather.mine ? "정원 날씨로 돌아가기" : "내 위치 날씨 보기"}
          </button>
        </div>
      )}
    </div>
  );
}
