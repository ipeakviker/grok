import { db } from "@/db";
import { messages } from "@/db/schema";
import { asc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 200;

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(messages)
      .orderBy(asc(messages.id))
      .limit(HISTORY_LIMIT);
    return Response.json({ ok: true, messages: rows });
  } catch (error) {
    console.error("GET /api/messages failed", error);
    return Response.json({ ok: false, messages: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      role?: string;
      content?: string;
      intent?: string | null;
      mood?: string | null;
    };

    const role = body.role === "jarvis" ? "jarvis" : "user";
    const content = (body.content ?? "").toString().trim();

    if (!content) {
      return Response.json({ ok: false, error: "content is required" }, { status: 400 });
    }

    const [row] = await db
      .insert(messages)
      .values({
        role,
        content: content.slice(0, 4000),
        intent: body.intent ?? null,
        mood: body.mood ?? null,
      })
      .returning();

    return Response.json({ ok: true, message: row });
  } catch (error) {
    console.error("POST /api/messages failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await db.execute(sql`delete from ${messages}`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/messages failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
