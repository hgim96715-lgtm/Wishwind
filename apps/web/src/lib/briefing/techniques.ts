export interface InvestigationTech {
  id: string;
  title: string;
  shortTitle: string;
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
    shortTitle: "유전자 계보 수사",
    definition: "DNA와 공개 계보 데이터를 연결해 수십 년 지난 장기 미제를 해결하는 기법",
    detail:
      "범죄 현장에서 채취한 DNA를 GEDmatch 같은 공개 계보 데이터베이스에 올려 먼 친척까지 추적한다. 2018년 골든 스테이트 킬러(Joseph James DeAngelo)가 이 방법으로 검거됐고, 그 이후 수십 건의 미제 살인·성폭력 사건이 같은 방식으로 해결됐다. 한국에서는 아직 법적 기반이 마련되지 않아 활용 사례가 없지만, 국제 공조 사건에서 간접 활용된다.",
    caseSlugs: ["golden-state-killer", "idaho-student-murders"],
  },
  {
    id: "age-progression",
    title: "아동 노화 시뮬레이션 (Age Progression)",
    shortTitle: "아동 노화 시뮬레이션",
    definition: "실종 당시 사진과 가족 얼굴 특징을 바탕으로 현재 모습을 추정해 실종 아동을 찾는 기술",
    detail:
      "실종 아동의 사진과 부모·형제 얼굴을 AI·법의학 미술로 합성해 10년, 20년 뒤 외모를 예측한다. 미국 국립실종착취아동센터(NCMEC)가 가장 적극적으로 활용하며, 이 기술로 수십 년 만에 발견된 아동 사례도 있다. 얼굴 뼈대 성장 패턴, 가족 유전형질이 핵심 데이터로 쓰인다.",
    link: { label: "실종자들의 정원", href: "/missing" },
    caseSlugs: ["madeleine-mccann-disappearance", "etan-patz-disappearance"],
  },
  {
    id: "forensic-art",
    title: "포렌식 미술 (얼굴 복원)",
    shortTitle: "포렌식 미술",
    definition: "신원 미상 유해의 두개골과 단서를 토대로 생전 얼굴을 복원해 신원을 확인하는 기법",
    detail:
      "법의인류학자가 두개골 형태·나이·성별·인종 정보를 분석하면, 포렌식 아티스트가 소프트 티슈 두께 기준표를 적용해 3D 조각이나 디지털 모델을 만든다. 완성된 얼굴을 공개하면 가족·지인이 신고해 신원이 확인되는 방식이다. DNA 채취가 어려운 오래된 유해에서 특히 유효하다.",
    caseSlugs: ["gilgo-beach-serial-killings"],
  },
  {
    id: "vicap-ngi",
    title: "ViCAP · 차세대 지문 시스템 (NGI)",
    shortTitle: "ViCAP · NGI",
    definition: "지역을 넘어 유사 사건 패턴과 지문을 대조해 연결 고리를 찾는 수사 데이터베이스",
    detail:
      "FBI의 ViCAP(폭력범죄 용의자 추적 프로그램)은 살인·납치 등 중범죄의 행동 패턴·물증을 전국 경찰이 공유하는 플랫폼이다. NGI(차세대 신원 확인 시스템)는 지문·홍채·얼굴을 통합해 조회한다. 연쇄 범죄자를 각각 다른 지역 사건과 연결하거나 오래된 미제를 현재 용의자와 연결할 때 사용된다.",
    caseSlugs: ["ted-bundy", "golden-state-killer"],
  },
  {
    id: "namus",
    title: "실종·신원 미상 통합 데이터베이스 (NamUs)",
    shortTitle: "NamUs 등 통합 DB",
    definition: "실종 신고와 신원 미상 기록을 교차 대조하는 공식 데이터베이스",
    detail:
      "미국 NamUs(National Missing and Unidentified Persons System)는 실종자 데이터와 신원 미상 유해 데이터를 같은 플랫폼에서 교차 검색한다. 가족이 직접 실종 신고를 등록하고, 의료검시관이 유해 정보를 올리면 시스템이 자동으로 연결 가능성을 제안한다. 한국의 경찰청 실종자 시스템·EPIS와 유사하지만, NamUs는 민간도 접근 가능하다는 점이 다르다.",
    link: { label: "실종자들의 정원", href: "/missing" },
    caseSlugs: ["gilgo-beach-serial-killings"],
  },
  {
    id: "forensic-dentistry",
    title: "치과 기록 매칭 (법치의학)",
    shortTitle: "치과 기록 매칭",
    definition: "오랜 시간이 지나도 변하지 않는 치아 치료 기록으로 신원을 확인하는 방법",
    detail:
      "치아 충전·보철·발치 패턴, X선 사진은 사람마다 고유해 DNA와 함께 가장 신뢰도 높은 신원 확인 수단으로 꼽힌다. 대형 재난 희생자 신원 확인(DVI)이나 오래된 유해 감식에 주로 쓰이며, 치과 기록이 보존돼 있다면 DNA보다 더 빠르게 결론을 낼 수 있다. 한국에서는 2003년 대구 지하철 참사 희생자 신원 확인에도 활용됐다.",
    caseSlugs: ["daegu-subway-fire", "september-11-attacks"],
  },
];
