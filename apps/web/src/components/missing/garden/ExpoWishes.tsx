"use client";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState, type RefObject } from "react";
import type { Point } from "./expo-layout";
import type { Pinwheel } from "./ExpoScene";
import { PlantedPinwheel } from "./ExpoDecor";

export function ExpoWishes({items,player,still,freshId}:{items:Pinwheel[];player:RefObject<Point>;still:boolean;freshId:string|null}) {
  const [near,setNear]=useState<string[]>([]),elapsed=useRef(0),last=useRef("");
  useFrame((_,dt)=>{elapsed.current+=dt;if(elapsed.current<.3)return;elapsed.current=0;
    const next=items.filter(w=>w.body&&Math.hypot(w.x-player.current.x,w.z-player.current.z)<4).sort((a,b)=>Math.hypot(a.x-player.current.x,a.z-player.current.z)-Math.hypot(b.x-player.current.x,b.z-player.current.z)).slice(0,2).map(w=>w.id);
    const key=next.join();if(last.current!==key){last.current=key;setNear(next);}
  });
  return <>{items.map(w=><group key={w.id}><PlantedPinwheel {...w} reducedMotion={still} />{w.body&&(near.includes(w.id)||w.id===freshId)&&<Html position={[w.x,2.1,w.z]} center distanceFactor={12} zIndexRange={[12,0]}><div className="w-52 rounded-2xl border border-[#e0d8bd] bg-[#fffbef]/95 p-3 text-xs text-[#4a5c45] shadow-sm"><p className="mb-1 text-[10px] text-[#889078]">{w.nickname||"누군가"}님의 바람개비{w.pending?" · 확인 중":""}</p><p>{w.body}</p></div></Html>}</group>)}</>;
}
