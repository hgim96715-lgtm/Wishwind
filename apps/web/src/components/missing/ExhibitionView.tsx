"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuChevronDown, LuChevronLeft, LuChevronRight, LuChevronUp, LuHouse, LuMapPin, LuSprout, LuBookOpen } from "react-icons/lu";
import { regionLabel } from "@/lib/missing/regions";
import { GardenCorner } from "./GardenCorner";
import { LanternDirectory } from "./LanternDirectory";
import { MissingCard } from "./MissingCard";
import { useGardenLanterns } from "./useGardenLanterns";
import { useAmbientSound } from "./useAmbientSound";
import { useWeather } from "./useWeather";
import { currentHour } from "./time-of-day";
import { useDevGardenWeather } from "./dev-garden-weather";
import type { WeatherApi } from "./GardenCorner";
import { phaseAt, type GardenPhase } from "./garden/expo-environment";
import "./garden-mobile.css";

const Scene = dynamic(() => import("./garden/ExhibitionScene"), { ssr: false });

/** 이동점 이름: ExhibitionScene의 VIEWS와 같은 순서 */
const VIEW_LABELS = ["입구", "아이들의 길", "바다 건너 길", "어른들의 길", "오래 기다리는 길"];
const VIEW_COLORS = ["#aab98b", "#f3c14f", "#70afbc", "#d98565", "#ac91bf"];
const navBtn = "relative flex h-[58px] w-[52px] flex-col items-center justify-center gap-0.5 rounded-[22px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9b87a] [-webkit-tap-highlight-color:transparent] text-[#5b4630] transition active:scale-95 hover:bg-[#f6e7c4] active:bg-[#efdcb0]";
const navOn = "!bg-[#7f9a6e] !text-[#fffdf4] shadow-[inset_0_-2px_0_#5f7a50]";

/** 가상 전시회 방식 정원(미리보기): 입구 문에서 시작해 길을 따라 네 구역을 걸어 봄 */
/** 화면 한쪽의 조이스틱: 위로 밀면 앞으로, 아래로 밀면 뒤로, 옆으로 밀면 옆걸음 */
function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const R = 32;
  // 일부 브라우저(특히 모바일)에서 setPointerCapture 직후에도 hasPointerCapture가 false로 나와,
  // 그 값만 믿고 움직임을 걸러내면 드래그가 통째로 씹히는 문제가 있어 자체 ref로 드래그 여부를 따로 추적함
  const dragging = useRef(false);
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    setKnob({ x: dx, y: dy });
    onMove(dx / R, -dy / R);
  };
  const start = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    move(e);
  };
  const end = () => { dragging.current = false; setKnob({ x: 0, y: 0 }); onMove(0, 0); };
  return (
    <div
      role="group"
      aria-label="걷기 조이스틱"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={e => { if (dragging.current && !e.currentTarget.hasPointerCapture(e.pointerId)) end(); }}
      className="pointer-events-auto relative h-[100px] w-[100px] touch-none select-none rounded-full border-2 border-[#c99560] bg-[#fffaf0]/90 shadow-[0_3px_0_#a5784e,0_12px_26px_rgba(60,40,15,.3)]"
    >
      <LuChevronUp aria-hidden="true" size={14} className="absolute left-1/2 top-1.5 -translate-x-1/2 text-[#b08a60]" />
      <LuChevronDown aria-hidden="true" size={14} className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[#b08a60]" />
      <LuChevronLeft aria-hidden="true" size={14} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#b08a60]" />
      <LuChevronRight aria-hidden="true" size={14} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#b08a60]" />
      <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-10 w-10 rounded-full border-2 border-[#8f6240] bg-[#c99560] shadow-[inset_0_3px_0_rgba(255,240,210,.55),0_3px_8px_rgba(60,40,10,.35)]" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  );
}

/** onList가 있으면 카드 화면 안에서 띄운 걷는 정원: 목록 버튼이 같은 화면의 카드 목록으로 돌아감 */
export function ExhibitionView({ onList, sound: shared, weather: sharedWeather }: { onList?: () => void; sound?: { on: boolean; toggle: () => void }; weather?: WeatherApi } = {}) {
  // 카드 화면 안에서 띄우면 카드 화면의 소리를 같이 씀 (사진첩으로 돌아가도 끊기지 않게)
  const own = useAmbientSound();
  const sound = shared ?? own;
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
  const goView = useCallback((i: number) => { setView(i); setArea(i); setResetKey(k => k + 1); setEntered(false); }, []);
  const enterGarden = useCallback(() => { setZoneMenu(false); setEntered(true); setEnterEnd("path"); setEnterKey(k => k + 1); }, []);
  // 입구 버튼: 아치 정중앙에 서서 길을 바라봄
  // 카드 화면 안에 떠 있을 때는(sharedWeather) 그 날씨 상태를 그대로 씀. 따로 열렸을 때만 제 날씨를 가짐
  const ownWeather = useWeather();
  const weatherApi = sharedWeather ?? ownWeather;
  // 개발 모드: DEV 메뉴에서 고른 날씨로 덮어써 비·눈을 미리 봄
  const devWeather = useDevGardenWeather();
  const weather = devWeather.kind === "clear" || devWeather.kind === "rain" || devWeather.kind === "snow"
    ? ({ kind: devWeather.kind, intensity: devWeather.kind === "clear" ? 0 : 0.85, place: "정원" } as typeof weatherApi.weather)
    : weatherApi.weather;
  const [december, setDecember] = useState(false);
  const [boost, setBoost] = useState<{ id: string; at: number } | null>(null);
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
    {!shared && <GardenCorner sound={sound} weather={weatherApi} className="garden-corner-abs" />}
    <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+98px)] right-4 z-10" inert={covered || undefined}><Joystick onMove={onJoy} /></div>
    <div className={`pointer-events-none absolute left-5 top-[84px] z-10 text-[#fffdf4] ${phase === "night" ? "" : "[text-shadow:0_2px_12px_#203428a0]"} sm:left-12`} inert={covered || undefined}>
      <h1 className="text-[21px] font-bold sm:text-[30px]">{area === 0 ? "실종자들의 정원" : VIEW_LABELS[area]}</h1>
      <p className="mt-2 text-[13px]">{area === 0 ? "문을 지나 길을 따라 걸으며 바람개비를 만나 보세요" : "화면을 밀어 둘러보고, 바닥의 표식을 눌러 다음 길로 가세요"}</p>
    </div>
    <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] z-10 flex flex-col items-center gap-3 px-3" inert={covered || undefined}>
      {zoneMenu && (
        <div role="menu" aria-label="구역 선택" className="flex min-w-48 flex-col gap-1 rounded-[22px] border border-[#dccda9] bg-[#fff8e8] p-2 shadow-[0_8px_30px_rgba(40,30,10,.28),inset_0_1px_0_rgba(255,255,255,.5)] backdrop-blur-2xl">
          {VIEW_LABELS.map((label, i) => (
            <button key={label} type="button" role="menuitem" onClick={() => { goView(i); setZoneMenu(false); }} className={`rounded-2xl px-4 py-2.5 text-left text-[14px] font-semibold text-[#544a39] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.98] ${view === i ? "bg-[#f1e6ce]" : "hover:bg-[#f8efdb]"}`}><span aria-hidden="true" className="mr-2 inline-block size-3 rounded-full" style={{ backgroundColor: VIEW_COLORS[i] }} />{label}</button>
          ))}
        </div>
      )}
      <nav aria-label="정원 이동" className="flex items-center gap-0.5 rounded-[30px] border-2 border-[#c99560] bg-[#fffaf0] px-2 py-1.5 shadow-[0_3px_0_#a5784e,0_14px_30px_rgba(60,40,15,.32)]">
        <button type="button" aria-label={view === 0 && onList ? "사진첩으로 나가기" : "입구로"} title={view === 0 && onList ? "사진첩으로" : "입구"} onClick={() => { setZoneMenu(false); if (view === 0 && onList) onList(); else goView(0); }} className={`${navBtn} ${view === 0 ? navOn : ""}`}><LuHouse size={22} aria-hidden="true" /><span className="text-[10px] font-semibold leading-none">입구</span></button>
        <button type="button" aria-label="구역 고르기" title="구역" aria-expanded={zoneMenu} onClick={() => { setZoneMenu(v => !v); }} className={`${navBtn} ${zoneMenu || view > 0 ? navOn : ""}`}><LuMapPin size={22} aria-hidden="true" /><span className="text-[10px] font-semibold leading-none">구역</span></button>
        <button type="button" aria-label={entered ? "길 따라 앞으로 걷기" : "정원으로 들어가기"} title={entered ? "길 따라 앞으로 걷기" : "정원으로 들어가기"} onClick={enterGarden} className={`${navBtn} ${view === 0 && !entered ? "bg-[#f2c77a] shadow-[inset_0_-2px_0_#c99a52]" : ""}`}><LuSprout size={22} aria-hidden="true" /><span className="text-[10px] font-semibold leading-none">{entered ? "앞으로" : "정원"}</span></button>
        {onList ? <button type="button" onClick={onList} aria-label="기다리는 분들의 사진첩 보기" title="사진첩" className={navBtn}><LuBookOpen size={22} aria-hidden="true" /><span className="text-[10px] font-semibold leading-none">사진첩</span></button> : <Link href="/missing#garden-list" aria-label="기다리는 분들의 사진첩 보기" title="사진첩" className={navBtn}><LuBookOpen size={22} aria-hidden="true" /><span className="text-[10px] font-semibold leading-none">사진첩</span></Link>}
      </nav>
    </div>
    {notice && <p role="status" className="pointer-events-none absolute inset-x-0 bottom-44 z-30 mx-auto w-fit max-w-[86%] rounded-full border border-white/45 bg-white/20 px-4 py-2 text-center text-sm text-white shadow backdrop-blur-xl [text-shadow:0_1px_6px_rgba(0,0,0,.35)]">{notice}</p>}
    {directory && <LanternDirectory showReveal={false} lights={lights} garden={garden} onGarden={setGarden} onClose={closeDirectory} onReveal={select} onSelect={select} />}
    {selected && <><div className="absolute inset-0 z-40 bg-[#263a32]/25" onClick={lights.close} aria-hidden="true" /><MissingCard key={selected} id={selected} regionLabel={regionLabel(lights.people.find(p => p.id === selected)?.region ?? "기억의 바람개비")} onClose={lights.close} onViewed={lights.remember} onLighting={lights.updateLighting} onSupported={onSupported} /></>}
  </div>;
}
