import type { Conversation } from "@/lib/types";

function lastInboundMessages(convo: Conversation) {
  const msgs = convo.messages;
  if (msgs.length === 0) return [];
  const last = msgs[msgs.length - 1];
  const prev = msgs[msgs.length - 2];
  // "You" is the local user in seed data.
  const inbound: typeof msgs = [];
  if (last.senderName !== "You") inbound.push(last);
  if (prev && prev.senderName !== "You" && inbound.length < 2) inbound.unshift(prev);
  return inbound.slice(-2);
}

function clean(s: string) {
  return s
    .replace(/\s+/g, " ")
    .replace(/[—–]{2,}/g, "-")
    .trim();
}

export function generateDraftReply(convo: Conversation): string {
  const inbound = lastInboundMessages(convo);
  const lastInbound = inbound[inbound.length - 1];
  const name = lastInbound?.senderName ?? convo.participants.find((p) => p !== "You") ?? "there";

  const context = clean(
    inbound
      .map((m) => m.body)
      .join(" "),
  );

  // Deterministic, lightweight templates by relationship.
  const opener = `Hi ${name},`;

  const middleByTag: Record<Conversation["relationshipTag"], string> = {
    investor:
      "Thanks for the note. Happy to share a bit more context and make sure we cover what matters most.",
    client:
      "Thanks for reaching out. I can help with this and keep things moving on your timeline.",
    team: "Thanks. I’m aligned and we can move forward with this approach.",
    candidate:
      "Thanks for following up. I’m looking forward to the next step and want to keep the process clear.",
    partner:
      "Thanks for the message. I’m open to exploring this and clarifying the use case on both sides.",
    newsletter:
      "Thanks for sending this over.",
  };

  const middle = middleByTag[convo.relationshipTag];

  const ask = (() => {
    const lower = context.toLowerCase();
    if (/\b(calendar|schedule|time|call|invite|availability)\b/.test(lower)) {
      return "If you share one or two preferred windows, I’ll confirm and send an invite.";
    }
    if (/\b(contract|msa|sla|addendum|procurement|security)\b/.test(lower)) {
      return "I’ll review the relevant section and send a clear summary of what we can commit to, plus any proposed edits.";
    }
    if (/\b(invoice|po|billing)\b/.test(lower)) {
      return "I’ll resend the invoice with the updated details and confirm once it’s sent.";
    }
    if (/\b(next steps|interview|pairing|availability)\b/.test(lower)) {
      return "If you send your availability, I’ll lock the next slot and share the details.";
    }
    if (/\b(agenda|kickoff)\b/.test(lower)) {
      return "I’ll send a short agenda and suggested attendees so we can keep the session crisp.";
    }
    return "If there’s anything specific you want me to prioritize, let me know and I’ll incorporate it.";
  })();

  const close = "Best,\nYou";

  return `${opener}\n\n${middle}\n\n${ask}\n\n${close}`;
}

