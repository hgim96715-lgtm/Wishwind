import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { ApiUnavailableError, getCase } from "@/lib/cases/api";
import { COUNTRY_LABEL, STATUS_STAMP, formatCaseDate } from "@/lib/cases/labels";
import { getMissing } from "@/lib/missing/api";
import { formatMissingDate } from "@/lib/missing/regions";

/**
 * 인스타그램 스토리용 전단지 (1080×1920 PNG).
 * - 사건: 상태 도장, 제목, 요약, 함께 생각해 볼 질문, 사이트 QR (피해자 사진은 넣지 않음)
 * - 실종자: FBI 공개 자료만 (사진·인상착의·실종 지역·제보처). 국내 안전Dream 자료는 이용 조건 확인 전까지 만들지 않음
 */
const W = 1080;
const H = 1920;
const SITE_NAME = "Wishwind";

const PAPER = "#f7f1e7";
const INK = "#2f2a24";
const MUTED = "#6b5a46";

type Ctx = RouteContext<"/api/flyer/[type]/[key]">;

export async function GET(request: Request, ctx: Ctx) {
  const { type, key } = await ctx.params;
  const origin = process.env.SITE_URL ?? new URL(request.url).origin;
  try {
    if (type === "case") return await caseFlyer(key, origin);
    if (type === "missing") return await missingFlyer(key, origin);
    return Response.json({ message: "잘못된 주소입니다" }, { status: 404 });
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return Response.json({ message: "API 서버에 연결할 수 없습니다" }, { status: 503 });
    }
    throw error;
  }
}

async function caseFlyer(slug: string, origin: string) {
  const data = await getCase(slug);
  if (!data || data.unpublished) return Response.json({ message: "사건을 찾을 수 없습니다" }, { status: 404 });
  const stamp = STATUS_STAMP[data.status];
  const question = data.unsolvedQuestions[0]?.question ?? null;
  const meta = [COUNTRY_LABEL[data.country], formatCaseDate(data.occurredAt, data.occurredAtPrecision), data.location]
    .filter(Boolean)
    .join(" · ");
  const url = `${origin}/cases/${slug}`;
  const qr = await qrDataUrl(url);
  const texts = [SITE_NAME, "CASE FILE", stamp.label, data.title, data.summary, meta, question ?? "", "함께 생각해 볼 질문", "QR을 찍으면 사건 파일이 열립니다", "같은 일이 다시 일어나지 않도록, 함께 기억해 주세요"];

  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 34, letterSpacing: 6, color: "#9a8a76" }}>CASE FILE</div>
          <div
            style={{
              display: "flex",
              border: `6px solid ${stamp.color}`,
              color: stamp.color,
              borderRadius: 18,
              padding: "8px 28px",
              fontSize: 48,
              fontWeight: 700,
              transform: "rotate(-6deg)",
            }}
          >
            {stamp.label}
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 90, fontSize: 96, fontWeight: 700, lineHeight: 1.25, color: INK }}>
          {data.title}
        </div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 38, color: "#9a8a76" }}>{meta}</div>
        <div style={{ display: "flex", marginTop: 64, fontSize: 48, lineHeight: 1.6, color: MUTED }}>
          {clip(data.summary, 120)}
        </div>
        {question && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 80,
              padding: "44px 48px",
              borderRadius: 28,
              background: "#fffaf2",
              border: "3px dashed #dccab0",
            }}
          >
            <div style={{ fontSize: 34, color: stamp.color, fontWeight: 700 }}>함께 생각해 볼 질문</div>
            <div style={{ display: "flex", marginTop: 18, fontSize: 48, lineHeight: 1.45, color: INK }}>{clip(question, 80)}</div>
          </div>
        )}
        <div style={{ flex: 1, display: "flex" }} />
        <Footer qr={qr} caption="QR을 찍으면 사건 파일이 열립니다" note="같은 일이 다시 일어나지 않도록, 함께 기억해 주세요" />
      </Frame>
    ),
    { width: W, height: H, fonts: await koreanFonts(texts.join("")), headers: cacheHeaders },
  );
}

async function missingFlyer(id: string, origin: string) {
  const data = await getMissing(id);
  if (!data) return Response.json({ message: "실종자 정보를 찾을 수 없습니다" }, { status: 404 });
  if (data.source !== "FBI") {
    return Response.json({ message: "국내 실종자 자료는 아직 전단지로 만들 수 없습니다" }, { status: 403 });
  }
  const url = `${origin}/missing?person=${encodeURIComponent(id)}`;
  const qr = await qrDataUrl(url);
  const missingOn = `${formatMissingDate(data.missingDate)} 실종`;
  const place = data.lastSeenPlace ?? data.region;
  const appearance = data.appearance ? clip(data.appearance, 140) : null;
  const tip = `${data.tip.label}`;
  const photo = data.photoUrl ? await imageDataUrl(data.photoUrl) : null;
  const texts = [SITE_NAME, "MISSING", "이 분을 찾습니다", data.name, missingOn, place, appearance ?? "", "인상착의", "마지막으로 목격된 곳", tip, "보셨다면 공식 창구로 알려 주세요", "QR을 찍으면 실종방에서 자세히 볼 수 있습니다", `자료 출처: ${data.sourceLabel}`];

  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 34, letterSpacing: 6, color: "#b08a52" }}>MISSING</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#c9873a" }}>이 분을 찾습니다</div>
        </div>
        <div style={{ display: "flex", marginTop: 56, gap: 44 }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} width={380} height={480} style={{ borderRadius: 32, objectFit: "cover" }} alt="" />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: data.name.length > 14 ? 60 : 76, fontWeight: 700, lineHeight: 1.2, color: INK }}>{data.name}</div>
            <div style={{ display: "flex", marginTop: 24, fontSize: 38, color: MUTED }}>{missingOn}</div>
            <div style={{ display: "flex", marginTop: 40, fontSize: 30, color: "#b08a52", fontWeight: 700 }}>마지막으로 목격된 곳</div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 38, lineHeight: 1.4, color: INK }}>{clip(place, 60)}</div>
          </div>
        </div>
        {appearance && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 56, padding: "36px 40px", borderRadius: 28, background: "#fffaf2" }}>
            <div style={{ fontSize: 30, color: "#b08a52", fontWeight: 700 }}>인상착의</div>
            <div style={{ display: "flex", marginTop: 14, fontSize: 42, lineHeight: 1.55, color: INK }}>{appearance}</div>
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
            padding: "30px 40px",
            borderRadius: 28,
            background: "#e9a94f",
            color: "white",
          }}
        >
          <div style={{ fontSize: 30 }}>보셨다면 공식 창구로 알려 주세요</div>
          <div style={{ display: "flex", marginTop: 8, fontSize: 44, fontWeight: 700 }}>{tip}</div>
        </div>
        <div style={{ flex: 1, display: "flex" }} />
        <Footer qr={qr} caption="QR을 찍으면 실종방에서 자세히 볼 수 있습니다" note={`자료 출처: ${data.sourceLabel}`} />
      </Frame>
    ),
    { width: W, height: H, fonts: await koreanFonts(texts.join("")), headers: cacheHeaders },
  );
}

const cacheHeaders = { "cache-control": "public, max-age=600" };

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: PAPER,
        padding: "110px 90px 90px",
        fontFamily: "NotoSansKR",
      }}
    >
      {children}
    </div>
  );
}

function Footer({ qr, caption, note }: { qr: string; caption: string; note: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40, borderTop: "3px solid #e3d6c3", paddingTop: 50 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} width={230} height={230} style={{ borderRadius: 20, background: "white", padding: 14 }} alt="" />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: INK }}>{SITE_NAME}</div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 30, color: MUTED }}>{caption}</div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 26, color: "#9a8a76" }}>{note}</div>
      </div>
    </div>
  );
}

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** 원본 사진을 서버에서 받아 넣음 (JPEG·PNG만, 실패하면 빈 칸). 저장하지 않음 */
async function imageDataUrl(url: string) {
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

async function qrDataUrl(url: string) {
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

async function koreanFonts(text: string) {
  const chars = [...new Set(text + "0123456789·…:() ")].join("");
  const [regular, bold] = await Promise.all([loadFont(400, chars), loadFont(700, chars)]);
  return [
    { name: "NotoSansKR", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "NotoSansKR", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}
