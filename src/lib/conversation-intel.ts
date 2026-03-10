import type {
  Conversation,
  ConversationIntent,
  ConversationStage,
  ConversationStatus,
} from "@/lib/types";

function textForConversation(convo: Conversation) {
  const bodies = convo.messages.map((m) => m.body).join(" ");
  return `${convo.title} ${convo.snippet} ${bodies}`.toLowerCase();
}

export function detectIntent(convo: Conversation): ConversationIntent {
  const t = textForConversation(convo);
  if (/\b(meet|meeting|call|sync|slot|schedule|calendar|availability)\b/.test(t)) {
    return "Meeting scheduling";
  }
  if (/\b(contract|msa|agreement|terms|procurement|sla)\b/.test(t)) {
    return "Contract discussion";
  }
  if (convo.relationshipTag === "investor" || /\bdeck|round|fund|invest\b/.test(t)) {
    return "Investor conversation";
  }
  if (/\bbug|issue|error|broken|does not work\b/.test(t)) {
    return "Bug discussion";
  }
  if (/\bhelp|support|question|trouble|escalation\b/.test(t)) {
    return "Support request";
  }
  if (/\bintro\b/.test(t)) {
    return "Intro request";
  }
  return "General update";
}

export function detectStatus(convo: Conversation): { status: ConversationStatus; awaiting: boolean } {
  const last = convo.messages[convo.messages.length - 1];
  const lastFromYou = last?.senderName === "You";
  const t = last?.body.toLowerCase() ?? "";

  if (!lastFromYou) {
    return { status: "Awaiting your reply", awaiting: true };
  }

  if (/\b(thanks|thank you|appreciate|sounds good|great,|all set)\b/.test(t)) {
    return { status: "Completed", awaiting: false };
  }

  if (/\b(follow up|check in|circle back)\b/.test(t)) {
    return { status: "Follow-up required", awaiting: false };
  }

  return { status: "Waiting for response", awaiting: false };
}

export function detectStage(convo: Conversation): ConversationStage {
  const len = convo.messages.length;
  const t = textForConversation(convo);
  if (/\bintro|introduction\b/.test(t) || len <= 2) {
    return "Intro";
  }
  if (/\b(sign|signing|agree|agreement|lock in|schedule|finalize|decision)\b/.test(t)) {
    return "Decision";
  }
  if (/\bfollow up|follow-up|check in|next week\b/.test(t)) {
    return "Follow-up";
  }
  return "Discussion";
}

export function suggestNextStep(
  intent: ConversationIntent,
  status: ConversationStatus,
  stage: ConversationStage,
): string {
  if (status === "Awaiting your reply") {
    if (intent === "Meeting scheduling") {
      return "Confirm a time window and offer to send a calendar invite.";
    }
    if (intent === "Contract discussion") {
      return "Clarify your position and share any updated document or redlines.";
    }
    if (intent === "Investor conversation") {
      return "Answer the question directly and propose the next check-in point.";
    }
    if (intent === "Support request" || intent === "Bug discussion") {
      return "Acknowledge the issue and share the next concrete troubleshooting or fix step.";
    }
  }

  if (stage === "Decision") {
    return "Confirm the decision, outline next steps, and set a clear timeline.";
  }

  if (stage === "Follow-up") {
    return "Send a concise follow-up and suggest when you will check in again.";
  }

  return "Reply with a short update and make the next step explicit.";
}

export function deriveConversationIntel(convo: Conversation) {
  const intent = detectIntent(convo);
  const { status, awaiting } = detectStatus(convo);
  const stage = detectStage(convo);
  const suggestedNextStep = suggestNextStep(intent, status, stage);

  return { intent, status, stage, suggestedNextStep, awaitingReply: awaiting };
}

