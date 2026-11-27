"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** 동화책 수채화 일러스트(SVG)를 그림 판으로 세우는 도구 모음 */

const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<filter id="wc" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16"/></filter>
<filter id="wc2" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="8"/></filter>
<filter id="soft"><feGaussianBlur stdDeviation="1.2"/></filter>
</defs>${body}</svg>`;

function mulberry(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** 수채화 나무: 갈색 줄기와 가지, 번진 초록 잎덩이 여러 겹 */
export function treeSvg(seed: number, tone: 0 | 1 | 2) {
  const r = mulberry(seed);
  const W = 520, H = 660;
  const greens = [
    ["#9fcf7a", "#7fba6b", "#5fa062", "#c7df8c", "#4f8f5a"],
    ["#a9d28a", "#86c07a", "#69ab6c", "#d7e79a", "#5a9a62"],
    ["#8ec56f", "#6fb064", "#559a5c", "#bcd985", "#468753"],
  ][tone];
  let crown = "";
  const cx = 260, cy = 235;
  for (let i = 0; i < 16; i++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * 150;
    const x = cx + Math.cos(a) * d * 1.15, y = cy + Math.sin(a) * d * 0.8;
    const rad = 58 + r() * 52;
    crown += `<ellipse cx="${x}" cy="${y}" rx="${rad}" ry="${rad * 0.85}" fill="${greens[Math.floor(r() * 3)]}" opacity="0.82"/>`;
  }
  let hi = "";
  for (let i = 0; i < 9; i++) {
    const a = -1.2 + r() * 2.2, d = 60 + r() * 100;
    hi += `<ellipse cx="${cx + Math.cos(a) * d - 20}" cy="${cy + Math.sin(a) * d * 0.7 - 30}" rx="${30 + r() * 30}" ry="${22 + r() * 22}" fill="${greens[3]}" opacity="0.7"/>`;
  }
  let lo = "";
  for (let i = 0; i < 8; i++) {
    const x = cx - 130 + r() * 260, y = cy + 20 + r() * 110;
    lo += `<ellipse cx="${x}" cy="${y}" rx="${24 + r() * 28}" ry="${16 + r() * 20}" fill="${greens[4]}" opacity="0.55"/>`;
  }
  let leaves = "";
  for (let i = 0; i < 30; i++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * 165;
    leaves += `<ellipse cx="${cx + Math.cos(a) * d * 1.1}" cy="${cy + Math.sin(a) * d * 0.78}" rx="9" ry="5.5" transform="rotate(${r() * 180} ${cx + Math.cos(a) * d * 1.1} ${cy + Math.sin(a) * d * 0.78})" fill="${r() < 0.5 ? "#e9ef9a" : "#6aa860"}" opacity="0.8"/>`;
  }
  const trunk = `<path d="M232 640 C240 560 244 500 246 430 C246 400 238 380 214 350 M246 430 C262 396 292 372 330 338 M246 440 C250 400 262 360 258 300 M252 400 C226 380 196 372 172 340" fill="none" stroke="#7d6046" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M214 640 C228 580 232 520 236 440 L274 440 C278 520 286 590 308 640 Z" fill="#8a6a4d"/>
<path d="M246 560 C250 520 252 470 252 440" stroke="#a98763" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  const grass = `<ellipse cx="260" cy="645" rx="150" ry="14" fill="#a9cf84" opacity="0.8" filter="url(#wc2)"/>`;
  return svg(W, H, `${grass}${trunk}<g filter="url(#wc)">${crown}${lo}${hi}</g>${leaves}
<g stroke="#5b4630" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.8"><path d="M246 440 C250 400 262 360 258 320"/><path d="M246 430 C262 396 292 372 318 350"/></g>`);
}

/** 꽃무더기: 잎 + 동글동글 꽃 */
export function flowerSvg(seed: number, kind: number) {
  const r = mulberry(seed);
  const W = 300, H = 280;
  const sets = [
    ["#ff9db8", "#ffc6d6", "#ff7a9e"],
    ["#ffd54a", "#ffe58a", "#f5b81f"],
    ["#ffffff", "#fff6e0", "#e9eef7"],
    ["#ff8a5c", "#ffb27d", "#e8643a"],
    ["#8fa6f2", "#b9c6fa", "#6c84dd"],
  ][kind % 5];
  let leaves = "", flowers = "";
  for (let i = 0; i < 9; i++) {
    const x = 40 + r() * 220, tip = 100 + r() * 70;
    leaves += `<path d="M${x} 262 C${x - 18} ${tip + 60} ${x - 6} ${tip + 20} ${x + (r() - 0.5) * 40} ${tip}" stroke="${r() < 0.5 ? "#7fb35e" : "#5f9a4e"}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  }
  const n = 6 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const x = 45 + r() * 210, y = 50 + r() * 120, s = 15 + r() * 10;
    const stemTop = y + s * 0.4;
    flowers += `<path d="M${x} 264 C${x + (r() - 0.5) * 30} ${(264 + y) / 2} ${x} ${y + 20} ${x} ${stemTop}" stroke="#6aa550" stroke-width="3.5" fill="none"/>`;
    let pet = "";
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * 360 + r() * 20;
      pet += `<ellipse cx="${x}" cy="${y - s * 0.72}" rx="${s * 0.5}" ry="${s * 0.72}" transform="rotate(${a} ${x} ${y})" fill="${sets[k % 2]}" stroke="${sets[2]}" stroke-width="1.2" opacity="0.95"/>`;
    }
    flowers += pet + `<circle cx="${x}" cy="${y}" r="${s * 0.36}" fill="${kind % 5 === 1 ? "#e8872a" : "#ffd24a"}"/>`;
  }
  return svg(W, H, `<g filter="url(#wc2)">${leaves}</g>${flowers}<ellipse cx="150" cy="268" rx="110" ry="9" fill="#9cc579" opacity="0.7" filter="url(#wc2)"/>`);
}

/** 꽃덤불: 작고 부드러운 잎 더미 위에 작은 들꽃이 흩어져 핌 */
export function bushSvg(seed: number, kind: number) {
  const r = mulberry(seed);
  const W = 360, H = 240;
  const pal = [["#78b866", "#92c874", "#a9d584", "#68a95e"], ["#86c06c", "#a2d07a", "#bcdf8e", "#74b060"]][kind % 2];
  const cols = [["#ffffff", "#ffe27a", "#ffc2d4"], ["#fff3b0", "#ffffff", "#d6c6f5"], ["#ffc2d4", "#ffffff", "#ffd8a0"], ["#cfe0ff", "#ffffff", "#ffe27a"]][kind % 4];
  let leaves = "", fl = "";
  const inside = (x: number, y: number) => ((x - 180) / 150) ** 2 + ((y - 150) / 80) ** 2 < 1;
  for (let i = 0; i < 70; i++) {
    const x = 36 + r() * 288, y = 70 + r() * 160;
    if (!inside(x, y)) continue;
    const len = 14 + r() * 12;
    leaves += `<ellipse cx="${x}" cy="${y}" rx="${len}" ry="${len * 0.45}" transform="rotate(${r() * 180} ${x} ${y})" fill="${pal[Math.floor(r() * 4)]}" opacity="0.92"/>`;
  }
  for (let i = 0; i < 46; i++) {
    const a = r() * 6.28, d = Math.sqrt(r());
    const x = 180 + Math.cos(a) * d * 140, y = 140 + Math.sin(a) * d * 62, s = 5 + r() * 5;
    const c = cols[Math.floor(r() * 3)];
    let p = "";
    for (let k = 0; k < 5; k++) p += `<ellipse cx="${x}" cy="${y - s * 0.7}" rx="${s * 0.46}" ry="${s * 0.72}" transform="rotate(${k * 72 + r() * 20} ${x} ${y})" fill="${c}" opacity="0.95"/>`;
    fl += p + `<circle cx="${x}" cy="${y}" r="${s * 0.3}" fill="#f2b440"/>`;
  }
  return svg(W, H, `<ellipse cx="180" cy="222" rx="150" ry="11" fill="#7a9a5a" opacity="0.22" filter="url(#wc2)"/><g filter="url(#wc2)">${leaves}</g>${fl}`);
}

/** 들꽃 한 줌: 가는 줄기 끝에 작은 꽃과 풀잎이 흩어짐 */
export function wildSvg(seed: number) {
  const r = mulberry(seed * 7 + 3);
  const W = 260, H = 200;
  const cols = ["#ffffff", "#ffe27a", "#ffb7cc", "#cdb8f2", "#aecaf7", "#ffc59a"];
  let g = "", f = "";
  for (let i = 0; i < 10; i++) {
    const x = 20 + r() * 220;
    g += `<path d="M${x} 196 q${(r() - 0.5) * 30} -50 ${(r() - 0.5) * 40} -${60 + r() * 60}" stroke="${r() < 0.5 ? "#8cc468" : "#6fae5a"}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < 12; i++) {
    const x = 24 + r() * 212, y = 40 + r() * 110, s = 6 + r() * 5;
    const c = cols[Math.floor(r() * cols.length)];
    g += `<path d="M${x} 196 Q${x + (r() - 0.5) * 24} ${(196 + y) / 2} ${x} ${y}" stroke="#7fbb62" stroke-width="2.5" fill="none"/>`;
    let p = "";
    for (let k = 0; k < 5; k++) p += `<ellipse cx="${x}" cy="${y - s * 0.7}" rx="${s * 0.46}" ry="${s * 0.72}" transform="rotate(${k * 72 + r() * 20} ${x} ${y})" fill="${c}" opacity="0.96"/>`;
    f += p + `<circle cx="${x}" cy="${y}" r="${s * 0.3}" fill="#f2b440"/>`;
  }
  return svg(W, H, `<g filter="url(#wc2)">${g}</g>${f}`);
}

/** 풍차 몸통(날개는 따로) */
export function windmillSvg() {
  const W = 400, H = 560;
  return svg(W, H, `
<ellipse cx="200" cy="545" rx="150" ry="12" fill="#7a9a5a" opacity="0.28"/>
<path d="M110 540 L150 175 L250 175 L290 540 Z" fill="#f4e6c4" stroke="#6a5645" stroke-width="4" stroke-linejoin="round"/>
<path d="M200 175 L250 175 L290 540 L200 540 Z" fill="#e6d3a8" opacity="0.7"/>
<g stroke="#b08a60" stroke-width="3" opacity="0.6"><path d="M125 430 L275 430"/><path d="M135 330 L265 330"/><path d="M142 250 L258 250"/></g>
<path d="M128 175 L272 175 L300 140 L100 140 Z" fill="#c9885a" stroke="#6a5645" stroke-width="4" stroke-linejoin="round"/>
<path d="M100 140 C100 80 160 40 200 24 C240 40 300 80 300 140 Z" fill="#b5593f" stroke="#6a5645" stroke-width="4" stroke-linejoin="round"/>
<path d="M130 120 C150 80 170 60 200 44" fill="none" stroke="#d98065" stroke-width="8" stroke-linecap="round" opacity="0.7"/>
<path d="M172 540 L172 470 C172 440 228 440 228 470 L228 540 Z" fill="#8a5a3a" stroke="#6a5645" stroke-width="4"/>
<circle cx="214" cy="500" r="4" fill="#f4d58a"/>
<rect x="178" y="300" width="44" height="52" rx="22" fill="#9ccbe8" stroke="#6a5645" stroke-width="4"/>
<path d="M200 300 L200 352 M178 326 L222 326" stroke="#6a5645" stroke-width="3"/>
<g fill="#e6679a" opacity="0.95"><circle cx="150" cy="535" r="8"/><circle cx="256" cy="538" r="7"/></g>
<g fill="#7fb35e"><ellipse cx="136" cy="536" rx="22" ry="9"/><ellipse cx="270" cy="538" rx="22" ry="9"/></g>`);
}

/** 풍차 날개: 가운데 축 기준 대칭이라 그대로 돌려도 자연스러움 */
export function sailsSvg() {
  const S = 700, c = S / 2;
  let blades = "";
  for (let i = 0; i < 4; i++) {
    blades += `<g transform="rotate(${i * 90 + 18} ${c} ${c})">
<rect x="${c - 6}" y="${c - 320}" width="12" height="320" rx="5" fill="#7a5238" stroke="#5a3d2a" stroke-width="2"/>
<path d="M${c + 6} ${c - 300} L${c + 78} ${c - 288} L${c + 78} ${c - 110} L${c + 6} ${c - 100} Z" fill="#f5ead0" stroke="#7a5238" stroke-width="4" stroke-linejoin="round"/>
<g stroke="#a98660" stroke-width="3"><path d="M${c + 6} ${c - 240} L${c + 78} ${c - 235}"/><path d="M${c + 6} ${c - 190} L${c + 78} ${c - 184}"/><path d="M${c + 6} ${c - 145} L${c + 78} ${c - 140}"/><path d="M${c + 42} ${c - 294} L${c + 42} ${c - 105}"/></g></g>`;
  }
  return svg(S, S, `<g filter="url(#wc2)">${blades}</g><circle cx="${c}" cy="${c}" r="26" fill="#a5694a" stroke="#5a3d2a" stroke-width="4"/><circle cx="${c}" cy="${c}" r="9" fill="#f4d58a"/>`);
}

/** 등대: 빨강·하양 줄무늬, 둥근 난간과 따뜻한 등 */
export function lighthouseSvg() {
  const W = 300, H = 800;
  let stripes = "";
  const top = 230, bot = 780;
  const halfAt = (y: number) => 56 + ((y - top) / (bot - top)) * 52;
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const y0 = top + (i * (bot - top)) / bands, y1 = top + ((i + 1) * (bot - top)) / bands;
    stripes += `<path d="M${150 - halfAt(y0)} ${y0} L${150 + halfAt(y0)} ${y0} L${150 + halfAt(y1)} ${y1} L${150 - halfAt(y1)} ${y1} Z" fill="${i % 2 ? "#e0604e" : "#fbf4e4"}" stroke="#6a5645" stroke-width="4" stroke-linejoin="round"/>`;
  }
  return svg(W, H, `
<ellipse cx="150" cy="786" rx="125" ry="12" fill="#7a9a5a" opacity="0.28"/>
${stripes}
<path d="M168 ${top} L${150 + halfAt(top)} ${top} L${150 + halfAt(bot)} ${bot} L190 ${bot} Z" fill="#000" opacity="0.06"/>
<rect x="104" y="214" width="92" height="20" rx="8" fill="#6c6a68" stroke="#6a5645" stroke-width="4"/>
<g stroke="#6a5645" stroke-width="3.5" fill="none"><path d="M106 214 L106 176 M130 214 L130 176 M150 214 L150 176 M170 214 L170 176 M194 214 L194 176"/><path d="M104 178 L196 178"/></g>
<rect x="112" y="108" width="76" height="72" rx="14" fill="#fff0b8" stroke="#6a5645" stroke-width="4"/>
<path d="M126 118 L126 172 M150 112 L150 176 M174 118 L174 172" stroke="#6a5645" stroke-width="3" opacity="0.6"/>
<path d="M104 112 L196 112 L150 40 Z" fill="#d9503f" stroke="#6a5645" stroke-width="4" stroke-linejoin="round"/>
<circle cx="150" cy="34" r="8" fill="#f4d58a" stroke="#6a5645" stroke-width="3"/>
<rect x="132" y="620" width="36" height="60" rx="16" fill="#8a5a3a" stroke="#6a5645" stroke-width="3.5"/>
<rect x="132" y="360" width="36" height="42" rx="18" fill="#9ccbe8" stroke="#6a5645" stroke-width="3.5"/>`);
}

/** 가로등: 가는 기둥과 따뜻한 유리 등 */
export function lampSvg() {
  const W = 140, H = 420;
  return svg(W, H, `
<ellipse cx="70" cy="410" rx="40" ry="7" fill="#7a9a5a" opacity="0.3"/>
<path d="M62 408 L66 120 L74 120 L78 408 Z" fill="#6b5645" stroke="#4a3a2c" stroke-width="3" stroke-linejoin="round"/>
<ellipse cx="70" cy="404" rx="22" ry="8" fill="#6b5645" stroke="#4a3a2c" stroke-width="3"/>
<path d="M70 150 C40 150 38 118 56 112" fill="none" stroke="#4a3a2c" stroke-width="6" stroke-linecap="round"/>
<path d="M40 112 L100 112 L88 56 L52 56 Z" fill="#fff0c0" stroke="#4a3a2c" stroke-width="4" stroke-linejoin="round"/>
<path d="M52 66 L88 66" stroke="#f4cf72" stroke-width="10" opacity="0.8"/>
<path d="M44 56 L96 56 L70 22 Z" fill="#5a4636" stroke="#4a3a2c" stroke-width="4" stroke-linejoin="round"/>
<circle cx="70" cy="18" r="5" fill="#5a4636"/>`);
}

const OUT = `stroke="#6a5a45" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;
const eyeSvg = (x: number, y: number, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><circle r="14" fill="#fff" stroke="#6a5a45" stroke-width="2.5"/><circle cx="2" cy="1" r="8.5" fill="#2a2220"/><circle cx="5" cy="-3" r="3" fill="#fff"/></g>`;

/** 목 긴 크림색 공룡(빨간 점) */
export function sauropodSvg() {
  const body = "#f3e4a6", belly = "#fcf4d2", spot = "#e66a5a";
  return svg(520, 460, `
<ellipse cx="260" cy="440" rx="190" ry="14" fill="#7a9a5a" opacity="0.28"/>
<path d="M92 330 C40 360 30 400 70 408 C120 412 160 370 170 330 Z" fill="${body}" ${OUT}/>
<g fill="${body}" ${OUT}><rect x="170" y="330" width="58" height="96" rx="26"/><rect x="290" y="330" width="58" height="96" rx="26"/></g>
<ellipse cx="262" cy="316" rx="168" ry="104" fill="${body}" ${OUT}/>
<ellipse cx="288" cy="344" rx="104" ry="64" fill="${belly}"/>
<path d="M330 260 C376 220 384 170 360 118 C346 90 372 70 396 80" fill="none" stroke="${body}" stroke-width="56" stroke-linecap="round"/>
<path d="M330 260 C376 220 384 170 360 118" fill="none" stroke="#6a5a45" stroke-width="3.5" opacity="0"/>
<ellipse cx="400" cy="84" rx="58" ry="46" fill="${body}" ${OUT}/>
${eyeSvg(398, 76, 1.2)}
<path d="M404 108 q14 12 30 0" fill="none" stroke="#7a3b2a" stroke-width="4" stroke-linecap="round"/>
<ellipse cx="368" cy="102" rx="12" ry="8" fill="#f4a79a" opacity="0.7"/>
<circle cx="386" cy="42" r="10" fill="${spot}"/><circle cx="408" cy="40" r="8" fill="${spot}"/>
<g fill="${spot}"><circle cx="200" cy="262" r="20"/><circle cx="250" cy="236" r="14"/><circle cx="300" cy="248" r="18"/><circle cx="168" cy="318" r="12"/></g>
<g fill="${belly}" ${OUT}><ellipse cx="200" cy="428" rx="40" ry="14"/><ellipse cx="320" cy="428" rx="40" ry="14"/></g>`);
}

/** 주황 티라노(작은 팔, 등 돌기) */
export function rexSvg() {
  const body = "#f2925c", belly = "#fbdcae", spike = "#cf6a3e";
  return svg(440, 520, `
<ellipse cx="220" cy="500" rx="140" ry="12" fill="#7a9a5a" opacity="0.28"/>
<path d="M120 380 C50 420 20 470 60 478 C110 480 150 440 170 400 Z" fill="${body}" ${OUT}/>
<g fill="${spike}" stroke="#6a5a45" stroke-width="3" stroke-linejoin="round"><path d="M150 210 l-22 -20 l8 30z"/><path d="M142 260 l-26 -14 l10 30z"/><path d="M146 310 l-28 -8 l12 28z"/><path d="M158 358 l-26 0 l16 24z"/></g>
<g fill="${body}" ${OUT}><rect x="160" y="400" width="62" height="86" rx="28"/><rect x="236" y="400" width="62" height="86" rx="28"/></g>
<ellipse cx="236" cy="340" rx="104" ry="128" fill="${body}" ${OUT}/>
<ellipse cx="262" cy="366" rx="62" ry="88" fill="${belly}"/>
<g fill="${body}" ${OUT}><ellipse cx="320" cy="320" rx="22" ry="14" transform="rotate(25 320 320)"/><ellipse cx="190" cy="328" rx="18" ry="12" transform="rotate(-25 190 328)"/></g>
<g fill="${belly}" ${OUT}><ellipse cx="190" cy="488" rx="42" ry="13"/><ellipse cx="268" cy="488" rx="42" ry="13"/></g>
<ellipse cx="256" cy="150" rx="118" ry="96" fill="${body}" ${OUT}/>
<ellipse cx="300" cy="186" rx="70" ry="48" fill="${belly}"/>
${eyeSvg(232, 118, 1.5)}${eyeSvg(300, 118, 1.5)}
<path d="M264 194 q30 22 62 -2" fill="none" stroke="#7a3b2a" stroke-width="5" stroke-linecap="round"/>
<g fill="#fff" stroke="#6a5a45" stroke-width="2"><path d="M284 200 l6 12 l6 -12z"/><path d="M306 196 l6 12 l6 -14z"/></g>
<ellipse cx="204" cy="150" rx="16" ry="10" fill="#f4a590" opacity="0.7"/><ellipse cx="324" cy="150" rx="16" ry="10" fill="#f4a590" opacity="0.7"/>`);
}

/** 지구본: 파란 바다, 둥근 초록 대륙, 굵은 흰 받침 */
export function globeSvg() {
  // 책상 위 지구본: 왼쪽을 감싸는 금속 반원 고리, 기울어진 지구, 가는 받침대와 둥근 바닥
  const CX = 210, CY = 196, R = 138;
  return svg(420, 480, `
<ellipse cx="210" cy="466" rx="112" ry="11" fill="#7a9a5a" opacity="0.28"/>
<ellipse cx="210" cy="448" rx="86" ry="20" fill="#c99d68" ${OUT}/><ellipse cx="210" cy="443" rx="62" ry="10" fill="#dcb98a"/>
<rect x="198" y="360" width="24" height="84" rx="8" fill="#c99d68" ${OUT}/>
<path d="M${CX} ${CY + R + 26} A ${R + 26} ${R + 26} 0 0 1 ${CX} ${CY - R - 26}" fill="none" stroke="#6a5a45" stroke-width="22" stroke-linecap="round"/>
<path d="M${CX} ${CY + R + 26} A ${R + 26} ${R + 26} 0 0 1 ${CX} ${CY - R - 26}" fill="none" stroke="#c99d68" stroke-width="15" stroke-linecap="round"/>
<g transform="rotate(-20 ${CX} ${CY})">
<circle cx="${CX}" cy="${CY}" r="${R}" fill="#74c6f2" ${OUT}/>
<g fill="#86d05e" stroke="#4aa83a" stroke-width="3.5" stroke-linejoin="round" filter="url(#wc2)">
<path d="M118 138 C136 96 192 90 214 120 C224 144 192 168 180 196 C174 224 146 240 126 220 C100 200 104 164 118 138Z"/>
<path d="M240 184 C274 164 312 174 322 208 C328 242 300 270 278 282 C254 286 238 256 234 230 C232 212 234 194 240 184Z"/>
<path d="M232 92 C254 80 284 86 288 106 C276 118 250 120 232 92Z"/></g>
<ellipse cx="${CX}" cy="${CY}" rx="${R}" ry="30" fill="none" stroke="#fff" stroke-width="3" opacity="0.4"/>
<ellipse cx="${CX}" cy="${CY}" rx="62" ry="${R}" fill="none" stroke="#fff" stroke-width="3" opacity="0.35"/>
<path d="M${CX - 100} ${CY - 96} C${CX - 60} ${CY - 132} ${CX - 10} ${CY - 138} ${CX + 30} ${CY - 132}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0.55"/>
<circle cx="${CX}" cy="${CY - R}" r="7" fill="#e9d9b6" ${OUT}/>
</g>`);
}

const cache = new Map<string, THREE.Texture>();
function texFor(svgStr: string) {
  let t = cache.get(svgStr);
  if (!t) {
    t = new THREE.TextureLoader().load("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    cache.set(svgStr, t);
  }
  return t;
}

export interface BillboardItem { svg: string; x: number; y: number; z: number; h: number; aspect: number; flip?: boolean; sway?: number }

/** 항상 카메라 쪽을 보는(수직 유지) 그림 판들. 밤·눈에는 색을 입혀 분위기를 맞춤 */
export function Billboards({ items, tint, still }: { items: BillboardItem[]; tint: string; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(() => {
    const m = new Map<string, THREE.MeshBasicMaterial>();
    items.forEach(it => {
      if (!m.has(it.svg)) m.set(it.svg, new THREE.MeshBasicMaterial({ map: texFor(it.svg), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, toneMapped: false, fog: true }));
    });
    return m;
  }, [items]);
  const plane = useMemo(() => { const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.5, 0); return g; }, []);
  useEffect(() => {
    mats.forEach(m => m.color.set(tint));
  }, [tint, mats, items]);
  useEffect(() => () => { plane.dispose(); mats.forEach(m => m.dispose()); }, [plane, mats]);
  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    const t = still ? 0 : performance.now() / 1000;
    for (let i = 0; i < g.children.length; i++) {
      const c = g.children[i];
      const it = items[i];
      if (!it) continue;
      c.rotation.y = Math.atan2(camera.position.x - c.position.x, camera.position.z - c.position.z);
      c.rotation.z = it.sway ? Math.sin(t * 1.1 + it.x * 0.7 + it.z * 0.4) * it.sway : 0;
    }
  });
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <mesh
          key={i}
          geometry={plane}
          material={mats.get(it.svg)}
          position={[it.x, it.y - it.h * 0.035, it.z]}
          scale={[it.h * it.aspect * (it.flip ? -1 : 1), it.h, 1]}
          raycast={() => null}
          userData={{ noShadow: true }}
        />
      ))}
    </group>
  );
}

export const storyTexture = texFor;

/** 무지개: 수채화 띠 + 발치의 구름 */
export function rainbowSvg() {
  const W = 900, H = 500;
  const cols = ["#f59a9a", "#f8bf8c", "#f9e38e", "#a8d9a0", "#9ccbe8", "#bba7e6"];
  let bands = "";
  cols.forEach((c, i) => {
    const r = 400 - i * 24;
    bands += `<path d="M${450 - r} 440 A${r} ${r} 0 0 1 ${450 + r} 440" fill="none" stroke="${c}" stroke-width="26" stroke-linecap="round" opacity="0.9"/>`;
  });
  const cloud = (cx: number) => `<g fill="#ffffff" opacity="0.96" filter="url(#wc2)"><ellipse cx="${cx}" cy="446" rx="78" ry="32"/><ellipse cx="${cx - 40}" cy="432" rx="42" ry="30"/><ellipse cx="${cx + 20}" cy="420" rx="50" ry="36"/><ellipse cx="${cx + 56}" cy="438" rx="38" ry="26"/></g>`;
  return svg(W, H, `<g filter="url(#wc)">${bands}</g>${cloud(78)}${cloud(822)}`);
}

/** 수채화 종이 질감(땅·길에 곱해지는 밝은 무늬) */
export function paintTexture(kind: "ground" | "path", repeatX: number, repeatY: number) {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const r = mulberry(kind === "ground" ? 5 : 8);
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, S, S);
  const wrap = (fn: (ox: number, oy: number) => void) => {
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy);
  };
  const blots = kind === "ground" ? 70 : 40;
  for (let i = 0; i < blots; i++) {
    const x = r() * S, y = r() * S, rx = 30 + r() * 80, ry = 20 + r() * 60;
    const l = r() < 0.5 ? "232,240,206" : "255,250,222";
    const a = 0.12 + r() * 0.16;
    wrap((ox, oy) => {
      g.fillStyle = `rgba(${l},${a})`;
      g.beginPath();
      g.ellipse(x + ox, y + oy, rx, ry, r() * 3, 0, 6.3);
      g.fill();
    });
  }
  if (kind === "ground") {
    // 짧은 붓결
    g.lineCap = "round";
    for (let i = 0; i < 520; i++) {
      const x = r() * S, y = r() * S, len = 6 + r() * 14, a = -1.2 + r() * 0.6;
      g.strokeStyle = r() < 0.5 ? "rgba(200,222,150,0.35)" : "rgba(255,255,235,0.4)";
      g.lineWidth = 1.5 + r() * 1.5;
      wrap((ox, oy) => { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len); g.stroke(); });
    }
  } else {
    // 길 위의 작은 자갈과 흙 점
    for (let i = 0; i < 160; i++) {
      const x = r() * S, y = r() * S, rr = 2 + r() * 5;
      const light = r() < 0.5;
      wrap((ox, oy) => {
        g.fillStyle = light ? "rgba(255,252,238,0.75)" : "rgba(184,158,112,0.2)";
        g.beginPath(); g.ellipse(x + ox, y + oy, rr * 1.3, rr, r() * 3, 0, 6.3); g.fill();
      });
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** 입구 꽃문: 나무 결이 있는 기둥, 굽은 들보, 덩굴과 꽃 (팻말은 따로 걸림) */
export function gateSvg() {
  const W = 1100, H = 800;
  const r = mulberry(31);
  const post = (x: number) => `
<path d="M${x - 46} 770 C${x - 40} 600 ${x - 38} 450 ${x - 34} 330 L${x + 34} 330 C${x + 38} 450 ${x + 40} 600 ${x + 46} 770 Z" fill="#a9794f" stroke="#5e4330" stroke-width="5" stroke-linejoin="round"/>
<path d="M${x + 6} 340 C${x + 14} 470 ${x + 18} 640 ${x + 24} 764 L${x + 46} 770 C${x + 40} 600 ${x + 38} 450 ${x + 34} 330 Z" fill="#8a5f3c" opacity="0.7"/>
<g stroke="#6e4c32" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"><path d="M${x - 18} 360 C${x - 16} 460 ${x - 20} 560 ${x - 16} 720"/><path d="M${x - 2} 380 C${x} 480 ${x - 4} 600 ${x} 740"/><path d="M${x - 30} 560 q8 -10 18 0"/><path d="M${x + 6} 480 q8 -10 18 0"/></g>
<ellipse cx="${x}" cy="326" rx="40" ry="14" fill="#c99a6a" stroke="#5e4330" stroke-width="4"/>`;
  let leaves = "";
  const pt = (t: number) => {
    const u = 1 - t;
    const x = u ** 3 * 150 + 3 * u * u * t * 300 + 3 * u * t * t * 800 + t ** 3 * 950;
    const y = u ** 3 * 330 + 3 * u * u * t * 130 + 3 * u * t * t * 130 + t ** 3 * 330;
    return { x, y };
  };
  for (let i = 0; i <= 40; i++) {
    const p = pt(i / 40);
    const sx = (r() - 0.5) * 20, sy = (r() - 0.5) * 26 - 6;
    leaves += `<ellipse cx="${p.x + sx}" cy="${p.y + sy}" rx="${15 + r() * 8}" ry="${7 + r() * 3}" transform="rotate(${r() * 180} ${p.x + sx} ${p.y + sy})" fill="${["#6fae5c", "#8cc468", "#559a50"][i % 3]}" stroke="#3f7340" stroke-width="1.6"/>`;
  }
  const cols = ["#ff9db8", "#ffd54a", "#ffffff", "#c4a3f2", "#ff8a5c"];
  let flowers = "";
  for (let i = 0; i < 16; i++) {
    const t = 0.04 + r() * 0.92, p = pt(t);
    const x = p.x + (r() - 0.5) * 24, y = p.y + (r() - 0.5) * 22 - 4, s = 13 + r() * 7;
    const c = cols[i % 5];
    let pe = "";
    for (let k = 0; k < 5; k++) pe += `<ellipse cx="${x}" cy="${y - s * 0.7}" rx="${s * 0.45}" ry="${s * 0.7}" transform="rotate(${k * 72} ${x} ${y})" fill="${c}" stroke="#8a7a66" stroke-width="1.3"/>`;
    flowers += pe + `<circle cx="${x}" cy="${y}" r="${s * 0.34}" fill="#f4b93a"/>`;
  }
  // 바닥 꽃무더기
  let foot = "";
  for (const bx of [150, 950]) {
    for (let i = 0; i < 9; i++) {
      const x = bx + (r() - 0.5) * 150, y = 760 + r() * 20, s = 12 + r() * 6;
      const c = cols[(i + (bx > 500 ? 2 : 0)) % 5];
      foot += `<path d="M${x} ${y} q${(r() - 0.5) * 16} -22 0 -${34 + r() * 20}" stroke="#5f9a4e" stroke-width="4" fill="none"/>`;
      let pe = "";
      for (let k = 0; k < 5; k++) pe += `<ellipse cx="${x}" cy="${y - 46 - s * 0.7}" rx="${s * 0.45}" ry="${s * 0.7}" transform="rotate(${k * 72} ${x} ${y - 46})" fill="${c}" stroke="#8a7a66" stroke-width="1.2"/>`;
      foot += pe + `<circle cx="${x}" cy="${y - 46}" r="${s * 0.34}" fill="#f4b93a"/>`;
    }
  }
  return svg(W, H, `
<ellipse cx="150" cy="776" rx="110" ry="14" fill="#7a9a5a" opacity="0.25"/><ellipse cx="950" cy="776" rx="110" ry="14" fill="#7a9a5a" opacity="0.25"/>
${post(150)}${post(950)}
<path d="M150 330 C300 130 800 130 950 330" fill="none" stroke="#5e4330" stroke-width="50" stroke-linecap="round"/>
<path d="M150 330 C300 130 800 130 950 330" fill="none" stroke="#a9794f" stroke-width="40" stroke-linecap="round"/>
<path d="M170 322 C310 148 790 148 930 322" fill="none" stroke="#c99a6a" stroke-width="9" stroke-linecap="round" opacity="0.8"/>
<g stroke="#6e4c32" stroke-width="3" fill="none"><path d="M240 250 q10 -8 22 -2"/><path d="M520 175 q12 -6 24 0"/><path d="M820 230 q12 -6 22 4"/></g>
<g stroke="#6b5645" stroke-width="5" stroke-linecap="round"><path d="M370 178 L370 300"/><path d="M730 178 L730 300"/></g>
${leaves}${flowers}${foot}`);
}

/** 나무 벤치: 둥근 판자 등받이와 꽃이 놓인 모습(옆모습) */
export function benchSvg() {
  return svg(420, 300, `
<ellipse cx="210" cy="286" rx="170" ry="10" fill="#7a9a5a" opacity="0.28"/>
<g fill="#a9794f" stroke="#5e4330" stroke-width="4" stroke-linejoin="round">
<rect x="58" y="120" width="22" height="160" rx="9"/><rect x="340" y="120" width="22" height="160" rx="9"/>
<path d="M70 126 L350 126 L372 156 L48 156 Z" fill="#d6aa78"/><rect x="56" y="156" width="308" height="26" rx="12"/>
<rect x="46" y="190" width="328" height="0.1" rx="1"/>
<rect x="54" y="30" width="22" height="130" rx="9" transform="rotate(-4 65 95)"/><rect x="344" y="30" width="22" height="130" rx="9" transform="rotate(4 355 95)"/>
<rect x="62" y="44" width="296" height="24" rx="11"/><rect x="62" y="82" width="296" height="24" rx="11"/>
</g>
<g stroke="#c99a6a" stroke-width="4" stroke-linecap="round" opacity="0.8"><path d="M80 52 L330 52"/><path d="M80 90 L330 90"/><path d="M70 158 L340 158"/></g>
<g stroke="#6e4c32" stroke-width="2.5" fill="none" opacity="0.7"><path d="M120 56 q10 -4 20 0"/><path d="M250 94 q10 -4 20 0"/><path d="M180 196 q12 -4 24 0"/></g>
<g fill="#7fb35e" stroke="#3f7340" stroke-width="1.6"><ellipse cx="84" cy="272" rx="16" ry="7"/><ellipse cx="348" cy="272" rx="16" ry="7"/></g>
<g fill="#ff9db8" stroke="#8a7a66" stroke-width="1.2"><circle cx="78" cy="262" r="6"/><circle cx="92" cy="266" r="5"/></g><g fill="#ffd54a" stroke="#8a7a66" stroke-width="1.2"><circle cx="344" cy="262" r="6"/><circle cx="356" cy="268" r="5"/></g>`);
}

export interface TreeKind { svg: string; aspect: number; h: number }

const wob = (r: () => number, x: number, y: number, rad: number, fill: string, op = 0.97) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rad}" ry="${rad * (0.8 + r() * 0.15)}" fill="${fill}" opacity="${op}"/>`;

const trunkPath = (x: number, top: number, bot: number, w: number, col = "#8a6a4d") =>
  `<path d="M${x - w * 1.5} ${bot} C${x - w * 0.5} ${bot - 30} ${x - w * 0.55} ${top + 40} ${x - w * 0.45} ${top} L${x + w * 0.45} ${top} C${x + w * 0.55} ${top + 40} ${x + w * 0.5} ${bot - 30} ${x + w * 1.5} ${bot} Q${x} ${bot + 12} ${x - w * 1.5} ${bot} Z" fill="${col}" stroke="#5e4330" stroke-width="4" stroke-linejoin="round"/><path d="M${x + w * 0.1} ${top + 10} C${x + w * 0.2} ${top + 80} ${x + w * 0.2} ${bot - 60} ${x + w * 0.6} ${bot - 6}" stroke="#a98763" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.7"/>`;

/** 다섯 종류의 동화책 나무 */
export function treeKind(kind: number, seed: number): TreeKind {
  const r = mulberry(seed * 13 + kind * 101);
  const ground = (w: number, cx: number, y: number) => `<ellipse cx="${cx}" cy="${y}" rx="${w}" ry="13" fill="#a9cf84" opacity="0.75" filter="url(#wc2)"/>`;
  if (kind === 0) {
    // 둥근 활엽수
    const W = 520, H = 660, g = ["#9fcf7a", "#7fba6b", "#5fa062", "#c7df8c", "#4f8f5a"];
    let c = "";
    for (let i = 0; i < 16; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 150; c += wob(r, 260 + Math.cos(a) * d * 1.15, 235 + Math.sin(a) * d * 0.8, 58 + r() * 52, g[Math.floor(r() * 3)]); }
    let hi = "";
    for (let i = 0; i < 9; i++) hi += wob(r, 200 + r() * 200, 150 + r() * 120, 28 + r() * 30, g[3], 0.7);
    let lo = "";
    for (let i = 0; i < 8; i++) lo += wob(r, 130 + r() * 260, 255 + r() * 110, 24 + r() * 26, g[4], 0.55);
    let lv = "";
    for (let i = 0; i < 30; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 165, x = 260 + Math.cos(a) * d * 1.1, y = 235 + Math.sin(a) * d * 0.78; lv += `<ellipse cx="${x}" cy="${y}" rx="9" ry="5.5" transform="rotate(${r() * 180} ${x} ${y})" fill="${r() < 0.5 ? "#e9ef9a" : "#6aa860"}" opacity="0.8"/>`; }
    return { svg: svg(W, H, `${ground(150, 260, 648)}${trunkPath(260, 270, 646, 22)}<g stroke="#5e4330" stroke-width="12" stroke-linecap="round" fill="none"><path d="M260 340 C250 300 230 280 205 262"/><path d="M262 340 C275 300 300 285 328 268"/></g><g filter="url(#wc)">${c}${lo}${hi}</g>${lv}`), aspect: W / H, h: 11 + r() * 3 };
  }
  if (kind === 1) {
    // 벚나무
    const W = 540, H = 620, g = ["#f7b9c9", "#fad3dd", "#ef9fb5", "#fde8ee"];
    let c = "";
    for (let i = 0; i < 17; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 160; c += wob(r, 270 + Math.cos(a) * d * 1.2, 220 + Math.sin(a) * d * 0.75, 50 + r() * 46, g[Math.floor(r() * 3)], 0.86); }
    let pet = "";
    for (let i = 0; i < 60; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 190, x = 270 + Math.cos(a) * d * 1.15, y = 220 + Math.sin(a) * d * 0.78; pet += `<circle cx="${x}" cy="${y}" r="${4 + r() * 4}" fill="${r() < 0.5 ? "#ffffff" : "#e77a9a"}" opacity="0.8"/>`; }
    let fall = "";
    for (let i = 0; i < 14; i++) fall += `<ellipse cx="${60 + r() * 420}" cy="${520 + r() * 100}" rx="7" ry="4" transform="rotate(${r() * 180} 100 560)" fill="#f9c9d6" opacity="0.8"/>`;
    return { svg: svg(W, H, `${ground(170, 270, 604)}${fall}${trunkPath(270, 250, 600, 20, "#6f5445")}<g stroke="#5a4236" stroke-width="12" stroke-linecap="round" fill="none"><path d="M270 330 C250 290 215 270 188 240"/><path d="M272 330 C292 290 332 272 362 238"/><path d="M270 330 C270 290 276 250 272 210"/></g><g filter="url(#wc)">${c}</g>${pet}`), aspect: W / H, h: 9.5 + r() * 2 };
  }
  if (kind === 2) {
    // 전나무: 층층이 물결 가장자리의 초록 삼각형
    const W = 400, H = 760, gs = ["#4f8f5a", "#5ea062", "#6fb06a", "#80bf74"];
    let tiers = "";
    for (let i = 0; i < 5; i++) {
      const y = 140 + i * 110, hw = 60 + i * 34;
      tiers += `<path d="M200 ${y - 96} C${200 - hw * 0.5} ${y - 40} ${200 - hw * 0.9} ${y + 10} ${200 - hw} ${y + 44} Q${200 - hw * 0.6} ${y + 58} ${200 - hw * 0.35} ${y + 44} Q${200 - hw * 0.2} ${y + 62} 200 ${y + 48} Q${200 + hw * 0.2} ${y + 62} ${200 + hw * 0.35} ${y + 44} Q${200 + hw * 0.6} ${y + 58} ${200 + hw} ${y + 44} C${200 + hw * 0.9} ${y + 10} ${200 + hw * 0.5} ${y - 40} 200 ${y - 96} Z" fill="${gs[i % 4]}" stroke="#3b6f45" stroke-width="3.5" stroke-linejoin="round"/>`;
      tiers += `<path d="M${200 - hw * 0.5} ${y + 10} Q200 ${y - 14} ${200 + hw * 0.4} ${y + 6}" fill="none" stroke="#a8d28a" stroke-width="6" stroke-linecap="round" opacity="0.55"/>`;
    }
    return { svg: svg(W, H, `${ground(120, 200, 748)}${trunkPath(200, 600, 744, 14)}<g filter="url(#wc2)">${tiers}</g>`), aspect: W / H, h: 14 + r() * 3 };
  }
  if (kind === 3) {
    // 길쭉한 포플러
    const W = 300, H = 760, g = ["#b3d36a", "#94c25c", "#76ac56", "#d3e488"];
    let c = "";
    for (let i = 0; i < 26; i++) { const t = r(); const y = 100 + t * 500, half = 70 * Math.sin(Math.PI * (0.12 + t * 0.85)); c += wob(r, 150 + (r() - 0.5) * half * 1.6, y, 30 + r() * 26, g[Math.floor(r() * 4)]); }
    return { svg: svg(W, H, `${ground(90, 150, 748)}${trunkPath(150, 600, 744, 12)}<g filter="url(#wc2)">${c}</g>`), aspect: W / H, h: 14 + r() * 3 };
  }
  // 사과나무
  const W = 500, H = 600, g = ["#8cc46a", "#6fae5e", "#5a9a56", "#b2d77c"];
  let c = "";
  for (let i = 0; i < 18; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 130; c += wob(r, 250 + Math.cos(a) * d * 1.2, 215 + Math.sin(a) * d * 0.8, 52 + r() * 40, g[Math.floor(r() * 3)]); }
  let hi = "";
  for (let i = 0; i < 6; i++) hi += wob(r, 190 + r() * 130, 140 + r() * 80, 26 + r() * 24, g[3], 0.8);
  let lv = "";
  for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 165, x = 250 + Math.cos(a) * d * 1.1, y = 220 + Math.sin(a) * d * 0.74; lv += `<ellipse cx="${x}" cy="${y}" rx="13" ry="6" transform="rotate(${r() * 180} ${x} ${y})" fill="${r() < 0.5 ? "#4f8f4e" : "#a8d27a"}" opacity="0.7"/>`; }
  let ap = "";
  for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = 40 + Math.sqrt(r()) * 95, x = 250 + Math.cos(a) * d * 1.25, y = 235 + Math.sin(a) * d * 0.7; ap += `<circle cx="${x}" cy="${y}" r="11" fill="#e8523f" stroke="#a83a2e" stroke-width="2.5"/><circle cx="${x - 3}" cy="${y - 3}" r="3" fill="#fff" opacity="0.7"/><path d="M${x} ${y - 11} q3 -6 8 -7" stroke="#5e4330" stroke-width="2.5" fill="none"/><ellipse cx="${x + 9}" cy="${y - 15}" rx="7" ry="3.5" fill="#6fae5e" transform="rotate(-25 ${x + 9} ${y - 15})"/>`; }
  return { svg: svg(W, H, `${ground(140, 250, 588)}${trunkPath(250, 250, 586, 21)}<g filter="url(#wc)">${c}${hi}</g>${lv}${ap}`), aspect: W / H, h: 9 + r() * 2 };
}

/** 프로펠러 비행기(오른쪽을 보고 남): 크림색 몸통, 빨간 코, 파란 날개, 뒤에 구름 꼬리 */
export function planeSvg() {
  const O = 'stroke="#6a5a45" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';
  return svg(480, 240, `
<g fill="#ffffff" opacity="0.95" filter="url(#wc2)"><ellipse cx="46" cy="130" rx="38" ry="22"/><ellipse cx="92" cy="122" rx="30" ry="18"/><ellipse cx="22" cy="150" rx="20" ry="13"/></g>
<path d="M150 128 L112 70 L150 66 L190 120 Z" fill="#f2b84b" ${O}/>
<ellipse cx="260" cy="130" rx="130" ry="46" fill="#fbf3de" ${O}/>
<path d="M360 112 C392 112 396 148 360 150 C372 140 372 122 360 112 Z" fill="#e0604e" ${O}/>
<path d="M150 134 C190 150 330 150 372 134" fill="none" stroke="#e0604e" stroke-width="8" opacity="0.8"/>
<path d="M232 142 L192 214 L250 206 L296 140 Z" fill="#6fb0e0" ${O}/>
<path d="M214 122 L238 54 L286 60 L286 122" fill="#8cc4ec" ${O} transform="rotate(0)"/>
<circle cx="316" cy="120" r="20" fill="#cfe9fb" ${O}/><circle cx="310" cy="114" r="5" fill="#fff" opacity="0.8"/>
<circle cx="262" cy="118" r="14" fill="#cfe9fb" ${O}/>
<circle cx="392" cy="130" r="8" fill="#6a5a45"/>
<path d="M392 92 L392 168" stroke="#6a5a45" stroke-width="7" stroke-linecap="round" opacity="0.55"/>`);
}

/** 동화책 구름: 종류마다 뭉치 수·크기·모양이 다른 하얀 구름 (kind 0~9) */
export function cloudSvg(kind: number) {
  let a = (kind + 1) * 2654435761;
  const r = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const flat = kind % 5 === 4; // 길게 퍼진 구름
  const wide = flat ? 300 : 140 + r() * 260;
  const n = flat ? 3 : 4 + Math.floor(r() * 3);
  const x0 = 280 - wide / 2;
  const base = 168;
  let puffs = "";
  let shade = "";
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const mid = 1 - Math.abs(t - 0.5) * 1.4;
    const rx = flat ? 60 + r() * 40 : 26 + mid * 44 + r() * 26;
    const ry = flat ? 20 + r() * 12 : 20 + mid * 34 + r() * 26;
    const cx = x0 + t * wide + (r() - 0.5) * 18;
    const cy = base - ry * 0.7 - (kind % 2 ? r() * 26 : r() * 8);
    puffs += `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" fill="#ffffff"/>`;
  }
  shade = `<ellipse cx="280" cy="${base - 2}" rx="${(wide / 2 + 50).toFixed(0)}" ry="${flat ? 16 : 24}" fill="#e6effa"/><ellipse cx="280" cy="${base - 10}" rx="${(wide / 2 + 36).toFixed(0)}" ry="${flat ? 12 : 20}" fill="#f4f8fd"/>`;
  return svg(560, 240, `<g filter="url(#wc2)">${shade}${puffs}</g>`);
}
