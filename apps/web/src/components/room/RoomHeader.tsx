import Link from "next/link";
import { getRoom, type RoomSlug } from "@/lib/rooms";

interface RoomHeaderProps {
  slug: RoomSlug;
}

export function RoomHeader({ slug }: RoomHeaderProps) {
  const room = getRoom(slug);
  const Icon = room.icon;

  return (
    <header className="border-b border-line pb-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-subtle transition-colors hover:text-foreground"
      >
        홈으로
      </Link>

      <div className="mt-10 flex items-center gap-4">
        <Icon aria-hidden className="size-8" style={{ color: room.accent }} />
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle">
            {room.subtitle}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{room.title}</h1>
        </div>
      </div>
      <p className="mt-4 text-muted">{room.description}</p>
    </header>
  );
}
