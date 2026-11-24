"use client";

import { useEffect, useRef } from "react";
import { GardenChoice } from "./GardenChoice";
import { EXPO_GARDENS } from "./garden/expo-layout";
import type { useGardenLanterns } from "./useGardenLanterns";
import { regionLabel } from "@/lib/missing/regions";

export function LanternDirectory({lights,garden,onGarden,onClose,onReveal,onSelect}:{lights:ReturnType<typeof useGardenLanterns>;garden:number;onGarden:(index:number)=>void;onClose:()=>void;onReveal:(id:string)=>void;onSelect:(id:string)=>void}) {
  const root=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;close.current?.focus();
    const key=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();if(e.key!=="Tab")return;const nodes=root.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input,select');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};
    window.addEventListener("keydown",key);return()=>{window.removeEventListener("keydown",key);previous?.focus();};
  },[onClose]);
  const rows=lights.groups[garden],total=rows.length;
  return <div className="absolute inset-0 z-40 flex items-end justify-center bg-[#293d34]/20">
    <div ref={root} role="dialog" aria-modal="true" aria-labelledby="lantern-directory-title" className="garden-directory-dialog flex w-full max-w-2xl max-h-[75dvh] flex-col overflow-hidden rounded-t-3xl border border-[#e4dac6] bg-[#fffaf1] p-5 shadow-xl">
      <div className="flex items-start justify-between gap-3"><div><h2 id="lantern-directory-title" className="text-lg font-semibold">기억의 바람개비</h2><p className="mt-1 text-xs text-[#74816e]">바람개비 하나에 한 사람의 이야기가 담겨 있음</p></div><button ref={close} type="button" onClick={onClose} className="rounded-full border border-[#d5dbc9] px-3 py-1.5 text-xs">닫기</button></div>
      <div className="mt-5"><GardenChoice label="정원" value={String(garden)} options={EXPO_GARDENS.map((g,i)=>({value:String(i),label:`${g.name} · ${lights.grouped[i].length}명`}))} onChange={value=>onGarden(Number(value))}/></div>
      <label className="mt-3 text-xs text-[#6b7c66]">이름 또는 지역<input value={lights.query} onChange={e=>lights.search(e.target.value)} placeholder="기억하는 이름이나 지역" className="mt-1 block w-full rounded-xl border border-[#d5dbc9] bg-white p-3 text-sm outline-offset-2" /></label>
      <p className="my-3 text-xs text-[#74816e]">{total}명 · 전체 검색 결과 · 정원에서는 매일 다른 분들의 이야기를 만날 수 있음</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {lights.status==="loading"&&<p role="status" className="py-8 text-center text-sm">바람개비의 이야기를 불러오는 중…</p>}
        {lights.status==="error"&&<div className="py-8 text-center text-sm"><p>실종자 목록을 불러오지 못했음.</p><button type="button" onClick={lights.retry} className="mt-3 underline">다시 불러오기</button></div>}
        {lights.status==="ready"&&!rows.length&&<p className="py-8 text-center text-sm text-[#74816e]">이 정원에서 조건에 맞는 분을 찾지 못했음.</p>}
        {rows.map(person=><article key={person.id} className="mb-2 rounded-2xl border border-[#e5dfcf] bg-white/70 p-3"><button type="button" onClick={()=>onSelect(person.id)} className="block w-full text-left"><span className="flex items-center justify-between gap-2"><strong className="text-sm font-medium">{person.name}</strong>{lights.visited.has(person.id)&&<span className="shrink-0 rounded-full bg-[#e2ece0] px-2 py-0.5 text-[10px] text-[#5a765e]">열어본 바람개비</span>}</span><span className="mt-1 block text-xs leading-5 text-[#74816e]">{regionLabel(person.region)} · {person.missingDate?person.missingDate.slice(0,10):"실종일 미상"}</span></button><button type="button" onClick={()=>onReveal(person.id)} className="mt-2 text-xs text-[#8a7049] underline underline-offset-4">정원에서 바람개비 보기</button></article>)}
      </div>

    </div>
  </div>;
}
