"use client";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EXPO_GARDENS, EXPO_REST_STOPS, MAP_SCALE, mapPoint } from "./expo-layout";

import { snowMaterial, useSnow } from "./ExpoSnow";
type Plant={x:number;z:number;height:number;angle:number};
function BatchAsset({name,plants,sway=false,still=false}:{name:string;plants:Plant[];sway?:boolean;still?:boolean}){
  const snow=useSnow();
  const {scene}=useGLTF(`/models/garden/${name}.glb`),{gl}=useThree();
  const root=useRef<THREE.InstancedMesh>(null),elapsed=useRef(1);
  const asset=useMemo(()=>{
    scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(scene),height=box.max.y-box.min.y||1;
    let mesh:THREE.Mesh|undefined;scene.traverse(o=>{if(o instanceof THREE.Mesh)mesh=o;});
    if(!mesh)throw new Error(`Plant asset missing: ${name}`);
    const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    geometry.translate(-(box.max.x+box.min.x)/2,-box.min.y,-(box.max.z+box.min.z)/2).scale(1/height,1/height,1/height);
    const material=(Array.isArray(mesh.material)?mesh.material[0]:mesh.material).clone() as THREE.MeshStandardMaterial;
    material.roughness=.96;material.metalness=0;material.roughnessMap=null;material.metalnessMap=null;material.envMapIntensity=.15;
    snowMaterial(material,snow);
    return {geometry,material};
  },[scene,name,snow]);
  useEffect(()=>()=>{asset.geometry.dispose();asset.material.dispose();},[asset]);
  const dummy=useMemo(()=>new THREE.Object3D(),[]);
  const update=(time:number)=>{
    const mesh=root.current;if(!mesh)return;
    plants.forEach((p,i)=>{dummy.position.set(p.x,.01,p.z);dummy.rotation.set(0,p.angle,sway&&!still?Math.sin(time*.65+i*1.7)*.006:0);dummy.scale.setScalar(p.height);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.instanceMatrix.needsUpdate=true;
  };
  useLayoutEffect(()=>{update(0);root.current?.computeBoundingSphere();gl.shadowMap.needsUpdate=true;},[plants,asset,gl,still]);
  useFrame(({clock},dt)=>{if(!sway||still)return;elapsed.current+=dt;if(elapsed.current<.066)return;elapsed.current=0;update(clock.elapsedTime);});
  return <instancedMesh ref={root} args={[asset.geometry,asset.material,plants.length]} castShadow={!sway} receiveShadow />;
}

export function ExpoVegetation({reducedMotion}:{reducedMotion:boolean}){
  const batches=useMemo(()=>{
    const apple:Plant[]=[],autumn:Plant[]=[],tulip:Plant[]=[],lavender:Plant[]=[];
    const tree=(x:number,y:number,scale:number,fall=false)=>{const p=mapPoint(x,y);(fall?autumn:apple).push({...p,height:3.8*scale,angle:(x+y)*.1});};
    [115,165,220,335,390].forEach(x=>tree(x,95,.75));
    [555,600,650,760,815,850].forEach((x,i)=>tree(x,90,.8,!!(i%2)));
    [[115,495],[155,555],[205,492],[325,580],[405,640],[350,650]].forEach(([x,y],i)=>tree(x,y,1.05,i%3!==2));
    [[560,480],[820,635],[855,470]].forEach(([x,y])=>tree(x,y,.8));
    for(let i=0;i<17;i++){tree(40+i*55,8+(i%3)*5,.8+(i%3)*.12);tree(40+i*55,713+(i%3)*5,.8+(i%3)*.12);}
    [130,220,310,450,540,630].forEach(y=>{tree(18,y,.85);tree(940,y,.85);});
    EXPO_GARDENS.forEach((g,gi)=>g.beds.forEach(([x,y,w,h],j)=>{
      if((gi===3&&j===0)||(gi===1&&(j===1||j===2)))return;
      const p=mapPoint(x+w/2,y+h/2),count=Math.min(23,Math.max(8,Math.floor(w*h/110)));
      for(let i=0;i<count;i++){const a=i*2.399963,r=Math.sqrt((i+.5)/count);(gi>=2?lavender:tulip).push({x:p.x+Math.cos(a)*r*w*MAP_SCALE*.42,z:p.z+Math.sin(a)*r*h*MAP_SCALE*.4,height:.36+(i%4)*.045,angle:i*1.9});}
    }));
    EXPO_REST_STOPS.forEach((stop,gi)=>{
      const p=mapPoint(stop.x,stop.y);
      for(let i=0;i<10;i++){const a=i*2.399963,r=3.4+(i%3)*.4;(gi<4?tulip:lavender).push({x:p.x+Math.cos(a)*r,z:p.z+Math.sin(a)*r,height:.42+(i%3)*.06,angle:i});}
    });
    return {apple,autumn,tulip,lavender};
  },[]);
  return <><BatchAsset name="apple-tree" plants={batches.apple} /><BatchAsset name="autumn-tree" plants={batches.autumn} /><BatchAsset name="tulip" plants={batches.tulip} sway still={reducedMotion} /><BatchAsset name="lavender-bush" plants={batches.lavender} sway still={reducedMotion} /></>;
}
