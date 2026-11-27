import type { MissingSummary } from "@/lib/missing/types";
import { gardenRoute, canWalk, mapPoint, MAP_SCALE, type Point } from "./expo-layout";

export const LANTERN_GROUP_SIZE=28;
export type GardenLantern = Point & {person:MissingSummary;garden:number;low:boolean};

/** Sample both verges of the actual paths, excluding junctions and obstacles. */
export function gardenLanternSlots(garden:number):Point[] {
  const route=gardenRoute(garden),ctx=document.createElement("canvas").getContext("2d")!;
  const path=new Path2D(route),candidates:Point[]=[];
  ctx.lineWidth=29;
  for(const section of route.match(/M[^M]+/g)??[]){
    const svg=document.createElementNS("http://www.w3.org/2000/svg","path");svg.setAttribute("d",section);
    const length=svg.getTotalLength();
    for(let d=8;d<length;d+=3/MAP_SCALE){
      const p=svg.getPointAtLength(d),a=svg.getPointAtLength(Math.max(0,d-1)),b=svg.getPointAtLength(Math.min(length,d+1));
      const len=Math.hypot(b.x-a.x,b.y-a.y)||1;
      for(const side of [-1,1]){
        const x=p.x-(b.y-a.y)/len*17*side,y=p.y+(b.x-a.x)/len*17*side,q=mapPoint(x,y);
        if(!ctx.isPointInStroke(path,x,y)&&canWalk(q.x,q.z)&&canWalk(q.x+.5,q.z+.5)&&canWalk(q.x-.5,q.z-.5))candidates.push(q);
      }
    }
  }
  // Farthest-first selects an even spread while preserving at least 3m clearance.
  const slots:Point[]=[];
  while(candidates.length&&slots.length<LANTERN_GROUP_SIZE){
    let best=0,distance=-1;
    candidates.forEach((p,i)=>{const nearest=slots.length?Math.min(...slots.map(q=>Math.hypot(q.x-p.x,q.z-p.z))):1;if(nearest>distance){best=i;distance=nearest;}});
    const p=candidates.splice(best,1)[0];if(slots.length&&distance<3)break;slots.push(p);
  }
  return slots;
}
export function placeGardenLanterns(groups:MissingSummary[][]):GardenLantern[]{
  if(typeof document==="undefined"||!groups.some(g=>g.length))return [];
  return groups.flatMap((people,garden)=>{const slots=gardenLanternSlots(garden);return people.slice(0,slots.length).map((person,i)=>({...slots[i],person,garden,low:i%2===1}));});
}

