import { pgTable, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const eventTypeEnum = pgEnum("event_type", ["online", "in_person", "hybrid"]);

export const eventsTable = pgTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  organizerId: text("organizer_id").notNull().references(() => usersTable.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  eventType: eventTypeEnum("event_type").notNull(),
  location: text("location"),
  streamUrl: text("stream_url"),
  attendeesCount: integer("attendees_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventAttendeesTable = pgTable("event_attendees", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => eventsTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
