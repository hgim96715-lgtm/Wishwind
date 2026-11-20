import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** 검색엔진에 공개 페이지만 보여 줌. 관리실·내 기록·로그인·API·개발용 주소는 제외 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/me", "/login", "/dev/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
