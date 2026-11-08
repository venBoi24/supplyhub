"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { useExperience } from "../store";

export function NotificationBell() {
  const { state } = useExperience();
  const unread = state.notifications.filter((n) => !n.read).length;

  return (
    <Link
      href="/experience?tab=alerts"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      className="relative grid size-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
    >
      <Bell className="size-5" aria-hidden="true" />
      {unread > 0 ? (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[0.5625rem] leading-none text-accent-foreground"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
