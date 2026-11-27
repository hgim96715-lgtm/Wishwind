"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { ENVIRONMENTS, type GardenPhase } from "./expo-environment";

export function Atmosphere({phase,overview,weather,exponential=false,meadow=false,liveShadows=false}:{phase:GardenPhase;overview:boolean;weather?:string;exponential?:boolean;meadow?:boolean;liveShadows?:boolean}) {
  const {camera,gl}=useThree();
  const fog=useRef<THREE.Fog>(null),fogExp=useRef<THREE.FogExp2>(null),sun=useRef<THREE.DirectionalLight>(null),hemi=useRef<THREE.HemisphereLight>(null),ambient=useRef<THREE.AmbientLight>(null),stars=useRef<THREE.PointsMaterial>(null);
  const shadowTime=useRef(2);
  const target=useMemo(()=>{
    const p=ENVIRONMENTS[phase],wet=weather==="rain"||weather==="snow",grey=new THREE.Color(weather==="snow"?(phase==="night"?"#1B263B":"#D8E3EE"):(phase==="night"?"#141D2E":"#8D9FB0"));
    const color=(hex:string,mix=0)=>new THREE.Color(hex).lerp(grey,mix);
    const fog=color(p.fog,wet?.65:0);if(meadow&&!wet)fog.lerp(new THREE.Color(p.horizon),.45);
    return {top:color(p.top,wet?.65:0),middle:color(p.middle,wet?.65:0),horizon:color(p.horizon,wet?.65:0),fog,sun:color(p.sun),hemi:color(p.hemi),ground:color(p.ground),power:p.power*(wet?.6:1)*(meadow?1.1:1),ambient:p.ambient*(meadow?.7:1),hemiPower:p.hemiPower*(meadow?.85:1),position:meadow&&phase!=="night"?new THREE.Vector3(-80,80,45):new THREE.Vector3(...p.position as [number,number,number]),stars:phase==="night"&&!wet?.55:0};
  },[phase,weather,meadow]);
  const uniforms=useMemo(()=>({top:{value:new THREE.Color(ENVIRONMENTS.day.top)},middle:{value:new THREE.Color(ENVIRONMENTS.day.middle)},horizon:{value:new THREE.Color(ENVIRONMENTS.day.horizon)}}),[]);
  const starGeometry=useMemo(()=>{const g=new THREE.BufferGeometry(),positions=[];for(let i=0;i<64;i++){const a=i*2.399963,y=.2+(i%17)/22,r=Math.sqrt(1-y*y);positions.push(Math.cos(a)*r*500,y*500,Math.sin(a)*r*500);}g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));return g;},[]);
  useEffect(()=>()=>starGeometry.dispose(),[starGeometry]);
  useEffect(()=>{const previous=gl.shadowMap.autoUpdate;gl.shadowMap.autoUpdate=liveShadows;gl.shadowMap.needsUpdate=true;shadowTime.current=0;return()=>{gl.shadowMap.autoUpdate=previous;};},[gl,target,liveShadows]);
  useFrame((_,delta)=>{
    const dt=Math.min(delta,.05),alpha=1-Math.exp(-dt*3.1);
    for(const key of ["top","middle","horizon"] as const)uniforms[key].value.lerp(target[key],alpha);
    if(fog.current){fog.current.color.lerp(target.fog,alpha);fog.current.near=THREE.MathUtils.lerp(fog.current.near,overview?camera.position.length()+24:weather==="rain"?35:52,alpha);fog.current.far=THREE.MathUtils.lerp(fog.current.far,overview?camera.position.length()+220:weather==="rain"?135:190,alpha);}
    if(fogExp.current){fogExp.current.color.lerp(target.fog,alpha);fogExp.current.density=THREE.MathUtils.lerp(fogExp.current.density,weather==="rain"||weather==="snow"?(meadow?.004:.0065):meadow?.0015:.005,alpha);}
    if(sun.current){sun.current.color.lerp(target.sun,alpha);sun.current.intensity=THREE.MathUtils.lerp(sun.current.intensity,target.power,alpha);if(meadow&&liveShadows){sun.current.target.position.set(camera.position.x,0,camera.position.z-25);sun.current.target.updateMatrixWorld();sun.current.position.set(camera.position.x+target.position.x,target.position.y,camera.position.z-25+target.position.z);}else sun.current.position.lerp(target.position,alpha);}
    if(hemi.current){hemi.current.color.lerp(target.hemi,alpha);hemi.current.groundColor.lerp(target.ground,alpha);hemi.current.intensity=THREE.MathUtils.lerp(hemi.current.intensity,target.hemiPower,alpha);}
    if(ambient.current)ambient.current.intensity=THREE.MathUtils.lerp(ambient.current.intensity,target.ambient,alpha);
    if(stars.current)stars.current.opacity=THREE.MathUtils.lerp(stars.current.opacity,target.stars,alpha);
    if(shadowTime.current<1.5){shadowTime.current+=dt;if(shadowTime.current>=1.5)gl.shadowMap.needsUpdate=true;}
  });
  return <>
    {exponential?<fogExp2 ref={fogExp} attach="fog" args={[ENVIRONMENTS.day.fog,.005]} />:<fog ref={fog} attach="fog" args={[ENVIRONMENTS.day.fog,40,190]} />}
    <mesh renderOrder={-10}><sphereGeometry args={[1000,32,16]} /><shaderMaterial uniforms={uniforms} side={THREE.BackSide} depthWrite={false} vertexShader={`varying float skyY;void main(){skyY=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`varying float skyY;uniform vec3 top;uniform vec3 middle;uniform vec3 horizon;void main(){float h=clamp(skyY,0.,1.);vec3 color=mix(horizon,middle,smoothstep(0.,.12,h));color=mix(color,top,smoothstep(.08,.42,h));gl_FragColor=vec4(color,1.);\n#include <colorspace_fragment>\n}`} /></mesh>
    <points geometry={starGeometry} raycast={()=>null}><pointsMaterial ref={stars} color="#ffefd0" size={1} transparent opacity={0} depthWrite={false} fog={false}/></points>
    <ambientLight ref={ambient} intensity={.35} color="#fff4db" />
    <hemisphereLight ref={hemi} args={["#fff3d7","#849b76",1]} />
    <directionalLight ref={sun} position={[-60,120,60]} color="#fff0cd" intensity={1.35} castShadow shadow-mapSize={[1024,1024]} shadow-radius={3} shadow-camera-left={meadow?-55:-108} shadow-camera-right={meadow?55:108} shadow-camera-top={meadow?55:100} shadow-camera-bottom={meadow?-55:-100} shadow-camera-far={300} shadow-normalBias={meadow?.015:.06} shadow-bias={-0.0001} />
  </>;
}

export function LighthouseBeam({night,reducedMotion,garden=false}:{night:boolean;reducedMotion:boolean;garden?:boolean}) {
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
    if(light.current)light.current.intensity=THREE.MathUtils.damp(light.current.intensity,night?(garden?550:130):0,3,dt);
  });
  return <group ref={rig} position={[0,garden?0:4.9,0]}>
    <spotLight ref={light} color="#ffe7b1" intensity={0} angle={garden?0.22:0.09} penumbra={0.9} distance={garden?240:140} decay={1} />
    <object3D ref={target} position={garden?[110,-38,0]:[110,-2,0]} />
    <mesh position={garden?[55,-19,0]:[55,0,0]} rotation={[0,0,garden?Math.PI/2-Math.atan2(38,110):Math.PI/2]} raycast={()=>null}><coneGeometry args={[9,garden?Math.hypot(110,38):110,24,1,true]} /><primitive object={beam} attach="material" /></mesh>
  </group>;
}

export function FountainWater({still=false}:{still?:boolean}) {
  const curves=useMemo(()=>Array.from({length:8},(_,i)=>{
    const a=i*Math.PI/4;
    const points=Array.from({length:25},(_,j)=>{const t=j/24,r=0.06+t*1.75;return new THREE.Vector3(Math.cos(a)*r,2.46+1.25*t-3.25*t*t,Math.sin(a)*r);});
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,0.012,5,false);
  }),[]);
  const material=useMemo(()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:`varying vec2 vWater; void main(){vWater=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vWater; uniform float time; void main(){float flow=.5+.5*sin(vWater.x*54.-time*4.);float edge=sin(vWater.y*3.14159);gl_FragColor=vec4(.76,.91,.90,(.11+flow*.18)*edge);}`}),[]);
  useFrame((_,dt)=>{if(!still)material.uniforms.time.value+=Math.min(dt,.05);});
  useEffect(()=>()=>{curves.forEach(c=>c.dispose());material.dispose();},[curves,material]);
  return <group>{curves.map((geometry,i)=><mesh key={i} geometry={geometry} material={material} raycast={()=>null}/>)}</group>;
}
