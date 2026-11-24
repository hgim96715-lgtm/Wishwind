"use client";

import { useFrame } from "@react-three/fiber";
import { Suspense, memo, useEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { mapPoint } from "./expo-layout";
import { ExpoLandscape } from "./ExpoLandscape";
import { ExpoPlaces } from "./ExpoPlaces";
import { ExpoVegetation } from "./ExpoPlants";
import { WaterSurface } from "./ExpoWater";
import { FountainWater, LighthouseBeam } from "./ExpoAtmosphere";

type V3 = [number, number, number];
function Ball({ p, s = [1,1,1], color }: { p: V3; s?: V3; color: string }) {
  return <mesh position={p} scale={s} castShadow><icosahedronGeometry args={[1,2]} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>;
}
function Box({ p, s, color }: { p: V3; s: V3; color: string }) {
  return <mesh position={p} castShadow receiveShadow><boxGeometry args={s} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>;
}
function Cylinder({ p, r, h, color }: { p: V3; r: number; h: number; color: string }) {
  return <mesh position={p} castShadow receiveShadow><cylinderGeometry args={[r,r,h,24]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>;
}

function Dinosaur() {
  const p=mapPoint(275,145);
  return <group position={[p.x,0.12,p.z]}>
    <Ball p={[0,0.95,0]} s={[1.35,0.8,0.65]} color="#8bb58b" />
    <Ball p={[0.15,0.75,0.38]} s={[0.85,0.5,0.32]} color="#c2d5a2" />
    {[-0.75,0.7].flatMap(x=>[-0.4,0.4].map(z=><Ball key={`${x}${z}`} p={[x,0.4,z]} s={[0.25,0.48,0.25]} color="#7fa57e" />))}
    <group position={[1,1.55,0]} rotation={[0,0,-0.18]}><Cylinder p={[0,0,0]} r={0.31} h={1.8} color="#8bb58b" /></group>
    <Ball p={[1.25,2.5,0]} s={[0.65,0.42,0.39]} color="#8bb58b" />
    {[-1,1].map(side=><group key={side}>
      <Ball p={[1.42,2.6,side*0.34]} s={[0.07,0.09,0.04]} color="#344c40" />
      <Ball p={[1.27,2.39,side*0.36]} s={[0.12,0.075,0.025]} color="#dfa895" />
    </group>)}
    <group position={[-1.48,0.95,0]} rotation={[0,0,1.1]}><mesh castShadow><coneGeometry args={[0.38,1.6,10]} /><meshStandardMaterial color="#8bb58b" /></mesh></group>
    {[-0.8,-0.25,0.3].map(x=><mesh key={x} position={[x,1.76,0]} castShadow><coneGeometry args={[0.23,0.42,4]} /><meshStandardMaterial color="#edca80" /></mesh>)}
  </group>;
}

function Toys() {
  const p=mapPoint(135,227);
  return <group position={[p.x,0.1,p.z]}>
    <Box p={[-0.65,0.55,0]} s={[1.05,1.05,1.05]} color="#d99e87" />
    <Box p={[0.55,0.55,0]} s={[1.05,1.05,1.05]} color="#8eb7c3" />
    <Box p={[-0.05,1.65,0]} s={[1.05,1.05,1.05]} color="#e9c771" />
    <Ball p={[0.55,0.55,0.54]} s={[0.27,0.27,0.03]} color="#fff2cd" />
    <mesh position={[-0.05,1.65,0.54]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[0.32,0.06,3]} /><meshStandardMaterial color="#fff2cd" /></mesh>
    <Ball p={[-0.65,0.55,0.54]} s={[0.24,0.24,0.03]} color="#fff2cd" />
  </group>;
}

function Hanok({ x,y }: {x:number;y:number}) {
  const p=mapPoint(x,y);
  const roof=useMemo(()=>{
    const vertices:number[]=[],indices:number[]=[];
    for(let row=0;row<=10;row++) for(let col=0;col<=10;col++) {
      const u=col/10*2-1,v=row/10*2-1;
      vertices.push(u*2,2.9-0.75*Math.abs(v)+0.25*Math.pow(Math.abs(v),4)+0.18*Math.pow(Math.abs(u),6),v*1.65);
    }
    for(let r=0;r<10;r++) for(let c=0;c<10;c++) {const a=r*11+c;indices.push(a,a+11,a+1,a+1,a+11,a+12);}
    const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
  },[]);
  useEffect(()=>()=>roof.dispose(),[roof]);
  return <group position={[p.x,0.1,p.z]}>
    <Box p={[0,0.16,0.15]} s={[3.5,0.3,3]} color="#a69476" />
    <Box p={[0,1.2,-0.1]} s={[3,2,2.2]} color="#f3e6ca" />
    {[-1.5,0,1.5].map(x=><Box key={x} p={[x,1.25,1.05]} s={[0.16,2.15,0.16]} color="#88664e" />)}
    {[-0.75,0.75].map(x=><group key={x}><Box p={[x,1.25,1.02]} s={[1.15,1.5,0.1]} color="#b39d76" />{[-0.36,0,0.36].map(dx=><Box key={dx} p={[x+dx,1.25,1.1]} s={[0.035,1.4,0.03]} color="#f9edcf" />)}<Box p={[x,1.3,1.1]} s={[1.1,0.04,0.03]} color="#f9edcf" /></group>)}
    <mesh geometry={roof} castShadow><meshStandardMaterial color="#566c69" side={THREE.DoubleSide} roughness={0.85} /></mesh>
    <Box p={[0,2.93,0]} s={[4.1,0.14,0.18]} color="#677a73" />
    <Box p={[0,0.38,1.35]} s={[3.2,0.15,0.65]} color="#a8825c" />
  </group>;
}

export function Fountain({reducedMotion}:{reducedMotion:boolean}) {
  return <group>
    <Cylinder p={[0,0.18,0]} r={2.5} h={0.35} color="#bbaa89" />
    <WaterSurface y={.49} rx={2.2} rz={2.2} still={reducedMotion} />
    <mesh position={[0,0.52,0]} rotation={[-Math.PI/2,0,0]} castShadow><torusGeometry args={[2.3,0.18,8,64]} /><meshStandardMaterial color="#e5d5b7" /></mesh>
    <Cylinder p={[0,1,0]} r={0.35} h={1.2} color="#d9c9aa" />
    <Cylinder p={[0,1.65,0]} r={1.05} h={0.23} color="#e6d7bc" />
    <WaterSurface y={1.82} rx={.93} rz={.93} still={reducedMotion} />
    <Cylinder p={[0,2.12,0]} r={0.16} h={0.65} color="#e3d5b9" />
    <Ball p={[0,2.5,0]} s={[0.22,0.28,0.22]} color="#a4d8dd" />
    <FountainWater reducedMotion={reducedMotion} />
  </group>;
}

function Lighthouse({night,reducedMotion}:{night:boolean;reducedMotion:boolean}) {
  const p=mapPoint(840,525);
  return <group position={[p.x,0,p.z]}>
    <Cylinder p={[0,0.15,0]} r={1.35} h={0.3} color="#d6ccb2" />
    {[0,1,2,3].map(i=><mesh key={i} position={[0,0.85+i,0]} castShadow><cylinderGeometry args={[0.67-i*0.08,0.75-i*0.08,1,24]} /><meshStandardMaterial color={i%2 ? "#d69b84":"#f5edda"} /></mesh>)}
    <Cylinder p={[0,4.4,0]} r={0.78} h={0.18} color="#597b7c" />
    <Cylinder p={[0,4.9,0]} r={0.45} h={0.85} color="#f3d78f" />
    {[0,1,2,3,4,5].map(i=><Cylinder key={i} p={[Math.cos(i*Math.PI/3)*0.5,4.9,Math.sin(i*Math.PI/3)*0.5]} r={0.035} h={0.95} color="#557779" />)}
    <mesh position={[0,5.55,0]} castShadow><coneGeometry args={[0.9,0.65,12]} /><meshStandardMaterial color="#557779" /></mesh>
    <Box p={[0,0.85,0.74]} s={[0.45,1.05,0.08]} color="#66868a" />
    <LighthouseBeam night={night} reducedMotion={reducedMotion} />
  </group>;
}

function Bench({ x,y,turn=0 }: {x:number;y:number;turn?:number}) {
  const p=mapPoint(x,y);
  return <group position={[p.x,0,p.z]} rotation={[0,turn,0]}>
    {[-0.24,0,0.24].map(z=><Box key={z} p={[0,0.52,z]} s={[1.9,0.1,0.2]} color="#b99470" />)}
    {[0.82,1.05].map(y=><Box key={y} p={[0,y,-0.32]} s={[1.9,0.17,0.09]} color="#bfa080" />)}
    {[-0.72,0.72].map(x=><group key={x}><Box p={[x,0.26,0]} s={[0.1,0.52,0.48]} color="#788574" /><Box p={[x,0.8,-0.32]} s={[0.08,0.65,0.08]} color="#788574" /></group>)}
  </group>;
}

function Sign({ text,x,y }: {text:string;x:number;y:number}) {
  const p=mapPoint(x,y);
  const [near,setNear]=useState(false);
  const visibility=useRef({elapsed:0,near:false});
  useFrame(({camera},dt)=>{
    visibility.current.elapsed+=dt;if(visibility.current.elapsed<.25)return;
    visibility.current.elapsed=0;
    const visible=Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<18&&camera.position.y<15;
    if(visible!==visibility.current.near){visibility.current.near=visible;setNear(visible);}
  });
  const texture=useMemo(()=>{
    const canvas=document.createElement("canvas");canvas.width=768;canvas.height=160;
    const ctx=canvas.getContext("2d")!;ctx.fillStyle="#f8edcf";ctx.fillRect(0,0,768,160);
    ctx.strokeStyle="#bca277";ctx.lineWidth=8;ctx.strokeRect(8,8,752,144);ctx.fillStyle="#405b4a";ctx.font="700 58px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,384,82,700);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
  },[text]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <group position={[p.x,0,p.z]}>
    {near&&<Html center position={[0,2.05,0]} zIndexRange={[8,0]} style={{pointerEvents:"none"}}><span className="garden-sign-label">{text}</span></Html>}
    {[-0.95,0.95].map(x=><Cylinder key={x} p={[x,0.7,0]} r={0.06} h={1.4} color="#a08a67" />)}
    <Box p={[0,1.35,0]} s={[2.7,0.65,0.12]} color="#b59b72" />
    {[0,Math.PI].map(turn=><mesh key={turn} position={[0,1.35,turn===0?0.065:-0.065]} rotation={[0,turn,0]}><planeGeometry args={[2.7,0.6]} /><meshBasicMaterial map={texture} /></mesh>)}
  </group>;
}

export const ExpoDecor=memo(function ExpoDecor({night,reducedMotion}:{night:boolean;reducedMotion:boolean}) {
  return <group>
    <ExpoPlaces /><ExpoLandscape night={night} still={reducedMotion} />
    <Fountain reducedMotion={reducedMotion} /><Dinosaur /><Toys /><Lighthouse night={night} reducedMotion={reducedMotion} />
    <Hanok x={657} y={175} /><Hanok x={742} y={175} />

    <Bench x={455} y={347} turn={-.7} /><Bench x={505} y={347} turn={.7} /><Bench x={455} y={403} turn={-2.4} /><Bench x={505} y={403} turn={2.4} />
    <Sign x={535} y={350} text="← 아이들·계절 / 어른들·바다 →" />
    <Bench x={380} y={235} /><Bench x={810} y={255} /><Bench x={340} y={550} /><Bench x={565} y={590} turn={Math.PI/2} />
    <Sign x={235} y={318} text="아이들의 길" /><Sign x={745} y={318} text="어른들의 길" />
    <Sign x={235} y={429} text="오래 기다리는 길" /><Sign x={745} y={429} text="바다 건너 길" />
    <Suspense fallback={null}><ExpoVegetation reducedMotion={reducedMotion} /></Suspense>
  </group>;
});

export function PlantedPinwheel({ x,z,color,reducedMotion=false }: {x:number;z:number;color:string;reducedMotion?:boolean}) {
  const blades=useRef<THREE.Group>(null);
  useFrame((_,dt)=>{if(blades.current&&!reducedMotion) blades.current.rotation.z-=Math.min(dt,0.05)*0.65;});
  return <group position={[x,0,z]}>
    <Cylinder p={[0,0.65,0]} r={0.025} h={1.3} color="#b4a080" />
    <group position={[0,1.3,0]} ref={blades}>{[0,1,2,3].map(i=><group key={i} rotation={[0,0,i*Math.PI/2]}><mesh position={[0.13,0.19,0]} rotation={[0,0,-0.3]}><circleGeometry args={[0.24,3]} /><meshStandardMaterial color={i%2?"#fff0cf":color} side={THREE.DoubleSide} /></mesh></group>)}</group>
    <Ball p={[0,1.3,0.05]} s={[0.065,0.065,0.065]} color="#e8bd71" />
  </group>;
}
