"use client";

import { AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuClock, LuCloud, LuCloudFog, LuCloudRain, LuCloudSnow, LuList, LuMap, LuMapPin, LuSun, LuUserRound, LuWind } from "react-icons/lu";
import { WEATHER_LABEL, type Weather, type WeatherKind } from "@/lib/weather/types";
import type { RegionGroup } from "@/lib/missing/regions";
import type { CloudMessage } from "@/lib/missing/types";
import { AvatarSetup, loadAvatar, type AvatarChoice } from "./garden/AvatarSetup";
import type { PlayerStatus, Wish, WorldControls } from "./garden/GardenScene";
import { Joystick } from "./garden/Joystick";
import { GARDEN_CENTER, lanternPoint, LIGHTHOUSE, pinwheelSpot, START_POND_VIEW, trailPoint } from "./garden/world";
import { MissingCard } from "./MissingCard";
import { MissingList } from "./MissingList";
import { buildSlots } from "./path-layout";
import { currentHour } from "./time-of-day";
import { useWeather } from "./useWeather";
import { arrivalMessage, useWishes, WishPanel } from "./WishPanel";

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

/** 방금 꽂은 바람개비 말풍선을 강조해 보여 주는 시간 */
const FRESH_BUBBLE_MS = 6000;

export function MissingExperience({ groups }: { groups: RegionGroup[] }) {
  const slots = useMemo(() => buildSlots(groups), [groups]);
  const [mode, setMode] = useState<Mode>("checking");
  const [touch, setTouch] = useState(false);
  const [avatar, setAvatar] = useState<AvatarChoice | null>(null);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [selected, setSelected] = useState<{ id: string; regionLabel: string } | null>(null);
  const [status, setStatus] = useState<PlayerStatus>({ place: "바람개비 정원", nearId: null, inGarden: true });
  const controls = useRef<WorldControls>({ stick: { x: 0, y: 0 } });
  const { weather, mine, askMyLocation, backToSeoul } = useWeather();

  // 응원은 모든 실종자에게 건네는 바람개비 → 정원 전체에 하나의 개수
  const [toast, setToast] = useState<string | null>(null);
  // 다른 사람이 새로 꽂으면 "○○님이 바람개비를 꽂았습니다"를 잠깐 띄움
  const [wishData, setWishData] = useWishes(useCallback((clouds: CloudMessage[]) => setToast(arrivalMessage(clouds)), []));
  const [wishOpen, setWishOpen] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);
  const closeWish = useCallback(() => setWishOpen(false), []);

  const wishes: Wish[] = useMemo(
    () => [
      ...(wishData?.pending ?? []).map((w) => ({ id: w.id, body: w.body, pending: true, pos: wishPos(w) })),
      ...(wishData?.clouds ?? []).map((w) => ({ id: w.id, body: w.body, pos: wishPos(w) })),
    ],
    [wishData],
  );
  const wishCount = wishData?.cloudCount ?? 0;

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

  // 방금 꽂은 바람개비의 강조 말풍선은 잠깐만 보여 줌. 그 뒤로는 다른 바람개비처럼 가까이 갈 때만 보임
  useEffect(() => {
    if (!freshId) return;
    const id = setTimeout(() => setFreshId(null), FRESH_BUBBLE_MS);
    return () => clearTimeout(id);
  }, [freshId]);

  const regionOf = useCallback(
    (id: string) => {
      for (const s of slots) if (s.kind === "lantern" && s.person.id === id) return s.regionLabel;
      return "";
    },
    [slots],
  );
  const select = useCallback((id: string) => setSelected({ id, regionLabel: regionOf(id) }), [regionOf]);
  const close = useCallback(() => setSelected(null), []);

  // 전단지 QR·공유 링크(/missing?person=id)로 들어오면 그 분의 카드를 바로 엶
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("person");
    if (!id || !slots.some((s) => s.kind === "lantern" && s.person.id === id)) return;
    // 마운트 직후 프레임에서 열어 effect 안 동기 setState(연쇄 렌더)를 피함
    const raf = requestAnimationFrame(() => select(id));
    return () => cancelAnimationFrame(raf);
  }, [slots, select]);

  /** 꽂은 바람개비 앞으로 데려가서 직접 보이게 함 */
  const onPlaced = useCallback(
    (id: string, message: string, placedHere: boolean) => {
      setWishOpen(false);
      setFreshId(id);
      setToast(message);
      // 서 있던 자리 앞에 꽂았으면 이미 눈앞에 보이므로 그대로 둠
      if (placedHere) return;
      const pendingCount = (wishData?.pending.length ?? 0) + 1;
      const k = Math.min(599, wishCount + pendingCount - 1);
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
              weather={weather}
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

          {/* 좁은 화면에서는 오른쪽 위 지역 메뉴와 겹치므로 그 아래로 내림 */}
          <p
            aria-live="polite"
            className="pointer-events-none absolute top-[7.5rem] left-1/2 z-10 md:top-20 -translate-x-1/2 rounded-full bg-white/75 px-3 py-1 text-sm whitespace-nowrap text-[#7a6650] backdrop-blur"
          >
            {status.place}
          </p>

          <PlaceMenu
            lanterns={total}
            onGo={(where) => {
              if (where === "garden") controls.current.teleport?.(GARDEN_CENTER[0] - 4, GARDEN_CENTER[1] + 4);
              else if (where === "pond") controls.current.teleport?.(START_POND_VIEW[0], START_POND_VIEW[1]);
              else if (where === "lighthouse") controls.current.teleport?.(LIGHTHOUSE[0] + 4, LIGHTHOUSE[1] + 4);
              else if (where === "newest") jumpTo(0);
              else jumpTo(Math.max(0, total - 1));
            }}
          />

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

          {weather && !overlay && (
            <WeatherChip weather={weather} mine={mine} onMine={askMyLocation} onSeoul={backToSeoul} raised={touch} />
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
                className="absolute top-40 left-1/2 z-30 md:top-32 -translate-x-1/2 rounded-full bg-[#fff4d6] px-4 py-2 text-sm whitespace-nowrap text-[#6b4f2a] shadow"
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
        {wishOpen && <WishPanel key="wishes" data={wishData} setData={setWishData} onClose={closeWish} onPlaced={onPlaced} nickname={avatar?.nickname} getPosition={() => (mode === "scene" ? controls.current.plantSpot?.() : undefined)} />}
      </AnimatePresence>
      <AnimatePresence>
        {selected && <MissingCard key={selected.id} id={selected.id} regionLabel={selected.regionLabel} onClose={close} />}
      </AnimatePresence>
    </div>
  );
}

/** 지역 구간으로 바로 이동: 나라별로 묶어 보여 줌 */
type Place = "garden" | "pond" | "lighthouse" | "newest" | "oldest";

/** 바로 가기: 지역으로 나누지 않으므로 언덕의 장소와 등불 길 처음·끝만 고름 */
function PlaceMenu({ lanterns, onGo }: { lanterns: number; onGo: (where: Place) => void }) {
  return (
    <label className="absolute top-[4.25rem] right-4 z-20 flex h-10 max-w-[60%] items-center gap-2 rounded-full bg-white/80 px-4 text-sm whitespace-nowrap shadow-sm backdrop-blur md:top-16 md:right-5 md:max-w-none">
      <span className="text-[#7a6650]">바로 가기</span>
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) onGo(e.target.value as Place);
          // 메뉴에 포커스가 남으면 키 입력(WASD·Enter)이 메뉴로 가서 걷기·등불 열기가 안 됨
          e.target.blur();
        }}
        className="min-w-0 flex-1 truncate bg-transparent outline-none md:max-w-48"
      >
        <option value="" disabled>
          장소 고르기
        </option>
        <option value="garden">바람개비 정원</option>
        <option value="pond">연못 다리</option>
        <option value="lighthouse">등대</option>
        <option value="newest">가장 최근 등불</option>
        <option value="oldest">가장 오래된 등불 ({lanterns}번째)</option>
      </select>
    </label>
  );
}

const WEATHER_ICON: Record<WeatherKind, typeof LuSun> = {
  clear: LuSun,
  cloudy: LuCloud,
  fog: LuCloudFog,
  rain: LuCloudRain,
  snow: LuCloudSnow,
};

/** 정원 날씨 표시. 누르면 내 위치 날씨 ↔ 서울 날씨 (위치 권한은 이때만 물어봄) */
function WeatherChip({
  weather,
  mine,
  onMine,
  onSeoul,
  raised,
}: {
  weather: Weather;
  mine: boolean;
  onMine: () => void;
  onSeoul: () => void;
  raised: boolean;
}) {
  const Icon = WEATHER_ICON[weather.kind];
  return (
    <div className={`absolute left-5 z-20 flex flex-col items-start gap-1.5 ${raised ? "bottom-40" : "bottom-40 md:bottom-6"}`}>
      <GardenClock />
      <button
        type="button"
        onClick={mine ? onSeoul : onMine}
        title={mine ? "서울 날씨로 바꾸기" : "내가 있는 곳의 날씨로 바꾸기 (위치는 저장하지 않습니다)"}
        className="flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 text-xs text-[#6b5a46] shadow-sm backdrop-blur hover:bg-white"
      >
        <Icon aria-hidden className="size-4" />
        {weather.place} · {WEATHER_LABEL[weather.kind]}
        <span className="ml-1 flex items-center gap-0.5 text-[#b9772a]">
          <LuMapPin aria-hidden className="size-3" />
          {mine ? "서울" : "내 위치"}
        </span>
      </button>
    </div>
  );
}

/** 언덕의 시각: 정원의 하늘이 따르는 시간(?time 미리 보기 포함)을 30초마다 갱신 */
function GardenClock() {
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setHour(currentHour());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  if (hour == null) return null;
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  const text = `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}`;
  return (
    <p className="flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 text-xs text-[#6b5a46] tabular-nums shadow-sm backdrop-blur">
      <LuClock aria-hidden className="size-4" />
      <time>{text}</time>
      <span className="text-[#9a8a76]">· {timeWord(h)}</span>
    </p>
  );
}

function timeWord(h: number): string {
  if (h < 5) return "새벽";
  if (h < 9) return "아침";
  if (h < 17) return "낮";
  if (h < 20) return "저녁";
  return "밤";
}

function Veil({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#f4e6d4] px-6 text-center text-[#7a6650]">
      {text}
    </div>
  );
}

/** 꽂은 자리가 있는 메시지만 언덕 좌표를 돌려줌 */
function wishPos(w: CloudMessage): [number, number] | undefined {
  return w.posX != null && w.posZ != null ? [w.posX, w.posZ] : undefined;
}
