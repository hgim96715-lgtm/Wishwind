"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { groupByGarden, type GardenPathKey } from "@/lib/missing/garden-paths";
import { regionLabel } from "@/lib/missing/regions";
import type { MissingSummary } from "@/lib/missing/types";
import { LANTERN_GROUP_SIZE, placeGardenLanterns } from "./garden/ExpoLanterns";

import { dailyGardenOrder, gardenDay } from "@/lib/missing/daily-garden";

const KEYS:GardenPathKey[]=["children","village","waiting","abroad"];
const VIEWED_KEY="wishwind-opened-lanterns-v1";
export function useGardenLanterns() {
  const [day,setDay]=useState(0);
  useEffect(()=>{const update=()=>setDay(gardenDay());update();const timer=setInterval(update,30000);document.addEventListener("visibilitychange",update);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",update);};},[]);
  useEffect(()=>setPages([0,0,0,0]),[day]);
  const [people,setPeople]=useState<MissingSummary[]>([]);
  const [status,setStatus]=useState<"loading"|"ready"|"error">("loading"),[attempt,setAttempt]=useState(0);
  const [query,setQuery]=useState("");
  const [pages,setPages]=useState([0,0,0,0]);
  const [visited,setVisited]=useState<ReadonlySet<string>>(new Set());
  const [selected,setSelected]=useState<string|null>(null);
  useEffect(()=>{
    const ac=new AbortController();
    fetch("/missing/lanterns",{signal:ac.signal}).then(async r=>{
      if(!r.ok)throw new Error("Unavailable");
      const data=await r.json() as {items:MissingSummary[]};
      if(!Array.isArray(data.items))throw new Error("Invalid response");
      const ids=new Set<string>();setPeople(data.items.filter(p=>!ids.has(p.id)&&!!ids.add(p.id)));setStatus("ready");
      const shared=new URLSearchParams(window.location.search).get("person");if(shared)setSelected(shared);
    }).catch(e=>{if(e.name!=="AbortError")setStatus("error");});
    return()=>ac.abort();
  },[attempt]);
  useEffect(()=>{try{const data:unknown=JSON.parse(localStorage.getItem(VIEWED_KEY)??"[]");if(Array.isArray(data))setVisited(new Set(data.filter((id):id is string=>typeof id==="string")));}catch{/* Optional local history. */}},[]);
  const remember=useCallback((id:string)=>{setVisited(previous=>{if(previous.has(id))return previous;const next=new Set(previous);next.add(id);try{localStorage.setItem(VIEWED_KEY,JSON.stringify([...next]));}catch{/* Browsing still works when storage is disabled. */}return next;});},[]);
  const grouped=useMemo(()=>{const result=groupByGarden(people,people.length?Date.now():0);return KEYS.map(key=>dailyGardenOrder(result[key],day,LANTERN_GROUP_SIZE));},[people,day]);
  const groups=useMemo(()=>grouped.map(rows=>rows.filter(p=>`${p.name} ${p.region} ${regionLabel(p.region)} ${p.lastSeenPlace??""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))),[grouped,query]);
  const pageCounts=groups.map(g=>Math.max(1,Math.ceil(g.length/LANTERN_GROUP_SIZE)));
  const visibleGroups=useMemo(()=>groups.map((g,i)=>{const start=(pages[i]%Math.max(1,Math.ceil(g.length/LANTERN_GROUP_SIZE)))*LANTERN_GROUP_SIZE;return g.slice(start,start+LANTERN_GROUP_SIZE);}),[groups,pages]);
  const lanterns=useMemo(()=>placeGardenLanterns(visibleGroups),[visibleGroups]);
  const nextGroup=(garden:number)=>setPages(p=>p.map((v,i)=>i===garden?(v+1)%pageCounts[i]:v));
  const reveal=(id:string)=>{
    for(let garden=0;garden<grouped.length;garden++){
      const index=grouped[garden].findIndex(p=>p.id===id);if(index<0)continue;
      const page=Math.floor(index/LANTERN_GROUP_SIZE);setQuery("");setPages(p=>p.map((v,i)=>i===garden?page:v));
      return placeGardenLanterns(grouped.map((g,i)=>i===garden?g.slice(page*LANTERN_GROUP_SIZE,(page+1)*LANTERN_GROUP_SIZE):[])).find(l=>l.person.id===id);
    }
  };
  const search=useCallback((value:string)=>{setQuery(value);setPages([0,0,0,0]);},[]);
  const retry=()=>{setStatus("loading");setAttempt(n=>n+1);};
  const updateLighting=useCallback((id:string,count:number)=>setPeople(rows=>rows.map(p=>p.id===id?{...p,lightCount:count}:p)),[]);
  const close=useCallback(()=>setSelected(null),[]);
  return {updateLighting,pages,pageCounts,visibleGroups,nextGroup,reveal,people,status,retry,groups,grouped,query,search,lanterns,visited,remember,selected,select:setSelected,close};
}
