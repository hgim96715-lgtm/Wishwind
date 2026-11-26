/** 검색엔진·공유 미리보기에 쓰는 사이트 기본 정보. 배포 주소는 SITE_URL로 정함 */
// SITE_URL을 안 정했으면 Vercel 배포 주소(VERCEL_PROJECT_PRODUCTION_URL)를 쓰고, 둘 다 없을 때만 로컬 주소
export const SITE_URL = (
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3001")
).replace(/\/+$/, "");
export const SITE_NAME = "Wishwind";
export const SITE_DESCRIPTION =
  "지난 사건을 함께 기억하고, 실종자가 돌아오길, 같은 일이 다시 없기를 바라는 곳입니다.";
export const SITE_KEYWORDS = ["미제사건", "사건 기록", "실종자", "실종자 찾기", "사건 파일", "Wishwind", "위시윈드"];
/** 공식 인스타그램 (홈 아래 링크, 검색엔진 sameAs) */
export const INSTAGRAM_URL = "https://www.instagram.com/wishwind.official/";
