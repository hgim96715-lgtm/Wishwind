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

const Look = dynamic(() => import("./garden/LookScene"), { ssr:false });

/** A neutral holding screen while the garden is redesigned. */
export function GardenView() {
  const lights = useGardenLanterns(false);
  const [directory, setDirectory] = useState(false);
  const [garden, setGarden] = useState(0);
  const [phase,setPhase]=useState<GardenPhase>("day");
  const [still,setStill]=useState(false);
  const {weather,mine,loading,askMyLocation,clearWeather}=useWeather();
  const [december,setDecember]=useState(false);
  const [boost,setBoost]=useState<{id:string;at:number}|null>(null),[notice,setNotice]=useState("");
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(""),6000);return()=>clearTimeout(timer);},[notice]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{setDecember(new Date().getMonth()===11||new URLSearchParams(window.location.search).get("xmas")==="1");},[]);
  useEffect(()=>{const update=()=>setPhase(phaseAt(currentHour()));update();const timer=setInterval(update,60000);const media=matchMedia("(prefers-reduced-motion: reduce)"),change=()=>setStill(media.matches);change();media.addEventListener("change",change);return()=>{clearInterval(timer);media.removeEventListener("change",change);};},[]);
  const selectLight = lights.select;
  const select = useCallback((id: string) => { setDirectory(false); selectLight(id); }, [selectLight]);
  const closeDirectory = useCallback(() => setDirectory(false), []);
  const selected = lights.selected;
  const people = useMemo(() => lights.people.map(({ id, lightCount }) => ({ id, lightCount })), [lights.people]);
  const onSupported = useCallback((name: string) => { if (selected) setBoost({ id: selected, at: Date.now() }); setNotice(`${name}님의 바람개비가 힘차게 돌아가요`); }, [selected]);

  return <div className="expo-root pinwheel-study relative w-full overflow-hidden bg-[#d5e5cf] text-[#344c40]" data-phase={phase}>
    <div className="study-background" aria-hidden="true"/>
    <div className="absolute inset-0" inert={directory || !!selected || undefined}><Look phase={phase} weather={weather} reducedMotion={still} paused={directory||!!selected} december={december} people={people} boost={boost} onSelect={select}/></div>
    <div className="study-heading" inert={directory || !!selected || undefined}><h1>실종자들의 정원</h1><p>천천히 둘러보고 바람개비를 눌러 이야기를 만나보세요</p></div>
    <div className="study-actions" inert={directory || !!selected || undefined}>
      <button type="button" onClick={() => setDirectory(true)} className="study-search"><LuSearch aria-hidden="true"/> 이름 찾기</button>
      <button type="button" disabled={loading} onClick={()=>void (mine?clearWeather():askMyLocation())} className="study-search">{loading?"날씨 확인 중":mine?"서울 날씨로":"내 위치 날씨"}</button>
    </div>
    {notice&&<p role="status" className="pointer-events-none absolute inset-x-0 bottom-24 z-30 mx-auto w-fit max-w-[86%] rounded-full bg-[#faf9ef]/92 px-4 py-2 text-center text-sm text-[#4d6a58] shadow">{notice}</p>}
    {directory && <LanternDirectory showReveal={false} lights={lights} garden={garden} onGarden={setGarden} onClose={closeDirectory} onReveal={select} onSelect={select}/>}
    {selected && <><div className="absolute inset-0 z-40 bg-[#263a32]/25" onClick={lights.close} aria-hidden="true"/><MissingCard key={selected} id={selected} regionLabel={regionLabel(lights.people.find(p => p.id === selected)?.region ?? "기억의 바람개비")} onClose={lights.close} onViewed={lights.remember} onLighting={lights.updateLighting} onSupported={onSupported}/></>}
  </div>;
}
