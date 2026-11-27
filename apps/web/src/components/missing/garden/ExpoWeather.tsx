"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { Weather } from "@/lib/weather/types";
import { mapPoint, MAP_SCALE, type Point } from "./expo-layout";

const RAIN_COUNT=1600,SNOW_COUNT=900,RIPPLE_COUNT=48;
const wrap=(v:number,center:number,width:number)=>((v-center+width/2)%width+width)%width-width/2+center;
export function ExpoWeather({weather,paused,player,wind}:{weather:Weather|null;paused:boolean;player:RefObject<Point>;wind?:RefObject<number>}){
  const rain=useRef<THREE.LineSegments>(null),snow=useRef<THREE.Points>(null),rings=useRef<THREE.InstancedMesh>(null);
  const amount=useRef({rain:0,snow:0}),time=useRef(0),initialized=useRef(false);
  const data=useMemo(()=>{
    const rainGeometry=new THREE.BufferGeometry(),snowGeometry=new THREE.BufferGeometry(),rippleGeometry=new THREE.RingGeometry(.92,1,20);
    const r=new Float32Array(RAIN_COUNT*6),s=new Float32Array(SNOW_COUNT*3),sizes=new Float32Array(SNOW_COUNT);
    for(let i=0;i<RAIN_COUNT;i++){r[i*6]=Math.sin(i*91.3)*18;r[i*6+1]=(i*.618%1)*22;r[i*6+2]=Math.cos(i*57.1)*18;}
    for(let i=0;i<SNOW_COUNT;i++){s[i*3]=Math.sin(i*41.7)*18;s[i*3+1]=(i*.618%1)*22;s[i*3+2]=Math.cos(i*73.1)*18;sizes[i]=[.65,1,1.35][i%3];}
    rainGeometry.setAttribute('position',new THREE.BufferAttribute(r,3).setUsage(THREE.DynamicDrawUsage));snowGeometry.setAttribute('position',new THREE.BufferAttribute(s,3).setUsage(THREE.DynamicDrawUsage));snowGeometry.setAttribute('flakeSize',new THREE.BufferAttribute(sizes,1));rippleGeometry.setAttribute('fade',new THREE.InstancedBufferAttribute(new Float32Array(RIPPLE_COUNT),1));
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.35,'rgba(255,255,255,.9)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const texture=new THREE.CanvasTexture(canvas);
    const rainMaterial=new THREE.LineBasicMaterial({color:'#DCE8F5',transparent:true,opacity:0,depthWrite:false});
    const snowMaterial=new THREE.PointsMaterial({color:'#ffffff',map:texture,size:.13,sizeAttenuation:true,transparent:true,opacity:0,depthWrite:false});
    snowMaterial.onBeforeCompile=shader=>{shader.vertexShader='attribute float flakeSize;\n'+shader.vertexShader.replace('gl_PointSize = size;','gl_PointSize = size * flakeSize;');};
    const rippleMaterial=new THREE.MeshBasicMaterial({color:'#d0dce7',transparent:true,opacity:0,depthWrite:false});
    rippleMaterial.onBeforeCompile=shader=>{shader.vertexShader='attribute float fade;varying float vFade;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFade=fade;');shader.fragmentShader='varying float vFade;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vFade;');};
    return {rainGeometry,snowGeometry,rippleGeometry,rainMaterial,snowMaterial,rippleMaterial,texture,r,s,dummy:new THREE.Object3D(),ripples:Array.from({length:RIPPLE_COUNT},(_,i)=>({x:0,z:0,cycle:-1,phase:i*.618%1}))};
  },[]);
  useEffect(()=>()=>{data.rainGeometry.dispose();data.snowGeometry.dispose();data.rippleGeometry.dispose();data.rainMaterial.dispose();data.snowMaterial.dispose();data.rippleMaterial.dispose();data.texture.dispose();},[data]);
  useFrame((_,delta)=>{
    const dt=Math.min(delta,.05),p=player.current;
    if(!initialized.current){for(let i=0;i<RAIN_COUNT;i++){data.r[i*6]+=p.x;data.r[i*6+2]+=p.z;}for(let i=0;i<SNOW_COUNT;i++){data.s[i*3]+=p.x;data.s[i*3+2]+=p.z;}initialized.current=true;}
    amount.current.rain=THREE.MathUtils.damp(amount.current.rain,weather?.kind==='rain'?1:0,4.6,dt);amount.current.snow=THREE.MathUtils.damp(amount.current.snow,weather?.kind==='snow'?1:0,4.6,dt);
    data.rainMaterial.opacity=amount.current.rain*.42;data.snowMaterial.opacity=amount.current.snow*.9;data.rippleMaterial.opacity=amount.current.rain*.35;
    if(rain.current)rain.current.visible=amount.current.rain>.001;if(snow.current)snow.current.visible=amount.current.snow>.001;if(rings.current)rings.current.visible=amount.current.rain>.001;
    if(paused)return;time.current+=dt;
    if(amount.current.rain>.001){
      for(let i=0;i<RAIN_COUNT;i++){const j=i*6,speed=24+(i%11)*.8,tilt=.08+.08*(wind?.current??1);data.r[j]=wrap(data.r[j]+speed*tilt*dt,p.x,36);data.r[j+1]=wrap(data.r[j+1]-speed*dt,11,22);data.r[j+2]=wrap(data.r[j+2]+speed*.04*dt,p.z,36);const len=.45+(i%5)*.09;data.r[j+3]=data.r[j]-tilt*len;data.r[j+4]=data.r[j+1]+len;data.r[j+5]=data.r[j+2]-.04*len;}
      data.rainGeometry.getAttribute('position').needsUpdate=true;
      const pond=mapPoint(700,550),fade=data.rippleGeometry.getAttribute('fade') as THREE.InstancedBufferAttribute;
      data.ripples.forEach((r,i)=>{const t=time.current*1.7+r.phase,cycle=Math.floor(t),age=t-cycle;if(cycle!==r.cycle||Math.hypot(r.x-p.x,r.z-p.z)>25){r.cycle=cycle;r.x=p.x+Math.sin(i*12.3+cycle*7.1)*17;r.z=p.z+Math.cos(i*8.7+cycle*5.3)*17;}const water=((r.x-pond.x)/(70*MAP_SCALE))**2+((r.z-pond.z)/(40*MAP_SCALE))**2<1;data.dummy.position.set(r.x,water?.075:.03,r.z);data.dummy.rotation.set(-Math.PI/2,0,0);data.dummy.scale.setScalar(.05+age*.55);data.dummy.updateMatrix();rings.current?.setMatrixAt(i,data.dummy.matrix);fade.setX(i,(1-age)**2);});fade.needsUpdate=true;if(rings.current)rings.current.instanceMatrix.needsUpdate=true;
    }
    if(amount.current.snow>.001){for(let i=0;i<SNOW_COUNT;i++){const j=i*3,phase=i*2.399,speed=1.6+(i%7)*.2;data.s[j]=wrap(data.s[j]+(Math.sin(time.current*.7+phase)*.55+(wind?.current??1)*.25)*dt,p.x,36);data.s[j+1]=wrap(data.s[j+1]-speed*dt,11,22);data.s[j+2]=wrap(data.s[j+2]+Math.cos(time.current*.5+phase)*.4*dt,p.z,36);}data.snowGeometry.getAttribute('position').needsUpdate=true;}
  });
  return <><lineSegments ref={rain} geometry={data.rainGeometry} material={data.rainMaterial} frustumCulled={false} raycast={()=>null}/><points ref={snow} geometry={data.snowGeometry} material={data.snowMaterial} frustumCulled={false} raycast={()=>null}/><instancedMesh ref={rings} args={[data.rippleGeometry,data.rippleMaterial,RIPPLE_COUNT]} frustumCulled={false} raycast={()=>null}/></>;
}
