"use client";

import type { ReactNode } from "react";
import { motion, MotionConfig, type Variants } from "motion/react";
import { ROOMS } from "@/lib/rooms";
import { RoomCard } from "./RoomCard";

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

interface RoomGridProps {
  /** 서버에서 그려 넘기는 사건방 배지 (사건 수). 그리드를 다시 마운트하지 않도록 슬롯으로 받음 */
  casesBadge?: ReactNode;
}

export function RoomGrid({ casesBadge }: RoomGridProps) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.nav
        aria-label="방 목록"
        variants={gridVariants}
        initial="hidden"
        animate="show"
        className="grid w-full gap-x-5 gap-y-8 md:grid-cols-3"
      >
        {ROOMS.map((room) => (
          <RoomCard key={room.slug} room={room} badgeSlot={room.slug === "cases" ? casesBadge : undefined} />
        ))}
      </motion.nav>
    </MotionConfig>
  );
}
