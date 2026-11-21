/**
 * 공유 미리보기·전단지 이미지의 Wishwind 느낌: 로고(글자), 바람개비 등대 아이콘, 로고에서 뽑은 색
 * 로고 파일은 사이트에 올라가 있는 것을 그대로 받아 씀 (배포 서버 함수에는 public 폴더가 같이 묶이지 않음)
 */
export const BRAND = {
  paper: "#f6f1e7",
  card: "#fffaf2",
  ink: "#24302d",
  muted: "#5b6a66",
  subtle: "#8a958f",
  teal: "#2f6b62",
  tealDark: "#1f4a44",
  tealSoft: "#e3efe9",
  orange: "#e08a57",
  orangeSoft: "#fbe6d6",
  sky: "#dcecf1",
  line: "#e2dccf",
};

const cache = new Map<string, string>();

async function asset(origin: string, path: string) {
  const key = origin + path;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const res = await fetch(origin + path, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
    cache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

/** 로고 글자(720×240)와 바람개비 등대 아이콘(256×256) */
export async function loadBrand(origin: string) {
  const [logo, icon] = await Promise.all([asset(origin, "/wishwind-logo.png"), asset(origin, "/icon.png")]);
  return { logo, icon };
}

/** 위쪽 줄: 왼쪽 로고, 오른쪽 이름표(MISSING·CASE FILE 등) */
export function BrandHeader({ logo, tag, scale = 1 }: { logo: string | null; tag: string; scale?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} width={168 * scale} height={56 * scale} alt="" />
      ) : (
        <div style={{ display: "flex", fontSize: 34 * scale, fontWeight: 700, color: BRAND.tealDark }}>Wishwind</div>
      )}
      <div
        style={{
          display: "flex",
          padding: `${6 * scale}px ${18 * scale}px`,
          borderRadius: 999,
          background: BRAND.tealSoft,
          color: BRAND.teal,
          fontSize: 20 * scale,
          fontWeight: 700,
          letterSpacing: /^[A-Z ]+$/.test(tag) ? 3 * scale : 0,
        }}
      >
        {tag}
      </div>
    </div>
  );
}

/** 구석에 옅게 깔리는 큰 바람개비 (배경 무늬) */
export function PinwheelMark({ icon, size, top, right, bottom, left, opacity = 0.1 }: { icon: string | null; size: number; top?: number; right?: number; bottom?: number; left?: number; opacity?: number }) {
  if (!icon) return null;
  // 이미지 그리기 도구는 값이 비어 있는(undefined) 스타일을 넣으면 실패함 → 정해진 위치만 넘김
  const pos = Object.fromEntries(Object.entries({ top, right, bottom, left }).filter(([, v]) => v !== undefined));
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={icon} width={size} height={size} style={{ position: "absolute", ...pos, opacity, transform: "rotate(-14deg)" }} alt="" />
  );
}
