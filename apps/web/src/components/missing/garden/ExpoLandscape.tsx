"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EXPO_GARDENS, MAP_SCALE, gardenRoute, mapPoint, canWalk } from "./expo-layout";
import { gardenLanternSlots } from "./ExpoLanterns";

import { snowMaterial, useSnow } from "./ExpoSnow";
type Instance={x:number;y:number;z:number;s:[number,number,number];color:string;angle?:number;spin?:boolean};
type Batch={geometry:THREE.BufferGeometry;items:Instance[]};
/** All repeated details are batched. Decorative meshes never intercept path/lantern clicks. */
export function ExpoLandscape({night,still}:{night:boolean;still:boolean}){
  const snow=useSnow();
  const snowMat=useMemo(()=>snowMaterial(new THREE.MeshStandardMaterial({roughness:1,side:THREE.DoubleSide}),snow),[snow]);
  useEffect(()=>()=>snowMat.dispose(),[snowMat]);
  const refs=useRef<(THREE.InstancedMesh|null)[]>([]);
  const data=useMemo(()=>{
    const stone:Batch={geometry:new THREE.IcosahedronGeometry(1,1),items:[]};
    const timber:Batch={geometry:new THREE.BoxGeometry(1,1,1),items:[]};
    const rope:Batch={geometry:new THREE.CylinderGeometry(1,1,1,5).rotateZ(Math.PI/2),items:[]};
    const foliage:Batch={geometry:new THREE.IcosahedronGeometry(1,1),items:[]};
    const pine:Batch={geometry:new THREE.ConeGeometry(1,1,7),items:[]};
    const petal:Batch={geometry:new THREE.CircleGeometry(1,5).rotateX(-Math.PI/2),items:[]};
    const blades:Batch={geometry:new THREE.CircleGeometry(1,3).translate(.65,.65,0),items:[]};
    const add=(batch:Batch,x:number,y:number,z:number,s:Instance['s'],color:string,angle=0,spin=false)=>batch.items.push({x,y,z,s,color,angle,spin});
    EXPO_GARDENS.forEach((g,gi)=>{
      const slots=gardenLanternSlots(gi),path=new Path2D(gardenRoute(gi));
      const ctx=document.createElement('canvas').getContext('2d')!;ctx.lineWidth=22;
      const safe=(x:number,z:number)=>canWalk(x,z)&&slots.every(p=>Math.hypot(p.x-x,p.z-z)>1.3)&&!ctx.isPointInStroke(path,x/MAP_SCALE+480,z/MAP_SCALE+375);
      // Flush stepping stones on the route; verge pebbles remain outside its clear width.
      for(const section of gardenRoute(gi).match(/M[^M]+/g)??[]){
        const svg=document.createElementNS('http://www.w3.org/2000/svg','path');svg.setAttribute('d',section);
        for(let d=15;d<svg.getTotalLength();d+=32){const q=svg.getPointAtLength(d),p=mapPoint(q.x,q.y);if(canWalk(p.x,p.z))add(stone,p.x,.025,p.z,[.25,.025,.18],'#ddd4bd',d);}
      }
      g.beds.forEach(([x,y,w,h],bi)=>{
        if(gi===3&&bi===0||gi===1&&(bi===1||bi===2))return;
        const p=mapPoint(x+w/2,y+h/2);
        for(let i=0;i<22;i++){const a=i/22*Math.PI*2,px=p.x+Math.cos(a)*w*MAP_SCALE*.48,pz=p.z+Math.sin(a)*h*MAP_SCALE*.48;if(safe(px,pz))add(stone,px,.1,pz,[.23,.13,.18],'#cabca7',a);}
        for(let i=0;i<12;i++){const a=i*2.4,r=Math.sqrt((i+.5)/12),px=p.x+Math.cos(a)*r*w*MAP_SCALE*.3,pz=p.z+Math.sin(a)*r*h*MAP_SCALE*.3;if(!safe(px,pz))continue;add(foliage,px,.24,pz,[.45,.32,.4],['#a7bd87','#91ae80','#b5c699'][i%3]);for(let f=0;f<5;f++)add(foliage,px+Math.cos(f*1.256)*.09,.55,pz+Math.sin(f*1.256)*.09,[.075,.035,.075],gi===0?'#ffe3a0':gi===1?'#d9c5dd':'#edcfbb');}
      });
      // Short fence sections frame the outside corners, never run across an entrance.
      for(const [mx,my] of [[g.x+20,g.y+30],[g.x+285,g.y+195]]){
        const p=mapPoint(mx,my);
        for(let i=0;i<4;i++){const x=p.x+i*1.2;if(!safe(x,p.z))continue;add(timber,x,.32,p.z,[.1,.64,.1],'#b89a72');if(i<3&&safe(x+1.2,p.z))add(rope,x+.6,.44,p.z,[1.2,.025,.025],'#d3bf93');}
      }
      const entrance=mapPoint(gi%2?716:296,gi<2?305:435);
      add(timber,entrance.x,.6,entrance.z,[.035,1.2,.035],'#b59670');
      for(let i=0;i<4;i++)add(blades,entrance.x,1.2,entrance.z,[.2,.2,.2],i%2?'#fff1d1':'#e9b076',i*Math.PI/2,true);
    });
    // Seasonal grove: pink blossom, green canopy, maple, snow-dusted evergreen.
    [[175,490],[175,535],[245,590],[350,605]].forEach(([x,y],i)=>{
      const p=mapPoint(x,y);add(timber,p.x,.95,p.z,[.2,1.9,.2],'#9c7b56');
      if(i===3){for(let layer=0;layer<3;layer++){add(pine,p.x,1.6+layer*.6,p.z,[1.4-layer*.25,1.3,1.4-layer*.25],'#78988a');add(pine,p.x,1.85+layer*.6,p.z,[1.06-layer*.21,.85,1.06-layer*.21],'#eeeede');}}
      else for(let j=0;j<3;j++)add(foliage,p.x+Math.cos(j*2.1)*.45,2+j*.2,p.z+Math.sin(j*2.1)*.45,[.9,1,.9],['#e5bec6','#9cb781','#cfaa78'][i]);
      for(let j=0;j<12;j++){const a=j*2.4,r=.6+j*.08;add(petal,p.x+Math.cos(a)*r,.035,p.z+Math.sin(a)*r,[.09,1,.06],i===0?'#edcbd0':i===2?'#cea578':'#c7d5b1',a);}
    });
    // Low hills and a layered tree line live beyond the walkable boundary.
    for(let i=0;i<32;i++){
      const a=i/32*Math.PI*2,x=Math.cos(a)*100,z=Math.sin(a)*84;
      add(foliage,x,-1,z,[14,4+(i%3),12],i%2?'#a9bf97':'#b6c9a0');
      for(let j=0;j<3;j++){const tx=x+j*3,tz=z+(j%2)*4;add(timber,tx,1.7,tz,[.28,3.4,.28],'#a48b68');add(foliage,tx,3.9,tz,[2,2.8,1.9],['#96b18c','#a3ba8d','#b4c89c'][j]);}
    }
    // A shore-side timber deck, sand, reeds and tiny shell fans, beside the pond.
    const shore=mapPoint(620,550);
    for(let i=0;i<14;i++)add(timber,shore.x-1.1+i*.17,.06,shore.z,[.15,.09,2.1],'#c6ae86');
    add(foliage,shore.x-2,.01,shore.z+3,[2.1,.025,1.8],'#e8d8af');
    for(let i=0;i<15;i++){const x=shore.x-2+Math.cos(i*2.4)*(1+i*.05),z=shore.z+3+Math.sin(i*2.4)*(1+i*.05);add(pine,x,.3,z,[.035,.6,.035],'#aeb586');if(i%3===0)add(foliage,x,.04,z+.4,[.12,.045,.1],'#f4e4d4');}
    return [stone,timber,rope,foliage,pine,petal,blades];
  },[]);
  const dummy=useMemo(()=>new THREE.Object3D(),[]);
  useLayoutEffect(()=>{data.forEach((batch,j)=>{const mesh=refs.current[j];if(!mesh)return;batch.items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,j===6?0:p.angle??0,j===6?p.angle??0:0);dummy.scale.set(...p.s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color(p.color));});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();});},[data,dummy]);
  useFrame(({clock})=>{if(still)return;const mesh=refs.current[6];if(!mesh)return;data[6].items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(...p.s);dummy.rotation.set(0,0,(p.angle??0)-clock.elapsedTime*.35);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;});
  useEffect(()=>()=>data.forEach(b=>b.geometry.dispose()),[data]);
  return <>{data.map((b,i)=><instancedMesh key={i} ref={m=>{refs.current[i]=m;}} args={[b.geometry,undefined,b.items.length]} raycast={()=>null}><primitive object={snowMat} attach="material"/></instancedMesh>)}</>;
}
