"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import type { Room } from "@/lib/rooms";
import { RoomEmblem } from "./RoomEmblem";

const MotionLink = motion.create(Link);

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

interface RoomCardProps {
  room: Room;
  enterLabel?: string;
}

export function RoomCard({ room, enterLabel = "들어가기" }: RoomCardProps) {
  const badge = room.badge;

  return (
    <MotionLink
      href={room.href}
      variants={cardVariants}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
      whileFocus={{ y: -6 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      style={{ "--accent": room.accent } as React.CSSProperties}
      className="group relative flex flex-col outline-none"
    >
      <div className="relative flex min-h-56 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgb(47_44_40/0.05),0_6px_18px_rgb(47_44_40/0.06)] transition-[border-color,box-shadow] duration-300 group-hover:border-(--accent)/40 group-hover:shadow-[0_2px_4px_rgb(47_44_40/0.06),0_16px_36px_rgb(47_44_40/0.10)] group-focus-visible:border-(--accent)/60 group-focus-visible:ring-4 group-focus-visible:ring-(--accent)/15">
        {/* 배지 */}
        {badge && (
          <span className="absolute top-3 right-3 rounded-full border border-(--accent)/40 bg-(--accent)/10 px-2 py-0.5 text-[10px] font-medium text-(--accent)">
            {badge}
          </span>
        )}

        <RoomEmblem slug={room.slug} />

        <div className="mt-auto pt-10">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {room.title}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-muted">
            {room.description}
          </p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-(--accent)">
            {enterLabel}
          </span>
        </div>
      </div>
    </MotionLink>
  );
}
