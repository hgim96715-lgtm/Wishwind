"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuCloud, LuCloudFog, LuCloudRain, LuMoon, LuSnowflake, LuSun, LuChevronDown, LuChevronLeft, LuChevronRight, LuChevronUp, LuCloudSun, LuHouse, LuMapPin, LuSearch, LuSprout } from "react-icons/lu";
import { regionLabel } from "@/lib/missing/regions";
import { LanternDirectory } from "./LanternDirectory";
import { MissingCard } from "./MissingCard";
import { useGardenLanterns } from "./useGardenLanterns";
import { useWeather } from "./useWeather";
import { currentHour } from "./time-of-day";
import { DEV_GARDEN_WEATHER_EVENT, DEV_GARDEN_WEATHER_KEY } from "./dev-garden-weather";
import { phaseAt, type GardenPhase } from "./garden/expo-environment";
import "./garden-mobile.css";

const Scene = dynamic(() => import("./garden/ExhibitionScene"), { ssr: false });

/** 이동점 이름: ExhibitionScene의 VIEWS와 같은 순서 */
const VIEW_LABELS = ["입구", "아이들의 길", "바다 건너 길", "어른들의 길", "오래 기다리는 길"];
const navBtn = "relative flex h-[58px] w-[52px] flex-col items-center justify-center gap-0.5 rounded-[22px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 [-webkit-tap-highlight-color:transparent] text-white [text-shadow:0_1px_6px_rgba(0,0,0,.35)] transition active:scale-95 hover:bg-white/15 active:bg-white/30";
const navOn = "bg-[#fff0c4]/30 after:absolute after:bottom-1 after:h-1 after:w-4 after:rounded-full after:bg-[#e3f5bd] after:content-['']";

/** 가상 전시회 방식 정원(미리보기): 입구 문에서 시작해 길을 따라 네 구역을 걸어 봄 */
/** 화면 한쪽의 조이스틱: 위로 밀면 앞으로, 아래로 밀면 뒤로, 옆으로 밀면 옆걸음 */
function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const R = 32;
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    setKnob({ x: dx, y: dy });
    onMove(dx / R, -dy / R);
  };
  const end = () => { setKnob({ x: 0, y: 0 }); onMove(0, 0); };
  return (
    <div
      role="group"
      aria-label="걷기 조이스틱"
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
      onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e); }}
      onPointerUp={end}
      onPointerCancel={end}
      className="pointer-events-auto relative h-[100px] w-[100px] touch-none select-none rounded-full border-2 border-[#fff3d0]/55 bg-[#fff6dc]/18 shadow-[0_6px_24px_rgba(40,30,10,.25),inset_0_1px_0_rgba(255,255,255,.4)] backdrop-blur-md"
    >
      <LuChevronUp aria-hidden="true" size={14} className="absolute left-1/2 top-1.5 -translate-x-1/2 text-white/70" />
      <LuChevronDown aria-hidden="true" size={14} className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-white/70" />
      <LuChevronLeft aria-hidden="true" size={14} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-white/70" />
      <LuChevronRight aria-hidden="true" size={14} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/70" />
      <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-10 w-10 rounded-full border border-white/70 bg-[#fff3d0]/75 shadow-[0_3px_10px_rgba(60,40,10,.3)]" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  );
}

function WeatherIcon({ kind, night }: { kind: string; night: boolean }) {
  const cls = "text-[#c98a2e]";
  if (kind === "rain") return <LuCloudRain size={40} aria-hidden="true" className="text-[#5f86a3]" />;
  if (kind === "snow") return <LuSnowflake size={40} aria-hidden="true" className="text-[#7aa3bd]" />;
  if (kind === "fog") return <LuCloudFog size={40} aria-hidden="true" className="text-[#8b9f91]" />;
  if (kind === "cloudy") return <LuCloud size={40} aria-hidden="true" className="text-[#8b9f91]" />;
  return night ? <LuMoon size={40} aria-hidden="true" className="text-[#8a7fc4]" /> : <LuSun size={40} aria-hidden="true" className={cls} />;
}

const WEATHER_LABEL: Record<string, string> = { clear: "맑음", cloudy: "구름", fog: "안개", rain: "비", snow: "눈" };

export function ExhibitionView() {
  const lights = useGardenLanterns(false);
  const [directory, setDirectory] = useState(false);
  const [garden, setGarden] = useState(0);
  const [phase, setPhase] = useState<GardenPhase>("day");
  const [still, setStill] = useState(false);
  const [view, setView] = useState(0);
  const [area, setArea] = useState(0);
  // 같은 이동점을 다시 눌러도 그 자리로 되돌아오게 하는 값
  const [resetKey, setResetKey] = useState(0);
  const [zoneMenu, setZoneMenu] = useState(false);
  const joyRef = useRef({ x: 0, y: 0 });
  const onJoy = useCallback((x: number, y: number) => { joyRef.current = { x, y }; }, []);
  const [entered, setEntered] = useState(false);
  const [enterKey, setEnterKey] = useState(0);
  const [enterEnd, setEnterEnd] = useState<"gate" | "path">("path");
  const goView = useCallback((i: number) => { setView(i); setResetKey(k => k + 1); setEntered(false); }, []);
  const enterGarden = useCallback(() => { setZoneMenu(false); setEntered(true); setEnterEnd("path"); setEnterKey(k => k + 1); }, []);
  // 입구 버튼: 아치 정중앙에 서서 길을 바라봄
  const { weather: realWeather, mine, loading, askMyLocation, clearWeather } = useWeather();
  // 개발 모드: DEV 메뉴에서 고른 날씨로 덮어써 비·눈을 미리 봄
  const [devWeather, setDevWeather] = useState("");
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const read = () => { try { setDevWeather(localStorage.getItem(DEV_GARDEN_WEATHER_KEY) ?? ""); } catch { setDevWeather(""); } };
    read();
    window.addEventListener(DEV_GARDEN_WEATHER_EVENT, read);
    return () => window.removeEventListener(DEV_GARDEN_WEATHER_EVENT, read);
  }, []);
  const weather = useMemo(
    () => (devWeather === "clear" || devWeather === "rain" || devWeather === "snow" ? { kind: devWeather, intensity: devWeather === "clear" ? 0 : 0.85, place: "정원" } as typeof realWeather : realWeather),
    [devWeather, realWeather],
  );
  const [december, setDecember] = useState(false);
  const [boost, setBoost] = useState<{ id: string; at: number } | null>(null);
  const [weatherMenu, setWeatherMenu] = useState(false);
  const [clock, setClock] = useState("");
  const [isNight, setIsNight] = useState(false);
  useEffect(() => {
    const tick = () => { const h = currentHour(); const hh = Math.floor(h) % 24; const mm = Math.floor((h - Math.floor(h)) * 60); setClock(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`); setIsNight(h < 5.5 || h >= 19.7); };
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDecember(new Date().getMonth() === 11 || new URLSearchParams(window.location.search).get("xmas") === "1"); }, []);
  useEffect(() => {
    const update = () => setPhase(phaseAt(currentHour()));
    update();
    const timer = setInterval(update, 60000);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setStill(media.matches);
    change();
    media.addEventListener("change", change);
    return () => { clearInterval(timer); media.removeEventListener("change", change); };
  }, []);
  const selectLight = lights.select;
  const select = useCallback((id: string) => { setDirectory(false); selectLight(id); }, [selectLight]);
  const closeDirectory = useCallback(() => setDirectory(false), []);
  const selected = lights.selected;
  const people = useMemo(
    () => lights.grouped.flatMap((rows, garden) => rows.map(p => ({ id: p.id, lightCount: p.lightCount, garden }))),
    [lights.grouped],
  );
  const onSupported = useCallback((name: string) => {
    if (selected) setBoost({ id: selected, at: Date.now() });
    setNotice(`${name}님의 바람개비가 힘차게 돌아가요`);
  }, [selected]);
  const covered = directory || !!selected;

  return <div className="expo-root pinwheel-study relative w-full overflow-hidden bg-[#d5e5cf] text-[#344c40]" data-phase={phase}>
    <div className="absolute inset-0" inert={covered || undefined}>
      <Scene phase={phase} weather={weather} reducedMotion={still} paused={covered} december={december} people={people} boost={boost} onSelect={select} view={view} onView={goView} resetKey={resetKey} joy={joyRef} onArea={setArea} enterKey={enterKey} enterEnd={enterEnd} />
    </div>
    <div className="pointer-events-none absolute right-4 top-[84px] z-10 inline-flex items-center gap-1.5 rounded-full border border-[#fff3d0]/55 bg-[#fff1cf]/18 px-3 py-1.5 text-[13px] font-bold text-[#fffdf4] shadow-[0_4px_16px_rgba(40,30,10,.2)] backdrop-blur-xl sm:right-12" inert={covered || undefined}>{isNight ? <LuMoon size={14} aria-hidden="true" /> : <LuSun size={14} aria-hidden="true" />}<span className="tabular-nums">{clock}</span></div>
    <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+98px)] right-4 z-10" inert={covered || undefined}><Joystick onMove={onJoy} /></div>
    <div className={`pointer-events-none absolute left-5 top-[84px] z-10 text-[#fffdf4] ${phase === "night" ? "" : "[text-shadow:0_2px_12px_#203428a0]"} sm:left-12`} inert={covered || undefined}>
      <h1 className="text-[21px] font-bold sm:text-[30px]">{area === 0 ? "실종자들의 정원" : VIEW_LABELS[area]}</h1>
      <p className="mt-2 text-[13px]">{area === 0 ? "문을 지나 길을 따라 걸으며 바람개비를 만나 보세요" : "화면을 밀어 둘러보고, 바닥의 표식을 눌러 다음 길로 가세요"}</p>
    </div>
    <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] z-10 flex flex-col items-center gap-3 px-3" inert={covered || undefined}>
      {zoneMenu && (
        <div role="menu" aria-label="구역 선택" className="flex min-w-44 flex-col gap-1 rounded-[26px] border border-[#fff3d0]/60 bg-[#fff6dc]/20 p-2 shadow-[0_8px_30px_rgba(40,30,10,.28),inset_0_1px_0_rgba(255,255,255,.5)] backdrop-blur-2xl">
          {VIEW_LABELS.map((label, i) => (
            <button key={label} type="button" role="menuitem" onClick={() => { goView(i); setZoneMenu(false); }} className={`rounded-2xl px-4 py-2.5 text-left text-[14px] font-semibold text-white [text-shadow:0_1px_6px_rgba(0,0,0,.35)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.98] ${view === i ? "bg-[#fff0c4]/30" : "hover:bg-white/10"}`}>{label}</button>
          ))}
        </div>
      )}
      {weatherMenu && (
        <div role="dialog" aria-label="날씨" className="flex w-[min(86vw,260px)] flex-col items-center gap-3 rounded-[28px] border-2 border-dashed border-[#e0cc9e] bg-[#f8edd3]/85 px-5 py-4 text-[#4a3522] shadow-[0_10px_34px_rgba(40,30,10,.3)] backdrop-blur-md">
          <WeatherIcon kind={weather?.kind ?? "clear"} night={isNight} />
          <p className="text-[18px] font-bold leading-none">{WEATHER_LABEL[weather?.kind ?? "clear"] ?? "맑음"}<span className="ml-2 text-[12px] font-semibold text-[#786650]">{mine ? "내 위치" : "정원"}</span></p>
          <button type="button" disabled={loading} onClick={() => void (mine ? clearWeather() : askMyLocation())} className="inline-flex min-h-10 w-full items-center justify-center rounded-full border-2 border-[#d9b87a] bg-[#f2c77a] px-4 text-[13px] font-bold text-[#4a3522] shadow-[0_2px_0_#c99a52] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a3522]/50 active:translate-y-px disabled:opacity-50">{loading ? "날씨 확인 중" : mine ? "정원 날씨로 돌아가기" : "내 위치 날씨 보기"}</button>
        </div>
      )}
      <nav aria-label="정원 이동" className="flex items-center gap-0.5 rounded-[32px] border-2 border-[#fff3d0]/55 bg-[#fff1cf]/22 px-2 py-1.5 shadow-[0_8px_30px_rgba(40,30,10,.28),inset_0_1px_0_rgba(255,255,255,.5)] backdrop-blur-2xl">
        <button type="button" aria-label="입구로" title="입구" onClick={() => { setZoneMenu(false); goView(0); }} className={`${navBtn} ${view === 0 ? navOn : ""}`}><LuHouse size={22} aria-hidden="true" /><span className="text-[10px] font-semibold leading-none">입구</span></button>
        <button type="button" aria-label="구역 고르기" title="구역" aria-expanded={zoneMenu} onClick={() => { setWeatherMenu(false); setZoneMenu(v => !v); }} className={`${navBtn} ${zoneMenu || view > 0 ? navOn : ""}`}><LuMapPin size={22} aria-hidden="true" /><span className="text-[10px] font-semibold leading-none">구역</span></button>
        <button type="button" aria-label="정원으로 들어가기" title="정원으로 들어가기" onClick={enterGarden} className={`${navBtn} ${view === 0 && !entered ? "bg-[#f2b25c]/50 shadow-[inset_0_1px_0_rgba(255,255,255,.45)]" : ""}`}><LuSprout size={22} aria-hidden="true" /><span className="text-[10px] font-semibold leading-none">정원</span></button>
        <button type="button" aria-label="이름 찾기" title="이름 찾기" onClick={() => { setZoneMenu(false); setDirectory(true); }} className={navBtn}><LuSearch size={22} aria-hidden="true" /><span className="text-[10px] font-semibold leading-none">찾기</span></button>
        <button type="button" aria-label="날씨와 시간" title="날씨와 시간" aria-expanded={weatherMenu} onClick={() => { setZoneMenu(false); setWeatherMenu(v => !v); }} className={`${navBtn} ${weatherMenu || mine ? navOn : ""}`}><LuCloudSun size={22} aria-hidden="true" /><span className="text-[10px] font-semibold leading-none">날씨</span></button>
      </nav>
    </div>
    {notice && <p role="status" className="pointer-events-none absolute inset-x-0 bottom-44 z-30 mx-auto w-fit max-w-[86%] rounded-full border border-white/45 bg-white/20 px-4 py-2 text-center text-sm text-white shadow backdrop-blur-xl [text-shadow:0_1px_6px_rgba(0,0,0,.35)]">{notice}</p>}
    {directory && <LanternDirectory showReveal={false} lights={lights} garden={garden} onGarden={setGarden} onClose={closeDirectory} onReveal={select} onSelect={select} />}
    {selected && <><div className="absolute inset-0 z-40 bg-[#263a32]/25" onClick={lights.close} aria-hidden="true" /><MissingCard key={selected} id={selected} regionLabel={regionLabel(lights.people.find(p => p.id === selected)?.region ?? "기억의 바람개비")} onClose={lights.close} onViewed={lights.remember} onLighting={lights.updateLighting} onSupported={onSupported} /></>}
  </div>;
}
