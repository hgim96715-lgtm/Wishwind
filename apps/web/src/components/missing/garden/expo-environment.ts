export type GardenPhase="morning"|"day"|"sunset"|"night";
export function phaseAt(hour:number):GardenPhase {
  const h=((hour%24)+24)%24;
  return h>=6&&h<10?"morning":h>=10&&h<17?"day":h>=17&&h<20?"sunset":"night";
}
export const ENVIRONMENTS={
  morning:{top:"#CFE7FA",middle:"#FDE8D7",horizon:"#FDE8D7",fog:"#EFECE6",sun:"#FFF3DC",power:1.1,position:[-90,45,45],hemi:"#FFF3DC",ground:"#b6c79c",ambient:.35,hemiPower:.9,lamp:.45},
  day:{top:"#7fb9ea",middle:"#cfe5f1",horizon:"#fbf1d9",fog:"#f1eedb",sun:"#FFF1CF",power:1.45,position:[-60,120,60],hemi:"#fff6e1",ground:"#9db68b",ambient:.35,hemiPower:1,lamp:.3},
  sunset:{top:"#6D5D8F",middle:"#E8927C",horizon:"#FAD49B",fog:"#E6B89C",sun:"#FFA85C",power:1.15,position:[-110,35,35],hemi:"#ffdac0",ground:"#ad9876",ambient:.28,hemiPower:.8,lamp:1.1},
  night:{top:"#0F172A",middle:"#243456",horizon:"#243456",fog:"#182238",sun:"#8EA8D8",power:.55,position:[-60,110,-35],hemi:"#8ea8d8",ground:"#314a47",ambient:.16,hemiPower:.55,lamp:1.6},
} satisfies Record<GardenPhase,{top:string;middle:string;horizon:string;fog:string;sun:string;power:number;position:number[];hemi:string;ground:string;ambient:number;hemiPower:number;lamp:number}>;
export function lampStrength(phase:GardenPhase,wet:boolean){return wet?Math.max(1.25,ENVIRONMENTS[phase].lamp):ENVIRONMENTS[phase].lamp;}
