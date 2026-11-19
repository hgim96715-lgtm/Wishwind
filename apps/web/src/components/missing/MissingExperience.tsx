"use client";

import { AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuList, LuMap, LuUserRound, LuWind } from "react-icons/lu";
import { countryLabel, type RegionGroup } from "@/lib/missing/regions";
import { AvatarSetup, loadAvatar, type AvatarChoice } from "./garden/AvatarSetup";
import type { PlayerStatus, Wish, WorldControls } from "./garden/GardenScene";
import { Joystick } from "./garden/Joystick";
import { GARDEN_CENTER, lanternPoint, pinwheelSpot, trailPoint } from "./garden/world";
import { MissingCard } from "./MissingCard";
import { MissingList } from "./MissingList";
import { buildSlots } from "./path-layout";
import { useWishes, WishPanel } from "./WishPanel";

// WebGL은 브라우저 전용 → 서버 렌더링에서 빼고, three 번들(수백 KB)도 이 화면에서만 받음
const GardenScene = dynamic(() => import("./garden/GardenScene"), {
  ssr: false,
  loading: () => <Veil text="바닷가 언덕으로 가고 있습니다…" />,
});

type Mode = "checking" | "scene" | "list";

function canUseScene(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function MissingExperience({ groups }: { groups: RegionGroup[] }) {
  const slots = useMemo(() => buildSlots(groups), [groups]);
  const [mode, setMode] = useState<Mode>("checking");
  const [touch, setTouch] = useState(false);
  const [avatar, setAvatar] = useState<AvatarChoice | null>(null);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [selected, setSelected] = useState<{ id: string; regionLabel: string } | null>(null);
  const [status, setStatus] = useState<PlayerStatus>({ region: null, nearId: null, inGarden: true });
  const controls = useRef<WorldControls>({ stick: { x: 0, y: 0 } });

  // 응원은 모든 실종자에게 건네는 바람개비 → 정원 전체에 하나의 개수
  const [wishData, setWishData] = useWishes();
  const [wishOpen, setWishOpen] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const closeWish = useCallback(() => setWishOpen(false), []);

  const wishes: Wish[] = useMemo(
    () => [
      ...(wishData?.pending ?? []).map((w) => ({ id: w.id, body: w.body, pending: true })),
      ...(wishData?.clouds ?? []).map((w) => ({ id: w.id, body: w.body })),
    ],
    [wishData],
  );
  const wishCount = wishData?.cloudCount ?? 0;

  const signs = useMemo(
    () =>
      slots.flatMap((s, index) =>
        s.kind === "sign" ? [{ index, label: s.label, count: s.count, country: countryLabel(s.region) }] : [],
      ),
    [slots],
  );

  useEffect(() => {
    // 브라우저 기능·저장값 확인은 마운트 후에만 가능 (서버에는 window가 없음)
    /* eslint-disable react-hooks/set-state-in-effect */
    setMode(canUseScene() ? "scene" : "list");
    setTouch(window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);
    setAvatar(loadAvatar());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const regionOf = useCallback(
    (id: string) => {
      for (const s of slots) if (s.kind === "lantern" && s.person.id === id) return s.regionLabel;
      return "";
    },
    [slots],
  );
  const select = useCallback((id: string) => setSelected({ id, regionLabel: regionOf(id) }), [regionOf]);
  const close = useCallback(() => setSelected(null), []);

  /** 꽂은 바람개비 앞으로 데려가서 직접 보이게 함 */
  const onPlaced = useCallback(
    (id: string, message: string) => {
      setWishOpen(false);
      setFreshId(id);
      setToast(message);
      const pendingCount = (wishData?.pending.length ?? 0) + 1;
      const k = Math.min(299, wishCount + pendingCount - 1);
      const [x, , z] = pinwheelSpot(k);
      // 바람개비와 정원 중심 사이, 바람개비에서 2.5만큼 떨어진 곳에 섬
      const dx = GARDEN_CENTER[0] - x;
      const dz = GARDEN_CENTER[1] - z;
      const l = Math.hypot(dx, dz) || 1;
      controls.current.teleport?.(x + (dx / l) * 2.5, z + (dz / l) * 2.5);
    },
    [wishData, wishCount],
  );

  const jumpTo = (slot: number) => {
    const s = slots[slot + 1];
    // 첫 등불 바로 옆 길 위에 세움 → 도착하자마자 "등불 보기"·Enter가 됨
    const [x, , z] = s?.kind === "lantern" ? lanternPoint(slot + 1, s.side, 0) : trailPoint(slot);
    controls.current.teleport?.(x, z + 0.5);
  };

  const total = groups.reduce((n, g) => n + g.people.length, 0);
  if (total === 0) {
    return <Veil text="아직 길에 놓인 등불이 없습니다. 실종자 정보를 불러오는 중이니 잠시 후 다시 와 주세요." />;
  }

  const overlay = !!selected || wishOpen || !avatar || editingAvatar;

  return (
    <div className="relative h-full w-full">
      {mode === "checking" && <Veil text="바닷가 언덕으로 가고 있습니다…" />}
      {mode === "scene" && (
        <>
          <div className="absolute inset-0">
            <GardenScene
              slots={slots}
              wishes={wishes}
              wishCount={wishCount}
              freshId={freshId}
              paused={overlay}
              avatar={avatar ?? { url: null, nickname: "" }}
              controls={controls}
              onSelect={select}
              onStatus={setStatus}
            />
          </div>

          <p
            aria-live="polite"
            className="pointer-events-none absolute top-20 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/75 px-3 py-1 text-sm whitespace-nowrap text-[#7a6650] backdrop-blur"
          >
            {status.region ?? (status.inGarden ? "바람개비 정원" : "등대 언덕")}
          </p>

          <RegionMenu signs={signs} current={status.region} onJump={jumpTo} onGarden={() => controls.current.teleport?.(GARDEN_CENTER[0] - 4, GARDEN_CENTER[1] + 4)} />

          {/* 터치 기기는 늘, 그 밖에는 좁은 화면(모바일 크기)에서 조이스틱을 보여 줌. 마우스로 끌어도 동작 */}
          {!overlay && (
            <div className={`absolute bottom-6 left-5 z-20 ${touch ? "" : "md:hidden"}`}>
              <Joystick onChange={(x, y) => (controls.current.stick = { x, y })} />
            </div>
          )}

          {!overlay && (
            <div className="absolute right-4 bottom-6 z-20 flex flex-col items-end gap-2 md:right-5">
              {status.nearId && (
                <button
                  type="button"
                  onClick={() => status.nearId && select(status.nearId)}
                  className="rounded-full bg-[#e9a94f] px-5 py-3 text-sm font-medium text-white shadow-sm"
                >
                  등불 보기
                </button>
              )}
              <button
                type="button"
                onClick={() => setWishOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2.5 text-sm text-[#6b5a46] shadow-sm backdrop-blur hover:bg-white"
              >
                <LuWind aria-hidden className="size-4 text-[#e9a94f]" />
                바람개비 꽂기
                {wishData && <span className="text-xs text-subtle">{wishCount}</span>}
              </button>
              <button
                type="button"
                onClick={() => setEditingAvatar(true)}
                className="flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-xs text-[#7a6650] backdrop-blur hover:bg-white"
              >
                <LuUserRound aria-hidden className="size-3.5" />
                {avatar?.nickname ?? "캐릭터"}
              </button>
            </div>
          )}

          {!touch && !overlay && (
            <p className="pointer-events-none absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 rounded-full bg-white/60 px-3 py-1 text-xs text-[#7a6650] backdrop-blur md:block">
              WASD·방향키로 걷고(Shift 달리기), 드래그로 둘러봅니다. 등불을 누르면 카드가 열립니다
            </p>
          )}

          <AnimatePresence>
            {toast && (
              <p
                role="status"
                className="absolute top-32 left-1/2 z-30 -translate-x-1/2 rounded-full bg-[#fff4d6] px-4 py-2 text-sm whitespace-nowrap text-[#6b4f2a] shadow"
              >
                {toast}
              </p>
            )}
          </AnimatePresence>
        </>
      )}
      {mode === "list" && (
        <div className="h-full overflow-y-auto">
          <MissingList groups={groups} onSelect={(id, regionLabel) => setSelected({ id, regionLabel })} />
        </div>
      )}

      {mode !== "checking" && (
        <button
          type="button"
          onClick={() => setMode((m) => (m === "scene" ? "list" : "scene"))}
          className="absolute top-5 right-5 z-20 flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm shadow-sm backdrop-blur transition-colors hover:bg-white"
        >
          {mode === "scene" ? <LuList aria-hidden className="size-4" /> : <LuMap aria-hidden className="size-4" />}
          {mode === "scene" ? "목록으로 보기" : "언덕 걷기"}
        </button>
      )}

      <AnimatePresence>
        {mode === "scene" && (!avatar || editingAvatar) && (
          <AvatarSetup
            key="avatar"
            initial={avatar}
            onDone={(v) => {
              setAvatar(v);
              setEditingAvatar(false);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {wishOpen && <WishPanel key="wishes" data={wishData} setData={setWishData} onClose={closeWish} onPlaced={onPlaced} />}
      </AnimatePresence>
      <AnimatePresence>
        {selected && <MissingCard key={selected.id} id={selected.id} regionLabel={selected.regionLabel} onClose={close} />}
      </AnimatePresence>
    </div>
  );
}

/** 지역 구간으로 바로 이동: 나라별로 묶어 보여 줌 */
function RegionMenu({
  signs,
  current,
  onJump,
  onGarden,
}: {
  signs: { index: number; label: string; count: number; country: string }[];
  current: string | null;
  onJump: (slot: number) => void;
  onGarden: () => void;
}) {
  return (
    <label className="absolute top-[4.25rem] right-4 z-20 flex h-10 max-w-[60%] items-center gap-2 rounded-full bg-white/80 px-4 text-sm whitespace-nowrap shadow-sm backdrop-blur md:top-16 md:right-5 md:max-w-none">
      <span className="text-[#7a6650]">지역</span>
      <select
        value={signs.find((s) => s.label === current)?.index ?? "garden"}
        onChange={(e) => {
          if (e.target.value === "garden") onGarden();
          else onJump(Number(e.target.value));
          // 메뉴에 포커스가 남으면 키 입력(WASD·Enter)이 메뉴로 가서 걷기·등불 열기가 안 됨
          e.target.blur();
        }}
        className="min-w-0 flex-1 truncate bg-transparent outline-none md:max-w-48"
      >
        <option value="garden">바람개비 정원</option>
        {[...new Set(signs.map((s) => s.country))].map((country) => (
          <optgroup key={country} label={country}>
            {signs
              .filter((s) => s.country === country)
              .map((s) => (
                <option key={s.index} value={s.index}>
                  {s.label.replace(`${country} · `, "")} · {s.count}명
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function Veil({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#f4e6d4] px-6 text-center text-[#7a6650]">
      {text}
    </div>
  );
}
