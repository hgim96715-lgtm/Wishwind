/** 검색엔진·공유 미리보기에 쓰는 사이트 기본 정보. 배포 주소는 SITE_URL로 정함 */
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3001").replace(/\/+$/, "");
export const SITE_NAME = "Wishwind";
export const SITE_DESCRIPTION =
  "지난 사건을 함께 기억하고, 실종된 사람이 돌아오기를, 같은 일이 다시 없기를 바라는 곳입니다. 국내외 주요 사건 기록과 실종자 정보를 모았습니다.";
export const SITE_KEYWORDS = ["미제사건", "사건 기록", "실종자", "실종자 찾기", "사건 파일", "Wishwind", "위시윈드"];
