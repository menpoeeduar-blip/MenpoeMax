import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const streamsTable = pgTable("streams", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  hostId: text("host_id").notNull().references(() => usersTable.id),
  isLive: boolean("is_live").notNull().default(true),
  viewersCount: integer("viewers_count").notNull().default(0),
  peakViewers: integer("peak_viewers").notNull().default(0),
  category: text("category"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStreamSchema = createInsertSchema(streamsTable).omit({ createdAt: true });
export type InsertStream = z.infer<typeof insertStreamSchema>;
export type Stream = typeof streamsTable.$inferSelect;
