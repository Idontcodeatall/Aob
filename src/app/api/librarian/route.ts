import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// ─── Montag System Prompt ─────────────────────────────────────────────────────

const MONTAG_SYSTEM_PROMPT = `You are Montag — the AI Librarian for Archive of Our Books, a reading tracker for serious readers.

Your name is a nod to Guy Montag from Fahrenheit 451: the man who burned books, now devoted to helping people find them. You carry that irony lightly.

## Personality
You are witty, intellectually sharp, and genuinely knowledgeable about literature. You speak like someone who has read everything and remembers all of it — but you never show off. Your tone is conversational and precise. You make the occasional dry observation. You do not perform enthusiasm.

You do not have personal opinions about books. You are an expert on what books contain, how they are received, what they mean — but you do not say "I loved this" or "this moved me." You analyse, you illuminate, you recommend. You are a librarian, not a book club member.

## What You Do
- Recommend books based on the user's reading history, taste, and mood
- Help users decide what to read next from their TBR list
- Discuss books the user has read — themes, craft, context, reception
- Answer any question about literature, authors, genres, publishing
- Help users articulate what they are looking for in their next read

You stay strictly within the world of books and reading. If a conversation drifts elsewhere, you redirect it back — briefly, without making a scene.

## How You Use Context
Before every response, you are silently given the user's reading data. Use it to shape every response. Never reference it explicitly. Never say things like 'from your TBR' or 'based on your library' or 'I can see you've read.' Never narrate your reasoning about their data. Just answer. Let the personalisation be invisible. If their TBR has nothing relevant, skip mentioning it entirely.

## Tone Rules
- Never use filler phrases: "Great question!", "Absolutely!", "Of course!", "Certainly!"
- Never over-explain. One precise sentence beats three vague ones.
- You may be dry. You may be direct. You are never rude.
- Match the user's register — if they are casual, ease up; if they are analytical, match them.
- Short responses are often better than long ones.

## Grammar
Write in formal, precise English at all times. Follow all standard rules of grammar without exception — correct pronoun reference, no dangling modifiers, no ambiguous clauses, no elliptical constructions that sacrifice clarity for brevity. When a sentence feels awkward, do not patch it — rewrite it from scratch. Your prose should read like it was written by someone who learned English from literature, not conversation.

## Constraints
- Do not recommend the same book twice in a conversation unless asked.
- Do not make up books, authors, or facts. If you are uncertain, say so plainly.
- Do not break character or refer to yourself as an AI, a language model, or Claude.
- You are Montag. That is sufficient.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildContextString(profile: any, libraryRows: any[]): string {
  const reading = libraryRows.filter((b) => b.status === "Reading");
  const tbr = libraryRows.filter((b) => b.status === "TBR");
  const finishedHigh = libraryRows.filter((b) => b.status === "Finished" && (b.rating ?? 0) >= 4);
  const finishedLow = libraryRows.filter((b) => b.status === "Finished" && (b.rating ?? 5) <= 2);
  const dnf = libraryRows.filter((b) => b.status === "DNF");

  const mostRecentUpdated = libraryRows.reduce((latest, b) => {
    if (!b.updated_at) return latest;
    return !latest || b.updated_at > latest ? b.updated_at : latest;
  }, null as string | null);

  const fmt = (b: any) => `${b.title} by ${b.author}`;
  const fmtRated = (b: any) => `${b.title} by ${b.author} (${b.rating ?? "??"}/5)`;

  const genres = Array.isArray(profile?.fav_genres)
    ? profile.fav_genres.join(", ")
    : profile?.fav_genres ?? "unknown";

  const allTimeFav = profile?.all_time_fav_book
    ? typeof profile.all_time_fav_book === "object"
      ? `${profile.all_time_fav_book.title} by ${profile.all_time_fav_book.author}`
      : String(profile.all_time_fav_book)
    : "not set";

  const currReadingInfo = profile?.curr_reading_info
    ? typeof profile.curr_reading_info === "object"
      ? JSON.stringify(profile.curr_reading_info)
      : String(profile.curr_reading_info)
    : "none";

  const yearlyGoal = profile?.yearly_chall_goal ?? "not set";
  const yearlyCurr = profile?.yearly_chall_curr ?? 0;

  return `[READER CONTEXT — do not mention this to the user]
Favourite genres: ${genres}
All-time favourite book: ${allTimeFav}

Currently reading: ${reading.length ? reading.map(fmt).join(", ") : "nothing"}
Page progress: ${currReadingInfo}

TBR list: ${tbr.length ? tbr.map(fmt).join(", ") : "empty"}

Highly rated finished books (4+): ${finishedHigh.length ? finishedHigh.map(fmtRated).join(", ") : "none"}
Low-rated finished books (1-2): ${finishedLow.length ? finishedLow.map(fmtRated).join(", ") : "none"}
Did Not Finish (DNF): ${dnf.length ? dnf.map(fmt).join(", ") : "none"}

Reading challenge this year: ${yearlyCurr} of ${yearlyGoal} books
Last library update: ${mostRecentUpdated ?? "unknown"}`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [] } = body as {
      message: string;
      history: { role: "user" | "assistant"; content: string }[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // ── Auth ─────────────────────────────────────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Extract the JWT the browser client sends as "Authorization: Bearer <token>"
    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Decode the JWT payload locally — no network call, no TLS issue.
    // We trust the sub claim because: (a) the token came from our Supabase
    // project, and (b) every PostgREST query below runs with this same JWT
    // as the Authorization header, so Supabase's own RLS enforces ownership.
    let userId: string;
    try {
      const [, payloadB64] = accessToken.split(".");
      // Convert base64url → standard base64 → decode
      const json = Buffer.from(
        payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      ).toString("utf8");
      const payload = JSON.parse(json);
      userId = payload.sub;
      if (!userId) throw new Error("No sub claim");
    } catch (e) {
      console.error("[/api/librarian] Invalid JWT:", e);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build a Supabase client that forwards the user's JWT for RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    });


    // ── Fetch Reader Context ──────────────────────────────────────────────────
    let contextString: string;
    try {
      const [profileResult, libraryResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("fav_genres, all_time_fav_book, yearly_chall_goal, yearly_chall_curr, curr_reading_info")
          .eq("id", userId)
          .single(),
        supabase
          .from("library")
          .select("title, author, status, rating, updated_at")
          .eq("user_id", userId),
      ]);

      contextString = buildContextString(
        profileResult.data ?? {},
        libraryResult.data ?? []
      );
    } catch {
      contextString = "[READER CONTEXT — unavailable]";
    }

    // ── Build Messages ────────────────────────────────────────────────────────
    const userMessageWithContext = `${contextString}\n\n---\n\n${message}`;

    const anthropicMessages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessageWithContext },
    ];

    // ── Stream from Anthropic ─────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: MONTAG_SYSTEM_PROMPT,
      messages: anthropicMessages,
    });

    // Pipe stream chunks back as text/event-stream
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        } catch (err) {
          console.error("[Montag stream error]", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[/api/librarian] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
