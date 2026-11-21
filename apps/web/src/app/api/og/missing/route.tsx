import { ImageResponse } from "next/og";
import { ApiUnavailableError } from "@/lib/cases/api";
import { getAllMissing, getMissing } from "@/lib/missing/api";
import { formatMissingDate } from "@/lib/missing/regions";
import type { MissingSummary } from "@/lib/missing/types";
import { clip, displayName, imageDataUrl, koreanFonts, qrDataUrl } from "@/lib/og/helpers";

/**
 * 실종방 링크를 메신저·SNS에 붙였을 때 보이는 미리보기 이미지 (1200×630).
 * - 기본: 지금 찾고 있는 분들의 사진 몇 장 + 인원 수 + 실종방 QR
 * - ?person=id: 그 분의 사진·이름·실종일·장소·제보처 + QR (FBI 공개 자료만. 국내 자료는 이용 조건 확인 전이라 기본 카드로 대신함)
 */
const W = 1200;
const H = 630;
const PAPER = "#f7f1e7";
const INK = "#2f2a24";
const MUTED = "#6b5a46";
const GOLD = "#b08a52";
const PHOTOS = 4;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.SITE_URL ?? url.origin;
  const person = url.searchParams.get("person");
  try {
    if (person) {
      const card = await personCard(person, origin);
      if (card) return card;
    }
    return await roomCard(origin);
  } catch (error) {
    if (error instanceof ApiUnavailableError) return Response.json({ message: "API 서버에 연결할 수 없습니다" }, { status: 503 });
    throw error;
  }
}

async function roomCard(origin: string) {
  const people = await getAllMissing();
  // 사진을 쓸 수 있는 FBI 공개 자료 중 최근 실종된 분부터
  const withPhoto = people
    .filter((p): p is MissingSummary & { thumbUrl: string } => p.source === "FBI" && !!p.thumbUrl)
    .sort((a, b) => (b.missingDate ?? "").localeCompare(a.missingDate ?? ""));
  // FBI 사이트가 자동 요청을 막을 때가 있어 몇 명을 한꺼번에 받아 보고, 사진이 없으면 이름 카드로 채움
  const candidates = withPhoto.slice(0, PHOTOS * 2);
  const photos = await Promise.all(candidates.map((p) => imageDataUrl(p.thumbUrl)));
  const loaded = candidates.flatMap((p, i) => (photos[i] ? [{ p, photo: photos[i] }] : []));
  const rest = candidates.filter((_, i) => !photos[i]).map((p) => ({ p, photo: null as string | null }));
  const faces = [...loaded, ...rest].slice(0, PHOTOS).map(({ p, photo }) => ({
    name: displayName(p.name),
    photo,
    when: p.missingDate ? `${formatMissingDate(p.missingDate)} 실종` : "",
    place: p.lastSeenPlace ?? "",
  }));
  const complete = faces.every((f) => f.photo);
  const qr = await qrDataUrl(`${origin}/missing`);
  const headline = ["지금도 집으로", "돌아오지 못한 분들이 있습니다"];
  const count = `${people.length.toLocaleString("ko-KR")}명`;
  const texts = [
    "MISSING",
    "실종방",
    ...headline,
    count,
    "의 실종자를 기억하고, 무사 귀가를 바라는 바람개비를 꽂습니다",
    "QR을 찍으면 실종방이 열립니다",
    "실종 신고 182 · 긴급 112",
    "Wishwind",
    ...faces.flatMap((f) => [f.name, f.when, f.place]),
  ];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: PAPER, padding: "56px 64px", fontFamily: "NotoSansKR" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 24, letterSpacing: 5, color: GOLD }}>MISSING</div>
            <div style={{ fontSize: 24, color: "#9a8a76" }}>· Wishwind 실종방</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 16, fontSize: 50, fontWeight: 700, lineHeight: 1.22, color: INK }}>
            <div style={{ display: "flex" }}>{headline[0]}</div>
            <div style={{ display: "flex" }}>{headline[1]}</div>
          </div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 26, color: MUTED }}>
            <span style={{ fontWeight: 700, color: "#c9873a" }}>{count}</span>
            <span>의 실종자를 기억하고, 무사 귀가를 바라는 바람개비를 꽂습니다</span>
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 34 }}>
            {faces.map((f) => (
              <div key={f.name} style={{ display: "flex", flexDirection: "column", width: 158 }}>
                {f.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.photo} width={158} height={196} style={{ borderRadius: 18, objectFit: "cover", border: "4px solid #fffaf2" }} alt="" />
                ) : (
                  // 사진을 못 받았을 때: 등불 색 카드에 실종 장소
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: 158, height: 196, borderRadius: 18, padding: 14, background: "linear-gradient(160deg, #fbe3b5, #e9a94f)", border: "4px solid #fffaf2" }}>
                    <div style={{ display: "flex", fontSize: 16, color: "#6b4f2a" }}>마지막 목격</div>
                    <div style={{ display: "flex", fontSize: 19, fontWeight: 700, color: "#4a3520", lineHeight: 1.3 }}>{clip(f.place || "확인 중", 24)}</div>
                  </div>
                )}
                <div style={{ display: "flex", marginTop: 10, fontSize: 18, fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>{clip(f.name, 16)}</div>
                <div style={{ display: "flex", fontSize: 16, color: "#9a8a76" }}>{f.when}</div>
              </div>
            ))}
          </div>
        </div>
        <QrColumn qr={qr} caption="QR을 찍으면 실종방이 열립니다" />
      </div>
    ),
    // 사진이 빠졌으면 조금 뒤 다시 만들어 보도록 짧게만 보관
    { width: W, height: H, fonts: await koreanFonts(texts.join("")), headers: complete ? cacheHeaders : shortCache },
  );
}

async function personCard(id: string, origin: string) {
  const data = await getMissing(id);
  if (!data || data.source !== "FBI") return null;
  const photo = (data.photoUrl ? await imageDataUrl(data.photoUrl) : null) ?? (data.thumbUrl ? await imageDataUrl(data.thumbUrl) : null);
  const qr = await qrDataUrl(`${origin}/missing?person=${encodeURIComponent(id)}`);
  const name = displayName(data.name);
  const missingOn = data.missingDate ? `${formatMissingDate(data.missingDate)} 실종` : "실종";
  const place = clip(data.lastSeenPlace ?? data.region, 40);
  const texts = ["MISSING", "이 분을 찾습니다", name, missingOn, "마지막으로 목격된 곳", place, "보셨다면 공식 창구로 알려 주세요", data.tip.label, "QR을 찍으면 실종방에서 자세히 볼 수 있습니다", `자료 출처: ${data.sourceLabel}`, "Wishwind"];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: PAPER, padding: "52px 60px", fontFamily: "NotoSansKR", gap: 44 }}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} width={400} height={526} style={{ borderRadius: 28, objectFit: "cover", border: "6px solid #fffaf2" }} alt="" />
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 24, letterSpacing: 5, color: GOLD }}>MISSING</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#c9873a" }}>이 분을 찾습니다</div>
          </div>
          <div style={{ display: "flex", marginTop: 18, fontSize: name.length > 16 ? 46 : 60, fontWeight: 700, lineHeight: 1.15, color: INK }}>{name}</div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 28, color: MUTED }}>{missingOn}</div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 22, fontWeight: 700, color: GOLD }}>마지막으로 목격된 곳</div>
          <div style={{ display: "flex", marginTop: 6, fontSize: 30, color: INK }}>{place}</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 26, padding: "18px 24px", borderRadius: 20, background: "#e9a94f", color: "white" }}>
            <div style={{ fontSize: 20 }}>보셨다면 공식 창구로 알려 주세요</div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 28, fontWeight: 700 }}>{clip(data.tip.label, 30)}</div>
          </div>
          <div style={{ flex: 1, display: "flex" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} width={110} height={110} style={{ borderRadius: 12, background: "white", padding: 8 }} alt="" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: INK }}>Wishwind</div>
              <div style={{ display: "flex", fontSize: 18, color: MUTED }}>QR을 찍으면 실종방에서 자세히 볼 수 있습니다</div>
              <div style={{ display: "flex", fontSize: 16, color: "#9a8a76" }}>{`자료 출처: ${data.sourceLabel}`}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts: await koreanFonts(texts.join("")), headers: photo ? cacheHeaders : shortCache },
  );
}

function QrColumn({ qr, caption }: { qr: string; caption: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", width: 210, marginLeft: 30 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} width={190} height={190} style={{ borderRadius: 16, background: "white", padding: 12 }} alt="" />
      <div style={{ display: "flex", marginTop: 14, fontSize: 16, color: MUTED, whiteSpace: "nowrap" }}>{caption}</div>
      <div style={{ display: "flex", marginTop: 20, fontSize: 18, fontWeight: 700, color: "#2f7469" }}>실종 신고 182 · 긴급 112</div>
      <div style={{ display: "flex", marginTop: 8, fontSize: 20, fontWeight: 700, color: INK }}>Wishwind</div>
    </div>
  );
}

const cacheHeaders = { "cache-control": "public, max-age=600, s-maxage=3600" };
const shortCache = { "cache-control": "public, max-age=60, s-maxage=60" };
