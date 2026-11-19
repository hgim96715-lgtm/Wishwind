"use client";

import { motion, MotionConfig, type Variants } from "motion/react";
import { ROOMS } from "@/lib/rooms";
import { RoomCard } from "./RoomCard";

// 부모가 자식 카드들의 등장 타이밍을 순차적으로 지정 (stagger)
const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

export function RoomGrid() {
  return (
    // OS의 "동작 줄이기" 설정을 켠 사용자에겐 transform 애니메이션을 끔
    <MotionConfig reducedMotion="user">
      <motion.nav
        aria-label="방 목록"
        variants={gridVariants}
        initial="hidden"
        animate="show"
        className="grid w-full gap-x-5 gap-y-8 md:grid-cols-3"
      >
        {ROOMS.map((room, i) => (
          <RoomCard key={room.slug} room={room} fileNo={i + 1} />
        ))}
      </motion.nav>
    </MotionConfig>
  );
}
