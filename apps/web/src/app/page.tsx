import { LuSearch } from "react-icons/lu";
import { RoomGrid } from "@/components/home/RoomGrid";

// 서버 컴포넌트. 정적인 텍스트는 서버에서 HTML로 내려가고,
// 애니메이션이 필요한 카드 영역(RoomGrid)만 클라이언트 번들에 포함됨
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-20">
      <section className="mb-14">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
          <LuSearch aria-hidden className="size-3.5" />
          Cold Cases 수사 노트
        </span>
        <h1 className="mt-5 text-4xl font-bold leading-snug tracking-tight md:text-5xl md:leading-tight">
          오늘은 어떤 단서를
          <br />
          따라가 볼까요?
        </h1>
        <p className="mt-5 max-w-xl leading-7 text-muted">
          풀리지 않은 사건, 아직 찾고 있는 사람들, 새로 들어온 소식까지.
          파일을 하나씩 열어 보며 편하게 둘러보세요. 작은 관심이 모이면 그게
          또 하나의 단서가 됩니다.
        </p>
      </section>

      <RoomGrid />
    </main>
  );
}
