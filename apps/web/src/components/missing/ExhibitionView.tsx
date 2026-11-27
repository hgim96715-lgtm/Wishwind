"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuSearch } from "react-icons/lu";
import { regionLabel } from "@/lib/missing/regions";
import { LanternDirectory } from "./LanternDirectory";
import { MissingCard } from "./MissingCard";
import { useGardenLanterns } from "./useGardenLanterns";
import { useWeather } from "./useWeather";
import { currentHour } from "./time-of-day";
import { phaseAt, type GardenPhase } from "./garden/expo-environment";
import "./garden-mobile.css";

const Scene = dynamic(() => import("./garden/ExhibitionScene"), { ssr: false });

/** 이동점 이름: ExhibitionScene의 VIEWS와 같은 순서 */
const VIEW_LABELS = ["입구", "아이들의 길", "바다 건너 길", "어른들의 길", "오래 기다리는 길"];
const chip = "min-h-11 rounded-full border border-white/60 bg-[#415f4b]/85 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur disabled:opacity-50";

/** 가상 전시회 방식 정원(미리보기): 입구 문에서 시작해 길을 따라 네 구역을 걸어 봄 */
export function ExhibitionView() {
  const lights = useGardenLanterns(false);
  const [directory, setDirectory] = useState(false);
  const [garden, setGarden] = useState(0);
  const [phase, setPhase] = useState<GardenPhase>("day");
  const [still, setStill] = useState(false);
  const [view, setView] = useState(0);
  const { weather, mine, loading, askMyLocation, clearWeather } = useWeather();
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
      <Scene phase={phase} weather={weather} reducedMotion={still} paused={covered} december={december} people={people} boost={boost} onSelect={select} view={view} onView={setView} />
    </div>
    <div className="pointer-events-none absolute left-5 top-[84px] z-10 text-[#fffdf4] [text-shadow:0_2px_12px_#203428a0] sm:left-12" inert={covered || undefined}>
      <h1 className="text-[21px] font-bold sm:text-[30px]">{view === 0 ? "실종자들의 정원" : VIEW_LABELS[view]}</h1>
      <p className="mt-2 text-[13px]">{view === 0 ? "문을 지나 길을 따라 걸으며 바람개비를 만나 보세요" : "화면을 밀어 둘러보고, 바닥의 표식을 눌러 다음 길로 가세요"}</p>
    </div>
    <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+18px)] z-10 flex flex-col items-center gap-3 px-3" inert={covered || undefined}>
      {view === 0 && (
        <button type="button" onClick={() => setView(1)} className="min-h-12 rounded-full bg-[#e9a94f] px-7 py-3 text-[15px] font-bold text-white shadow-lg">정원으로 들어가기</button>
      )}
      <div className="flex max-w-full flex-wrap justify-center gap-2">
        {VIEW_LABELS.map((label, i) => (
          <button key={label} type="button" aria-pressed={view === i} onClick={() => setView(i)} className={`${chip} ${view === i ? "!bg-[#e9a94f] !text-white" : ""}`}>{label}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setDirectory(true)} className={`${chip} flex items-center gap-2`}><LuSearch aria-hidden="true" /> 이름 찾기</button>
        <button type="button" disabled={loading} onClick={() => void (mine ? clearWeather() : askMyLocation())} className={chip}>{loading ? "날씨 확인 중" : mine ? "위치 날씨 끄기" : "내 위치 날씨"}</button>
      </div>
    </div>
    {notice && <p role="status" className="pointer-events-none absolute inset-x-0 bottom-44 z-30 mx-auto w-fit max-w-[86%] rounded-full bg-[#faf9ef]/92 px-4 py-2 text-center text-sm text-[#4d6a58] shadow">{notice}</p>}
    {directory && <LanternDirectory showReveal={false} lights={lights} garden={garden} onGarden={setGarden} onClose={closeDirectory} onReveal={select} onSelect={select} />}
    {selected && <><div className="absolute inset-0 z-40 bg-[#263a32]/25" onClick={lights.close} aria-hidden="true" /><MissingCard key={selected} id={selected} regionLabel={regionLabel(lights.people.find(p => p.id === selected)?.region ?? "기억의 바람개비")} onClose={lights.close} onViewed={lights.remember} onLighting={lights.updateLighting} onSupported={onSupported} /></>}
  </div>;
}
