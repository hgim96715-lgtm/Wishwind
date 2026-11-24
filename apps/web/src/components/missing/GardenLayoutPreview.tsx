"use client";

import { useState } from "react";

import { EXPO_GARDENS as gardens, gardenRoute } from "./garden/expo-layout";

/** 조형물은 고리길 안의 잔디와 바깥 여유 공간에만 배치한다. */
function ChildrensGardenDecor() {
  return (
    <g aria-label="아이들의 정원 · 공룡 친구와 장난감, 노란 들꽃">
      <g transform="translate(242 123)">
        <ellipse cx="30" cy="43" rx="33" ry="5" fill="#859d70" opacity="0.24" />
        <path d="M13 23 L15 14 L23 18 L29 11 L34 19 L41 14 L44 25" fill="#edc887" stroke="#728c62" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M13 25 Q2 29 -5 21 Q-3 37 12 37 L14 43 Q18 46 22 42 L23 38 L34 38 L35 43 Q40 46 43 42 L43 33 Q57 34 58 24 L59 12 Q68 11 66 5 Q65 0 55 2 Q47 2 47 12 L46 24 Q29 14 13 25 Z" fill="#8fb58a" stroke="#527c62" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M22 31 Q30 26 37 32 L36 37 H23 Z" fill="#c6d7a5" />
        <circle cx="57" cy="7" r="1.7" fill="#34483e" />
        <circle cx="61" cy="12" r="2.6" fill="#e5b39a" />
        <path d="M61 16 Q57 19 54 16" fill="none" stroke="#527c62" strokeWidth="1.3" strokeLinecap="round" />
      </g>
      <g transform="translate(112 204)" strokeWidth="1.5" strokeLinejoin="round">
        <ellipse cx="23" cy="40" rx="28" ry="5" fill="#bda968" opacity="0.25" stroke="none" />
        <rect x="2" y="19" width="20" height="20" rx="3" fill="#dca18a" stroke="#ad7964" />
        <path d="M12 23 L14 28 L19 29 L15 32 L16 36 L12 34 L8 36 L9 32 L5 29 L10 28 Z" fill="#fff1ce" stroke="none" />
        <rect x="24" y="19" width="20" height="20" rx="3" fill="#99bfca" stroke="#6a99a5" />
        <circle cx="34" cy="29" r="5" fill="#f9f0d3" stroke="none" />
        <rect x="13" y="-3" width="20" height="20" rx="3" fill="#edcb7e" stroke="#ba9b55" />
        <path d="M23 2 L29 12 H17 Z" fill="#fff5d7" stroke="none" />
      </g>
      <g fill="#f7d46c" stroke="#fff0b2" strokeWidth="2">
        {[[243,214],[263,225],[280,213],[301,225],[318,214]].map(([x,y]) => (
          <g key={x} transform={`translate(${x} ${y})`}>
            <circle cx="-3" cy="0" r="3" />
            <circle cx="3" cy="0" r="3" />
            <circle cx="0" cy="-3" r="3" />
            <circle cx="0" cy="3" r="3" />
            <circle r="2" fill="#b88e47" stroke="none" />
          </g>
        ))}
      </g>
    </g>
  );
}

/** 실제 공간을 다시 만들기 전, 영역과 동선만 확인하는 평면 배치 시안. */
export function GardenLayoutPreview() {
  const [selected, setSelected] = useState(0);
  const garden = gardens[selected];
  return (
    <section className="mx-auto max-w-6xl px-5 pb-10">
      <div className="mb-5 mt-4">
        <p className="text-sm tracking-widest text-[#697c69]">WISHWIND · 정원 안내도</p>
        <h1 className="mt-2 text-3xl font-semibold">광장을 둘러싼 네 개의 정원</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[#667568]">분수 광장에서 앞뒤 네 정원으로 이어지는 길. 3D 정원도 이 배치를 따라 걸을 수 있음.</p>
      </div>
      <div className="overflow-hidden rounded-3xl border border-[#cdd6c8] bg-[#e6ecdf]">
        <svg viewBox="0 0 960 730" className="block w-full" role="img" aria-labelledby="layout-title layout-desc">
          <title id="layout-title">중앙 광장과 앞뒤 네 정원의 평면 배치</title>
          <desc id="layout-desc">북서쪽 아이들의 정원에는 순한 공룡 조형물, 장난감 블록과 노란 들꽃이 길 옆에 있다. 북동쪽 어른들의 정원은 실종된 성인과 어르신을, 남서쪽 계절이 쌓이는 정원은 실종된 지 오랜 시간이 지난 분들을 기억하는 공간이다. 남동쪽에는 바다 건너 정원이 있다. 중앙 분수 광장과 외곽 순환로로 연결되며 정원 영역은 겹치지 않는다. 바다 정원 동쪽에는 유지할 등대가 있으며 뒤쪽 순환로와 연결된다.</desc>
          <rect x="35" y="30" width="890" height="670" rx="90" fill="#d5dfcb" />
          <rect x="65" y="40" width="830" height="640" rx="65" fill="none" stroke="#f8f4e7" strokeWidth="19" />
          <path d="M65 375 H895 M280 290 V450 M700 290 V450" fill="none" stroke="#f8f4e7" strokeWidth="19" strokeLinejoin="round" />
          {gardens.map((g, index) => (
            <g key={g.name}>
              <rect x={g.x} y={g.y} width="340" height="220" rx="30" fill={g.color} opacity={selected === index ? 1 : 0.65} stroke={selected === index ? "#4d6b54" : "#90a087"} strokeWidth={selected === index ? 3 : 1.5} />
              {g.beds.map(([x,y,w,h], bed) => <rect key={bed} x={x} y={y} width={w} height={h} rx="12" fill={index === 3 && bed === 0 ? "#78acb6" : "#8eaa7e"} opacity="0.85" />)}
              <path d={gardenRoute(index)} fill="none" stroke="#fffaf0" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
              {index === 0 && <ChildrensGardenDecor />}
              <text x={g.x + 170} y={g.y + 200} textAnchor="middle" fontSize="18" fill="#34483e" fontWeight="600">{g.name}</text>
            </g>
          ))}
          <g aria-label="유지할 등대 · 바다 정원 전망 쉼터">
            <ellipse cx="840" cy="550" rx="23" ry="12" fill="#e8dfc9" stroke="#a49c87" />
            <path d="M829 544 L833 509 H847 L851 544 Z" fill="#fffaf0" stroke="#637b7a" strokeWidth="2" />
            <path d="M832 520 H848 L849 529 H831 Z" fill="#c17b66" />
            <rect x="832" y="500" width="16" height="10" rx="2" fill="#f4d782" stroke="#637b7a" strokeWidth="2" />
            <path d="M829 500 L840 492 L851 500 Z" fill="#526f71" />
            <text x="840" y="580" textAnchor="middle" fontSize="16" fontWeight="600" fill="#34483e">등대</text>
          </g>
          <circle cx="480" cy="375" r="65" fill="#e4d6b9" stroke="#b5a58c" strokeWidth="2" />
          <circle cx="480" cy="365" r="23" fill="#92bcc1" stroke="#faf8ee" strokeWidth="9" />
          <text x="480" y="411" textAnchor="middle" fontSize="17" fill="#4c5a50">분수 광장</text>
          <text x="480" y="34" textAnchor="middle" fontSize="14" fill="#5c715f">앞쪽 정원</text>
          <text x="480" y="714" textAnchor="middle" fontSize="14" fill="#5c715f">뒤쪽 정원 · 외곽 순환로</text>
        </svg>
      </div>
      <div className="mt-5 flex flex-wrap gap-2" aria-label="정원 설명 선택">
        {gardens.map((g,i) => <button key={g.name} type="button" aria-pressed={selected === i} onClick={() => setSelected(i)} className={`rounded-full border px-4 py-2 text-sm transition ${selected === i ? "border-[#365b47] bg-[#365b47] text-white" : "border-[#ccd5c8] bg-white text-[#445b49]"}`}>{g.path}</button>)}
      </div>
      <p className="mt-4 max-w-3xl text-base leading-7">{garden.detail}</p>
      <p className="mt-4 text-sm text-[#687568]">색 면은 정원 영역, 밝은 선은 보행로, 내부 블록은 화단·쉼터 자리. 정원 입구의 안내판을 따라 천천히 둘러볼 수 있음.</p>
    </section>
  );
}
