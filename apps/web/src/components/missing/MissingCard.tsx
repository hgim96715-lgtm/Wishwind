"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LuMapPin, LuShare2, LuX, LuWind } from "react-icons/lu";
import { formatMissingDate } from "@/lib/missing/regions";
import type { MissingDetail } from "@/lib/missing/types";
import { fileUrl, recordFileEvent } from "@/lib/files/client";

type Load={state:"loading"}|{state:"error";message:string}|{state:"ready";data:MissingDetail};
export function MissingCard({id,regionLabel,onClose,onViewed,onLighting,onSupported}:{id:string;regionLabel:string;onClose:()=>void;onViewed?:(id:string)=>void;onLighting?:(id:string,count:number)=>void;onSupported?:(name:string)=>void}){
  const [load,setLoad]=useState<Load>({state:"loading"});
  const closeRef=useRef<HTMLButtonElement>(null),dragY=useRef<number|null>(null);
  useEffect(()=>{const ac=new AbortController();fetch(`/missing/person/${encodeURIComponent(id)}`,{signal:ac.signal}).then(async r=>{if(!r.ok)throw new Error("정보를 불러오지 못했음");return r.json() as Promise<MissingDetail>;}).then(data=>{if(!ac.signal.aborted){setLoad({state:"ready",data});onViewed?.(id);}}).catch(e=>{if(e.name!=="AbortError")setLoad({state:"error",message:e.message});});return()=>ac.abort();},[id,onViewed]);
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;closeRef.current?.focus();
    const key=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();if(e.key!=="Tab")return;const nodes=closeRef.current?.closest('[role="dialog"]')?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],summary');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};
    window.addEventListener("keydown",key);return()=>{window.removeEventListener("keydown",key);previous?.focus();};
  },[onClose]);
  return <motion.div role="dialog" aria-modal="true" aria-label="실종자 정보" initial={{y:28,opacity:0}} animate={{y:0,opacity:1}} exit={{y:28,opacity:0}} transition={{duration:.2}} className="garden-person-dialog fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl border border-[#e5dcc8] bg-[#FFFDF7] px-5 pb-[max(16px,env(safe-area-inset-bottom))] text-[#3D2E1E] shadow-[0_-8px_60px_#27332626] md:w-[min(92vw,800px)] md:px-8">
    <div className="pb-5 pt-3" style={{touchAction:"none"}} onPointerDown={e=>{dragY.current=e.clientY;e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{if(dragY.current!==null&&e.clientY-dragY.current>90)onClose();dragY.current=null;}} onPointerCancel={()=>{dragY.current=null;}}><div className="mx-auto h-1 w-12 rounded-full bg-[#d7d1c3]" /></div>
    <button ref={closeRef} type="button" aria-label="닫기" onClick={onClose} className="absolute right-3 top-3 rounded-full p-2 text-[#8c806d] hover:bg-[#f4ede0]"><LuX size={20}/></button>
    {load.state==="loading"&&<p role="status" className="py-12 text-center text-sm">이야기를 불러오는 중…</p>}
    {load.state==="error"&&<p role="alert" className="py-12 text-center text-sm">{load.message}</p>}
    {load.state==="ready"&&<CardBody data={load.data} regionLabel={regionLabel} onLighting={onLighting} onSupported={onSupported}/>}
  </motion.div>;
}
function CardBody({data,regionLabel,onLighting,onSupported}:{data:MissingDetail;regionLabel:string;onLighting?:(id:string,count:number)=>void;onSupported?:(name:string)=>void}){
  const [count,setCount]=useState(data.lightCount??0),[lit,setLit]=useState(false),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState("");
  const [supportMessage,setSupportMessage]=useState("");
  const [appearanceExpanded,setAppearanceExpanded]=useState(false);
  const [shareMessage,setShareMessage]=useState(""),[translation,setTranslation]=useState<string|null>(null),[translating,setTranslating]=useState(false),[translationError,setTranslationError]=useState("");
  const pending=useRef(false),version=useRef(0),alive=useRef(true);
  const storageKey=`wishwind-lit:${data.id}`;
  const sync=useCallback((value:number)=>{setCount(value);onLighting?.(data.id,value);},[data.id,onLighting]);
  useEffect(()=>{alive.current=true;const ac=new AbortController();const initialVersion=version.current;let saved=false;try{saved=localStorage.getItem(storageKey)==="1";}catch{}setLit(saved);
    fetch(`/missing/person/${data.id}/light`,{signal:ac.signal,cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error();return r.json() as Promise<{count:number;lit:boolean}>;}).then(result=>{if(ac.signal.aborted||version.current!==initialVersion)return;sync(result.count);setLit(result.lit||saved);setReady(true);}).catch(e=>{if(e.name!=="AbortError"){setReady(true);setError("응원 수를 불러오지 못했음. 바람개비 날리기로 다시 시도할 수 있음.");}});
    return()=>{ac.abort();alive.current=false;};
  },[data.id,storageKey,sync]);
  const light=async()=>{
    if(lit||pending.current)return;pending.current=true;setBusy(true);setError("");version.current++;const before=count;sync(before+1);setLit(true);
    try{const r=await fetch(`/missing/person/${data.id}/light`,{method:"POST",headers:{"content-type":"application/json"},body:"{}"});if(!r.ok)throw new Error();const result=await r.json() as {count:number;lit:boolean;added?:boolean};if(result.added!==false){onSupported?.(data.name);if(alive.current)setSupportMessage(`${data.name}님의 바람개비가 멋지게 돌아가고 있습니다`);}try{localStorage.setItem(storageKey,"1");}catch{}onLighting?.(data.id,result.count);if(alive.current){setCount(result.count);setLit(result.lit);}}
    catch{onLighting?.(data.id,before);if(alive.current){setCount(before);setLit(false);setError("바람개비를 저장하지 못했음. 다시 눌러 시도할 수 있음.");}}
    finally{pending.current=false;if(alive.current)setBusy(false);}
  };
  const share=async()=>{const url=fileUrl("missing",data.id);try{if(navigator.share){await navigator.share({title:`${data.name}님을 찾습니다`,url});void recordFileEvent("missing",data.id,"SHARE","native");}else{await navigator.clipboard.writeText(url);setShareMessage("링크를 복사했음");void recordFileEvent("missing",data.id,"SHARE","link");}}catch(e){if((e as Error).name!=="AbortError")setShareMessage("공유하지 못했음. 다시 시도할 수 있음.");}};
  const translate=async()=>{setTranslating(true);setTranslationError("");try{const r=await fetch(`/missing/person/${data.id}/translation`),body=await r.json();if(!r.ok||!body.descriptionKo)throw new Error();setTranslation(body.descriptionKo);}catch{setTranslationError("번역하지 못했음. 원문을 확인할 수 있음.");}finally{setTranslating(false);}};
  return <>
    <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-4 md:grid-cols-[152px_1fr] md:gap-x-6">
      <div className="row-span-1 h-28 w-25 overflow-hidden rounded-2xl bg-[#f4ede0] md:h-40 md:w-38 md:rounded-2xl">
        {data.photoUrl?/* eslint-disable-next-line @next/next/no-img-element */<img src={data.photoUrl} alt={`${data.name}님 사진`} referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={e=>{e.currentTarget.style.visibility="hidden";}}/>:<div className="grid h-full place-items-center text-xs text-[#9c8d76]">사진 없음</div>}
      </div>
      <div className="min-w-0 pr-5"><h2 className="text-2xl font-bold leading-tight md:text-3xl">{data.name}</h2><p className="mt-2 text-xs leading-5 text-[#8C7A65] md:text-sm">{formatMissingDate(data.missingDate)} 실종{data.ageNow!==null?` · 추정 ${data.ageNow}세`:data.ageAtMissing!==null?` · 당시 ${data.ageAtMissing}세`:""}</p><p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-[#8C7A65] md:text-sm"><LuMapPin className="mt-0.5 shrink-0"/>{data.lastSeenPlace||regionLabel}</p></div>
      <div className="col-span-2 grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <section className="rounded-2xl bg-[#F4EDE0] p-3.5"><h3 className="text-sm font-semibold">인상착의</h3><p id="garden-appearance" className={`mt-1 whitespace-pre-line text-xs leading-5 text-[#786650] ${appearanceExpanded?"":"line-clamp-5"}`}>{data.appearance||"공개된 인상착의 정보가 없음"}</p>{data.appearance&&data.appearance.length>100&&<button type="button" aria-expanded={appearanceExpanded} aria-controls="garden-appearance" onClick={()=>setAppearanceExpanded(v=>!v)} className="mt-2 min-h-9 rounded-lg px-2 text-xs font-medium text-[#526e58] underline underline-offset-4">{appearanceExpanded?"접기":"인상착의 전체 보기"}</button>}</section>
        <div className="flex flex-col gap-2"><div className="grid grid-cols-[1.25fr_1fr] gap-2"><button type="button" onClick={()=>void light()} disabled={!ready||lit||busy} aria-pressed={lit} className="flex min-h-11 items-center justify-center gap-1 rounded-full bg-[#9AA98C] px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-[#879977] disabled:cursor-default disabled:bg-[#a9b59d]"><LuWind className="shrink-0"/>{busy?"바람 보내는 중…":lit?"바람을 보냈어요":"바람개비 날리기"} · {count}</button><button type="button" onClick={()=>void share()} className="garden-share-button flex min-h-11 items-center justify-center gap-1 rounded-full border border-[#c4c9b8] bg-white px-2 py-2 text-xs font-medium text-[#7b886c]"><LuShare2/>링크 공유</button></div><a href={data.tip.url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center rounded-full bg-[#E5A13E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d49330]">{data.tip.label}</a>{error&&<p role="alert" className="text-[11px] text-[#a05b3e]">{error}</p>}{supportMessage&&<p role="status" className="text-xs leading-5 text-[#55734f]">{supportMessage}</p>}{shareMessage&&<p role="status" className="text-[11px] text-[#8c7a65]">{shareMessage}</p>}</div>
      </div>
    </div>
    {data.description&&<details className="mt-3 rounded-xl border border-[#eee5d5] px-3 py-2 text-xs text-[#8c7a65]"><summary className="cursor-pointer">사연·기록 더 보기</summary><p className="mt-2 whitespace-pre-line leading-6">{translation||data.description}</p>{data.source==="FBI"&&!translation&&<button type="button" disabled={translating} onClick={()=>void translate()} className="mt-2 underline">{translating?"번역 중…":"한국어로 번역"}</button>}{translation&&<p className="mt-2">AI 번역 · 정확한 내용은 출처 원문 확인</p>}{translationError&&<p role="status">{translationError}</p>}</details>}
    <p className="mt-4 border-t border-[#e9e3d5] pt-3 text-center text-[11px] leading-5 text-[#9a9685]">자료 출처: <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="underline">{data.sourceLabel}</a> · 지금까지 {count}명이 바람을 보냈습니다</p>
  </>;
}
