"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuChevronDown, LuFootprints } from "react-icons/lu";
import type { MissingSummary } from "@/lib/missing/types";
import type { Weather } from "@/lib/weather/types";
import { currentHour } from "./time-of-day";
import { phaseAt, type GardenPhase } from "./garden/expo-environment";

const Scene = dynamic(() => import("./garden/ExhibitionScene"), { ssr: false });

/**
 * 카드 화면 맨 위의 정원 입구: 3D 정원을 보기만 하는 장면으로 깔고(걷기·누르기 없음),
 * 화면 밖으로 내려가면 3D 그리기를 멈춰 카드 목록을 볼 때 폰이 뜨거워지지 않게 함.
 */
export function GardenHero({ grouped, onWalk, covered = false, weather = null }: { grouped: MissingSummary[][]; onWalk: () => void; covered?: boolean; weather?: Weather | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<GardenPhase>("day");
  const [visible, setVisible] = useState(true);
  const [still, setStill] = useState(false);
  useEffect(() => {
    const update = () => setPhase(phaseAt(currentHour()));
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    // 첫 값은 다음 프레임에 맞춤 (서버 렌더와 어긋나지 않게)
    const first = requestAnimationFrame(() => { update(); setStill(media.matches); });
    const timer = setInterval(update, 60_000);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.02 });
    if (box.current) io.observe(box.current);
    return () => { cancelAnimationFrame(first); clearInterval(timer); io.disconnect(); };
  }, []);
  const people = useMemo(() => grouped.flatMap((rows, garden) => rows.map(p => ({ id: p.id, lightCount: p.lightCount, garden }))), [grouped]);
  const noop = useMemo(() => () => {}, []);


  return (
    // 버튼(.garden-gate-actions)을 .garden-gate 밖으로 뺌: .garden-gate는 isolation:isolate라
    // 안에 있으면 z-index를 줘도 정원 모서리(시계 등) 쪽과 비교가 안 돼서, 스크롤로 버튼이
    // 시계 위로 올라와도 뒤로 보낼 수가 없었음
    <div ref={box} className="garden-gate-outer">
      <section className="garden-gate" data-phase={phase} aria-label="실종자들의 정원 입구">
        <div className="garden-gate-scene">
          <Scene phase={phase} weather={weather} reducedMotion={still} paused={!visible || covered} idle={!visible || covered} december={false} people={people} boost={null} onSelect={noop} view={0} onView={noop} lockLook />
        </div>
        <h1 className="sr-only">실종자들의 정원</h1>
      </section>
      <div className="garden-gate-actions">
        <button type="button" className="garden-gate-walk" onClick={onWalk}><LuFootprints aria-hidden="true" /> 정원 걸어 보기</button>
        <a className="garden-gate-down" href="#garden-list"><LuChevronDown aria-hidden="true" /> 기다리는 분들 보기</a>
      </div>
    </div>
  );
}
