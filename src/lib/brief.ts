import type { Conversation } from "@/lib/types";

export type BriefItem = {
  conversationId: string;
  title: string;
  source: Conversation["source"];
  priorityLabel: Conversation["priorityLabel"];
  snippet: string;
  lastMessageAt: string;
};

export type MorningBrief = {
  topPriorities: BriefItem[];
  followUps: BriefItem[];
  suggestedActions: string[];
};

export function computeMorningBrief(conversations: Conversation[]): MorningBrief {
  const sorted = [...conversations].sort((a, b) => b.priorityScore - a.priorityScore);
  const top = sorted
    .filter((c) => c.priorityScore > 0)
    .slice(0, 3)
    .map(toItem);

  const followUps = sorted
    .filter((c) => c.awaitingReply)
    .slice(0, 6)
    .map(toItem);

  const suggestedActions: string[] = [
    "Reply to the top 2 awaiting threads before noon.",
    "Confirm any time-sensitive scheduling requests.",
    "Close out one low-effort admin item (invoice, access, or doc send).",
  ];

  return { topPriorities: top, followUps, suggestedActions };
}

function toItem(c: Conversation): BriefItem {
  return {
    conversationId: c.id,
    title: c.title,
    source: c.source,
    priorityLabel: c.priorityLabel,
    snippet: c.snippet,
    lastMessageAt: c.lastMessageAt,
  };
}

