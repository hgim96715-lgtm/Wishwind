"use client";

import { motion, MotionConfig, type Variants } from "motion/react";
import { ROOMS, ROOMS_EN } from "@/lib/rooms";
import { RoomCard } from "./RoomCard";

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

export function RoomGrid({ lang = "ko" }: { lang?: "ko" | "en" }) {
  const rooms = lang === "en" ? ROOMS_EN : ROOMS;
  const enterLabel = lang === "en" ? "Enter" : "들어가기";

  return (
    <MotionConfig reducedMotion="user">
      <motion.nav
        aria-label={lang === "en" ? "Rooms" : "방 목록"}
        variants={gridVariants}
        initial="hidden"
        animate="show"
        className="grid w-full gap-x-5 gap-y-8 md:grid-cols-3"
      >
        {rooms.map((room) => (
          <RoomCard key={room.slug} room={room} enterLabel={enterLabel} />
        ))}
      </motion.nav>
    </MotionConfig>
  );
}
