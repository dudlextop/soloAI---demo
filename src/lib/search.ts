import type { Conversation, Message } from "@/lib/types";

export type SearchResultConversation = {
  type: "conversation";
  conversationId: string;
  title: string;
  snippet: string;
  source: Conversation["source"];
  lastMessageAt: string;
  matches: { field: "title" | "snippet"; indices: [number, number][] };
};

export type SearchResultMessage = {
  type: "message";
  conversationId: string;
  source: Conversation["source"];
  title: string;
  message: Pick<Message, "senderName" | "senderRole" | "body" | "timestamp">;
  matches: { field: "body"; indices: [number, number][] };
};

export type SearchResults = {
  conversations: SearchResultConversation[];
  messages: SearchResultMessage[];
};

function norm(s: string) {
  return s.toLowerCase();
}

function findAllIndices(haystack: string, needle: string): [number, number][] {
  if (!needle) return [];
  const h = norm(haystack);
  const n = norm(needle);
  const out: [number, number][] = [];
  let i = 0;
  while (i < h.length) {
    const idx = h.indexOf(n, i);
    if (idx === -1) break;
    out.push([idx, idx + n.length]);
    i = idx + n.length;
  }
  return out;
}

export function searchAll(conversations: Conversation[], query: string): SearchResults {
  const q = query.trim();
  if (!q) return { conversations: [], messages: [] };

  const conversationsOut: SearchResultConversation[] = [];
  const messagesOut: SearchResultMessage[] = [];

  for (const c of conversations) {
    const titleMatches = findAllIndices(c.title, q);
    const snippetMatches = findAllIndices(c.snippet, q);
    if (titleMatches.length || snippetMatches.length) {
      conversationsOut.push({
        type: "conversation",
        conversationId: c.id,
        title: c.title,
        snippet: c.snippet,
        source: c.source,
        lastMessageAt: c.lastMessageAt,
        matches: {
          field: titleMatches.length ? "title" : "snippet",
          indices: titleMatches.length ? titleMatches : snippetMatches,
        },
      });
    }

    for (const m of c.messages) {
      const bodyMatches = findAllIndices(m.body, q);
      if (bodyMatches.length) {
        messagesOut.push({
          type: "message",
          conversationId: c.id,
          source: c.source,
          title: c.title,
          message: {
            senderName: m.senderName,
            senderRole: m.senderRole,
            body: m.body,
            timestamp: m.timestamp,
          },
          matches: { field: "body", indices: bodyMatches },
        });
      }
    }
  }

  conversationsOut.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  messagesOut.sort((a, b) => b.message.timestamp.localeCompare(a.message.timestamp));

  return { conversations: conversationsOut.slice(0, 30), messages: messagesOut.slice(0, 50) };
}

export function highlightText(
  text: string,
  ranges: [number, number][],
): Array<{ text: string; highlight: boolean }> {
  if (!ranges.length) return [{ text, highlight: false }];
  const merged = [...ranges]
    .sort((a, b) => a[0] - b[0])
    .reduce<[number, number][]>((acc, r) => {
      const last = acc[acc.length - 1];
      if (!last || r[0] > last[1]) acc.push([...r]);
      else last[1] = Math.max(last[1], r[1]);
      return acc;
    }, []);

  const parts: Array<{ text: string; highlight: boolean }> = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), highlight: false });
    parts.push({ text: text.slice(start, end), highlight: true });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), highlight: false });
  return parts;
}

