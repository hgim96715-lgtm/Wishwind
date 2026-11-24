"use client";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EXPO_REST_STOPS, mapPoint } from "./expo-layout";

function Timber({p,s,color="#c5a478"}:{p:[number,number,number];s:[number,number,number];color?:string}){
  return <mesh position={p} castShadow><boxGeometry args={s}/><meshStandardMaterial color={color} roughness={1}/></mesh>;
}
function Shelter({x,y,index}:{x:number;y:number;index:number}){
  const p=mapPoint(x,y),play=index===0,coast=index>=6,covered=index%2===0;
  return <group position={[p.x,0,p.z]}>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.018,0]}><circleGeometry args={[2.5,40]}/><meshStandardMaterial color={play?"#dfd9aa":"#ded4b7"} roughness={1}/></mesh>
    {covered&&<>{[-1.5,1.5].flatMap(x=>[-1.2,1.2].map(z=><Timber key={`${x}-${z}`} p={[x,1.45,z]} s={[.11,2.9,.11]} />))}
    {Array.from({length:7},(_,i)=><Timber key={i} p={[-1.6+i*.53,2.9,0]} s={[.16,.14,3]} color={coast?"#a5c7c0":"#bfaf80"}/>)}
    {[-1.25,1.25].map(z=><Timber key={z} p={[0,2.8,z]} s={[3.5,.18,.13]}/>)}
    </>}
    <mesh position={[0,.78,0]} castShadow><cylinderGeometry args={[.9,.9,.1,24]}/><meshStandardMaterial color={play?"#ecc88a":"#c5a478"} roughness={1}/></mesh>
    <Timber p={[0,.38,0]} s={[.17,.76,.17]}/>
    {[-1,1].map(sign=><group key={sign}><Timber p={[0,.46,sign*1.25]} s={[1.7,.12,.4]}/>{[-.62,.62].map(x=><Timber key={x} p={[x,.2,sign*1.25]} s={[.12,.4,.28]}/>)}</group>)}
    {play&&<><mesh position={[.3,.98,0]}><sphereGeometry args={[.18,10,8]}/><meshStandardMaterial color="#e7a394" roughness={1}/></mesh><Timber p={[-.25,.98,.1]} s={[.28,.28,.28]} color="#91b8c2"/></>}
  </group>;
}

/** Low planting islands create layers without adding hundreds of separate draw calls. */
function PlantingIslands(){
  const mesh=useRef<THREE.InstancedMesh>(null);
  const shrubs=useMemo(()=>{
    const entries:{x:number;z:number;size:number;color:string}[]=[];
    EXPO_REST_STOPS.forEach((stop,index)=>{
      const p=mapPoint(stop.x,stop.y);
      for(let i=0;i<12;i++){const a=i/12*Math.PI*2;entries.push({x:p.x+Math.cos(a)*3.4,z:p.z+Math.sin(a)*3.4,size:.4+(i%3)*.15,color:["#89ad7d","#a7c28d",index<2?"#e2b9bb":"#b7c39a"][i%3]});}
    });
    // Four planted crescents around the fountain keep the entrances open.
    for(let q=0;q<4;q++)for(let i=0;i<12;i++){const a=q*Math.PI/2+.3+i*.075;entries.push({x:Math.cos(a)*8.3,z:Math.sin(a)*8.3,size:.45+(i%3)*.06,color:i%4===0?"#d9bb9d":"#93b480"});}
    return entries;
  },[]);
  useLayoutEffect(()=>{if(!mesh.current)return;const d=new THREE.Object3D(),color=new THREE.Color();shrubs.forEach((p,i)=>{d.position.set(p.x,p.size*.55,p.z);d.scale.set(p.size*1.2,p.size,p.size);d.rotation.y=i;d.updateMatrix();mesh.current!.setMatrixAt(i,d.matrix);mesh.current!.setColorAt(i,color.set(p.color));});mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;mesh.current.computeBoundingSphere();},[shrubs]);
  return <instancedMesh ref={mesh} args={[undefined,undefined,shrubs.length]}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial roughness={1}/></instancedMesh>;
}
export function ExpoPlaces(){
  return <><PlantingIslands/>{EXPO_REST_STOPS.map((s,i)=><Shelter key={s.kind} x={s.x} y={s.y} index={i}/>)}</>;
}
