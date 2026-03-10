"use client";

import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Inbox as InboxIcon,
  Linkedin,
  Search as SearchIcon,
  Settings2,
  Slack,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { siGmail, siTelegram, siWhatsapp } from "simple-icons";

export type TabKey = "now" | "inbox" | "search" | "brief" | "settings";
export type SortMode = "priority" | "recent" | "unread";
export type InboxMode = "list" | "thread";
export type ConnectorStatus = "connected" | "disconnected" | "available";
export type PriorityFilter = "all" | "high" | "medium" | "low" | "needs_reply";
export type Connectors = {
  gmail: ConnectorStatus;
  slack: ConnectorStatus;
  whatsapp: ConnectorStatus;
  linkedin: ConnectorStatus;
  telegram: ConnectorStatus;
};
export type SourceChannel = Conversation["source"];
export type SourceFilter = SourceChannel | "all";
export type TriageBucket = "urgent" | "needs_reply" | "waiting" | "low_signal";

export type QueueSection = {
  key: "act_now" | "watching";
  label: string;
  description: string;
  items: Conversation[];
};

export const NAV_ITEMS: Array<{
  key: TabKey;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}> = [
  { key: "now", label: "Now", shortLabel: "Now", icon: Sparkles },
  { key: "inbox", label: "Inbox", shortLabel: "Inbox", icon: InboxIcon },
  { key: "search", label: "Search", shortLabel: "Search", icon: SearchIcon },
  { key: "brief", label: "Brief", shortLabel: "Brief", icon: CalendarDays },
  { key: "settings", label: "Settings", shortLabel: "Settings", icon: Settings2 },
];

export const SOURCE_LABEL: Record<SourceChannel, string> = {
  gmail: "Gmail",
  slack: "Slack",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  telegram: "Telegram",
};

export const RAIL_SOURCES: SourceChannel[] = [
  "gmail",
  "telegram",
  "linkedin",
  "slack",
  "whatsapp",
];

export const PRIORITY_FILTERS: Array<{
  key: PriorityFilter;
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
  { key: "needs_reply", label: "Needs reply" },
];

const SIMPLE_ICONS: Partial<
  Record<SourceChannel, { path: string; hex: string; title: string }>
> = {
  gmail: siGmail,
  whatsapp: siWhatsapp,
  telegram: siTelegram,
};

function compareBySortMode(a: Conversation, b: Conversation, sortMode: SortMode) {
  if (sortMode === "recent") {
    return b.lastMessageAt.localeCompare(a.lastMessageAt);
  }

  if (sortMode === "unread") {
    if (a.unread !== b.unread) {
      return a.unread ? -1 : 1;
    }
    return b.lastMessageAt.localeCompare(a.lastMessageAt);
  }

  if (a.priorityScore !== b.priorityScore) {
    return b.priorityScore - a.priorityScore;
  }

  return b.lastMessageAt.localeCompare(a.lastMessageAt);
}

function matchesSourceFilter(conversation: Conversation, sourceFilter: SourceFilter) {
  return sourceFilter === "all" ? true : conversation.source === sourceFilter;
}

export function matchesPriorityFilter(
  conversation: Conversation,
  priorityFilter: PriorityFilter,
) {
  if (priorityFilter === "all") return true;
  if (priorityFilter === "needs_reply") return conversation.awaitingReply;
  return conversation.priorityLabel.toLowerCase() === priorityFilter;
}

export function primaryParticipant(conversation: Conversation) {
  return (
    conversation.participants.find((participant) => participant !== "You") ??
    conversation.participants[0] ??
    "Contact"
  );
}

export function deriveEmail(name: string) {
  if (name === "You") return "you@solo.app";

  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");

  return cleaned ? `${cleaned}@example.com` : "contact@example.com";
}

export function triageBucketFor(conversation: Conversation): TriageBucket {
  if (conversation.priorityLabel === "High" || conversation.priorityScore >= 76) {
    return "urgent";
  }

  if (conversation.awaitingReply || conversation.status === "Awaiting your reply") {
    return "needs_reply";
  }

  if (conversation.status === "Waiting for response" || conversation.stage === "Follow-up") {
    return "waiting";
  }

  return "low_signal";
}

export function buildInboxRows(
  conversations: Conversation[],
  options: {
    sortMode?: SortMode;
    sourceFilter?: SourceFilter;
    priorityFilter?: PriorityFilter;
  } = {},
) {
  const {
    sortMode = "priority",
    sourceFilter = "all",
    priorityFilter = "all",
  } = options;

  return conversations
    .filter((conversation) => matchesSourceFilter(conversation, sourceFilter))
    .filter((conversation) => matchesPriorityFilter(conversation, priorityFilter))
    .slice()
    .sort((a, b) => compareBySortMode(a, b, sortMode));
}

export function buildNowSections(
  conversations: Conversation[],
  options: {
    sourceFilter?: SourceFilter;
    priorityFilter?: PriorityFilter;
  } = {},
): QueueSection[] {
  const rows = buildInboxRows(conversations, {
    sortMode: "priority",
    sourceFilter: options.sourceFilter,
    priorityFilter: options.priorityFilter,
  });

  const actNow = rows.filter((conversation) => {
    const bucket = triageBucketFor(conversation);
    return bucket === "urgent" || bucket === "needs_reply";
  });

  const watching = rows.filter((conversation) => {
    if (actNow.some((item) => item.id === conversation.id)) return false;
    const bucket = triageBucketFor(conversation);
    return bucket === "waiting" || conversation.priorityLabel !== "Low";
  });

  const sections: QueueSection[] = [
    {
      key: "act_now",
      label: "Act now",
      description: "High-signal threads that should move first.",
      items: actNow.slice(0, 12),
    },
    {
      key: "watching",
      label: "Watching",
      description: "Threads worth keeping in view after the first pass.",
      items: watching.slice(0, 8),
    },
  ];

  return sections.filter((section) => section.items.length > 0);
}

export function channelStatusTone(status: ConnectorStatus) {
  if (status === "connected") return "bg-emerald-500";
  if (status === "available") return "bg-amber-500";
  return "bg-zinc-300";
}

export function priorityDotTone(conversation: Conversation) {
  if (conversation.priorityLabel === "High") return "bg-red-500";
  if (conversation.priorityLabel === "Medium") return "bg-amber-500";
  return "bg-zinc-300";
}

export function priorityBorderTone(conversation: Conversation) {
  if (conversation.awaitingReply || conversation.priorityLabel === "High") {
    return "border-l-red-500";
  }

  if (conversation.priorityLabel === "Medium") {
    return "border-l-amber-500";
  }

  return "border-l-transparent";
}

export function SourceLogo({
  source,
  className,
  mono = false,
}: {
  source: SourceChannel;
  className?: string;
  mono?: boolean;
}) {
  const icon = SIMPLE_ICONS[source];
  const brandColor =
    source === "slack" ? "#4A154B" : source === "linkedin" ? "#0A66C2" : "currentColor";

  if (!icon && source === "slack") {
    return (
      <Slack
        aria-hidden="true"
        className={cn("h-4 w-4", className)}
        style={{ color: mono ? "currentColor" : brandColor }}
      />
    );
  }

  if (!icon && source === "linkedin") {
    return (
      <Linkedin
        aria-hidden="true"
        className={cn("h-4 w-4", className)}
        style={{ color: mono ? "currentColor" : brandColor }}
      />
    );
  }

  if (!icon) {
    return (
      <span
        aria-hidden="true"
        className={cn("inline-block h-2.5 w-2.5 rounded-full bg-current", className)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("h-4 w-4", className)}
      style={{ color: mono ? "currentColor" : `#${icon.hex}` }}
      fill="currentColor"
    >
      <path d={icon.path} />
    </svg>
  );
}

export function SourcePill({
  source,
  className,
}: {
  source: SourceChannel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-subtle)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-2)]",
        className,
      )}
    >
      <SourceLogo source={source} className="h-3.5 w-3.5" />
      {SOURCE_LABEL[source]}
    </span>
  );
}

export function PriorityPill({
  label,
  className,
}: {
  label: Conversation["priorityLabel"];
  className?: string;
}) {
  const tone =
    label === "High"
      ? "border-red-200 bg-red-50 text-red-700"
      : label === "Medium"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-[var(--line)] bg-[var(--panel-subtle)] text-[var(--text-2)]";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
