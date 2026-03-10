import type { Contact, ContactMemory, Conversation } from "@/lib/types";
import { detectIntent, detectStage, detectStatus, suggestNextStep } from "@/lib/conversation-intel";

function collectRecentMessages(conversations: Conversation[], contact: Contact) {
  const all: { convo: Conversation; index: number }[] = [];
  conversations.forEach((c) => {
    c.messages.forEach((_, idx) => {
      all.push({ convo: c, index: idx });
    });
  });
  all.sort((a, b) => {
    const ta = a.convo.messages[a.index].timestamp;
    const tb = b.convo.messages[b.index].timestamp;
    return tb.localeCompare(ta);
  });
  return all.slice(0, 30);
}

export function generateContactMemory(
  contact: Contact,
  conversations: Conversation[],
): ContactMemory {
  const related = conversations.filter((c) => c.participants.includes(contact.fullName));
  if (!related.length) {
    return {
      contactId: contact.id,
      fullName: contact.fullName,
      relationshipSummary: "No recent conversations yet.",
      keyFacts: [],
      openLoops: [],
      preferences: contact.notes,
      lastAgreement: "",
      nextSuggestedStep: "",
    };
  }

  // Use the most recent conversation as anchor.
  const sorted = [...related].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  const anchor = sorted[0];
  const intent = detectIntent(anchor);
  const intelStatus = detectStatus(anchor);
  const stage = detectStage(anchor);
  const nextSuggestedStep = suggestNextStep(intent, intelStatus.status, stage);

  const summaryParts: string[] = [];
  if (contact.relationshipTag === "investor") {
    summaryParts.push("Investor who is interested in Solo's progress and direction.");
  } else if (contact.relationshipTag === "client") {
    summaryParts.push("Customer using Solo to improve communication workflows.");
  } else if (contact.relationshipTag === "candidate") {
    summaryParts.push("Candidate in an active hiring process.");
  } else if (contact.relationshipTag === "partner") {
    summaryParts.push("Potential partner exploring integration or go to market collaboration.");
  } else if (contact.relationshipTag === "team") {
    summaryParts.push("Internal teammate involved in product or operations.");
  }

  if (intent === "Meeting scheduling") {
    summaryParts.push("Most conversations revolve around scheduling and next steps.");
  } else if (intent === "Contract discussion") {
    summaryParts.push("Recent threads focus on contract language and approvals.");
  } else if (intent === "Investor conversation") {
    summaryParts.push("Recent messages cover traction, retention and roadmap.");
  }

  const relationshipSummary =
    summaryParts.join(" ") ||
    "Ongoing relationship with regular check ins across channels.";

  const keyFacts: string[] = [];
  keyFacts.push(`Relationship: ${contact.relationshipTag}`);
  if (contact.company) keyFacts.push(`Company: ${contact.company}`);
  if (contact.role) keyFacts.push(`Role: ${contact.role}`);
  if (contact.timezone) keyFacts.push(`Timezone: ${contact.timezone}`);
  keyFacts.push(`Trust level: ${contact.trustLevel}`);

  const recent = collectRecentMessages(related, contact);
  let lastAgreement = "";
  const openLoops: string[] = [];

  for (const { convo, index } of recent) {
    const m = convo.messages[index];
    const body = m.body.toLowerCase();

    if (m.senderName === "You") {
      if (/\b(i will|i'll|i ll|i am going to)\b/.test(body) || /\b(send|share|follow up)\b/.test(body)) {
        if (!openLoops.includes("Follow up on a promise you made.")) {
          openLoops.push("Follow up on a promise you made.");
        }
      }
      if (/\b(agenda|summary|document|deck|invoice|questionnaire)\b/.test(body)) {
        lastAgreement =
          lastAgreement ||
          "You agreed to send a document or summary and keep them updated.";
      }
    } else {
      if (/\b(can you|could you|please|would you)\b/.test(body)) {
        if (!openLoops.includes("Respond to a direct request or question.")) {
          openLoops.push("Respond to a direct request or question.");
        }
      }
      if (/\bwhen|timeline|by\b/.test(body)) {
        if (!openLoops.includes("Clarify timing or set a clear deadline.")) {
          openLoops.push("Clarify timing or set a clear deadline.");
        }
      }
    }
  }

  if (!lastAgreement) {
    if (stage === "Decision") {
      lastAgreement = "You are close to a decision and should document the outcome.";
    } else if (stage === "Follow-up") {
      lastAgreement = "You agreed to follow up with a short update.";
    } else {
      lastAgreement = "You agreed to continue the discussion and keep them updated.";
    }
  }

  const preferences =
    intent === "Investor conversation"
      ? "Prefers concise updates with clear metrics and next steps."
      : intent === "Meeting scheduling"
        ? "Appreciates fast confirmation and clear time options."
        : "Responds well to calm, direct messages with a clear ask.";

  return {
    contactId: contact.id,
    fullName: contact.fullName,
    relationshipSummary,
    keyFacts,
    openLoops,
    preferences,
    lastAgreement,
    nextSuggestedStep,
  };
}

