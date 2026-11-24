"use client";

import dynamic from "next/dynamic";
import "./garden-mobile.css";
const styles={"root": "expo-root", "mobileOnly": "expo-mobileOnly", "toolbar": "expo-toolbar", "settingsToggle": "expo-settingsToggle", "settingsPanel": "expo-settingsPanel", "footer": "expo-footer", "wishCount": "expo-wishCount"};
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Joystick } from "./garden/Joystick";
import { canWalk, EXPO_ENTRANCES, EXPO_GARDENS, EXPO_START, MAP_SCALE, type Point } from "./garden/expo-layout";
import type { Pinwheel, Travel } from "./garden/ExpoScene";
import { useGardenLanterns } from "./useGardenLanterns";
import { LanternDirectory } from "./LanternDirectory";
import { MissingCard } from "./MissingCard";
import { AvatarSetup, loadAvatar, type AvatarChoice } from "./garden/AvatarSetup";
import { useWeather } from "./useWeather";
import { WEATHER_LABEL } from "@/lib/weather/types";
import { GardenChoice } from "./GardenChoice";
import { AnimatePresence } from "motion/react";
import { phaseAt, type GardenPhase } from "./garden/expo-environment";
import { regionLabel } from "@/lib/missing/regions";

const NO_PLANTED_PINWHEELS:Pinwheel[]=[];
const GARDEN_OPTIONS=EXPO_GARDENS.map((g,i)=>({value:String(i),label:g.name}));
const Scene=dynamic(()=>import("./garden/ExpoScene"),{ssr:false,loading:()=> <div className="grid h-full place-items-center text-[#526e5b]">정원으로 들어가는 중…</div>});


class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="grid h-full place-items-center p-10 text-center">3D 화면을 불러오지 못했음. 페이지를 새로고침하면 다시 확인할 수 있음.</div>:this.props.children;}
}

export function GardenExpo() {
  const lights=useGardenLanterns();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [listOpen,setListOpen]=useState(false),[selectedGarden,setSelectedGarden]=useState(0);
  const [timeMode,setTimeMode]=useState<"auto"|GardenPhase>("auto"),[hour,setHour]=useState(16);
  const [reducedMotion,setReducedMotion]=useState(false);
  const [mode,setMode]=useState<"overview"|"walk">("walk");
  const [ready,setReady]=useState(false);
  const [position,setPosition]=useState<Point>(EXPO_START);
  const [travel,setTravel]=useState<Travel|null>(null);
  const [notice,setNotice]=useState("");
  const [savedAvatar,setAvatar]=useState<AvatarChoice|null>(null),[avatarLoaded,setAvatarLoaded]=useState(false),[editingAvatar,setEditingAvatar]=useState(false);
  const [accountNickname,setAccountNickname]=useState<string|null>(null);
  const avatar=useMemo(()=>savedAvatar&&accountNickname?{...savedAvatar,nickname:accountNickname}:savedAvatar,[savedAvatar,accountNickname]);
  const {weather,mine,loading:weatherLoading,error:weatherError,askMyLocation,clearWeather}=useWeather();
  useEffect(()=>{
    setAvatar(loadAvatar());setAvatarLoaded(true);
    const ac=new AbortController();fetch("/api/auth/status",{signal:ac.signal}).then(r=>r.json()).then(r=>setAccountNickname(r.nickname??null)).catch(()=>{});return()=>ac.abort();
  },[]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(""),6000);return()=>clearTimeout(timer);},[notice]);
  const stick=useRef({x:0,y:0}),player=useRef<Point>({...EXPO_START});
  const sequence=useRef(0);
  const onWalk=useCallback(()=>setMode("walk"),[]),onReady=useCallback(()=>setReady(true),[]);
  const onPosition=useCallback((p:Point)=>setPosition(previous=>Math.hypot(previous.x-p.x,previous.z-p.z)>0.03?p:previous),[]);
  const moveTo=(point:Point)=>{setTravel({point,id:++sequence.current});setMode("walk");};
  const enterGarden=(index:number)=>{setSelectedGarden(index);moveTo(EXPO_ENTRANCES[index]);};
  const closeList=useCallback(()=>setListOpen(false),[]);
  const selectPerson=useCallback((id:string)=>{setListOpen(false);lights.select(id);},[lights.select]);
  const revealPerson=(id:string)=>{
    const item=lights.reveal(id);if(!item)return;
    setListOpen(false);setSelectedGarden(item.garden);
    const approach={x:item.x,z:item.z+(item.garden>=2?-2.8:2.8)};
    moveTo(canWalk(approach.x,approach.z)?approach:EXPO_ENTRANCES[item.garden]);
  };
  useEffect(()=>{
    const update=()=>{const now=new Date();setHour(now.getHours()+now.getMinutes()/60);};update();const timer=window.setInterval(update,60000);
    const preference=window.matchMedia("(prefers-reduced-motion: reduce)");setReducedMotion(preference.matches);
    const motionChange=()=>setReducedMotion(preference.matches);preference.addEventListener("change",motionChange);
    return()=>{window.clearInterval(timer);preference.removeEventListener("change",motionChange);};
  },[]);
  const phase=timeMode==="auto"?phaseAt(hour):timeMode;
  const night=phase==="night";
  const setupOpen=avatarLoaded&&(!avatar||editingAvatar);
  const modalOpen=listOpen||!!lights.selected||setupOpen;
  const gardenCount=lights.groups[selectedGarden].length;
  const totalSupport=lights.people.reduce((total,p)=>total+(p.lightCount??0),0);
  const onSupported=useCallback((name:string)=>setNotice(`${name}님의 바람개비가 멋지게 돌아가고 있습니다`),[]);
  const mx=position.x/MAP_SCALE+480,my=position.z/MAP_SCALE+375;
  const current=EXPO_GARDENS.find(g=>mx>=g.x&&mx<=g.x+340&&my>=g.y&&my<=g.y+220);
  return <div data-phase={phase} className={`${styles.root} relative w-full overflow-hidden bg-[#dce7df] text-[#344c40]`}>
    <div className="absolute inset-0" inert={modalOpen||undefined}>
      <SceneBoundary><Scene avatar={avatar??{url:null,nickname:""}} weather={weather} phase={phase} freshId={null} mode={mode} paused={modalOpen} night={night} reducedMotion={reducedMotion} lanterns={lights.lanterns} visited={lights.visited} onSelect={selectPerson} travel={travel} stick={stick} player={player} pinwheels={NO_PLANTED_PINWHEELS} onWalk={onWalk} onPosition={onPosition} onReady={onReady} /></SceneBoundary>
    </div>
    <div className={`${styles.toolbar} pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-4`} inert={modalOpen||undefined}>
      <div className="pointer-events-auto flex max-w-full flex-wrap justify-center gap-1 rounded-2xl border border-white/70 bg-[#fbfaf1]/90 p-1.5 shadow-sm backdrop-blur">
        <button type="button" onClick={()=>setMode("overview")} aria-pressed={mode==="overview"} className={`rounded-xl px-3 py-2 text-sm ${mode==="overview"?"bg-[#496954] text-white":"hover:bg-[#e9eddf]"}`}>전체 보기 · 축소</button>
        <button type="button" onClick={onWalk} disabled={!ready} aria-pressed={mode==="walk"} className={`rounded-xl px-3 py-2 text-sm disabled:opacity-40 ${mode==="walk"?"bg-[#496954] text-white":"hover:bg-[#e9eddf]"}`}>직접 걷기</button>
        <button type="button" onClick={()=>setListOpen(true)} className="rounded-xl px-3 py-2 text-sm hover:bg-[#e9eddf]">바람개비 목록</button>
      </div>
    </div>
    <button type="button" className={`${styles.mobileOnly} ${styles.settingsToggle}`} aria-expanded={settingsOpen} aria-controls="garden-settings" onClick={()=>setSettingsOpen(v=>!v)} inert={modalOpen||undefined}>{settingsOpen?"설정 닫기":"정원 설정"}</button>
    <div id="garden-settings" data-open={settingsOpen} className="expo-settingsPanel" inert={modalOpen||undefined}>
      <div className="expo-settings-row"><button type="button" onClick={()=>setEditingAvatar(true)}>{avatar?.nickname||"캐릭터·닉네임"}</button><span>{weather.place} · {WEATHER_LABEL[weather.kind]}</span><button type="button" disabled={weatherLoading} onClick={()=>void (mine?clearWeather():askMyLocation())}>{weatherLoading?"날씨 확인 중":mine?"위치 날씨 끄기":"내 위치 날씨"}</button></div>
      {weatherError&&<p role="status" className="expo-weather-error">{weatherError}</p>}
      <div className="expo-time-options" role="group" aria-label="정원 시간">{([['auto','자동'],['morning','아침'],['day','낮'],['sunset','노을'],['night','밤']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={timeMode===value} onClick={()=>setTimeMode(value)}>{label}</button>)}</div>
    </div>
    <section className="expo-browse" aria-label="오늘의 바람개비와 검색" inert={modalOpen||undefined}>
      <label><span className="sr-only">이름·지역 검색</span><input aria-label="이름·지역 검색" value={lights.query} onChange={e=>lights.search(e.target.value)} placeholder="이름·지역 검색" /></label>
      <GardenChoice label="둘러볼 정원" value={String(selectedGarden)} options={GARDEN_OPTIONS} onChange={value=>enterGarden(Number(value))}/>
      <div><span role="status">{gardenCount?(lights.query?`검색 결과 ${gardenCount}명`:`오늘 만나는 ${lights.visibleGroups[selectedGarden].length}명의 이야기`):"검색 결과 없음"}</span><button type="button" onClick={()=>setListOpen(true)}>모든 분 찾기 ›</button></div>

    </section>
    {mode==="overview"&&<div className="absolute left-5 top-72 hidden w-56 rounded-2xl border border-white/70 bg-[#fbfaf1]/90 p-4 shadow-sm backdrop-blur md:block" inert={modalOpen||undefined}>
      <p className="text-[10px] tracking-[0.22em] text-[#7b8e78]">WISHWIND GARDEN</p>
      <h1 className="mt-1 text-lg font-semibold">함께 기다리는 정원</h1>
      <p className="mt-2 text-xs leading-5 text-[#71816f]">따뜻한 바람개비 하나에<br/>한 사람의 이야기를 담아</p>
      <div className="mt-4"><GardenChoice label="바람개비를 볼 정원" value={String(selectedGarden)} options={GARDEN_OPTIONS} onChange={value=>enterGarden(Number(value))}/></div>
      <p className="mt-2 text-xs text-[#71816f]">{gardenCount}명 중 {lights.visibleGroups[selectedGarden].length}개의 바람개비를 둘러보는 중</p>
      <button type="button" onClick={()=>setListOpen(true)} className="mt-2 rounded-lg border px-3 py-1.5 text-xs">이름 찾기 · 전체 목록</button>
      <p className="mt-3 text-[10px] leading-4 text-[#78856e]">열어본 바람개비는 중앙에 작은 금빛 테두리가 남음</p>
      <p className="mt-3 border-t border-[#dbe1d3] pt-3 text-xs text-[#71816f]">드래그로 둘러보기 · 휠로 확대<br/>바닥을 누르거나 방향키로 걷기</p>
    </div>}
    <div className={`${styles.footer} pointer-events-none absolute inset-x-0 bottom-5 z-10 flex flex-col items-center gap-2 px-3 lg:px-56`} inert={modalOpen||undefined}>
      {mode==="walk"&&<div className="pointer-events-auto mb-1 flex w-full max-w-lg items-end justify-between gap-3">
        <div aria-label="걷기 조이스틱"><Joystick onChange={(x,y)=>{stick.current={x,y};}} /></div>
        <p className={`${styles.wishCount} rounded-full bg-[#faf9ef]/90 px-4 py-2 text-xs`}>바람개비 날리기 · {totalSupport.toLocaleString()}회</p>
      </div>}
      <p role="status" className="max-w-xl rounded-full bg-[#faf9ef]/90 px-4 py-1.5 text-center text-xs text-[#5d735e]">{lights.status==="loading"?"실종자들의 바람개비를 불러오는 중…":lights.status==="error"?"바람개비를 불러오지 못했음 · 바람개비 목록에서 다시 시도":notice||(mode==="overview"?`${lights.people.length}명의 기억 · 바람개비를 눌러 이야기를 만나기`:"좌우로 방향 전환 · 위아래로 걷기")}</p>
      <nav aria-label="정원 입구로 이동" className="expo-garden-nav pointer-events-auto">
        {EXPO_GARDENS.map((g,i)=><button key={g.name} type="button" disabled={!ready} onClick={()=>enterGarden(i)} aria-current={current?.name===g.name?"location":undefined} className="rounded-xl px-3 py-2 text-xs hover:bg-[#e0e8d7] disabled:opacity-40">{g.path}</button>)}
        <button type="button" disabled={!ready} onClick={()=>moveTo(EXPO_START)} aria-current={!current?"location":undefined} className="rounded-xl px-3 py-2 text-xs hover:bg-[#e0e8d7] disabled:opacity-40">분수 광장</button>
      </nav>
    </div>
    {listOpen&&<LanternDirectory lights={lights} garden={selectedGarden} onGarden={setSelectedGarden} onClose={closeList} onReveal={revealPerson} onSelect={selectPerson} />}
    <AnimatePresence>
      {setupOpen&&<AvatarSetup initial={avatar} accountNickname={accountNickname} onDone={v=>{setAvatar(v);setEditingAvatar(false);}} />}
    </AnimatePresence>
    {lights.selected&&<><div className="absolute inset-0 z-40 bg-[#263a32]/25 backdrop-blur-[2px]" onClick={lights.close} aria-hidden="true" /><MissingCard key={lights.selected} id={lights.selected} regionLabel={regionLabel(lights.people.find(p=>p.id===lights.selected)?.region??"기억의 바람개비")} onClose={lights.close} onViewed={lights.remember} onLighting={lights.updateLighting} onSupported={onSupported} /></>}
  </div>;
}
