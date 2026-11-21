import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * 검색엔진에 공개 페이지만 보여 줌. 관리실·내 기록·로그인·API·개발용 주소는 제외.
 * 단, 링크 미리보기 이미지(/api/og/)와 전단지(/api/flyer/)는 메신저·SNS가 가져갈 수 있게 열어 둠
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/api/og/", "/api/flyer/"], disallow: ["/admin", "/api/", "/me", "/login", "/dev/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
