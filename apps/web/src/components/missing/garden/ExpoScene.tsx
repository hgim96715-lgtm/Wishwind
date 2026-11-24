"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { memo, useEffect, useMemo, useRef, type ComponentRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { Avatar } from "./Avatar";
import { ExpoDecor } from "./ExpoDecor";
import { ExpoPond } from "./ExpoWater";
import { ExpoWeather } from "./ExpoWeather";
import { ExpoWishes } from "./ExpoWishes";
import type { AvatarChoice } from "./AvatarSetup";
import type { Weather } from "@/lib/weather/types";
import { lampStrength, type GardenPhase } from "./expo-environment";
import { SnowContext, SnowDetails, snowMaterial, useSnow } from "./ExpoSnow";
import { Atmosphere } from "./ExpoAtmosphere";
import { ExpoLanterns, type GardenLantern } from "./ExpoLanterns";
import { canWalk, EXPO_GARDENS, EXPO_MAIN_PATH, EXPO_START, MAP_SCALE, gardenRoute, findWalkRoute, type Point } from "./expo-layout";

export type Pinwheel = Point & { id: string; color: string; body?:string; nickname?:string|null; pending?:boolean };
export type Travel = { point: Point; id: number };
export interface ExpoSceneProps {
  avatar: AvatarChoice;
  weather: Weather|null;
  freshId: string|null;
  mode: "overview" | "walk";
  paused: boolean;
  phase: GardenPhase;
  night: boolean;
  reducedMotion: boolean;
  lanterns: GardenLantern[];
  visited: ReadonlySet<string>;
  onSelect: (id:string)=>void;
  travel: Travel | null;
  stick: MutableRefObject<{x:number;y:number}>;
  player: MutableRefObject<Point>;
  pinwheels: Pinwheel[];
  onWalk: () => void;
  onPosition: (point: Point) => void;
  onReady: () => void;
}

function Ground({ onChoose,wet }: { onChoose: (p:Point)=>void;wet:boolean }) {
  const snow=useSnow();
  const groundMaterial=useMemo(()=>snowMaterial(new THREE.MeshStandardMaterial({roughness:.85}),snow,true,"#E3E9F0"),[snow]);
  const outsideMaterial=useMemo(()=>snowMaterial(new THREE.MeshStandardMaterial({color:"#bdcba5",roughness:.85}),snow,true),[snow]);
  useFrame((_,dt)=>{groundMaterial.roughness=THREE.MathUtils.damp(groundMaterial.roughness,wet?.45:.85,3.1,Math.min(dt,.05));outsideMaterial.roughness=groundMaterial.roughness;});
  useEffect(()=>()=>{groundMaterial.dispose();outsideMaterial.dispose();},[groundMaterial,outsideMaterial]);
  const texture=useMemo(()=>{
    const canvas=document.createElement("canvas");canvas.width=2880;canvas.height=2190;
    const ctx=canvas.getContext("2d")!;ctx.scale(3,3);
    ctx.fillStyle="#b9ce98";ctx.fillRect(0,0,960,730);
    ctx.fillStyle="#b5cc91";ctx.beginPath();ctx.roundRect(35,30,890,670,90);ctx.fill();
    ctx.strokeStyle="#ede3cc";ctx.lineWidth=19;ctx.lineCap="round";ctx.lineJoin="round";
    ctx.beginPath();ctx.roundRect(65,40,830,640,65);ctx.stroke();ctx.stroke(new Path2D(EXPO_MAIN_PATH));
    EXPO_GARDENS.forEach((g,i)=>{
      const wash=ctx.createRadialGradient(g.x+170,g.y+110,20,g.x+170,g.y+110,205);
      wash.addColorStop(0,["#d0dbab","#cbd4af","#c1cfaa","#b9d2b6"][i]);wash.addColorStop(1,"rgba(185,206,152,0)");
      ctx.fillStyle=wash;ctx.fillRect(g.x-30,g.y-30,400,280);
      ctx.strokeStyle=["#f5e9c8","#e7dac0","#e9e1c9","#ece3c8"][i];ctx.lineWidth=12;ctx.stroke(new Path2D(gardenRoute(i)));
    });
    ctx.fillStyle="#e4d5b8";ctx.beginPath();ctx.arc(480,375,65,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#c7b797";ctx.lineWidth=2;ctx.beginPath();ctx.arc(480,375,59,0,Math.PI*2);ctx.stroke();
    // Small paving marks remain on the plaza, never become extra paths.
    for(let i=0;i<24;i++) {const a=i*Math.PI/12;ctx.fillStyle="#d4c4a5";ctx.beginPath();ctx.arc(480+Math.cos(a)*52,375+Math.sin(a)*52,1.8,0,Math.PI*2);ctx.fill();}
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
  },[]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  groundMaterial.map=texture;
  const click=(event:ThreeEvent<MouseEvent>)=>{if(event.delta>5) return;event.stopPropagation();onChoose({x:event.point.x,z:event.point.z});};
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,-10*MAP_SCALE]} receiveShadow onClick={click}>
      <planeGeometry args={[960*MAP_SCALE,730*MAP_SCALE]} /><primitive object={groundMaterial} attach="material" />
    </mesh>
    <mesh position={[0,-1,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[1600,1600]} /><primitive object={outsideMaterial} attach="material" /></mesh>

  </group>;
}

function World(props: ExpoSceneProps) {
  const {mode,travel,stick,player,onPosition,onReady,onWalk}=props;
  const snow=useMemo(()=>({value:0}),[]);
  const {camera,size,gl}=useThree();
  const controls=useRef<ComponentRef<typeof OrbitControls>>(null);
  const character=useRef<THREE.Group>(null);
  const speed=useRef(0),keys=useRef(new Set<string>()),route=useRef<Point[]>([]);
  const lastTarget=useRef(new THREE.Vector3()),forward=useRef(new THREE.Vector3()),right=useRef(new THREE.Vector3()),targetTemp=useRef(new THREE.Vector3());
  const initialized=useRef(false),reportTime=useRef(0);
  const followActive=useRef(false);
  const heading=useRef(Math.PI),orbitActive=useRef(false),orbitUntil=useRef(0);
  const metrics=useRef({seconds:0,frames:0});
  const cursor=useRef<THREE.Mesh>(null),destination=useRef<Point|null>(null);

  useEffect(()=>{onReady();},[onReady]);
  useEffect(()=>{
    const canvas=gl.domElement;canvas.tabIndex=0;canvas.setAttribute("aria-label","3D 정원. 방향키 또는 W A S D로 걷기, 바닥을 눌러 이동하기");
    const down=(e:KeyboardEvent)=>{
      if(!["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) return;
      if(document.activeElement!==canvas) return;
      e.preventDefault();keys.current.add(e.code);onWalk();
    };
    const up=(e:KeyboardEvent)=>{keys.current.delete(e.code);};
    const clear=()=>{keys.current.clear();stick.current={x:0,y:0};};
    const focus=()=>canvas.focus({preventScroll:true});
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);window.addEventListener("blur",clear);document.addEventListener("visibilitychange",clear);canvas.addEventListener("pointerdown",focus);canvas.addEventListener("blur",clear);
    return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);window.removeEventListener("blur",clear);document.removeEventListener("visibilitychange",clear);canvas.removeEventListener("pointerdown",focus);canvas.removeEventListener("blur",clear);};
  },[gl,onWalk,stick]);

  useEffect(()=>{
    if(!travel) return;
    player.current={...travel.point};route.current=[];destination.current=null;
    if(character.current) character.current.position.set(travel.point.x,0.08,travel.point.z);
    onPosition({...travel.point});initialized.current=false;
  },[travel,player,onPosition]);

  useEffect(()=>{initialized.current=false;if(mode==="overview"){keys.current.clear();route.current=[];destination.current=null;}},[mode,size.width,size.height]);

  const choose=(point:Point)=>{
    const next=findWalkRoute(player.current,point);
    if(!next.length) return;
    route.current=next;destination.current=point;onWalk();
  };

  useFrame((_,rawDelta)=>{
    snow.value=THREE.MathUtils.clamp(snow.value+(props.weather?.kind==="snow"?1:-1)*Math.min(rawDelta,.1)/14,0,1);
    if(process.env.NODE_ENV!=="production"){
      metrics.current.seconds+=rawDelta;metrics.current.frames++;
      if(metrics.current.seconds>=2){
        gl.domElement.dataset.gardenSnow=String(snow.value);
        gl.domElement.dataset.gardenHeading=String(heading.current);
        gl.domElement.dataset.gardenPlayer=JSON.stringify(player.current);
        gl.domElement.dataset.gardenFps=String(Math.round(metrics.current.frames/metrics.current.seconds));
        gl.domElement.dataset.gardenDrawCalls=String(gl.info.render.calls);
        gl.domElement.dataset.gardenLanterns=String(props.lanterns.length);
        gl.domElement.dataset.gardenCounts=JSON.stringify([0,1,2,3].map(g=>props.lanterns.filter(l=>l.garden===g).length));
        let minimum=Infinity;for(let i=0;i<props.lanterns.length;i++)for(let j=i+1;j<props.lanterns.length;j++){const a=props.lanterns[i],b=props.lanterns[j];minimum=Math.min(minimum,Math.hypot(a.x-b.x,a.z-b.z));}
        gl.domElement.dataset.gardenSpacing=String(minimum);
        gl.domElement.dataset.gardenUniquePositions=String(new Set(props.lanterns.map(l=>`${l.x},${l.z}`)).size);
        metrics.current={seconds:0,frames:0};
      }
    }
    const dt=Math.min(rawDelta,0.04),c=controls.current,body=character.current;
    if(props.paused){speed.current=0;keys.current.clear();stick.current={x:0,y:0};route.current=[];destination.current=null;return;}
    if(!c||!body) return;
    const p=player.current;
    if(!initialized.current) {
      if(mode==="overview") {
        const aspect=size.width/size.height;
        const distance=Math.max(205,212/Math.max(aspect,0.3));
        camera.position.set(0,distance*0.76,distance*0.82);c.target.set(0,0,-1);
      } else {
        const faceSouth=!!travel&&travel.point.z>0&&travel.point.x!==0;
        const narrow=size.width<640;
        camera.position.set(p.x,narrow?4.7:3.7,p.z+(faceSouth?-1:1)*(narrow?10.5:7.4));c.target.set(p.x,1.25,p.z+(faceSouth?1.5:-1.5));
        heading.current=faceSouth?0:Math.PI;body.rotation.y=heading.current;
      }
      lastTarget.current.set(p.x,1.25,p.z);c.update();initialized.current=true;
    }
    let dx=0,dz=0;
    if(mode==="walk") {
      const k=keys.current;
      const sx=(k.has("KeyD")||k.has("ArrowRight")?1:0)-(k.has("KeyA")||k.has("ArrowLeft")?1:0)+stick.current.x;
      const sy=(k.has("KeyW")||k.has("ArrowUp")?1:0)-(k.has("KeyS")||k.has("ArrowDown")?1:0)+stick.current.y;
      const steering=Math.abs(sx)>.08,walking=Math.abs(sy)>.08;
      if(steering||walking){
        route.current=[];destination.current=null;
        // Character-relative steering: camera rotation never changes the controls.
        heading.current-=sx*1.9*dt;
        dx=Math.sin(heading.current)*sy;dz=Math.cos(heading.current)*sy;
      }else if(route.current.length){
        while(route.current.length&&Math.hypot(route.current[0].x-p.x,route.current[0].z-p.z)<.12)route.current.shift();
        const next=route.current[0];if(next){dx=next.x-p.x;dz=next.z-p.z;heading.current=Math.atan2(dx,dz);}else destination.current=null;
      }
      const facingDifference=Math.atan2(Math.sin(heading.current-body.rotation.y),Math.cos(heading.current-body.rotation.y));
      body.rotation.y+=facingDifference*(1-Math.exp(-dt*12));
      const length=Math.hypot(dx,dz),step=Math.min(3.8*dt,length),beforeX=p.x,beforeZ=p.z;
      if(length>0.02) {
        const nx=dx/length*step,nz=dz/length*step;
        if(canWalk(p.x+nx,p.z))p.x+=nx;
        if(canWalk(p.x,p.z+nz))p.z+=nz;
      }
      speed.current=dt>0?Math.hypot(p.x-beforeX,p.z-beforeZ)/dt:0;
      const delta=targetTemp.current.set(p.x,1.25,p.z).sub(lastTarget.current);
      camera.position.add(delta);c.target.add(delta);lastTarget.current.add(delta);
      if(length>.02||steering)followActive.current=true;
      if(followActive.current&&!orbitActive.current&&performance.now()>orbitUntil.current){
        const offset=forward.current.copy(camera.position).sub(c.target),radius=Math.hypot(offset.x,offset.z);
        const desired=heading.current+Math.PI,yaw=Math.atan2(offset.x,offset.z);
        const difference=Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw));
        const nextYaw=yaw+difference*(1-Math.exp(-dt*3));
        const look=right.current.set(p.x+Math.sin(heading.current)*1.5,1.25,p.z+Math.cos(heading.current)*1.5);
        if(length<=.02&&!steering&&Math.abs(difference)<.005&&c.target.distanceTo(look)<.02)followActive.current=false;
        c.target.lerp(look,1-Math.exp(-dt*5));
        camera.position.set(c.target.x+Math.sin(nextYaw)*radius,c.target.y+offset.y,c.target.z+Math.cos(nextYaw)*radius);
      }
    } else speed.current=0;
    body.position.set(p.x,0.08,p.z);
    if(cursor.current) {cursor.current.visible=!!destination.current;if(destination.current)cursor.current.position.set(destination.current.x,0.06,destination.current.z);}
    reportTime.current+=dt;if(reportTime.current>0.2){reportTime.current=0;onPosition({...p});}
  });

  return <SnowContext.Provider value={snow}>
    <Atmosphere phase={props.phase} overview={mode==="overview"} weather={props.weather?.kind} />
    <Ground onChoose={choose} wet={props.weather?.kind==="rain"} />
    <SnowDetails player={player} paused={props.paused||props.reducedMotion}/>
    <ExpoPond night={props.night} still={props.reducedMotion||props.paused} />
    <ExpoWeather weather={props.weather} player={player} paused={props.reducedMotion||props.paused} />
    <ExpoDecor night={props.night} reducedMotion={props.reducedMotion||props.paused} />
    <ExpoLanterns strength={lampStrength(props.phase,props.weather?.kind==="rain"||props.weather?.kind==="snow")} items={props.lanterns} visited={props.visited} night={props.night} reducedMotion={props.reducedMotion||props.paused} onSelect={props.onSelect} player={player} />
    <group ref={character} position={[EXPO_START.x,0.08,EXPO_START.z]}><Avatar url={props.avatar.url} speedRef={speed} /></group>
    <ExpoWishes items={props.pinwheels} player={player} still={props.reducedMotion||props.paused} freshId={props.freshId} />
    <mesh ref={cursor} visible={false} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.25,0.34,24]} /><meshBasicMaterial color="#fcf0ba" /></mesh>
    <OrbitControls onStart={()=>{orbitActive.current=true;followActive.current=false;}} onEnd={()=>{orbitActive.current=false;orbitUntil.current=performance.now()+800;}} ref={controls} makeDefault enabled={!props.paused} enablePan={false} minDistance={mode==="walk"?5:100} maxDistance={900} maxPolarAngle={mode==="walk"?Math.PI*.475:Math.PI*.4} minPolarAngle={.18} enableDamping={!props.reducedMotion} dampingFactor={0.16} rotateSpeed={0.55} zoomSpeed={0.55} />
  </SnowContext.Provider>;
}

function ExpoScene(props:ExpoSceneProps) {
  return <Canvas shadows={{type:THREE.PCFShadowMap}} dpr={1} camera={{position:[0,75,82],fov:50,near:0.5,far:1200}} gl={{antialias:false,powerPreference:"high-performance"}} fallback={<div className="p-8 text-center">이 브라우저에서 3D 화면을 열 수 없음. 다른 브라우저에서 다시 열 수 있음.</div>}><World {...props} /></Canvas>;
}

export default memo(ExpoScene);
