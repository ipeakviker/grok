import { db } from "@/db";
import { messages } from "@/db/schema";
import { asc } from "drizzle-orm";
import JarvisApp from "@/components/JarvisApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const history = await db.select().from(messages).orderBy(asc(messages.id)).limit(200);

  const initialMessages = history.map((m) => ({
    id: m.id,
    role: m.role === "jarvis" ? ("jarvis" as const) : ("user" as const),
    content: m.content,
    intent: m.intent,
    mood: m.mood,
    createdAt: m.createdAt.toISOString(),
  }));

  return <JarvisApp initialMessages={initialMessages} />;
}
