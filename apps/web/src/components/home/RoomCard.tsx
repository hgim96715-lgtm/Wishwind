"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { LuArrowRight } from "react-icons/lu";
import type { Room } from "@/lib/rooms";

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
  fileNo: number;
}

export function RoomCard({ room, fileNo }: RoomCardProps) {
  const Icon = room.icon;
  const no = String(fileNo).padStart(2, "0");

  return (
    <MotionLink
      href={room.href}
      variants={cardVariants}
      whileHover={{ y: -6, rotate: -1 }}
      whileTap={{ scale: 0.98 }}
      whileFocus={{ y: -6, rotate: -1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      style={{ "--accent": room.accent } as React.CSSProperties}
      className="group relative flex flex-col outline-none"
    >
      <span className="ml-5 inline-flex w-fit items-center rounded-t-xl border border-b-0 border-line bg-(--accent)/15 px-3 pt-1.5 pb-1 font-mono text-[11px] font-semibold tracking-wider text-(--accent)">
        FILE {no}
      </span>
      
      <div className="relative flex min-h-56 flex-1 flex-col overflow-hidden rounded-2xl rounded-tl-md border border-line bg-surface p-6 shadow-[0_1px_2px_rgb(47_44_40/0.05),0_6px_18px_rgb(47_44_40/0.06)] transition-[border-color,box-shadow] duration-300 group-hover:border-(--accent)/40 group-hover:shadow-[0_2px_4px_rgb(47_44_40/0.06),0_16px_36px_rgb(47_44_40/0.10)] group-focus-visible:border-(--accent)/60 group-focus-visible:ring-4 group-focus-visible:ring-(--accent)/15">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1.5 bg-(--accent)/50"
        />

        <div className="flex items-start justify-between">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-(--accent)/12 text-(--accent)">
            <Icon aria-hidden className="size-6" />
          </span>
          <span className="rotate-6 rounded-md border-2 border-(--accent)/45 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-(--accent)/80 transition-transform duration-300 group-hover:rotate-3">
            {room.subtitle}
          </span>
        </div>

        <div className="mt-auto pt-10">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {room.title}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-muted">
            {room.description}
          </p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-(--accent)">
            파일 열기
            <LuArrowRight
              aria-hidden
              className="size-4 transition-transform duration-300 group-hover:translate-x-1"
            />
          </span>
        </div>
      </div>
    </MotionLink>
  );
}
