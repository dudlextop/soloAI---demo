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
      ? "bg-violet-500"
      : "bg-zinc-500";

  return (
    <Avatar className={cn("h-9 w-9", className)}>
      <AvatarImage src={src} alt={alt || name} />
      <AvatarFallback>{initials}</AvatarFallback>
      <AvatarBadge className={cn("border-2 border-background", badgeClassName)} />
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

