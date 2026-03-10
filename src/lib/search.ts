import type { Conversation, Source } from "@/lib/types";

const SOURCE_LABEL: Record<Source, string> = {
  gmail: "Gmail",
  slack: "Slack",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  telegram: "Telegram",
};

export type SearchMatchField =
  | "title"
  | "snippet"
  | "participant"
  | "sender"
  | "role"
  | "body"
  | "source"
  | "relationship";

export type SearchHit = {
  conversationId: string;
  source: Conversation["source"];
  title: string;
  participant: string;
  excerpt: string;
  matchedField: SearchMatchField;
  highlightRanges: [number, number][];
  score: number;
  lastMessageAt: string;
  priorityLabel: Conversation["priorityLabel"];
};

export type SearchResults = SearchHit[];

type SearchCandidate = {
  matchedField: SearchMatchField;
  text: string;
  excerpt: string;
  score: number;
  ranges: [number, number][];
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function tokenize(query: string) {
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean);
}

function findTokenRanges(text: string, tokens: string[]) {
  const haystack = normalize(text);
  const ranges: [number, number][] = [];

  for (const token of tokens) {
    let cursor = 0;
    while (cursor < haystack.length) {
      const index = haystack.indexOf(token, cursor);
      if (index === -1) break;
      ranges.push([index, index + token.length]);
      cursor = index + token.length;
    }
  }

  return mergeRanges(ranges);
}

function mergeRanges(ranges: [number, number][]) {
  if (!ranges.length) return [];

  return [...ranges]
    .sort((a, b) => a[0] - b[0])
    .reduce<[number, number][]>((acc, current) => {
      const previous = acc[acc.length - 1];
      if (!previous || current[0] > previous[1]) {
        acc.push([...current]);
        return acc;
      }

      previous[1] = Math.max(previous[1], current[1]);
      return acc;
    }, []);
}

function allTokensMatch(text: string, tokens: string[]) {
  const haystack = normalize(text);
  return tokens.every((token) => haystack.includes(token));
}

function compactExcerpt(text: string, ranges: [number, number][]) {
  if (!text.trim()) return "";
  if (!ranges.length || text.length <= 120) return text;

  const [start, end] = ranges[0];
  const sliceStart = Math.max(0, start - 36);
  const sliceEnd = Math.min(text.length, Math.max(end + 64, 110));
  const excerpt = text.slice(sliceStart, sliceEnd).trim();

  return `${sliceStart > 0 ? "..." : ""}${excerpt}${sliceEnd < text.length ? "..." : ""}`;
}

function scoreField(
  text: string,
  tokens: string[],
  baseScore: number,
  prefixBonus = 0,
  exactBonus = 0,
) {
  if (!text.trim()) return { score: 0, ranges: [] as [number, number][] };

  const ranges = findTokenRanges(text, tokens);
  if (!ranges.length) return { score: 0, ranges: [] as [number, number][] };

  const normalized = normalize(text);
  let score = baseScore + ranges.length * 4;

  if (tokens.some((token) => normalized.startsWith(token))) {
    score += prefixBonus;
  }

  if (tokens.length === 1 && normalized === tokens[0]) {
    score += exactBonus;
  }

  return { score, ranges };
}

function primaryParticipant(conversation: Conversation) {
  return (
    conversation.participants.find((participant) => participant !== "You") ??
    conversation.participants[0] ??
    "Contact"
  );
}

function searchBlob(conversation: Conversation) {
  const messageText = conversation.messages
    .map((message) => [message.senderName, message.senderRole ?? "", message.body].join(" "))
    .join(" ");

  return [
    conversation.title,
    conversation.snippet,
    conversation.participants.join(" "),
    conversation.relationshipTag,
    SOURCE_LABEL[conversation.source],
    messageText,
  ].join(" ");
}

export function searchAll(conversations: Conversation[], query: string): SearchResults {
  const tokens = tokenize(query);
  if (!tokens.length) return [];

  const hits: SearchHit[] = [];

  for (const conversation of conversations) {
    if (!allTokensMatch(searchBlob(conversation), tokens)) {
      continue;
    }

    const participant = primaryParticipant(conversation);
    const sourceLabel = SOURCE_LABEL[conversation.source];

    const candidates: SearchCandidate[] = [
      {
        matchedField: "title" as const,
        text: conversation.title,
        excerpt: conversation.title,
        ...scoreField(conversation.title, tokens, 120, 18, 28),
      },
      {
        matchedField: "participant" as const,
        text: conversation.participants.join(" "),
        excerpt: participant,
        ...scoreField(conversation.participants.join(" "), tokens, 112, 14, 22),
      },
      {
        matchedField: "snippet" as const,
        text: conversation.snippet,
        excerpt: compactExcerpt(conversation.snippet, findTokenRanges(conversation.snippet, tokens)),
        ...scoreField(conversation.snippet, tokens, 90, 10, 0),
      },
      {
        matchedField: "source" as const,
        text: sourceLabel,
        excerpt: `Source: ${sourceLabel}`,
        ...scoreField(sourceLabel, tokens, 72, 10, 18),
      },
      {
        matchedField: "relationship" as const,
        text: conversation.relationshipTag,
        excerpt: `Context: ${conversation.relationshipTag}`,
        ...scoreField(conversation.relationshipTag, tokens, 66, 6, 12),
      },
    ];

    for (const message of conversation.messages) {
      const senderCandidate = scoreField(message.senderName, tokens, 106, 14, 18);
      if (senderCandidate.score) {
        candidates.push({
          matchedField: "sender" as const,
          text: message.senderName,
          excerpt: `Sender: ${message.senderName}`,
          ...senderCandidate,
        });
      }

      const roleCandidate = scoreField(message.senderRole ?? "", tokens, 84, 8, 12);
      if (roleCandidate.score && message.senderRole) {
        candidates.push({
          matchedField: "role" as const,
          text: message.senderRole,
          excerpt: `${message.senderName} · ${message.senderRole}`,
          ...roleCandidate,
        });
      }

      const bodyCandidate = scoreField(message.body, tokens, 78, 6, 0);
      if (bodyCandidate.score) {
        candidates.push({
          matchedField: "body" as const,
          text: message.body,
          excerpt: `${message.senderName}: ${compactExcerpt(message.body, bodyCandidate.ranges)}`,
          ...bodyCandidate,
        });
      }
    }

    const bestCandidate = candidates
      .filter((candidate) => candidate.score > 0)
      .sort((left, right) => right.score - left.score)[0];

    if (!bestCandidate) continue;

    hits.push({
      conversationId: conversation.id,
      source: conversation.source,
      title: conversation.title,
      participant,
      excerpt: bestCandidate.excerpt,
      matchedField: bestCandidate.matchedField,
      highlightRanges: findTokenRanges(bestCandidate.excerpt, tokens),
      score:
        bestCandidate.score +
        (conversation.priorityLabel === "High" ? 10 : conversation.priorityLabel === "Medium" ? 4 : 0),
      lastMessageAt: conversation.lastMessageAt,
      priorityLabel: conversation.priorityLabel,
    });
  }

  return hits
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return right.lastMessageAt.localeCompare(left.lastMessageAt);
    })
    .slice(0, 60);
}

export function highlightText(
  text: string,
  ranges: [number, number][],
): Array<{ text: string; highlight: boolean }> {
  if (!ranges.length) return [{ text, highlight: false }];

  const parts: Array<{ text: string; highlight: boolean }> = [];
  let cursor = 0;

  for (const [start, end] of mergeRanges(ranges)) {
    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), highlight: false });
    }

    parts.push({ text: text.slice(start, end), highlight: true });
    cursor = end;
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), highlight: false });
  }

  return parts;
}
