// children = 책장(/cases) 또는 전체 상세 페이지(/cases/[slug])
// modal = 책장 위에 겹쳐 뜨는 바텀 시트 (@modal 슬롯)
export default function CasesLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
