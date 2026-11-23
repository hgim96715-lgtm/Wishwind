import type { RoomSlug } from "@/lib/rooms";

/** 사건방: 국가별 책장의 책등 몇 권 */
function Books() {
  const books = [
    { x: 4, w: 9, h: 40, o: 0.85 },
    { x: 15, w: 7, h: 34, o: 0.5 },
    { x: 24, w: 10, h: 44, o: 0.7 },
    { x: 36, w: 8, h: 38, o: 0.35 },
  ];
  return (
    <svg viewBox="0 0 64 52" className="h-12 w-16" aria-hidden>
      {books.map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={48 - b.h} width={b.w} height={b.h} rx={1.5} fill="var(--accent)" fillOpacity={b.o} />
          <rect x={b.x + 1.5} y={48 - b.h + 5} width={b.w - 3} height={1.5} fill="#fffaf2" fillOpacity={0.7} />
        </g>
      ))}
      {/* 기대어 놓인 한 권 */}
      <rect x={47} y={12} width={8} height={36} rx={1.5} fill="var(--accent)" fillOpacity={0.6} transform="rotate(14 51 48)" />
      <rect x={1} y={48} width={62} height={2.5} rx={1} fill="var(--accent)" fillOpacity={0.3} />
    </svg>
  );
}

/** 실종자들의 정원: 천천히 도는 바람개비. 마우스를 올리면 조금 빨라지고, 움직임 줄이기 설정이면 멈춤 */
function Pinwheel() {
  return (
    <svg viewBox="0 0 52 56" className="h-12 w-11" aria-hidden>
      <rect x={25} y={26} width={2.2} height={29} rx={1.1} fill="var(--accent)" fillOpacity={0.5} />
      <g className="origin-[26px_26px] motion-safe:animate-[spin_9s_linear_infinite] motion-safe:group-hover:animate-[spin_3.5s_linear_infinite]">
        {[0, 90, 180, 270].map((deg, i) => (
          <path
            key={deg}
            d="M26 26 L26 5 Q38 6 42 16 Z"
            fill="var(--accent)"
            fillOpacity={i % 2 ? 0.45 : 0.85}
            transform={`rotate(${deg} 26 26)`}
          />
        ))}
        <circle cx={26} cy={26} r={2.6} fill="#fffaf2" stroke="var(--accent)" strokeWidth={1.2} />
      </g>
    </svg>
  );
}

/** 브리핑룸: 접힌 신문 한 장 */
function Newspaper() {
  return (
    <svg viewBox="0 0 60 50" className="h-12 w-14" aria-hidden>
      <path d="M8 8 h40 a2 2 0 0 1 2 2 v32 a3 3 0 0 1 -3 3 H11 a3 3 0 0 1 -3 -3 Z" fill="#fffaf2" stroke="var(--accent)" strokeOpacity={0.5} strokeWidth={1.5} />
      <path d="M50 16 h4 v26 a3 3 0 0 1 -3 3 h-4" fill="none" stroke="var(--accent)" strokeOpacity={0.4} strokeWidth={1.5} />
      <rect x={13} y={13} width={30} height={4} rx={1} fill="var(--accent)" fillOpacity={0.8} />
      <rect x={13} y={21} width={13} height={11} rx={1} fill="var(--accent)" fillOpacity={0.3} />
      {[21, 25, 29].map((y) => (
        <rect key={y} x={29} y={y} width={14} height={1.6} rx={0.8} fill="var(--accent)" fillOpacity={0.45} />
      ))}
      {[35, 39].map((y) => (
        <rect key={y} x={13} y={y} width={30} height={1.6} rx={0.8} fill="var(--accent)" fillOpacity={0.35} />
      ))}
    </svg>
  );
}

/** 홈 방 카드의 작은 표식. 방마다 그 방을 닮은 그림 */
export function RoomEmblem({ slug }: { slug: RoomSlug }) {
  if (slug === "cases") return <Books />;
  if (slug === "missing") return <Pinwheel />;
  return <Newspaper />;
}
