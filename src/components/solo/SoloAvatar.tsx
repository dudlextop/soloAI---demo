"use client";

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type SoloAvatarStatus = "online" | "away" | "busy" | "offline" | "ai";

interface SoloAvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  status?: SoloAvatarStatus;
  className?: string;
}

export function SoloAvatar({
  src,
  alt,
  name = "User",
  status = "offline",
  className,
}: SoloAvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const badgeClassName =
    status === "online"
      ? "bg-emerald-500"
      : status === "away"
      ? "bg-amber-400"
      : status === "busy"
      ? "bg-red-500"
      : status === "ai"
      ? "bg-[var(--foreground)]"
      : "bg-zinc-400";

  return (
    <Avatar
      className={cn(
        "h-9 w-9 rounded-[16px] border border-[var(--line)] bg-[var(--panel-subtle)] shadow-[var(--shadow-subtle)]",
        className,
      )}
    >
      <AvatarImage src={src} alt={alt || name} />
      <AvatarFallback className="bg-[var(--accent-soft)] text-[11px] font-semibold text-[var(--foreground)]">
        {initials}
      </AvatarFallback>
      <AvatarBadge className={cn("border-2 border-[var(--panel-strong)]", badgeClassName)} />
    </Avatar>
  );
}

export function SoloAvatarExamples() {
  return (
    <div className="flex items-center gap-4">
      <SoloAvatar src="https://github.com/shadcn.png" name="David Kim" status="online" />
      <SoloAvatar src="https://github.com/shadcn.png" name="Samir Patel" status="busy" />
      <SoloAvatar src="https://github.com/shadcn.png" name="Maya Chen" status="away" />
      <SoloAvatar name="Solo AI" status="ai" />
    </div>
  );
}
