import { ImageResponse } from "next/og";
import { ApiUnavailableError, getCase } from "@/lib/cases/api";
import { COUNTRY_LABEL, caseStamp, formatCaseDate } from "@/lib/cases/labels";
import type { CaseDetail } from "@/lib/cases/types";
import { getMissing } from "@/lib/missing/api";
import { formatMissingDate } from "@/lib/missing/regions";
import { BRAND, loadBrand, PinwheelMark } from "@/lib/og/brand";
import { clip, clipAtBoundary, imageDataUrl, koreanFonts, qrDataUrl } from "@/lib/og/helpers";

/**
 * 인스타그램 스토리용 전단지 (1080×1920 PNG). /api/flyer/post/[slug]는 피드 게시물용 (1080×1350).
 * - 사건: 상태 도장, 제목, 요약, 함께 생각해 볼 질문, 사이트 QR (피해자 사진은 넣지 않음)
 * - 실종자: FBI 공개 자료만 (사진·인상착의·실종 지역·제보처). 국내 안전Dream 자료는 이용 조건 확인 전까지 만들지 않음
 */
const W = 1080;
const H = 1920;
const SITE_NAME = "Wishwind";

const PAPER = BRAND.paper;
const INK = BRAND.ink;
const MUTED = BRAND.muted;

type Brand = Awaited<ReturnType<typeof loadBrand>>;

type Ctx = RouteContext<"/api/flyer/[type]/[key]">;

export async function GET(request: Request, ctx: Ctx) {
  const { type, key } = await ctx.params;
  const origin = process.env.SITE_URL ?? new URL(request.url).origin;
  try {
    const brand = await loadBrand(new URL(request.url).origin);
    if (type === "case") return await caseFlyer(key, origin, brand);
    if (type === "post") return await postFlyer(key, origin, brand);
    if (type === "missing") return await missingFlyer(key, origin, brand);
    return Response.json({ message: "잘못된 주소입니다" }, { status: 404 });
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return Response.json({ message: "API 서버에 연결할 수 없습니다" }, { status: 503 });
    }
    throw error;
  }
}

async function caseFlyer(slug: string, origin: string, brand: Brand) {
  const data = await getCase(slug);
  if (!data || data.unpublished) return Response.json({ message: "사건을 찾을 수 없습니다" }, { status: 404 });
  const stamp = caseStamp(data);
  const question = data.unsolvedQuestions[0]?.question ?? null;
  const meta = caseMeta(data);
  const url = `${origin}/cases/${slug}`;
  const qr = await qrDataUrl(url);
  // 제목이 길면 글자를 줄여 두 줄 안에 들어가게 함 (내용이 넘치면 Satori가 칸을 눌러 글자가 겹침)
  // 끝의 괄호(예: '(김길태 사건)')는 줄바꿈이 어색해지지 않게 제목 아래 작은 줄로 뺌
  const paren = data.title.match(/^(.+?)\s*\((.+)\)$/);
  const titleMain = paren ? paren[1] : data.title;
  const titleNote = paren ? `(${paren[2]})` : null;
  const titleSize = titleMain.length > 22 ? 68 : titleMain.length > 14 ? 80 : 96;
  const summary = clipAtBoundary(data.summary, question ? 110 : 160);
  const texts = [SITE_NAME, "CASE FILE", stamp.label, data.title, data.summary, meta, question ?? "", "함께 생각해 볼 질문", "QR을 찍으면 사건 파일이 열립니다", "같은 일이 다시 일어나지 않도록, 함께 기억해 주세요"];

  return new ImageResponse(
    (
      <Frame brand={brand}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 34, letterSpacing: 6, color: BRAND.teal }}>CASE FILE</div>
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
        <div style={{ display: "flex", flexShrink: 0, marginTop: 70, fontSize: titleSize, fontWeight: 700, lineHeight: 1.3, color: INK, wordBreak: "keep-all" }}>
          {titleMain}
        </div>
        {titleNote && (
          <div style={{ display: "flex", flexShrink: 0, marginTop: 8, fontSize: Math.round(titleSize * 0.6), fontWeight: 700, color: MUTED }}>
            {titleNote}
          </div>
        )}
        <div style={{ display: "flex", flexShrink: 0, marginTop: 28, fontSize: 36, lineHeight: 1.45, color: "#9a8a76", wordBreak: "keep-all" }}>{clip(meta, 60)}</div>
        <div style={{ display: "flex", flexShrink: 0, marginTop: 52, fontSize: 44, lineHeight: 1.6, color: MUTED, wordBreak: "keep-all" }}>
          {summary}
        </div>
        {question && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              marginTop: 56,
              padding: "40px 48px",
              borderRadius: 28,
              background: "#fffaf2",
              border: "3px dashed #b9d6cd",
            }}
          >
            <div style={{ fontSize: 34, color: stamp.color, fontWeight: 700 }}>함께 생각해 볼 질문</div>
            <div style={{ display: "flex", marginTop: 18, fontSize: 44, lineHeight: 1.45, color: INK, wordBreak: "keep-all" }}>{clipAtBoundary(question, 80)}</div>
          </div>
        )}
        <div style={{ flex: 1, display: "flex" }} />
        <Footer qr={qr} caption="QR을 찍으면 사건 파일이 열립니다" note="같은 일이 다시 일어나지 않도록, 함께 기억해 주세요" />
      </Frame>
    ),
    { width: W, height: H, fonts: await koreanFonts(texts.join("")), headers: cacheHeaders },
  );
}

/** '나라 · 발생일 · 장소'. '기타' 나라는 장소 첫 어절(예: 코모로)을 나라 이름으로 씀 */
function caseMeta(data: CaseDetail) {
  const [firstWord, ...restWords] = (data.location ?? "").split(" ");
  const otherCountry = data.country === "OTHER" && restWords.length > 0;
  const countryLabel = otherCountry ? firstWord : data.country === "OTHER" ? null : COUNTRY_LABEL[data.country];
  const place = otherCountry ? restWords.join(" ") : data.location;
  return [countryLabel, formatCaseDate(data.occurredAt, data.occurredAtPrecision), place].filter(Boolean).join(" · ");
}

/**
 * 인스타그램 피드 게시물용 (1080×1350, 4:5). 피드에서 가장 크게 보이는 비율.
 * 질문은 넣지 않고 글(캡션)에 씀. 대신 피해 규모 한 줄과 요약을 크게 보여 줌
 */
async function postFlyer(slug: string, origin: string, brand: Brand) {
  const data = await getCase(slug);
  if (!data || data.unpublished) return Response.json({ message: "사건을 찾을 수 없습니다" }, { status: 404 });
  const stamp = caseStamp(data);
  const meta = caseMeta(data);
  const paren = data.title.match(/^(.+?)\s*\((.+)\)$/);
  const titleMain = paren ? paren[1] : data.title;
  const titleNote = paren ? `(${paren[2]})` : null;
  const titleSize = titleMain.length > 22 ? 60 : titleMain.length > 14 ? 70 : 84;
  const summary = clipAtBoundary(data.summary, 110);
  const qr = await qrDataUrl(`${origin}/cases/${slug}`);
  const caption = "QR을 찍으면 사건 파일이 열립니다";
  const note = "같은 일이 다시 일어나지 않도록, 함께 기억해 주세요";
  const texts = [SITE_NAME, "CASE FILE", stamp.label, data.title, summary, meta, data.victimCountNote ?? "", caption, note];

  return new ImageResponse(
    (
      <Frame brand={brand} compact>
        <div style={{ display: "flex", flexShrink: 0, justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 30, letterSpacing: 6, color: BRAND.teal }}>CASE FILE</div>
          <div
            style={{
              display: "flex",
              border: `5px solid ${stamp.color}`,
              color: stamp.color,
              borderRadius: 16,
              padding: "6px 24px",
              fontSize: 40,
              fontWeight: 700,
              transform: "rotate(-6deg)",
            }}
          >
            {stamp.label}
          </div>
        </div>
        <div style={{ display: "flex", flexShrink: 0, marginTop: 44, fontSize: titleSize, fontWeight: 700, lineHeight: 1.3, color: INK, wordBreak: "keep-all" }}>
          {titleMain}
        </div>
        {titleNote && (
          <div style={{ display: "flex", flexShrink: 0, marginTop: 6, fontSize: Math.round(titleSize * 0.6), fontWeight: 700, color: MUTED }}>
            {titleNote}
          </div>
        )}
        <div style={{ display: "flex", flexShrink: 0, marginTop: 22, fontSize: 32, lineHeight: 1.45, color: "#9a8a76", wordBreak: "keep-all" }}>{clip(meta, 60)}</div>
        {data.victimCountNote && (
          <div style={{ display: "flex", flexShrink: 0, marginTop: 30 }}>
            <div style={{ display: "flex", padding: "10px 24px", borderRadius: 999, background: "#efe6d8", fontSize: 32, fontWeight: 700, color: INK }}>
              {data.victimCountNote}
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexShrink: 0, marginTop: 36, fontSize: 40, lineHeight: 1.6, color: MUTED, wordBreak: "keep-all" }}>
          {summary}
        </div>
        <div style={{ flex: 1, display: "flex" }} />
        <Footer qr={qr} caption={caption} note={note} small />
      </Frame>
    ),
    { width: W, height: 1350, fonts: await koreanFonts(texts.join("")), headers: cacheHeaders },
  );
}

async function missingFlyer(id: string, origin: string, brand: Brand) {
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
      <Frame brand={brand}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 34, letterSpacing: 6, color: BRAND.teal }}>MISSING</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: BRAND.orange }}>이 분을 찾습니다</div>
        </div>
        <div style={{ display: "flex", marginTop: 56, gap: 44 }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} width={380} height={480} style={{ borderRadius: 32, objectFit: "cover" }} alt="" />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: data.name.length > 14 ? 60 : 76, fontWeight: 700, lineHeight: 1.2, color: INK }}>{data.name}</div>
            <div style={{ display: "flex", marginTop: 24, fontSize: 38, color: MUTED }}>{missingOn}</div>
            <div style={{ display: "flex", marginTop: 40, fontSize: 30, color: BRAND.teal, fontWeight: 700 }}>마지막으로 목격된 곳</div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 38, lineHeight: 1.4, color: INK }}>{clip(place, 60)}</div>
          </div>
        </div>
        {appearance && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 56, padding: "36px 40px", borderRadius: 28, background: "#fffaf2" }}>
            <div style={{ fontSize: 30, color: BRAND.teal, fontWeight: 700 }}>인상착의</div>
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
            background: BRAND.teal,
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

/** 전단지 바탕: 위에 Wishwind 로고, 오른쪽 아래에 옅은 바람개비 등대 */
function Frame({ brand, children, compact = false }: { brand: Brand; children: React.ReactNode; compact?: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: PAPER,
        padding: compact ? "60px 80px 64px" : "80px 90px 90px",
        fontFamily: "NotoSansKR",
      }}
    >
      <PinwheelMark icon={brand.icon} size={compact ? 600 : 760} right={-230} bottom={-170} opacity={0.1} />
      {brand.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logo} width={compact ? 264 : 330} height={compact ? 88 : 110} style={{ marginBottom: compact ? 30 : 50, marginLeft: -12 }} alt="" />
      ) : (
        <div style={{ display: "flex", marginBottom: compact ? 30 : 50, fontSize: 56, fontWeight: 700, color: BRAND.tealDark }}>{SITE_NAME}</div>
      )}
      {children}
    </div>
  );
}

function Footer({ qr, caption, note, small = false }: { qr: string; caption: string; note: string; small?: boolean }) {
  const size = small ? 180 : 230;
  return (
    <div style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 40, borderTop: `3px solid ${BRAND.line}`, paddingTop: small ? 34 : 50 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} width={size} height={size} style={{ borderRadius: 20, background: "white", padding: 14 }} alt="" />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: INK }}>{SITE_NAME}</div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 30, color: MUTED }}>{caption}</div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 26, color: "#9a8a76" }}>{note}</div>
      </div>
    </div>
  );
}
