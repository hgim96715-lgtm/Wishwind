"use client";

import { useEffect, useMemo, useState } from "react";
import { LuArrowRight, LuSearch } from "react-icons/lu";
import { GARDEN_PATHS, gardenPathMeta, gardenPathOf } from "@/lib/missing/garden-paths";
import dynamic from "next/dynamic";
import { GardenHero } from "./GardenHero";
import { RegionPicker } from "./RegionPicker";
import { GardenCorner } from "./GardenCorner";
import { useAmbientSound } from "./useAmbientSound";
import { useWeather } from "./useWeather";
import { useOverriddenWeather } from "./dev-garden-weather";
import { currentHour } from "./time-of-day";
import { useNightBrowserTint } from "./useNightBrowserTint";
import { phaseAt, type GardenPhase } from "./garden/expo-environment";

/** 걷는 정원은 누를 때만 불러옴 */
const ExhibitionView = dynamic(() => import("./ExhibitionView").then(m => m.ExhibitionView), { ssr: false });
import { formatMissingDate, groupByRegion, regionLabel } from "@/lib/missing/regions";
import type { MissingSummary } from "@/lib/missing/types";
import { MissingCard } from "./MissingCard";
import { useGardenLanterns } from "./useGardenLanterns";
import "./picture-book.css";

function Pinwheel() {
  return <svg width="27" height="31" viewBox="0 0 40 46" aria-hidden="true"><path d="m20 19 1 26" stroke="#ab845d" strokeWidth="2.5"/><g className="wall-rotor">{["#dd9980","#e8c479","#8db5a3","#b3a6c6"].map((fill,i)=><path key={fill} d="M20 19 5 14 11 3Z" transform={`rotate(${i*90} 20 19)`} fill={fill}/>)}<circle cx="20" cy="19" r="2" fill="#fff0bd"/></g></svg>;
}

function Portrait({person,featured,remembered,onRemember,onSelect}:{person:MissingSummary;featured:boolean;remembered:boolean;onRemember:()=>void;onSelect:()=>void}) {
  const [failed,setFailed]=useState(false);
  const path=gardenPathMeta(gardenPathOf(person));
  return <article className={featured?"wall-card wall-feature":"wall-card"} style={{"--tape":path.signTone} as React.CSSProperties}>
    <span className="wall-tape" aria-hidden="true"/>
    <div className="wall-photo">{person.thumbUrl && !failed ? <img src={person.thumbUrl} alt={person.name+" 공개 사진"} loading={featured?"eager":"lazy"} referrerPolicy="no-referrer" onError={()=>setFailed(true)}/> : <span>{failed?"사진을 불러오지 못함":"공개된 사진 없음"}</span>}</div>
    <div className="wall-caption">{featured ? <p className="wall-today"><span className="wall-today-pin"><Pinwheel/></span>오늘 다시 기억할 분</p> : <p className="wall-path">{path.name}</p>}
      <h2>{person.name}</h2><p className="wall-when">{formatMissingDate(person.missingDate)}<span className="wall-region"> · {regionLabel(person.region)}</span></p>
      {person.lastSeenPlace && <p className="wall-place">{person.lastSeenPlace}</p>}
      {person.appearance && <p className="wall-traits">{person.appearance}</p>}
      <div className="wall-actions"><button aria-pressed={remembered} onClick={onRemember} className="wall-memory"><Pinwheel/>기억하기</button>
      <button onClick={onSelect} className="wall-detail">상세·제보처 <LuArrowRight/></button></div>
    </div>
  </article>;
}

const MEMORY_KEY="wishwind-wall-memories-v1";
const PAGE=6;
export function MissingPictureBook() {
  const lights=useGardenLanterns(false);
  // 정원 걸어 보기: 같은 화면 위에 걷는 정원을 띄움. 뒤로 가기나 "목록"을 누르면 카드 목록으로 돌아옴
  const [walking,setWalking]=useState(false);
  const sound=useAmbientSound();
  const weather=useWeather();
  // 카드 위 정원 입구도 걷는 정원과 같은 DEV 날씨 선택을 보게 함
  const heroWeather=useOverriddenWeather(weather.weather);
  useEffect(()=>{const pop=()=>setWalking(location.hash==="#garden-walk");addEventListener("popstate",pop);return()=>removeEventListener("popstate",pop);},[]);
  // 정원 입구 지나서 스크롤해 내려가면 시계·날씨·소리는 통째로 숨김 (사진첩 카드 위에 떠 있을 이유가 없음)
  const [scrolled,setScrolled]=useState(false);
  useEffect(()=>{const onScroll=()=>setScrolled(window.scrollY>24);onScroll();addEventListener("scroll",onScroll,{passive:true});return()=>removeEventListener("scroll",onScroll);},[]);
  useEffect(()=>{if(!walking)return;const prev=document.documentElement.style.overflow;document.documentElement.style.overflow="hidden";return()=>{document.documentElement.style.overflow=prev;};},[walking]);
  const startWalk=()=>{history.pushState(null,"","#garden-walk");setWalking(true);};
  // 화면 잠금(overflow)이 풀린 다음에 카드 목록으로 내려감
  const toList=()=>{if(location.hash==="#garden-walk")history.replaceState(null,"","#garden-list");setWalking(false);setTimeout(()=>document.getElementById("garden-list")?.scrollIntoView({behavior:"smooth",block:"start"}),60);};
  const [region,setRegion]=useState("");
  const [query,setQuery]=useState("");
  const [limits,setLimits]=useState([PAGE,PAGE,PAGE,PAGE]);
  const [memory,setMemory]=useState<string[]>([]);
  // 위쪽 물결(정원 입구)과 같은 시간대 기준을 써서 카드 목록 배경도 경계 없이 이어짐
  const [phase,setPhase]=useState<GardenPhase>("day");
  useNightBrowserTint(phase === "night");
  const [season,setSeason]=useState(0);
  useEffect(()=>{
    try {const ids:unknown=JSON.parse(localStorage.getItem(MEMORY_KEY)??"[]");if(Array.isArray(ids))setMemory(ids.filter((x):x is string=>typeof x==="string"));} catch {}
    const update=()=>{setPhase(phaseAt(currentHour()));setSeason(Math.floor(((new Date().getMonth()+1)%12)/3));};
    update();const timer=setInterval(update,60000);return()=>clearInterval(timer);
  },[]);
  const choices=useMemo(()=>groupByRegion(lights.people),[lights.people]);
  // 오늘의 세 분: 네 길의 맨 앞 분들 중에서 날마다 시작 길을 바꿔 세 분을 고름
  const q=query.trim().toLowerCase();
  // 공개된 사진이 없는 분은 목록 뒤로 보냄 (사진 있는 분이 먼저 보이게). 정렬은 안정적이라 그 안에서는 원래 순서 유지
  const sections=useMemo(()=>lights.grouped.map(rows=>rows.filter(p=>(!region||p.region===region)&&[p.name,p.lastSeenPlace,regionLabel(p.region)].join(" ").toLowerCase().includes(q)).slice().sort((a,b)=>(a.thumbUrl?0:1)-(b.thumbUrl?0:1))),[lights.grouped,region,q]);
  // 기억하기: 정원에서 바람을 보낼 때처럼 "○○님의 바람개비가 힘차게 돌아가요" 알림을 잠깐 띄움
  const [notice,setNotice]=useState<{text:string;n:number}|null>(null);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(null),2800);return()=>clearTimeout(t);},[notice]);
  const remember=(id:string)=>{const p=lights.people.find(x=>x.id===id);if(!memory.includes(id)){const next=[...memory,id];setMemory(next);try{localStorage.setItem(MEMORY_KEY,JSON.stringify(next));}catch{}}setNotice(n=>({text:`${p?.name??""}님의 바람개비가 힘차게 돌아가요`,n:(n?.n??0)+1}));};
  const card=(p:MissingSummary)=><Portrait key={p.id} person={p} featured={false} remembered={memory.includes(p.id)} onRemember={()=>remember(p.id)} onSelect={()=>lights.select(p.id)}/>;
  const total=sections.reduce((n,s)=>n+s.length,0);
  return <div className="garden-wall" data-phase={phase} data-season={season}>
    <div inert={!!lights.selected||walking}><GardenHero grouped={lights.grouped} onWalk={startWalk} covered={walking} weather={heroWeather}/></div>
    {walking&&<div className="garden-walk-layer"><ExhibitionView onList={toList} sound={sound} weather={weather}/></div>}
    <GardenCorner sound={sound} weather={weather} className={walking?"garden-corner-fixed garden-corner-walking":scrolled?"garden-corner-fixed garden-corner-hidden":"garden-corner-fixed"}/>
    <section id="garden-list" className="wall-inner" inert={!!lights.selected||walking}>
      <div className="wall-filters"><RegionPicker value={region} choices={choices} onChange={r=>{setRegion(r);setLimits([PAGE,PAGE,PAGE,PAGE]);}}/>
      <label><LuSearch/><input aria-label="이름 또는 장소 찾기" placeholder="이름 또는 장소" type="search" value={query} onChange={e=>{setQuery(e.target.value);setLimits([PAGE,PAGE,PAGE,PAGE]);}}/></label></div>
      {total>0 ? GARDEN_PATHS.map((path,i)=>{const rows=sections[i]??[];if(!rows.length)return null;return <section key={path.key} className="wall-path-section" style={{"--tape":path.signTone} as React.CSSProperties}>
        <header className="wall-path-head"><h2>{path.name}</h2><p>{path.mood}</p><span>{rows.length}분</span></header>
        <div className="wall-grid">{rows.slice(0,limits[i]).map(p=>card(p))}</div>
        {rows.length>limits[i] && <button className="wall-more" onClick={()=>setLimits(l=>l.map((n,k)=>k===i?n+PAGE:n))}>{path.name} 더 보기</button>}
      </section>;}) :
      <p role="status">{lights.status==="error"?<button onClick={lights.retry}>목록 다시 불러오기</button>:lights.status==="loading"?"":"조건에 맞는 공개 정보가 없음."}</p>}
    </section>
    {notice && <p key={notice.n} role="status" className="wall-notice">{notice.text}</p>}
    {lights.selected && <><div className="fixed inset-0 z-40 bg-black/30" onClick={lights.close}/><MissingCard id={lights.selected} key={lights.selected} regionLabel={regionLabel(lights.people.find(p=>p.id===lights.selected)?.region??"")} onClose={lights.close} onViewed={lights.remember} onLighting={lights.updateLighting} onSupported={name=>setNotice(n=>({text:`${name}님의 바람개비가 힘차게 돌아가요`,n:(n?.n??0)+1}))}/></>}
  </div>;
}
