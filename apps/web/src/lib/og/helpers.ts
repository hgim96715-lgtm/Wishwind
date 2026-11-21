import QRCode from "qrcode";

/** 전단지·공유 미리보기 이미지(next/og)에서 같이 쓰는 도구: 글자 자르기, 사진·QR 넣기, 한글 글꼴 */

const INK = "#2f2a24";

/** FBI 자료의 대문자 이름을 읽기 쉽게 (NANCY GUTHRIE → Nancy Guthrie) */
export function displayName(name: string) {
  return /[a-z]/.test(name) ? name : name.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (c) => c.toUpperCase());
}

export function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** 받아 온 사진은 서버가 켜져 있는 동안만 메모리에 둠 (FBI 사이트가 자동 요청을 자주 막아서, 한 번 받은 건 다시 받지 않음) */
const imageCache = new Map<string, string>();

/** 원본 사진을 서버에서 받아 넣음 (JPEG·PNG만, 실패하면 빈 칸). 디스크에 저장하지 않음 */
export async function imageDataUrl(url: string) {
  const hit = imageCache.get(url);
  if (hit) return hit;
  const data = await fetchImage(url);
  if (data) {
    if (imageCache.size > 100) imageCache.clear();
    imageCache.set(url, data);
  }
  return data;
}

async function fetchImage(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "Mozilla/5.0 (cold-cases flyer)" } });
    const type = res.headers.get("content-type") ?? "";
    if (process.env.NODE_ENV !== "production" && (!res.ok || !/^image\/(jpeg|png)/.test(type))) {
      console.warn(`[flyer] 사진을 넣지 못함: ${res.status} ${type} ${url}`);
    }
    if (!res.ok || !/^image\/(jpeg|png)/.test(type)) return null;
    return `data:${type.split(";")[0]};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function qrDataUrl(url: string) {
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, color: { dark: INK, light: "#ffffff" } });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * 한글 글꼴: Google Fonts에서 이 전단지에 쓰인 글자만 잘라 받음 (용량 작음, ImageResponse 500KB 제한 회피).
 * 결과는 같은 글자 조합이면 메모리에 잠시 보관
 */
const fontCache = new Map<string, Promise<ArrayBuffer>>();
async function loadFont(weight: 400 | 700, text: string) {
  const key = `${weight}:${text}`;
  let p = fontCache.get(key);
  if (!p) {
    p = (async () => {
      const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`;
      const css = await (await fetch(cssUrl)).text();
      const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
      if (!src) throw new Error("글꼴을 불러오지 못했습니다");
      return (await fetch(src)).arrayBuffer();
    })();
    if (fontCache.size > 200) fontCache.clear();
    fontCache.set(key, p);
    p.catch(() => fontCache.delete(key));
  }
  return p;
}

export async function koreanFonts(text: string) {
  const chars = [...new Set(text + "0123456789·…:() ")].join("");
  const [regular, bold] = await Promise.all([loadFont(400, chars), loadFont(700, chars)]);
  return [
    { name: "NotoSansKR", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "NotoSansKR", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}
