export type TechIcon = "dna" | "hourglass" | "brush" | "database" | "search" | "smile";

export interface InvestigationTech {
  id: string;
  title: string;
  shortTitle: string;
  /** 카드 위에 붙는 작은 분류 */
  badge: string;
  icon: TechIcon;
  definition: string;
  detail: string;
  link?: { label: string; href: string };
  /** 이 기술이 쓰였거나 이 기술로 이해할 수 있는 사건 (공개된 사건만 화면에 나옴) */
  caseSlugs: string[];
}

export const INVESTIGATION_TECHNIQUES: readonly InvestigationTech[] = [
  {
    id: "igg",
    title: "유전자 계보 수사 (IGG)",
    shortTitle: "유전자 계보(IGG)",
    badge: "DNA",
    icon: "dna",
    definition: "DNA와 공개 계보 데이터를 이어 수십 년 된 미제 사건의 범인을 찾는 방법입니다.",
    detail:
      "현장에서 나온 DNA를 계보 데이터베이스와 견주어 먼 친척을 찾고, 가계도를 거슬러 올라가 용의자를 좁힙니다. 2018년 골든 스테이트 킬러가 이 방법으로 체포된 뒤, 오래 묻혀 있던 사건들이 같은 방식으로 풀리고 있습니다. 보관된 증거물이 남아 있다면 몇십 년이 지나도 다시 시도할 수 있다는 점이 가장 큰 힘입니다.",
    caseSlugs: ["golden-state-killer", "jacqueline-dunleavy-murder"],
  },
  {
    id: "age-progression",
    title: "아동 노화 시뮬레이션 (Age Progression)",
    shortTitle: "아동 노화 시뮬레이션",
    badge: "실종 추적",
    icon: "hourglass",
    definition: "실종 당시 사진과 가족의 얼굴 특징으로 지금의 모습을 그려 보는 기술입니다.",
    detail:
      "실종 아동의 사진에 부모와 형제의 얼굴 특징을 더해, 10년 뒤와 20년 뒤의 모습을 추정합니다. 미국 국립실종착취아동센터(NCMEC)가 오랫동안 사용해 왔고, 얼굴 뼈대가 자라는 패턴과 가족에게서 이어진 특징이 핵심 자료가 됩니다. 사람들이 실종자를 다시 알아볼 수 있게 돕는 것이 목적입니다.",
    link: { label: "실종자들의 정원", href: "/missing" },
    caseSlugs: ["madeleine-mccann-disappearance", "etan-patz-disappearance"],
  },
  {
    id: "forensic-art",
    title: "포렌식 미술 (얼굴 복원)",
    shortTitle: "포렌식 미술",
    badge: "법의학",
    icon: "brush",
    definition: "신원을 알 수 없는 유해의 두개골로 생전 얼굴을 복원하는 기법입니다.",
    detail:
      "법의인류학자가 두개골에서 나이, 성별, 인종 같은 정보를 읽어 내면, 포렌식 아티스트가 조직 두께 기준을 적용해 얼굴을 3D 조각이나 디지털 모델로 만듭니다. 완성된 얼굴을 공개하면 가족이나 지인이 알아보고 연락해 오기도 합니다. DNA를 얻기 어려운 오래된 유해에서 특히 쓸모가 있습니다.",
    caseSlugs: ["gilgo-beach-serial-killings"],
  },
  {
    id: "vicap-ngi",
    title: "ViCAP · 차세대 지문 시스템 (NGI)",
    shortTitle: "ViCAP · NGI",
    badge: "데이터베이스",
    icon: "database",
    definition: "지역을 넘어 비슷한 사건의 패턴과 지문을 맞춰 보는 수사 데이터베이스입니다.",
    detail:
      "FBI의 ViCAP은 살인과 납치 같은 중범죄의 수법과 물증을 여러 지역의 경찰이 함께 보는 시스템입니다. NGI는 지문, 홍채, 얼굴을 한데 모아 조회합니다. 서로 다른 지역에서 일어난 사건을 한 사람과 잇거나, 오래된 미제 사건을 지금의 용의자와 연결할 때 쓰입니다.",
    caseSlugs: ["ted-bundy", "golden-state-killer"],
  },
  {
    id: "namus",
    title: "실종·신원 미상 통합 데이터베이스 (NamUs)",
    shortTitle: "NamUs",
    badge: "데이터베이스",
    icon: "search",
    definition: "실종 신고와 신원 미상 기록을 한곳에서 맞춰 보는 공식 데이터베이스입니다.",
    detail:
      "미국의 NamUs는 실종자 정보와 신원 미상 유해 정보를 같은 곳에서 함께 검색할 수 있게 한 시스템입니다. 가족이 실종 신고를 직접 올릴 수 있고, 검시 기관이 유해 정보를 올리면 서로 닮은 기록을 이어 줍니다. 우리나라의 경찰청 실종자 시스템과 비슷하지만, 일반인도 접근할 수 있다는 점이 다릅니다.",
    link: { label: "실종자들의 정원", href: "/missing" },
    caseSlugs: ["gilgo-beach-serial-killings"],
  },
  {
    id: "forensic-dentistry",
    title: "치과 기록 매칭 (법치의학)",
    shortTitle: "치과 기록 매칭",
    badge: "법의학",
    icon: "smile",
    definition: "오래 지나도 변하지 않는 치아 치료 기록으로 신원을 확인하는 방법입니다.",
    detail:
      "치아의 충전물, 보철, 발치 자국과 치과 X선 사진은 사람마다 달라서, DNA와 함께 가장 믿을 만한 신원 확인 수단으로 꼽힙니다. 대형 재난의 희생자나 오래된 유해를 확인할 때 주로 쓰이고, 치과 기록이 남아 있으면 DNA보다 빠르게 결론이 나기도 합니다. 2003년 대구 지하철 참사의 희생자 신원 확인에도 활용되었습니다.",
    caseSlugs: ["daegu-subway-fire", "september-11-attacks"],
  },
];
