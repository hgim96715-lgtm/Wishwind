"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { MeshReflectorMaterial } from "@react-three/drei";
import { mapPoint, MAP_SCALE } from "./expo-layout";
import * as THREE from "three";

/** One small shader surface: moving highlights and ripples, no reflection render pass. */
export function WaterSurface({x=0,z=0,y=.05,rx,rz,night=false,still=false,overlay=false}:{x?:number;z?:number;y?:number;rx:number;rz:number;night?:boolean;still?:boolean;overlay?:boolean}) {
  const uniforms=useMemo(()=>({time:{value:0},night:{value:night?1:0}}),[]);
  useFrame((_,dt)=>{if(!still)uniforms.time.value+=Math.min(dt,.05);uniforms.night.value=THREE.MathUtils.damp(uniforms.night.value,night?1:0,3.1,Math.min(dt,.05));});
  return <mesh position={[x,y,z]} rotation={[-Math.PI/2,0,0]} scale={[rx,rz,1]}>
    <circleGeometry args={[1,64]} />
    <shaderMaterial transparent={overlay} depthWrite={!overlay} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} uniforms={uniforms} side={THREE.DoubleSide} vertexShader={`varying vec2 waterUV; void main(){waterUV=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`
      varying vec2 waterUV;uniform float time;uniform float night;
      void main(){
        vec2 p=waterUV;float r=length(p);
        float swell=sin(p.x*8.+time*.45)*sin(p.y*9.-time*.38);
        float shimmer=sin(p.x*18.+p.y*11.+time*.6)+sin(p.y*21.-p.x*8.-time*.45);
        float rings=sin(r*38.-time*1.8)*exp(-r*2.4);
        vec3 deep=mix(vec3(.18,.39,.43),vec3(.08,.19,.25),night);
        vec3 shallow=mix(vec3(.44,.65,.62),vec3(.20,.34,.38),night);
        vec3 color=mix(deep,shallow,smoothstep(.25,1.,r)*.55+.18);
        color+=vec3(.055,.08,.075)*swell;
        color+=vec3(.14,.18,.16)*pow(max(0.,shimmer*.5),7.)*(1.-night*.35);
        color+=vec3(.09,.13,.12)*max(0.,rings)*.35;
        color=mix(color,shallow+.05,smoothstep(.97,1.,r)*.3);
        gl_FragColor=vec4(color,${overlay?"0.65":"1.0"});
      }`} />
  </mesh>;
}

/** A single low-resolution reflection for the central fountain, with moving surface normals. */
export function FountainReflection({still=false}:{still?:boolean}) {
  const normals=useMemo(()=>{
    const size=128,data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=x/size*Math.PI*2,v=y/size*Math.PI*2,i=(y*size+x)*4;
      data[i]=128+Math.round(17*Math.sin(u*3+v*2)+9*Math.cos(v*5-u*2));
      data[i+1]=128+Math.round(17*Math.cos(v*3-u*2)+9*Math.sin(u*5+v*2));
      data[i+2]=250;data[i+3]=255;
    }
    const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,2);texture.needsUpdate=true;return texture;
  },[]);
  useFrame((_,dt)=>{if(!still){normals.offset.x+=Math.min(dt,.05)*.012;normals.offset.y+=Math.min(dt,.05)*.008;}});
  useEffect(()=>()=>normals.dispose(),[normals]);
  return <mesh position={[0,.49,0]} rotation={[-Math.PI/2,0,0]}>
    <circleGeometry args={[2.2,64]} />
    <MeshReflectorMaterial resolution={192} blur={[0,0]} mirror={0.65} mixStrength={0.6} color="#699e99" roughness={0.18} metalness={0.08} normalMap={normals} normalScale={new THREE.Vector2(.35,.35)} />
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
