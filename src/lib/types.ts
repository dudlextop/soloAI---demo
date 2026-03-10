export type Source = "gmail" | "slack" | "whatsapp" | "linkedin" | "telegram";
export type RelationshipTag =
  | "investor"
  | "client"
  | "team"
  | "candidate"
  | "partner"
  | "newsletter";

export type PriorityLabel = "High" | "Medium" | "Low";

export type ConversationIntent =
  | "Meeting scheduling"
  | "Contract discussion"
  | "Investor conversation"
  | "Support request"
  | "Bug discussion"
  | "Intro request"
  | "General update";

export type ConversationStatus =
  | "Awaiting your reply"
  | "Waiting for response"
  | "Follow-up required"
  | "Completed";

export type ConversationStage = "Intro" | "Discussion" | "Decision" | "Follow-up";

export type TrustLevel = "Low" | "Med" | "High";

export type Contact = {
  id: string;
  fullName: string;
  role?: string;
  company?: string;
  relationshipTag: Exclude<RelationshipTag, "newsletter">;
  timezone?: string;
  lastInteractionAt: string;
  trustLevel: TrustLevel;
  notes: string;
};

export type ContactMemory = {
  contactId: string;
  fullName: string;
  relationshipSummary: string;
  keyFacts: string[];
  openLoops: string[];
  preferences: string;
  lastAgreement: string;
  nextSuggestedStep: string;
};

export type Message = {
  senderName: string;
  senderRole?: string;
  body: string;
  timestamp: string; // ISO
  source?: Source;
};

export type Conversation = {
  id: string;
  source: Source;
  title: string;
  participants: string[];
  snippet: string;
  lastMessageAt: string; // ISO
  unread: boolean;
  awaitingReply: boolean;
  relationshipTag: RelationshipTag;
  priorityScore: number; // 0-100
  priorityLabel: PriorityLabel;
  priorityReasons: string[];
  intent?: ConversationIntent;
  status?: ConversationStatus;
  stage?: ConversationStage;
  suggestedNextStep?: string;
  messages: Message[];
};
