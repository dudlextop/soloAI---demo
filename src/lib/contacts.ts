import type { Contact, Conversation } from "@/lib/types";

export const contacts: Contact[] = [
  {
    id: "c_maya_chen",
    fullName: "Maya Chen",
    role: "Investor",
    company: "Northline Capital",
    relationshipTag: "investor",
    timezone: "PT",
    lastInteractionAt: new Date().toISOString(),
    trustLevel: "Med",
    notes: "Early interest in GTM focus and traction.",
  },
  {
    id: "c_david_kim",
    fullName: "David Kim",
    role: "Investor",
    company: "Summit Ventures",
    relationshipTag: "investor",
    timezone: "PT",
    lastInteractionAt: new Date().toISOString(),
    trustLevel: "High",
    notes: "Leans hands-on with product and roadmap.",
  },
  {
    id: "c_ravi_helio",
    fullName: "Ravi @ Helio",
    role: "Head of Support",
    company: "Helio",
    relationshipTag: "client",
    timezone: "ET",
    lastInteractionAt: new Date().toISOString(),
    trustLevel: "High",
    notes: "Pilot customer for unified inbox.",
  },
  {
    id: "c_monika_clearsky",
    fullName: "Monica — ClearSky",
    role: "Support Lead",
    company: "ClearSky",
    relationshipTag: "client",
    timezone: "ET",
    lastInteractionAt: new Date().toISOString(),
    trustLevel: "Med",
    notes: "Focused on SLA and incident clarity.",
  },
  {
    id: "c_elena_relay",
    fullName: "Elena Morozova",
    role: "Partnerships",
    company: "RelayWorks",
    relationshipTag: "partner",
    timezone: "CET",
    lastInteractionAt: new Date().toISOString(),
    trustLevel: "Med",
    notes: "Exploring analytics integration.",
  },
];

export function primaryContactNameForConversation(convo: Conversation): string | null {
  const name = convo.participants.find((p) => p !== "You");
  return name ?? null;
}

export function contactForConversation(convo: Conversation): Contact | null {
  const name = primaryContactNameForConversation(convo);
  if (!name) return null;
  return contacts.find((c) => c.fullName === name) ?? null;
}

export function conversationsForContact(contact: Contact, conversations: Conversation[]) {
  return conversations.filter((c) => c.participants.includes(contact.fullName));
}

