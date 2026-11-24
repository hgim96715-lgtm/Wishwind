"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Weather } from "@/lib/weather/types";
const MINE_KEY="missing-weather-mine";
const CLEAR:Weather={kind:"clear",intensity:0,place:"정원"};
function position():Promise<{lat:number;lon:number}>{return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude}),reject,{maximumAge:30*60*1000,timeout:8000,enableHighAccuracy:false}));}
export function useWeather(){
  const [weather,setWeather]=useState<Weather>(CLEAR),[mine,setMine]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState("");
  const useMine=useRef(false),generation=useRef(0),request=useRef<AbortController|null>(null);
  const refresh=useCallback(async(local:boolean)=>{
    const id=++generation.current;request.current?.abort();setError("");
    if(!local){useMine.current=false;setMine(false);setWeather(CLEAR);setLoading(false);try{localStorage.setItem(MINE_KEY,"0");}catch{}return;}
    const ac=new AbortController();request.current=ac;setLoading(true);
    try{
      const coords=await position();if(id!==generation.current)return;
      const r=await fetch(`/api/weather?lat=${coords.lat.toFixed(1)}&lon=${coords.lon.toFixed(1)}`,{signal:ac.signal});if(!r.ok)throw new Error();
      const data=await r.json() as Weather;if(id!==generation.current)return;
      if(!["clear","cloudy","fog","rain","snow"].includes(data.kind))throw new Error();
      setWeather({...data,place:"내 위치"});useMine.current=true;setMine(true);
      try{localStorage.setItem(MINE_KEY,"1");}catch{}
    }catch{if(id===generation.current){setWeather(CLEAR);setMine(false);useMine.current=false;setError("내 위치 날씨를 확인하지 못해 맑은 정원으로 표시 중");}}
    finally{if(id===generation.current)setLoading(false);}
  },[]);
  useEffect(()=>{
    let cancelled=false;
    // Saved opt-in alone must not trigger a new permission prompt on arrival.
    const restore=async()=>{try{if(localStorage.getItem(MINE_KEY)==="1"&&navigator.permissions){const permission=await navigator.permissions.query({name:"geolocation"});if(!cancelled&&permission.state==="granted")void refresh(true);}}catch{}};
    void restore();
    const timer=setInterval(()=>{if(useMine.current&&document.visibilityState==="visible")void refresh(true);},300000);
    return()=>{cancelled=true;clearInterval(timer);generation.current++;request.current?.abort();};
  },[refresh]);
  const askMyLocation=useCallback(async()=>{if(!("geolocation" in navigator)){setError("이 브라우저에서 위치를 지원하지 않아 맑음으로 표시 중");return;}await refresh(true);},[refresh]);
  const clearWeather=useCallback(()=>refresh(false),[refresh]);
  return {weather,mine,loading,error,askMyLocation,clearWeather,backToSeoul:clearWeather};
}
