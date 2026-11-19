import * as THREE from "three";

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

// 한밤: 캄캄한 남색 하늘. 땅은 겨우 보일 만큼만 밝혀 등불·등대가 돋보이게 함
const NIGHT: Omit<SkyPalette, "dark" | "stars"> = {
  top: "#070d24", horizon: "#1a2444", hemiSky: "#6f7aa8", hemiGround: "#22253c",
  hemiIntensity: 0.75, sun: "#9aa8dc", sunIntensity: 0.3, cloud: "#8f98ba", lamp: 2.8,
  grass: "#2b4a40", sand: "#55516a", sea: "#132244",
};

const KEYS: Key[] = [
  [0, NIGHT],
  [4.5, NIGHT],
  // 새벽: 지평선부터 분홍빛
  [6, { top: "#7f9cc8", horizon: "#f8cdb8", hemiSky: "#f4e6f0", hemiGround: "#d8b2a6", hemiIntensity: 1.3, sun: "#ffc8a8", sunIntensity: 0.8, cloud: "#fbeef0", lamp: 2.0 , grass: "#8fae8a", sand: "#e9cdbb", sea: "#7d97c4" }],
  // 아침
  [8, { top: "#8fc3ea", horizon: "#fde4c8", hemiSky: "#ffffff", hemiGround: "#ffe6cf", hemiIntensity: 1.9, sun: "#fff0d6", sunIntensity: 1.4, cloud: "#ffffff", lamp: 1.4 , grass: "#8cc47a", sand: "#f3dfc0", sea: "#6fb1d9" }],
  // 한낮
  [13, { top: "#74b3ec", horizon: "#e6f1fa", hemiSky: "#ffffff", hemiGround: "#f2eee6", hemiIntensity: 2.0, sun: "#ffffff", sunIntensity: 1.6, cloud: "#ffffff", lamp: 1.1 , grass: "#86c46d", sand: "#f2e3c4", sea: "#5aa7dc" }],
  [16.5, { top: "#8fb8e0", horizon: "#fde2c6", hemiSky: "#fff8ef", hemiGround: "#f8e2cc", hemiIntensity: 1.9, sun: "#ffe2bf", sunIntensity: 1.4, cloud: "#fffaf4", lamp: 1.3 , grass: "#93c176", sand: "#f4dcbf", sea: "#6aaad6" }],
  // 노을: 진한 주황 대신 복숭아·연분홍·라벤더로 은은하게
  [18.3, { top: "#9fa9d4", horizon: "#ffd2b8", hemiSky: "#fff1ea", hemiGround: "#f3d3c8", hemiIntensity: 1.7, sun: "#ffcfb0", sunIntensity: 1.2, cloud: "#fff2ec", lamp: 1.5 , grass: "#a3b98a", sand: "#f3d2bf", sea: "#8aa1cf" }],
  // 저녁: 짙은 남보라 대신 부드러운 라벤더 블루
  [20, { top: "#4a5689", horizon: "#b9a7c9", hemiSky: "#d9d4ec", hemiGround: "#8a7d9c", hemiIntensity: 1.2, sun: "#c6bde4", sunIntensity: 0.6, cloud: "#ebe7f6", lamp: 1.8 , grass: "#6f7f86", sand: "#b7a6b8", sea: "#5a6596" }],
  [21.5, NIGHT],
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
