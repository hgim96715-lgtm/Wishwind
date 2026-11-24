"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { mapPoint, MAP_SCALE } from "./expo-layout";
import * as THREE from "three";

/** One small shader surface: moving highlights and ripples, no reflection render pass. */
export function WaterSurface({x=0,z=0,y=.05,rx,rz,night=false,still=false}:{x?:number;z?:number;y?:number;rx:number;rz:number;night?:boolean;still?:boolean}) {
  const uniforms=useMemo(()=>({time:{value:0},night:{value:night?1:0}}),[]);
  useFrame((_,dt)=>{if(!still)uniforms.time.value+=Math.min(dt,.05);uniforms.night.value=THREE.MathUtils.damp(uniforms.night.value,night?1:0,3.1,Math.min(dt,.05));});
  return <mesh position={[x,y,z]} rotation={[-Math.PI/2,0,0]} scale={[rx,rz,1]}>
    <circleGeometry args={[1,64]} />
    <shaderMaterial polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} uniforms={uniforms} side={THREE.DoubleSide} vertexShader={`varying vec2 waterUV; void main(){waterUV=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`
      varying vec2 waterUV;uniform float time;uniform float night;
      void main(){
        vec2 p=waterUV;float r=length(p);
        float a=sin(p.x*24.+p.y*9.+time*.8);
        float b=sin(p.y*32.-p.x*6.-time*.65);
        float ripple=sin(p.x*18.+p.y*13.+sin(p.y*9.-time*.35)-time*.7);
        vec3 deep=mix(vec3(.22,.49,.53),vec3(.10,.24,.31),night);
        vec3 shallow=mix(vec3(.56,.75,.70),vec3(.25,.40,.43),night);
        vec3 color=mix(deep,shallow,smoothstep(.15,1.,r));
        color+=vec3(.16,.23,.22)*pow(max(0.,a*b),12.)*(1.-night*.65);
        color+=vec3(.10,.14,.14)*smoothstep(.92,1.,ripple)*.3;
        color=mix(color,shallow+.12,smoothstep(.965,.99,r)*.5);
        gl_FragColor=vec4(color,1.);
      }`} />
  </mesh>;
}

export function ExpoPond({night,still}:{night:boolean;still:boolean}) {
  const p=mapPoint(700,550),rx=70*MAP_SCALE,rz=40*MAP_SCALE;
  return <group>
    <mesh position={[p.x,.025,p.z]} rotation={[-Math.PI/2,0,0]} scale={[rx+.3,rz+.3,1]}><circleGeometry args={[1,64]} /><meshStandardMaterial polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} color="#b8b79c" roughness={1} /></mesh>
    <WaterSurface x={p.x} z={p.z} rx={rx} rz={rz} night={night} still={still} />
    {[0,1,2,3,4,5,6].map(i=>{const a=i*.54+.1;return <mesh key={i} position={[p.x+Math.cos(a)*(rx+.15),.12,p.z+Math.sin(a)*(rz+.15)]} scale={[.3+(i%2)*.15,.18,.25]}><icosahedronGeometry args={[1,1]} /><meshStandardMaterial color={i%2?"#b7b49a":"#a6ac94"} roughness={1} /></mesh>;})}
  </group>;
}
