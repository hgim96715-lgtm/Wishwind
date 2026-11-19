import type { IconType } from "react-icons";
import { LuFolderSearch, LuClipboardList, LuUserRoundSearch } from "react-icons/lu";

/**
 * 홈에서 들어갈 수 있는 "방" 목록.
 * 방을 추가하려면 여기에 한 줄 넣고 같은 slug로 app/<slug>/page.tsx를 만들면 됨.
 */
export type RoomSlug = "cases" | "missing" | "briefing";

export interface Room {
  slug: RoomSlug;
  href: `/${RoomSlug}`;
  title: string;
  subtitle: string;
  description: string;
  icon: IconType;
  /** 방마다 쓰는 포인트 색. 아이콘 배경·호버 테두리에 씀. 밝은 배경에서 부드럽게 보이는 중간 채도 */
  accent: string;
}

export const ROOMS: readonly Room[] = [
  {
    slug: "cases",
    href: "/cases",
    title: "사건방",
    subtitle: "Case Files",
    description: "해결된 사건과 미제 사건을 함께 살펴보는 곳",
    icon: LuFolderSearch,
    accent: "#c46a4b",
  },
  {
    slug: "missing",
    href: "/missing",
    title: "실종방",
    subtitle: "Missing Persons",
    description: "지금도 누군가 기다리고 있는 사람들의 이야기",
    icon: LuUserRoundSearch,
    accent: "#3f8f84",
  },
  {
    slug: "briefing",
    href: "/briefing",
    title: "브리핑룸",
    subtitle: "Briefing Room",
    description: "새 소식, 사건 변경, 사람들의 생각을 한눈에 모아 보는 곳",
    icon: LuClipboardList,
    accent: "#4f78a8",
  },
] as const;

export function getRoom(slug: RoomSlug): Room {
  const room = ROOMS.find((r) => r.slug === slug);
  if (!room) throw new Error(`Unknown room: ${slug}`);
  return room;
}
