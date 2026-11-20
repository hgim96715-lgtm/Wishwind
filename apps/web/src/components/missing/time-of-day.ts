import * as THREE from "three";

import { DEV_GARDEN_TIME_KEY } from "./dev-garden-time";

/**
 * 보는 사람의 현재 시각(브라우저 로컬 시간)에 맞춘 하늘 색.
 * 키프레임 사이는 선형 보간 → 1분마다 갱신해도 끊기지 않고 서서히 바뀜.
 * 밤에는 하늘이 캄캄해지고 별이 뜸 (사용자 요청 2026-11-19, 예전엔 죽음 연상 소재라 뺐음). 등불이 더 밝아져 길을 비춤
 */
export interface SkyPalette {
  top: string;
  horizon: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sun: string;
  sunIntensity: number;
  cloud: string;
  lamp: number;
  /** 바닷가 언덕 배경 색 */
  grass: string;
  sand: string;
  sea: string;
  /** HUD 글자를 밝게 바꿀지 */
  dark: boolean;
  /** 별이 보이는 정도 (0 = 낮, 1 = 한밤) */
  stars: number;
}

type Key = [hour: number, p: Omit<SkyPalette, "dark" | "stars">];

// 한밤: 거의 검정이던 하늘을 깊은 남색으로. 달빛 받은 푸른 언덕이 보이고 등불·등대가 돋보이게 함
const NIGHT: Omit<SkyPalette, "dark" | "stars"> = {
  top: "#0b1a3d", horizon: "#25386a", hemiSky: "#8fa3d6", hemiGround: "#2a3552",
  hemiIntensity: 0.95, sun: "#b8c6f0", sunIntensity: 0.45, cloud: "#9aa6c8", lamp: 2.8,
  grass: "#2f5a55", sand: "#626887", sea: "#16305e",
};

/**
 * 하루의 흐름이 눈에 보이도록 시간대마다 색을 분명히 나눔 (사용자 요청 2026-11-20: 아침·오후가 똑같아 보임)
 * 해 뜰 녘(주황·분홍) → 아침(맑고 산뜻) → 한낮(진한 파랑) → 오후(황금빛) → 노을(주황·장밋빛) → 해 질 녘(보라) → 밤(남색)
 */
const KEYS: Key[] = [
  [0, NIGHT],
  [4.8, NIGHT],
  // 해 뜰 녘: 지평선에서 주황·분홍 빛이 번짐
  [6, { top: "#5a6fb0", horizon: "#ffb07c", hemiSky: "#ffd9c2", hemiGround: "#e0a98f", hemiIntensity: 1.25, sun: "#ffb27a", sunIntensity: 0.9, cloud: "#ffd8c4", lamp: 2.0, grass: "#7fa07c", sand: "#e8c0a2", sea: "#6a7fbf" }],
  // 아침: 해가 올라 맑고 산뜻함 (연노랑 햇살)
  [8.5, { top: "#9fd3f5", horizon: "#fff1cf", hemiSky: "#ffffff", hemiGround: "#ffe9c8", hemiIntensity: 1.9, sun: "#fff1cc", sunIntensity: 1.45, cloud: "#ffffff", lamp: 1.3, grass: "#8fcf7a", sand: "#f6e2bd", sea: "#6fbde6" }],
  // 한낮: 하늘이 가장 진한 파랑, 햇빛이 하얗게 강함
  [13, { top: "#4f9be6", horizon: "#d6ebfb", hemiSky: "#ffffff", hemiGround: "#eef0ea", hemiIntensity: 2.05, sun: "#ffffff", sunIntensity: 1.7, cloud: "#ffffff", lamp: 1.0, grass: "#79c062", sand: "#f1e4c6", sea: "#3f98d8" }],
  // 오후: 햇빛이 기울며 황금빛
  [16.3, { top: "#7fa9dc", horizon: "#ffe0a8", hemiSky: "#fff3dc", hemiGround: "#f4dbb0", hemiIntensity: 1.85, sun: "#ffd89a", sunIntensity: 1.45, cloud: "#fff5e3", lamp: 1.2, grass: "#9cc06a", sand: "#f2d4a0", sea: "#5e9ccc" }],
  // 노을: 지평선이 주황·장밋빛으로 물듦
  [18.2, { top: "#6f6fae", horizon: "#ff9a6b", hemiSky: "#ffd0b5", hemiGround: "#e39a83", hemiIntensity: 1.55, sun: "#ff9a5e", sunIntensity: 1.15, cloud: "#ffd3c0", lamp: 1.6, grass: "#9a9a72", sand: "#e8b49a", sea: "#7a6fa8" }],
  // 해 질 녘: 분홍이 보라·남색으로 바뀜
  [19.5, { top: "#2e3a74", horizon: "#c97b8f", hemiSky: "#c9b8dc", hemiGround: "#6e6382", hemiIntensity: 1.1, sun: "#d08aa6", sunIntensity: 0.55, cloud: "#d8c6e0", lamp: 2.2, grass: "#4b5d6a", sand: "#8f7f96", sea: "#36407a" }],
  [21, NIGHT],
  [24, NIGHT],
];

const a = new THREE.Color();
const b = new THREE.Color();
const mixHex = (x: string, y: string, t: number) => "#" + a.set(x).lerp(b.set(y), t).getHexString();
const mixNum = (x: number, y: number, t: number) => x + (y - x) * t;

export function paletteAt(hour: number): SkyPalette {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const [h0, p0] = KEYS[i];
  const [h1, p1] = KEYS[i + 1];
  const t = h1 === h0 ? 0 : (h - h0) / (h1 - h0);
  const p: Omit<SkyPalette, "dark" | "stars"> = {
    top: mixHex(p0.top, p1.top, t),
    horizon: mixHex(p0.horizon, p1.horizon, t),
    hemiSky: mixHex(p0.hemiSky, p1.hemiSky, t),
    hemiGround: mixHex(p0.hemiGround, p1.hemiGround, t),
    hemiIntensity: mixNum(p0.hemiIntensity, p1.hemiIntensity, t),
    sun: mixHex(p0.sun, p1.sun, t),
    sunIntensity: mixNum(p0.sunIntensity, p1.sunIntensity, t),
    cloud: mixHex(p0.cloud, p1.cloud, t),
    lamp: mixNum(p0.lamp, p1.lamp, t),
    grass: mixHex(p0.grass, p1.grass, t),
    sand: mixHex(p0.sand, p1.sand, t),
    sea: mixHex(p0.sea, p1.sea, t),
  };
  // 별: 저녁 7시 반부터 9시 반까지 서서히 떠서, 새벽 4시 반부터 6시까지 서서히 사라짐
  const stars = h >= 19.5 ? Math.min(1, (h - 19.5) / 2) : h < 4.5 ? 1 : h < 6 ? 1 - (h - 4.5) / 1.5 : 0;
  return { ...p, dark: h >= 19.5 || h < 5.5, stars };
}

/** 현재 시각(소수 시간). ?time=19 처럼 주소에 넣으면 그 시간으로 미리 볼 수 있음 */
export function currentHour(): number {
  const override = new URLSearchParams(window.location.search).get("time");
  const forced = override === null ? NaN : Number(override);
  if (Number.isFinite(forced)) return forced;
  // 개발 모드: 화면 아래 DEV 메뉴에서 고른 시각
  if (process.env.NODE_ENV === "development") {
    try {
      const dev = Number(localStorage.getItem(DEV_GARDEN_TIME_KEY) ?? NaN);
      if (Number.isFinite(dev)) return dev;
    } catch {
      /* 저장소를 못 쓰면 실제 시각 */
    }
  }
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

/** 흐림·비·눈·안개면 하늘을 회색빛으로 덮고 햇빛·별을 줄임 */
export function withWeather(p: SkyPalette, kind: "clear" | "cloudy" | "fog" | "rain" | "snow"): SkyPalette {
  if (kind === "clear") return p;
  const grey = p.dark ? "#262b3a" : kind === "snow" ? "#d9dde6" : "#a3a9b5";
  const amount = kind === "cloudy" ? 0.4 : kind === "fog" ? 0.6 : 0.55;
  return {
    ...p,
    top: mixHex(p.top, grey, amount),
    horizon: mixHex(p.horizon, grey, amount),
    hemiSky: mixHex(p.hemiSky, grey, amount * 0.5),
    sun: mixHex(p.sun, grey, amount),
    sunIntensity: p.sunIntensity * (1 - amount),
    hemiIntensity: p.hemiIntensity * (kind === "snow" ? 1.05 : 0.9),
    sea: mixHex(p.sea, grey, amount * 0.5),
    stars: 0,
  };
}
