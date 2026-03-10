import type { Conversation, PriorityLabel, RelationshipTag } from "@/lib/types";
import { deriveConversationIntel } from "@/lib/conversation-intel";

const relationshipWeight: Record<RelationshipTag, number> = {
  investor: 26,
  client: 22,
  candidate: 18,
  partner: 14,
  team: 10,
  newsletter: 2,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function daysBetween(now: Date, iso: string) {
  const t = new Date(iso).getTime();
  return (now.getTime() - t) / (1000 * 60 * 60 * 24);
}

export function computePriority(convo: Conversation, now = new Date()): {
  priorityScore: number;
  priorityLabel: PriorityLabel;
  priorityReasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  score += relationshipWeight[convo.relationshipTag];
  reasons.push(`Relationship: ${convo.relationshipTag}`);

  const recencyDays = daysBetween(now, convo.lastMessageAt);
  if (recencyDays <= 0.5) {
    score += 22;
    reasons.push("Recent activity");
  } else if (recencyDays <= 1.5) {
    score += 16;
    reasons.push("Recent activity");
  } else if (recencyDays <= 3.5) {
    score += 10;
    reasons.push("Active this week");
  } else if (recencyDays <= 7) {
    score += 6;
    reasons.push("Active recently");
  } else {
    score += 2;
  }

  if (convo.awaitingReply) {
    score += 22;
    reasons.push("Awaiting your reply");
  }

  if (convo.unread) {
    score += 10;
    reasons.push("Unread");
  }

  // Light boost for urgent-sounding subjects (deterministic keyword checks).
  const text = `${convo.title} ${convo.snippet}`.toLowerCase();
  const keywordBoost =
    (/\b(urgent|asap|today|tomorrow|sign|procurement|security|sla|invoice)\b/.test(
      text,
    )
      ? 10
      : 0) +
    (/\b(schedule|calendar|kickoff|next steps)\b/.test(text) ? 6 : 0);
  if (keywordBoost > 0) {
    score += keywordBoost;
    reasons.push("Time-sensitive request");
  }

  score = clamp(Math.round(score), 0, 100);

  let label: PriorityLabel = "Low";
  if (score >= 84) label = "High";
  else if (score >= 48) label = "Medium";

  const finalReasons = reasons
    .filter((r, idx) => reasons.indexOf(r) === idx)
    .slice(0, 3);

  return { priorityScore: score, priorityLabel: label, priorityReasons: finalReasons };
}

export function analyzeInbox(conversations: Conversation[], now = new Date()) {
  const updated = conversations.map((c) => {
    const intel = deriveConversationIntel(c);
    const { priorityScore, priorityLabel, priorityReasons } = computePriority(
      { ...c, awaitingReply: intel.awaitingReply },
      now,
    );
    return {
      ...c,
      awaitingReply: intel.awaitingReply,
      intent: intel.intent,
      status: intel.status,
      stage: intel.stage,
      suggestedNextStep: intel.suggestedNextStep,
      priorityScore,
      priorityLabel,
      priorityReasons,
    };
  });
  updated.sort((a, b) => b.priorityScore - a.priorityScore);
  return updated;
}
