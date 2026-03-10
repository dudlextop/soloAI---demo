"use client";

import { Badge } from "@/components/ui/badge";
import { BadgeCheck, BookmarkIcon, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeType = "topic" | "status" | "stage" | "role" | "online" | "ai";

interface SoloBadgeProps {
  label: string;
  type?: BadgeType;
  className?: string;
}

export function SoloBadge({ label, type = "topic", className }: SoloBadgeProps) {
  const lower = label.toLowerCase();

  let statusClass = "bg-zinc-100 text-zinc-700";
  if (type === "status" || type === "stage") {
    if (lower.includes("await")) statusClass = "bg-amber-50 text-amber-800";
    else if (lower.includes("discussion")) statusClass = "bg-violet-50 text-violet-800";
    else if (lower.includes("done")) statusClass = "bg-emerald-50 text-emerald-800";
    else if (lower.includes("block")) statusClass = "bg-red-50 text-red-800";
  }

  let roleClass = "bg-sky-50 text-sky-800";
  if (type === "role") {
    if (lower.includes("investor")) roleClass = "bg-emerald-50 text-emerald-800";
    else if (lower.includes("client")) roleClass = "bg-blue-50 text-blue-800";
    else if (lower.includes("hiring") || lower.includes("candidate"))
      roleClass = "bg-violet-50 text-violet-800";
    else if (lower.includes("support")) roleClass = "bg-orange-50 text-orange-800";
    else if (lower.includes("partner")) roleClass = "bg-teal-50 text-teal-800";
  }

  const styles: Record<BadgeType, string> = {
    topic: "bg-zinc-100 text-zinc-700",
    status: statusClass,
    stage: statusClass,
    role: roleClass,
    online: "bg-emerald-500 text-white",
    ai: "bg-violet-600 text-white",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-transparent px-2 py-0.5 text-[11px] font-medium",
        styles[type],
        className,
      )}
    >
      {type === "online" && <Circle data-icon="inline-start" className="h-3 w-3" />}
      {type === "role" && <BadgeCheck data-icon="inline-start" className="h-3 w-3" />}
      {type === "ai" && <BookmarkIcon data-icon="inline-start" className="h-3 w-3" />}
      {label}
    </Badge>
  );
}

