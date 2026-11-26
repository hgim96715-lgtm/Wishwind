"use client";

import { motion, MotionConfig, type Variants } from "motion/react";
import { ROOMS } from "@/lib/rooms";
import { RoomCard } from "./RoomCard";

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

interface RoomGridProps {
  caseCount?: number;
}

export function RoomGrid({ caseCount }: RoomGridProps) {
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
          <RoomCard key={room.slug} room={room} caseCount={room.slug === "cases" ? caseCount : undefined} />
        ))}
      </motion.nav>
    </MotionConfig>
  );
}
