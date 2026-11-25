"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";

import type { MissingSummary } from "@/lib/missing/types";

import { gardenRoute, canWalk, mapPoint, MAP_SCALE, type Point } from "./expo-layout";

export const LANTERN_GROUP_SIZE=28;
export type GardenLantern = Point & {person:MissingSummary;garden:number;low:boolean};

/** Sample both verges of the actual paths, excluding junctions and obstacles. */
export function gardenLanternSlots(garden:number):Point[] {
  const route=gardenRoute(garden),ctx=document.createElement("canvas").getContext("2d")!;
  const path=new Path2D(route),candidates:Point[]=[];
  ctx.lineWidth=29;
  for(const section of route.match(/M[^M]+/g)??[]){
    const svg=document.createElementNS("http://www.w3.org/2000/svg","path");svg.setAttribute("d",section);
    const length=svg.getTotalLength();
    for(let d=8;d<length;d+=3/MAP_SCALE){
      const p=svg.getPointAtLength(d),a=svg.getPointAtLength(Math.max(0,d-1)),b=svg.getPointAtLength(Math.min(length,d+1));
      const len=Math.hypot(b.x-a.x,b.y-a.y)||1;
      for(const side of [-1,1]){
        const x=p.x-(b.y-a.y)/len*17*side,y=p.y+(b.x-a.x)/len*17*side,q=mapPoint(x,y);
        if(!ctx.isPointInStroke(path,x,y)&&canWalk(q.x,q.z)&&canWalk(q.x+.5,q.z+.5)&&canWalk(q.x-.5,q.z-.5))candidates.push(q);
      }
    }
  }
  // Farthest-first selects an even spread while preserving at least 3m clearance.
  const slots:Point[]=[];
  while(candidates.length&&slots.length<LANTERN_GROUP_SIZE){
    let best=0,distance=-1;
    candidates.forEach((p,i)=>{const nearest=slots.length?Math.min(...slots.map(q=>Math.hypot(q.x-p.x,q.z-p.z))):1;if(nearest>distance){best=i;distance=nearest;}});
    const p=candidates.splice(best,1)[0];if(slots.length&&distance<3)break;slots.push(p);
  }
  return slots;
}
export function placeGardenLanterns(groups:MissingSummary[][]):GardenLantern[]{
  if(typeof document==="undefined"||!groups.some(g=>g.length))return [];
  return groups.flatMap((people,garden)=>{const slots=gardenLanternSlots(garden);return people.slice(0,slots.length).map((person,i)=>({...slots[i],person,garden,low:i%2===1}));});
}

export function ExpoLanterns({items,visited,strength,reducedMotion,onSelect,player}:{items:GardenLantern[];visited:ReadonlySet<string>;night:boolean;strength:number;reducedMotion:boolean;onSelect:(id:string)=>void;player:RefObject<Point>}){
  const refs=useRef<(THREE.InstancedMesh|null)[]>([]),{gl}=useThree();
  const [hover,setHover]=useState<string|null>(null),[near,setNear]=useState<string|null>(null);
  const motion=useRef(new Map<string,{angle:number;speed:number;count:number;burst:number}>());
  const elapsed=useRef(0);
  const resources=useMemo(()=>{
    // Folded paper sails share a pivot at the hub, never at the ground.
    const blade=new THREE.BufferGeometry();
    blade.setAttribute("position",new THREE.Float32BufferAttribute([0,0,.025, .15,.55,0, -.27,.43,.025, 0,0,.025, -.27,.43,.025, -.13,.18,.13],3));blade.computeVertexNormals();
    const matte=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.95,metalness:0,side:THREE.DoubleSide});
    const geometries=[new THREE.CylinderGeometry(.028,.04,1.25,6).translate(0,.625,0),blade,blade.clone(),blade.clone(),blade.clone(),new THREE.SphereGeometry(.067,8,6),new THREE.TorusGeometry(.085,.012,4,16)];
    const materials=[matte("#B18A5E"),matte("#ffffff"),matte("#ffffff"),matte("#ffffff"),matte("#ffffff"),matte("#FFF3CC"),matte("#E1AC61")];
    return {geometries,materials,dummy:new THREE.Object3D(),color:new THREE.Color()};
  },[]);
  useEffect(()=>()=>{new Set(resources.geometries).forEach(g=>g.dispose());resources.materials.forEach(m=>m.dispose());},[resources]);
  useEffect(()=>{gl.domElement.style.cursor=hover?"pointer":"";return()=>{gl.domElement.style.cursor="";};},[hover,gl]);
  useLayoutEffect(()=>{
    setHover(null);setNear(null);
    const {dummy,color}=resources;
    const palettes=[["#F2AA91","#F5D47C","#A3C8B0","#A9BDDE"],["#D8B3A8","#E6CE9E","#9FB9A0","#BDB3D5"],["#E3A595","#DABD7F","#A9BC91","#D4BEDB"],["#94BDD6","#F2D898","#A4D3CB","#F0B6A1"]];
    refs.current.forEach((mesh,j)=>{
      if(!mesh)return;
      mesh.instanceMatrix.setUsage(j>=1&&j<=4?THREE.DynamicDrawUsage:THREE.StaticDrawUsage);
      items.forEach((p,i)=>{
        const size=p.low?.78:1;
        dummy.position.set(p.x,j===0?0:1.25*size,p.z+(j===0?0:j===6?.095:.055));
        dummy.rotation.set(0,0,j>=1&&j<=4?(j-1)*Math.PI/2:0);
        dummy.scale.setScalar(j===6&&!visited.has(p.person.id)?0:size);
        dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
        if(j>=1&&j<=4)mesh.setColorAt(i,color.set(palettes[p.garden][(j-1+i)%4]));
      });
      mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    });
  },[items,visited,resources]);
  useEffect(()=>{resources.materials.slice(1,6).forEach(m=>{m.emissive.set("#FFE7B0");m.emissiveIntensity=Math.min(.22,strength*.12);});},[strength,resources]);
  useFrame((_,delta)=>{
    const dt=Math.min(delta,.05),{dummy}=resources;let closest:string|null=null,dist=12;
    items.forEach((p,i)=>{
      const distance=Math.hypot(p.x-player.current.x,p.z-player.current.z);
      if(distance<dist){dist=distance;closest=p.person.id;}
      const count=p.person.lightCount??0;
      let state=motion.current.get(p.person.id);
      if(!state){state={angle:i*1.37,speed:.45,count,burst:0};motion.current.set(p.person.id,state);}
      if(count>state.count)state.burst=4;
      state.count=count;state.burst=Math.max(0,state.burst-dt);
      const base=.45+Math.min(.85,Math.log1p(count)*.18);
      state.speed=THREE.MathUtils.damp(state.speed,state.burst>0?3:base,2.5,dt);
      if(!reducedMotion)state.angle=(state.angle+state.speed*dt)%(Math.PI*2);
      const size=p.low?.78:1,hub=1.25*size;
      refs.current.forEach((mesh,j)=>{
        if(!mesh||j<1||j>4||reducedMotion)return;
        dummy.position.set(p.x,hub,p.z+.055);dummy.rotation.set(0,0,state.angle+(j-1)*Math.PI/2);dummy.scale.setScalar(size);
        dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      });
    });
    // Keep removed groups from accumulating animation state indefinitely.
    if(motion.current.size>160){const ids=new Set(items.map(p=>p.person.id));for(const id of motion.current.keys())if(!ids.has(id))motion.current.delete(id);}
    refs.current.forEach((m,j)=>{if(m&&j>=1&&j<=4&&!reducedMotion)m.instanceMatrix.needsUpdate=true;});
    elapsed.current+=delta;if(elapsed.current>.2){elapsed.current=0;setNear(closest);}
  });
  const events={onPointerMove:(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();setHover(items[e.instanceId??-1]?.person.id??null);},onPointerOut:()=>setHover(null),onClick:(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();const p=items[e.instanceId??-1];if(e.delta<5&&p)onSelect(p.person.id);}};
  const label=items.find(p=>p.person.id===(hover??near));
  return <group>{resources.geometries.map((geometry,j)=><instancedMesh key={`${j}-${items.length}`} ref={m=>{refs.current[j]=m;}} args={[geometry,resources.materials[j],items.length]} frustumCulled={false} {...events}/>)}
    {label&&Math.hypot(label.x-player.current.x,label.z-player.current.z)<=12&&<Html position={[label.x,label.low?1.8:2.15,label.z]} center zIndexRange={[14,0]}><button type="button" onClick={()=>onSelect(label.person.id)} className="garden-person-label relative w-max whitespace-nowrap rounded-full bg-[#FFFDF7]/95 px-3.5 py-1.5 text-[13px] text-[#3D2E1E] shadow-md">{label.person.name} · 이야기 보기<span aria-hidden="true" className="garden-person-tail absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-[#FFFDF7]/95"/></button></Html>}
  </group>;
}
