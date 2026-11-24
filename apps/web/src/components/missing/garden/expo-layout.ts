export const EXPO_GARDENS = [
  { name: "아이들의 정원", path: "아이들의 길", x: 90, y: 70, color: "#e8dba1", detail: "노란 들꽃 사이로 순한 공룡 친구와 알록달록 장난감 블록을 만나는 정원. 조형물은 길 옆에 두어 꽃밭을 둘러 걷거나 작은 샛길로 지나갈 수 있는 구성.", route: "M280 290 L280 255 C155 275 130 110 250 115 C370 100 400 250 280 255 M160 180 L375 180", beds: [[185,140,40,25],[230,205,100,28],[320,125,35,30]] },
  { name: "어른들의 정원", path: "어른들의 길", x: 530, y: 70, color: "#e0c6ad", detail: "실종된 성인과 어르신을 기억하며 돌아오기를 기다리는 정원. 한옥과 툇마루, 작은 마당들을 잇는 골목에 돌아올 집의 온기를 담는 공간.", route: "M700 290 L700 220 L605 220 L605 135 L785 135 L785 220 L700 220 M700 135 L700 100", beds: [[550,95,35,80],[635,155,45,40],[720,155,45,40],[805,110,35,105]] },
  { name: "계절이 쌓이는 정원", path: "오래 기다리는 길", x: 90, y: 450, color: "#b6c6ac", detail: "실종된 지 10년, 20년이 지나도 여전히 찾고 있는 분들을 기억하는 정원. 여러 계절이 쌓인 나무와 꽃 사이를 걸으며, 오랜 기다림에 함께하는 공간.", route: "M280 450 C400 480 365 540 260 535 C135 530 150 615 285 630 M280 450 L145 475 L130 620 L285 630 L390 600 L390 485 L280 450", beds: [[185,475,60,30],[290,565,60,32],[180,570,45,26]] },
  { name: "바다 건너 정원", path: "바다 건너 길", x: 530, y: 450, color: "#afd0ce", detail: "물가를 둘러 걷다가 등대 앞에 머무는 정원. 등대는 유지하며, 중앙 광장에서 오는 길과 뒤쪽 순환로를 연결할 예정.", route: "M700 450 L700 480 C565 480 565 625 700 625 C835 625 835 480 700 480 M600 550 L560 550 M800 550 L895 550 M700 625 L700 680", beds: [[630,510,140,80],[550,470,45,28],[795,610,45,28]] },
] as const;

export type Point = { x: number; z: number };
export const MAP_SCALE = 0.18;
export const WORLD_BOUNDS={minX:-77.5,maxX:77.5,minZ:-61.8,maxZ:56.2};
export const mapPoint = (x: number, y: number): Point => ({ x: (x - 480) * MAP_SCALE, z: (y - 375) * MAP_SCALE });
export const EXPO_MAIN_PATH = "M65 375 H895 M280 290 V450 M700 290 V450";
export const EXPO_START = mapPoint(480, 418);
export const EXPO_ENTRANCES = [mapPoint(280, 310), mapPoint(700, 310), mapPoint(280, 430), mapPoint(700, 430)];

/** Side walks connect the back of each garden and small places to linger. */
export const EXPO_SIDE_PATHS=[
  "M160 180 C100 180 105 110 150 115 L250 115 M375 180 C420 180 420 255 360 260 L280 255 M280 115 L280 40",
  "M605 135 C555 135 555 75 610 75 L700 75 L700 100 M785 220 C840 220 850 160 830 135 L785 135 M700 75 L700 40",
  "M145 475 L65 475 M285 630 L285 680 M260 535 C225 505 220 475 260 470 M390 600 C425 640 380 650 350 650 L285 630",
  "M700 480 C650 435 575 455 575 510 L600 550 M700 625 C760 665 840 655 850 600 L800 550",
] as const;
export const EXPO_REST_STOPS=[
  {x:125,y:140,kind:"play"}, {x:395,y:235,kind:"flowers"},
  {x:590,y:95,kind:"porch"}, {x:830,y:180,kind:"tea"},
  {x:240,y:495,kind:"seasons"}, {x:390,y:640,kind:"rest"},
  {x:595,y:475,kind:"coast"}, {x:810,y:645,kind:"sea"},
] as const;
export function gardenRoute(index:number){return EXPO_GARDENS[index].route+" "+EXPO_SIDE_PATHS[index];}

type Obstacle = { x: number; z: number; rx: number; rz: number };
export const EXPO_OBSTACLES: Obstacle[] = [
  ...[[455,347],[505,347],[455,403],[505,403]].map(([x,y])=>({...mapPoint(x,y),rx:1.1,rz:1.1})),
  {...mapPoint(535,350),rx:1.35,rz:.2},
  ...[[175,490],[175,535],[245,590],[350,605]].map(([x,y])=>({...mapPoint(x,y),rx:.25,rz:.25})),
  { ...mapPoint(480,375), rx: 2.5, rz: 2.5 },
  {...mapPoint(657,175),rx:2.1,rz:1.65},
  {...mapPoint(742,175),rx:2.1,rz:1.65},
  {...mapPoint(700,550),rx:70*MAP_SCALE,rz:40*MAP_SCALE},
  ...EXPO_REST_STOPS.map(s=>({...mapPoint(s.x,s.y),rx:1.9,rz:1.9})),
  { ...mapPoint(275,145), rx:2.5, rz:1.3 },
  { ...mapPoint(135,227), rx:1.8, rz:1.5 },
  { ...mapPoint(840,525), rx:1.3, rz:1.3 },
  ...[[380,235],[810,255],[340,550]].map(([x,y])=>({...mapPoint(x,y),rx:1.15,rz:0.4})),
  {...mapPoint(565,590),rx:0.4,rz:1.15},
  ...[[235,318],[745,318],[235,429],[745,429]].map(([x,y])=>({...mapPoint(x,y),rx:1.35,rz:0.12})),
  ...[[115,95],[165,95],[220,95],[335,95],[390,95],[555,90],[600,90],[650,90],[760,90],[815,90],[850,90],[115,495],[155,555],[205,492],[325,580],[405,640],[350,650],[560,480],[820,635],[855,470]].map(([x,y])=>({...mapPoint(x,y),rx:0.2,rz:0.2})),
];

export function canWalk(x: number, z: number) {
  if (x < WORLD_BOUNDS.minX || x > WORLD_BOUNDS.maxX || z < WORLD_BOUNDS.minZ || z > WORLD_BOUNDS.maxZ) return false;
  return !EXPO_OBSTACLES.some(o => Math.abs(x-o.x) < o.rx+0.35 && Math.abs(z-o.z) < o.rz+0.35);
}

/** Exact segment/expanded-box test: even a short corner crossing is blocked. */
export function clearWalkSegment(from:Point,to:Point) {
  if(!canWalk(from.x,from.z)||!canWalk(to.x,to.z))return false;
  return !EXPO_OBSTACLES.some(o=>{
    let low=0,high=1;
    for(const [start,end,center,radius] of [[from.x,to.x,o.x,o.rx+0.35],[from.z,to.z,o.z,o.rz+0.35]]){
      const direction=end-start,min=center-radius,max=center+radius;
      if(Math.abs(direction)<1e-9){if(start<=min||start>=max)return false;continue;}
      const a=(min-start)/direction,b=(max-start)/direction;
      low=Math.max(low,Math.min(a,b));high=Math.min(high,Math.max(a,b));
      if(low>high)return false;
    }
    return low<=high;
  });
}

// Click-to-walk uses a bounded navigation grid so water and garden objects cannot be crossed.
const STEP = 0.75;
const COLS = Math.ceil((WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX)/STEP)+1;
const ROWS = Math.ceil((WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ)/STEP)+1;
const pointAt = (id: number): Point => ({ x: (id % COLS)*STEP+WORLD_BOUNDS.minX, z: Math.floor(id/COLS)*STEP+WORLD_BOUNDS.minZ });
const cellAt = (p: Point) => Math.max(0,Math.min(ROWS-1,Math.round((p.z-WORLD_BOUNDS.minZ)/STEP)))*COLS + Math.max(0,Math.min(COLS-1,Math.round((p.x-WORLD_BOUNDS.minX)/STEP)));
const NAV = Array.from({length:COLS*ROWS}, (_,id) => { const p=pointAt(id); return canWalk(p.x,p.z); });

export function findWalkRoute(from: Point, to: Point): Point[] {
  if (!canWalk(to.x,to.z)) return [];
  if(clearWalkSegment(from,to))return [to];
  const start=cellAt(from), goal=cellAt(to);
  if (!NAV[goal]) return [];
  const parent = new Int32Array(NAV.length).fill(-1);
  const queue=[start]; parent[start]=start;
  for(let head=0;head<queue.length;head++) {
    const id=queue[head];
    if(id===goal) break;
    const col=id%COLS, row=Math.floor(id/COLS);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const c=col+dx,r=row+dz,next=r*COLS+c;
      if(c<0||c>=COLS||r<0||r>=ROWS||!NAV[next]||parent[next]!==-1) continue;
      if(dx&&dz&&(!NAV[row*COLS+c]||!NAV[r*COLS+col])) continue;
      parent[next]=id; queue.push(next);
    }
  }
  if(parent[goal]===-1) return [];
  const route:Point[]=[to];
  for(let id=goal;id!==start;id=parent[id]) route.push(pointAt(id));
  const ordered=route.reverse(),smooth:Point[]=[];
  let anchor=from,index=0;
  while(index<ordered.length){
    let far=index;
    for(let candidate=index+1;candidate<ordered.length;candidate++){
      if(!clearWalkSegment(anchor,ordered[candidate]))break;far=candidate;
    }
    if(!clearWalkSegment(anchor,ordered[far]))return [];
    anchor=ordered[far];smooth.push(anchor);index=far+1;
  }
  return smooth;
}
