import { NextResponse } from "next/server";
import type { Conversation } from "@/lib/types";
import { generateDraftReply } from "@/lib/draft";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { conversation?: Conversation };
    if (!body.conversation) {
      return NextResponse.json(
        { error: "Missing conversation" },
        { status: 400 },
      );
    }

    const draft = generateDraftReply(body.conversation);
    return NextResponse.json({ draft });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

