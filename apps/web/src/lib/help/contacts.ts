/**
 * 도움받는 곳(신고·상담 번호). 공식 기관·정부 자료로 확인한 번호만 넣음.
 * 번호를 더하거나 바꿀 때는 sourceUrl과 verifiedAt도 함께 고침.
 */
export type HelpCountry = "KR" | "US" | "GB" | "JP";

export type HelpSituation =
  | "danger"
  | "missing"
  | "child-abuse"
  | "violence"
  | "mind"
  | "school"
  | "elder-disability"
  | "digital-sex-crime"
  | "victim-support";

export interface HelpContact {
  id: string;
  country: HelpCountry;
  situations: HelpSituation[];
  /** 화면에 보이는 번호 */
  number: string;
  /** tel: 링크에 쓰는 번호 (숫자만) */
  tel: string;
  name: string;
  /** 이럴 때 연락합니다 */
  what: string;
  hours?: string;
  /** 전화 말고 연락하는 방법 (문자·온라인 등) */
  channels?: string[];
  sourceUrl: string;
  verifiedAt: string;
}

export const HELP_VERIFIED_AT = "2026-11-19";
const v = HELP_VERIFIED_AT;

export const HELP_CONTACTS: HelpContact[] = [
  // 한국
  {
    id: "kr-112",
    country: "KR",
    situations: ["danger", "missing", "child-abuse", "violence", "elder-disability"],
    number: "112",
    tel: "112",
    name: "경찰",
    what: "범죄·긴급 상황 신고. 아동학대, 노인학대, 가정폭력, 실종 신고도 112로 할 수 있습니다.",
    hours: "24시간",
    channels: ["문자 112: 이름, 장소, 이유를 적어 보냅니다.", "말하기 어려우면 112에 전화한 뒤 아무 숫자 버튼을 누릅니다(똑똑112)."],
    sourceUrl: "https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/promotion/1308237_1118.html",
    verifiedAt: v,
  },
  {
    id: "kr-182",
    country: "KR",
    situations: ["missing"],
    number: "182",
    tel: "182",
    name: "경찰청 실종아동찾기센터",
    what: "실종아동 등(아동, 지적·자폐성·정신장애인, 치매환자)의 실종 신고와 제보. 성인이 사라졌다면 112로 신고합니다.",
    channels: ["온라인: safe182.go.kr"],
    sourceUrl: "https://www.wikitree.co.kr/articles/1169101",
    verifiedAt: v,
  },
  {
    id: "kr-109",
    country: "KR",
    situations: ["mind"],
    number: "109",
    tel: "109",
    name: "자살예방 상담전화",
    what: "죽고 싶다는 생각이 들 때, 마음이 너무 힘들 때 이야기를 들어 줍니다. 가족이나 친구가 걱정될 때도 상담할 수 있습니다.",
    hours: "24시간",
    sourceUrl: "https://m.korea.kr/briefing/actuallyView.do?newsId=148975768",
    verifiedAt: v,
  },
  {
    id: "kr-1366",
    country: "KR",
    situations: ["violence", "victim-support"],
    number: "1366",
    tel: "1366",
    name: "여성긴급전화",
    what: "가정폭력, 성폭력, 스토킹 등 피해 긴급 상담과 보호시설·의료·법률 지원 연결.",
    hours: "365일 24시간",
    sourceUrl: "https://www.mogef.go.kr/sp/hrp/sp_hrp_f004.do",
    verifiedAt: v,
  },
  {
    id: "kr-1388",
    country: "KR",
    situations: ["mind", "school", "violence"],
    number: "1388",
    tel: "1388",
    name: "청소년상담",
    what: "만 9~24세 청소년의 고민, 위기 상담. 집·학교·친구 문제 무엇이든 이야기할 수 있습니다.",
    hours: "24시간",
    channels: ["문자 #1388", "카카오톡 #1388"],
    sourceUrl: "https://khan.co.kr/article/202609231453001",
    verifiedAt: v,
  },
  {
    id: "kr-117",
    country: "KR",
    situations: ["school"],
    number: "117",
    tel: "117",
    name: "학교폭력 신고·상담",
    what: "학교폭력을 당했거나 봤을 때 신고하고 상담받습니다.",
    channels: ["문자 #0117"],
    sourceUrl: "https://m.korea.kr/news/policyNewsView.do?newsId=148896149",
    verifiedAt: v,
  },
  {
    id: "kr-1577-1389",
    country: "KR",
    situations: ["elder-disability"],
    number: "1577-1389",
    tel: "15771389",
    name: "노인학대 상담",
    what: "어르신 학대가 의심될 때 상담합니다. 급한 신고는 112로 합니다.",
    hours: "24시간",
    sourceUrl: "https://www.kbmaeil.com/article/20260602500203",
    verifiedAt: v,
  },
  {
    id: "kr-1644-8295",
    country: "KR",
    situations: ["elder-disability"],
    number: "1644-8295",
    tel: "16448295",
    name: "장애인권익옹호기관",
    what: "장애인 학대가 의심될 때 상담하고 신고합니다.",
    sourceUrl: "https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/promotion/1308237_1118.html",
    verifiedAt: v,
  },
  {
    id: "kr-d4u",
    country: "KR",
    situations: ["digital-sex-crime"],
    number: "02-735-8994",
    tel: "027358994",
    name: "디지털성범죄피해자지원센터",
    what: "불법 촬영, 유포, 협박 등 디지털 성범죄 피해 상담과 피해 영상 삭제 지원.",
    channels: ["온라인 게시판: d4u.stop.or.kr"],
    sourceUrl: "https://m.korea.kr/news/policyNewsView.do?newsId=148933267",
    verifiedAt: v,
  },
  {
    id: "kr-132",
    country: "KR",
    situations: ["victim-support"],
    number: "132",
    tel: "132",
    name: "대한법률구조공단",
    what: "범죄·가정폭력 피해자의 법률 상담. 어떤 절차를 밟을 수 있는지 안내받을 수 있습니다.",
    sourceUrl: "https://www.mogef.go.kr/sp/hrp/sp_hrp_f004.do",
    verifiedAt: v,
  },

  // 미국
  {
    id: "us-911",
    country: "US",
    situations: ["danger"],
    number: "911",
    tel: "911",
    name: "Emergency",
    what: "긴급 상황 신고 (경찰·소방·구급).",
    sourceUrl: "https://www.cdc.gov/mental-health/caring/index.html",
    verifiedAt: v,
  },
  {
    id: "us-988",
    country: "US",
    situations: ["mind"],
    number: "988",
    tel: "988",
    name: "988 Suicide & Crisis Lifeline",
    what: "자살 위기, 마음의 위기 상담.",
    hours: "24시간",
    channels: ["문자 988", "988lifeline.org"],
    sourceUrl: "https://www.cdc.gov/mental-health/caring/index.html",
    verifiedAt: v,
  },
  {
    id: "us-ncmec",
    country: "US",
    situations: ["missing"],
    number: "1-800-843-5678",
    tel: "18008435678",
    name: "NCMEC (실종·착취 아동센터)",
    what: "미국 내 아동 실종 신고와 제보.",
    sourceUrl: "https://ovc.ojp.gov/help-for-victims/toll-free-and-online-hotlines",
    verifiedAt: v,
  },
  {
    id: "us-childhelp",
    country: "US",
    situations: ["child-abuse"],
    number: "1-800-422-4453",
    tel: "18004224453",
    name: "Childhelp",
    what: "아동학대 상담과 신고 안내.",
    hours: "24시간",
    sourceUrl: "https://ovc.ojp.gov/help-for-victims/toll-free-and-online-hotlines",
    verifiedAt: v,
  },
  {
    id: "us-ndvh",
    country: "US",
    situations: ["violence"],
    number: "1-800-799-7233",
    tel: "18007997233",
    name: "National Domestic Violence Hotline",
    what: "가정폭력 피해 상담.",
    channels: ["문자: START를 88788로"],
    sourceUrl: "https://ovc.ojp.gov/help-for-victims/toll-free-and-online-hotlines",
    verifiedAt: v,
  },
  {
    id: "us-rainn",
    country: "US",
    situations: ["violence"],
    number: "1-800-656-4673",
    tel: "18006564673",
    name: "RAINN (성폭력 상담)",
    what: "성폭력 피해 상담.",
    hours: "24시간",
    channels: ["온라인 채팅: hotline.rainn.org/online"],
    sourceUrl: "https://ovc.ojp.gov/help-for-victims/toll-free-and-online-hotlines",
    verifiedAt: v,
  },

  // 영국
  {
    id: "gb-999",
    country: "GB",
    situations: ["danger"],
    number: "999",
    tel: "999",
    name: "Emergency",
    what: "긴급 상황 신고. 급하지 않은 경찰 상담은 101.",
    sourceUrl: "https://crimestoppers-uk.org/give-information/useful-numbers-and-links",
    verifiedAt: v,
  },
  {
    id: "gb-101",
    country: "GB",
    situations: ["danger", "missing"],
    number: "101",
    tel: "101",
    name: "Police (non-emergency)",
    what: "급하지 않은 경찰 신고·상담.",
    sourceUrl: "https://crimestoppers-uk.org/give-information/useful-numbers-and-links",
    verifiedAt: v,
  },
  {
    id: "gb-missing-people",
    country: "GB",
    situations: ["missing"],
    number: "116 000",
    tel: "116000",
    name: "Missing People",
    what: "실종자 가족 상담, 집을 떠난 사람의 연락 창구.",
    hours: "전화 10~17시, 문자 10~22시",
    sourceUrl: "https://www.missingpeople.org.uk/talk-to-us",
    verifiedAt: v,
  },
  {
    id: "gb-samaritans",
    country: "GB",
    situations: ["mind"],
    number: "116 123",
    tel: "116123",
    name: "Samaritans",
    what: "마음이 힘들 때 이야기를 들어 주는 상담.",
    sourceUrl: "https://crimestoppers-uk.org/give-information/useful-numbers-and-links",
    verifiedAt: v,
  },
  {
    id: "gb-nspcc",
    country: "GB",
    situations: ["child-abuse"],
    number: "0808 800 5000",
    tel: "08088005000",
    name: "NSPCC",
    what: "아동이 걱정되는 어른을 위한 상담.",
    sourceUrl: "https://crimestoppers-uk.org/give-information/useful-numbers-and-links",
    verifiedAt: v,
  },
  {
    id: "gb-childline",
    country: "GB",
    situations: ["child-abuse", "mind"],
    number: "0800 1111",
    tel: "08001111",
    name: "Childline",
    what: "아이들이 직접 거는 상담 전화.",
    sourceUrl: "https://crimestoppers-uk.org/give-information/useful-numbers-and-links",
    verifiedAt: v,
  },

  // 일본
  {
    id: "jp-189",
    country: "JP",
    situations: ["child-abuse"],
    number: "189",
    tel: "189",
    name: "児童相談所 虐待対応ダイヤル",
    what: "아동학대 신고·상담 (가까운 아동상담소로 연결). 일부 IP 전화로는 걸리지 않습니다.",
    hours: "24시간",
    sourceUrl: "https://kodomoshien.cfa.go.jp/no-gyakutai/",
    verifiedAt: v,
  },
  {
    id: "jp-sos",
    country: "JP",
    situations: ["school", "mind"],
    number: "0120-0-78310",
    tel: "0120078310",
    name: "24時間子供SOSダイヤル",
    what: "아이들의 고민·괴롭힘 상담.",
    hours: "24시간",
    sourceUrl: "https://kodomoshien.cfa.go.jp/no-gyakutai/",
    verifiedAt: v,
  },
];

export const SITUATIONS: { key: HelpSituation; title: string; lead: string }[] = [
  { key: "danger", title: "지금 위험해요", lead: "망설이지 말고 바로 신고합니다." },
  { key: "missing", title: "사람이 사라졌어요", lead: "시간이 지날수록 찾기 어려워집니다. 기다리지 말고 바로 신고합니다." },
  { key: "child-abuse", title: "학대를 봤거나 겪고 있어요", lead: "확실하지 않아도 괜찮습니다. 의심된다면 알려 주세요." },
  { key: "violence", title: "폭력·성폭력·스토킹", lead: "혼자 견디지 않아도 됩니다. 상담부터 시작할 수 있습니다." },
  { key: "mind", title: "마음이 너무 힘들어요", lead: "말로 꺼내는 것만으로도 조금 가벼워질 수 있습니다." },
  { key: "school", title: "학교폭력", lead: "당한 사람도, 본 사람도 연락할 수 있습니다." },
  { key: "elder-disability", title: "어르신·장애인 학대", lead: "스스로 알리기 어려운 분들이라 주변의 관심이 꼭 필요합니다." },
  { key: "digital-sex-crime", title: "디지털 성범죄", lead: "영상 삭제부터 상담까지 도움을 받을 수 있습니다." },
  { key: "victim-support", title: "범죄 피해 뒤 도움", lead: "피해 뒤에도 법률·생활 지원을 받을 수 있습니다." },
];

export const COUNTRY_NAME: Record<HelpCountry, string> = { KR: "한국", US: "미국", GB: "영국", JP: "일본" };

export function contactsFor(situation: HelpSituation, country: HelpCountry = "KR") {
  return HELP_CONTACTS.filter((c) => c.country === country && c.situations.includes(situation));
}

export function contactById(id: string) {
  return HELP_CONTACTS.find((c) => c.id === id);
}
