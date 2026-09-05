import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Conversation log for the Jarvis assistant. The "brain" (intent routing,
// math, jokes, memory) runs in Rust/WebAssembly on the client; the server
// only persists the resulting dialogue so it survives page reloads.
export const messages = pgTable("jarvis_messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // "user" | "jarvis"
  content: text("content").notNull(),
  intent: text("intent"),
  mood: text("mood"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
