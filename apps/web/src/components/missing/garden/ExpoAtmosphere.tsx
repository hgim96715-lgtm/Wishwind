"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { ENVIRONMENTS, type GardenPhase } from "./expo-environment";

export function Atmosphere({phase,overview,weather}:{phase:GardenPhase;overview:boolean;weather?:string}) {
  const {camera,gl}=useThree();
  const fog=useRef<THREE.Fog>(null),sun=useRef<THREE.DirectionalLight>(null),hemi=useRef<THREE.HemisphereLight>(null),ambient=useRef<THREE.AmbientLight>(null),stars=useRef<THREE.PointsMaterial>(null);
  const shadowTime=useRef(2);
  const target=useMemo(()=>{
    const p=ENVIRONMENTS[phase],wet=weather==="rain"||weather==="snow",grey=new THREE.Color(weather==="snow"?(phase==="night"?"#1B263B":"#D8E3EE"):(phase==="night"?"#141D2E":"#8D9FB0"));
    const color=(hex:string,mix=0)=>new THREE.Color(hex).lerp(grey,mix);
    return {top:color(p.top,wet?.65:0),middle:color(p.middle,wet?.65:0),horizon:color(p.horizon,wet?.65:0),fog:color(p.fog,wet?.65:0),sun:color(p.sun),hemi:color(p.hemi),ground:color(p.ground),power:p.power*(wet?.6:1),ambient:p.ambient,hemiPower:p.hemiPower,position:new THREE.Vector3(...p.position as [number,number,number]),stars:phase==="night"&&!wet?.55:0};
  },[phase,weather]);
  const uniforms=useMemo(()=>({top:{value:new THREE.Color(ENVIRONMENTS.day.top)},middle:{value:new THREE.Color(ENVIRONMENTS.day.middle)},horizon:{value:new THREE.Color(ENVIRONMENTS.day.horizon)}}),[]);
  const starGeometry=useMemo(()=>{const g=new THREE.BufferGeometry(),positions=[];for(let i=0;i<64;i++){const a=i*2.399963,y=.2+(i%17)/22,r=Math.sqrt(1-y*y);positions.push(Math.cos(a)*r*500,y*500,Math.sin(a)*r*500);}g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));return g;},[]);
  useEffect(()=>()=>starGeometry.dispose(),[starGeometry]);
  useEffect(()=>{gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;shadowTime.current=0;},[gl,target]);
  useFrame((_,delta)=>{
    const dt=Math.min(delta,.05),alpha=1-Math.exp(-dt*3.1);
    for(const key of ["top","middle","horizon"] as const)uniforms[key].value.lerp(target[key],alpha);
    if(fog.current){fog.current.color.lerp(target.fog,alpha);fog.current.near=THREE.MathUtils.lerp(fog.current.near,overview?camera.position.length()+24:weather==="rain"?35:52,alpha);fog.current.far=THREE.MathUtils.lerp(fog.current.far,overview?camera.position.length()+220:weather==="rain"?135:190,alpha);}
    if(sun.current){sun.current.color.lerp(target.sun,alpha);sun.current.intensity=THREE.MathUtils.lerp(sun.current.intensity,target.power,alpha);sun.current.position.lerp(target.position,alpha);}
    if(hemi.current){hemi.current.color.lerp(target.hemi,alpha);hemi.current.groundColor.lerp(target.ground,alpha);hemi.current.intensity=THREE.MathUtils.lerp(hemi.current.intensity,target.hemiPower,alpha);}
    if(ambient.current)ambient.current.intensity=THREE.MathUtils.lerp(ambient.current.intensity,target.ambient,alpha);
    if(stars.current)stars.current.opacity=THREE.MathUtils.lerp(stars.current.opacity,target.stars,alpha);
    if(shadowTime.current<1.5){shadowTime.current+=dt;if(shadowTime.current>=1.5)gl.shadowMap.needsUpdate=true;}
  });
  return <>
    <fog ref={fog} attach="fog" args={[ENVIRONMENTS.day.fog,40,190]} />
    <mesh renderOrder={-10}><sphereGeometry args={[1000,32,16]} /><shaderMaterial uniforms={uniforms} side={THREE.BackSide} depthWrite={false} vertexShader={`varying float skyY;void main(){skyY=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`varying float skyY;uniform vec3 top;uniform vec3 middle;uniform vec3 horizon;void main(){float h=clamp(skyY,0.,1.);vec3 color=mix(horizon,middle,smoothstep(0.,.12,h));color=mix(color,top,smoothstep(.08,.42,h));gl_FragColor=vec4(color,1.);\n#include <colorspace_fragment>\n}`} /></mesh>
    <points geometry={starGeometry} raycast={()=>null}><pointsMaterial ref={stars} color="#ffefd0" size={1} transparent opacity={0} depthWrite={false} fog={false}/></points>
    <ambientLight ref={ambient} intensity={.35} color="#fff4db" />
    <hemisphereLight ref={hemi} args={["#fff3d7","#849b76",1]} />
    <directionalLight ref={sun} position={[-60,120,60]} color="#fff0cd" intensity={1.35} castShadow shadow-mapSize={[1024,1024]} shadow-radius={4} shadow-camera-left={-108} shadow-camera-right={108} shadow-camera-top={100} shadow-camera-bottom={-100} shadow-camera-far={300} shadow-normalBias={0.06} shadow-bias={-0.0001} />
  </>;
}

export function LighthouseBeam({night,reducedMotion}:{night:boolean;reducedMotion:boolean}) {
  const rig=useRef<THREE.Group>(null),light=useRef<THREE.SpotLight>(null),target=useRef<THREE.Object3D>(null);
  const beam=useMemo(()=>{
    const material=new THREE.MeshBasicMaterial({color:"#ffe7b1",transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    material.onBeforeCompile=shader=>{
      shader.vertexShader="varying float beamDistance;\n"+shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nbeamDistance = clamp(0.5 - position.y / 110.0, 0.0, 1.0);");
      shader.fragmentShader="varying float beamDistance;\n"+shader.fragmentShader.replace("#include <color_fragment>","#include <color_fragment>\ndiffuseColor.a *= smoothstep(0.0, 0.025, beamDistance) * (1.0 - smoothstep(0.35, 1.0, beamDistance));");
    };
    return material;
  },[]);
  useEffect(()=>{if(light.current&&target.current)light.current.target=target.current;return()=>beam.dispose();},[beam]);
  useFrame((_,delta)=>{
    const dt=Math.min(delta,.05);
    if(rig.current&&!reducedMotion)rig.current.rotation.y+=dt*.18;
    beam.opacity=THREE.MathUtils.damp(beam.opacity,night?.075:0,3,dt);
    if(light.current)light.current.intensity=THREE.MathUtils.damp(light.current.intensity,night?130:0,3,dt);
  });
  return <group ref={rig} position={[0,4.9,0]}>
    <spotLight ref={light} color="#ffe7b1" intensity={0} angle={0.09} penumbra={0.9} distance={140} decay={1} />
    <object3D ref={target} position={[110,-2,0]} />
    <mesh position={[55,0,0]} rotation={[0,0,Math.PI/2]} raycast={()=>null}><coneGeometry args={[9,110,24,1,true]} /><primitive object={beam} attach="material" /></mesh>
  </group>;
}

export function FountainWater({reducedMotion}:{reducedMotion:boolean}) {
  const droplets=useRef<THREE.InstancedMesh>(null);
  const curves=useMemo(()=>Array.from({length:8},(_,i)=>{
    const a=i*Math.PI/4;
    const points=Array.from({length:25},(_,j)=>{const t=j/24,r=0.06+t*1.75;return new THREE.Vector3(Math.cos(a)*r,2.46+1.25*t-3.25*t*t,Math.sin(a)*r);});
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,0.018,5,false);
  }),[]);
  useEffect(()=>()=>curves.forEach(c=>c.dispose()),[curves]);
  const dummy=useMemo(()=>new THREE.Object3D(),[]);
  useFrame(({clock})=>{
    if(!droplets.current)return;
    for(let i=0;i<24;i++){const t=reducedMotion?(i%3)/3:(clock.elapsedTime*0.45+(i%3)/3)%1,a=Math.floor(i/3)*Math.PI/4,r=0.06+t*1.75;dummy.position.set(Math.cos(a)*r,2.46+1.25*t-3.25*t*t,Math.sin(a)*r);dummy.scale.set(0.027,0.05,0.027);dummy.updateMatrix();droplets.current.setMatrixAt(i,dummy.matrix);}
    droplets.current.instanceMatrix.needsUpdate=true;
  });
  return <group>{curves.map((geometry,i)=><mesh key={i} geometry={geometry}><meshStandardMaterial color="#b2d4d5" transparent opacity={0.55} roughness={0.5} metalness={0} depthWrite={false} /></mesh>)}<instancedMesh ref={droplets} args={[undefined,undefined,24]}><sphereGeometry args={[1,5,5]} /><meshBasicMaterial color="#e9f4e8" transparent opacity={0.7} /></instancedMesh></group>;
}
