import { ImageResponse } from "next/og";
import { ApiUnavailableError } from "@/lib/cases/api";
import { getAllMissing, getMissing } from "@/lib/missing/api";
import { formatMissingDate } from "@/lib/missing/regions";
import type { MissingSummary } from "@/lib/missing/types";
import { BRAND, BrandHeader, loadBrand, PinwheelMark } from "@/lib/og/brand";
import { clip, displayName, imageDataUrl, koreanFonts, qrDataUrl } from "@/lib/og/helpers";

/**
 * 실종자들의 정원 링크를 메신저·SNS에 붙였을 때 보이는 미리보기 이미지 (1200×630). Wishwind 로고·바람개비·로고 색으로 꾸밈
 * - 기본: 지금 찾고 있는 분들의 사진 몇 장 + 인원 수 + 실종자들의 정원 QR
 * - ?person=id: 그 분의 이름·실종일·장소·제보처 + QR
 *   FBI 자료는 사진도 넣고, 국내(경찰청 안전Dream) 자료는 사진 이용 조건 확인 전이라 사진 대신 '182' 신고 안내를 크게 넣음
 */
const W = 1200;
const H = 630;
const PHOTOS = 4;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.SITE_URL ?? url.origin;
  const person = url.searchParams.get("person");
  try {
    const brand = await loadBrand(url.origin);
    if (person) {
      const card = await personCard(person, origin, brand);
      if (card) return card;
    }
    return await roomCard(origin, brand);
  } catch (error) {
    if (error instanceof ApiUnavailableError) return Response.json({ message: "API 서버에 연결할 수 없습니다" }, { status: 503 });
    throw error;
  }
}

type Brand = Awaited<ReturnType<typeof loadBrand>>;

function Canvas({ brand, children }: { brand: Brand; children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative", background: BRAND.paper, padding: "40px 56px 44px", fontFamily: "NotoSansKR", overflow: "hidden" }}>
      <PinwheelMark icon={brand.icon} size={420} right={-110} bottom={-120} opacity={0.12} />
      {children}
    </div>
  );
}

async function roomCard(origin: string, brand: Brand) {
  const people = await getAllMissing();
  // 사진을 쓸 수 있는 FBI 공개 자료 중 최근 실종된 분부터
  const withPhoto = people
    .filter((p): p is MissingSummary & { thumbUrl: string } => p.source === "FBI" && !!p.thumbUrl)
    .sort((a, b) => (b.missingDate ?? "").localeCompare(a.missingDate ?? ""));
  // FBI 사이트가 자동 요청을 막을 때가 있어 몇 명을 한꺼번에 받아 보고, 사진이 없으면 장소 카드로 채움
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
    "실종자들의 정원",
    ...headline,
    count,
    "을 기억하며, 무사 귀가를 바라는 바람개비를 꽂습니다",
    "마지막 목격",
    "확인 중",
    "QR을 찍으면 실종자들의 정원이 열립니다",
    "실종 신고 182 · 긴급 112",
    "Wishwind",
    ...faces.flatMap((f) => [f.name, f.when, f.place]),
  ];

  return new ImageResponse(
    (
      <Canvas brand={brand}>
        <BrandHeader logo={brand.logo} tag="실종자들의 정원" />
        <div style={{ display: "flex", flex: 1, marginTop: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 46, fontWeight: 700, lineHeight: 1.22, color: BRAND.ink }}>
              <div style={{ display: "flex" }}>{headline[0]}</div>
              <div style={{ display: "flex" }}>{headline[1]}</div>
            </div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 24, color: BRAND.muted }}>
              <span style={{ fontWeight: 700, color: BRAND.orange }}>{count}</span>
              <span>을 기억하며, 무사 귀가를 바라는 바람개비를 꽂습니다</span>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
              {faces.map((f) => (
                <div key={f.name} style={{ display: "flex", flexDirection: "column", width: 150 }}>
                  {f.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.photo} width={150} height={180} style={{ borderRadius: 18, objectFit: "cover", border: `4px solid ${BRAND.card}` }} alt="" />
                  ) : (
                    // 사진을 못 받았을 때: 바다·하늘 색 카드에 마지막 목격 장소
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: 150, height: 180, borderRadius: 18, padding: 14, background: `linear-gradient(165deg, ${BRAND.sky}, #8fc1c9 60%, ${BRAND.teal})`, border: `4px solid ${BRAND.card}` }}>
                      <div style={{ display: "flex", fontSize: 15, color: "#eaf5f3" }}>마지막 목격</div>
                      <div style={{ display: "flex", fontSize: 18, fontWeight: 700, color: "white", lineHeight: 1.3 }}>{clip(f.place || "확인 중", 24)}</div>
                    </div>
                  )}
                  <div style={{ display: "flex", marginTop: 8, fontSize: 17, fontWeight: 700, color: BRAND.ink, whiteSpace: "nowrap" }}>{clip(f.name, 16)}</div>
                  <div style={{ display: "flex", fontSize: 15, color: BRAND.subtle }}>{f.when}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", width: 220, marginLeft: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} width={180} height={180} style={{ borderRadius: 18, background: "white", padding: 12, border: `3px solid ${BRAND.tealSoft}` }} alt="" />
            <div style={{ display: "flex", marginTop: 12, fontSize: 16, color: BRAND.muted, whiteSpace: "nowrap" }}>QR을 찍으면 실종자들의 정원이 열립니다</div>
            <div style={{ display: "flex", marginTop: 14, padding: "6px 16px", borderRadius: 999, background: BRAND.teal, color: "white", fontSize: 17, fontWeight: 700 }}>
              실종 신고 182 · 긴급 112
            </div>
          </div>
        </div>
      </Canvas>
    ),
    // 사진이 빠졌으면 조금 뒤 다시 만들어 보도록 짧게만 보관
    { width: W, height: H, fonts: await koreanFonts(texts.join("")), headers: complete ? cacheHeaders : shortCache },
  );
}

async function personCard(id: string, origin: string, brand: Brand) {
  const data = await getMissing(id);
  if (!data) return null;
  const domestic = data.source === "SAFE182";
  const photo = domestic ? null : ((data.photoUrl ? await imageDataUrl(data.photoUrl) : null) ?? (data.thumbUrl ? await imageDataUrl(data.thumbUrl) : null));
  const qr = await qrDataUrl(`${origin}/missing?person=${encodeURIComponent(id)}`);
  const name = displayName(data.name);
  const age = data.ageAtMissing != null ? ` · 실종 당시 ${data.ageAtMissing}세` : "";
  const missingOn = `${data.missingDate ? `${formatMissingDate(data.missingDate)} 실종` : "실종"}${domestic ? age : ""}`;
  const place = clip(data.lastSeenPlace ?? data.region, 40);
  const texts = ["이 분을 찾습니다", "실종 신고", "182", "긴급할 때는 112", name, missingOn, "마지막으로 목격된 곳", place, "보셨다면 공식 창구로 알려 주세요", data.tip.label, "QR을 찍으면 실종자들의 정원에서 자세히 볼 수 있습니다", `자료 출처: ${data.sourceLabel}`, "Wishwind"];

  return new ImageResponse(
    (
      <Canvas brand={brand}>
        <BrandHeader logo={brand.logo} tag="이 분을 찾습니다" />
        <div style={{ display: "flex", flex: 1, marginTop: 22, gap: 40 }}>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} width={340} height={440} style={{ borderRadius: 28, objectFit: "cover", border: `6px solid ${BRAND.card}` }} alt="" />
          )}
          {domestic && (
            // 국내 자료는 사진 대신 182 안내: 로고의 바다색 카드 위에 바람개비
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative", width: 320, height: 440, borderRadius: 28, background: `linear-gradient(165deg, #3f8a7f, ${BRAND.tealDark})`, border: `6px solid ${BRAND.card}`, color: "white", overflow: "hidden" }}>
              {brand.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.icon} width={96} height={96} style={{ marginBottom: 6 }} alt="" />
              )}
              <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#d8ece7" }}>실종 신고</div>
              <div style={{ display: "flex", fontSize: 128, fontWeight: 700, lineHeight: 1.05 }}>182</div>
              <div style={{ display: "flex", marginTop: 12, padding: "6px 16px", borderRadius: 999, background: "rgba(255,255,255,0.16)", fontSize: 20, fontWeight: 700 }}>긴급할 때는 112</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: name.length > 16 ? 44 : 58, fontWeight: 700, lineHeight: 1.15, color: BRAND.ink }}>{name}</div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 26, color: BRAND.muted }}>{missingOn}</div>
            <div style={{ display: "flex", marginTop: 22, fontSize: 20, fontWeight: 700, color: BRAND.teal }}>마지막으로 목격된 곳</div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 28, color: BRAND.ink }}>{place}</div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 22, padding: "16px 22px", borderRadius: 20, background: BRAND.orangeSoft, border: `2px solid #f2c9aa` }}>
              <div style={{ display: "flex", fontSize: 19, color: "#9a5a33" }}>보셨다면 공식 창구로 알려 주세요</div>
              <div style={{ display: "flex", marginTop: 2, fontSize: 27, fontWeight: 700, color: "#7a3f1f" }}>{clip(data.tip.label, 30)}</div>
            </div>
            <div style={{ flex: 1, display: "flex" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} width={104} height={104} style={{ borderRadius: 12, background: "white", padding: 8, border: `2px solid ${BRAND.tealSoft}` }} alt="" />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 18, color: BRAND.muted }}>QR을 찍으면 실종자들의 정원에서 자세히 볼 수 있습니다</div>
                <div style={{ display: "flex", marginTop: 2, fontSize: 15, color: BRAND.subtle }}>{`자료 출처: ${data.sourceLabel}`}</div>
              </div>
            </div>
          </div>
        </div>
      </Canvas>
    ),
    { width: W, height: H, fonts: await koreanFonts(texts.join("")), headers: photo || domestic ? cacheHeaders : shortCache },
  );
}

const cacheHeaders = { "cache-control": "public, max-age=600, s-maxage=3600" };
const shortCache = { "cache-control": "public, max-age=60, s-maxage=60" };
