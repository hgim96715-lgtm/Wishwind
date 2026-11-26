import type { IconType } from "react-icons";
import { LuFolderSearch, LuClipboardList, LuUserRoundSearch } from "react-icons/lu";

export type RoomSlug = "cases" | "missing" | "briefing";

export interface Room {
  slug: RoomSlug;
  href: `/${RoomSlug}`;
  title: string;
  subtitle: string;
  description: string;
  icon: IconType;
  accent: string;
  /** 방 카드에 표시할 성격 배지 */
  badge: string;
}

export const ROOMS: readonly Room[] = [
  {
    slug: "cases",
    href: "/cases",
    title: "사건방",
    subtitle: "Case Files",
    description: "끝난 사건과 미제 사건을 함께 살펴보는 곳",
    icon: LuFolderSearch,
    accent: "#c46a4b",
    badge: "미제부터 종결까지",
  },
  {
    slug: "missing",
    href: "/missing",
    title: "실종자들의 정원",
    subtitle: "Missing Persons",
    description: "지금도 누군가 기다리고 있는 사람들의 이야기",
    icon: LuUserRoundSearch,
    accent: "#3f8f84",
    badge: "3D 바람개비 정원",
  },
  {
    slug: "briefing",
    href: "/briefing",
    title: "브리핑룸",
    subtitle: "Briefing Room",
    description: "새 소식, 사건 변경, 사람들의 생각을 한눈에 모아 보는 곳",
    icon: LuClipboardList,
    accent: "#4f78a8",
    badge: "새 소식 · 공지",
  },
] as const;

export function getRoom(slug: RoomSlug): Room {
  const room = ROOMS.find((r) => r.slug === slug);
  if (!room) throw new Error(`Unknown room: ${slug}`);
  return room;
}
