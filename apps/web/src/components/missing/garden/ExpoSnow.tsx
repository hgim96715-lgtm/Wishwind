"use client";
import { createContext, useContext, useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mapPoint, type Point } from "./expo-layout";
export const SnowContext=createContext<THREE.IUniform<number>>({value:0});
export const useSnow=()=>useContext(SnowContext);
/** One shared uniform tints upward-facing surfaces without extra material passes. */
export function snowMaterial(material:THREE.MeshStandardMaterial,coverage:THREE.IUniform<number>,all=false,color="#EFF4F9"){
  material.onBeforeCompile=shader=>{
    shader.uniforms.snowCoverage=coverage;shader.uniforms.snowTint={value:new THREE.Color(color)};
    shader.vertexShader="varying float snowUp;\n"+shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nsnowUp=normal.y;");
    shader.fragmentShader="varying float snowUp;uniform float snowCoverage;uniform vec3 snowTint;\n"+shader.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,snowTint,snowCoverage*${all?"1.":"smoothstep(.35,.85,snowUp)"});`);
  };
  material.customProgramCacheKey=()=>`garden-snow-${all}-${color}`;material.needsUpdate=true;
  return material;
}
const TREE_POINTS=[[115,95],[165,95],[220,95],[335,95],[390,95],[555,90],[600,90],[650,90],[760,90],[815,90],[850,90],[115,495],[155,555],[205,492],[325,580],[405,640],[350,650],[560,480],[820,635],[855,470]];
export function SnowDetails({player,paused}:{player:RefObject<Point>;paused:boolean}){
  const snow=useSnow(),mesh=useRef<THREE.InstancedMesh>(null),material=useRef<THREE.MeshStandardMaterial>(null),footMesh=useRef<THREE.InstancedMesh>(null);
  const dummy=useMemo(()=>new THREE.Object3D(),[]),time=useRef(0),next=useRef(0),last=useRef<Point|null>(null);
  const footprints=useRef(Array.from({length:28},()=>({x:0,z:0,at:-100,angle:0})));
  const patches=useMemo(()=>{
    const p:T[]=[];type T={x:number;z:number;y:number;s:[number,number,number]};
    TREE_POINTS.forEach(([x,y],i)=>{const q=mapPoint(x,y);p.push({...q,x:q.x+.5,y:.02,s:[.85,.14,.6]});p.push({...q,y:i<5?2.7:i<11?2.9:3.6,s:[.7,.12,.65]});if(i<10)p.push({...q,x:q.x-.8,y:.02,s:[.65,.12,.45]});});
    [[455,347],[505,347],[455,403],[505,403],[380,235],[810,255],[340,550]].forEach(([x,y])=>p.push({...mapPoint(x,y),y:.6,s:[.85,.05,.2]}));
    return p;
  },[]);
  const footGeometry=useMemo(()=>{const g=new THREE.CircleGeometry(1,16);g.setAttribute('fade',new THREE.InstancedBufferAttribute(new Float32Array(28),1));return g;},[]);
  const footMaterial=useMemo(()=>{const m=new THREE.MeshBasicMaterial({color:'#b7c5d4',transparent:true,depthWrite:false});m.onBeforeCompile=s=>{s.vertexShader='attribute float fade;varying float vFade;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFade=fade;');s.fragmentShader='varying float vFade;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vFade;');};return m;},[]);
  useEffect(()=>()=>{footGeometry.dispose();footMaterial.dispose();},[footGeometry,footMaterial]);
  useFrame((_,delta)=>{
    const amount=snow.value;if(!paused)time.current+=Math.min(delta,.05);
    if(mesh.current){mesh.current.visible=amount>.001;patches.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,0);dummy.scale.set(p.s[0],p.s[1]*amount,p.s[2]);dummy.updateMatrix();mesh.current!.setMatrixAt(i,dummy.matrix);});mesh.current.instanceMatrix.needsUpdate=true;}
    if(material.current)material.current.opacity=amount;
    const pos=player.current,previous=last.current;
    if(!previous||Math.hypot(pos.x-previous.x,pos.z-previous.z)>3)last.current={...pos};
    else if(!paused&&amount>.4&&Math.hypot(pos.x-previous.x,pos.z-previous.z)>.5){const angle=Math.atan2(pos.x-previous.x,pos.z-previous.z),side=next.current%2?1:-1;footprints.current[next.current%28]={x:pos.x+Math.cos(angle)*.1*side,z:pos.z-Math.sin(angle)*.1*side,at:time.current,angle};next.current++;last.current={...pos};}
    if(footMesh.current){footMesh.current.visible=amount>.4;const fade=footGeometry.getAttribute('fade') as THREE.InstancedBufferAttribute;footprints.current.forEach((p,i)=>{dummy.position.set(p.x,.045,p.z);dummy.rotation.set(-Math.PI/2,0,-p.angle);dummy.scale.set(.075,.15,1);dummy.updateMatrix();footMesh.current!.setMatrixAt(i,dummy.matrix);fade.setX(i,Math.max(0,1-(time.current-p.at)/5)*.45*amount);});footMesh.current.instanceMatrix.needsUpdate=true;fade.needsUpdate=true;}
  });
  return <><instancedMesh ref={mesh} args={[undefined,undefined,patches.length]} frustumCulled={false} raycast={()=>null}><icosahedronGeometry args={[1,2]}/><meshStandardMaterial ref={material} color="#F8FBFF" roughness={.9} transparent opacity={0} depthWrite={false}/></instancedMesh><instancedMesh ref={footMesh} args={[footGeometry,footMaterial,28]} frustumCulled={false} raycast={()=>null}/></>;
}
