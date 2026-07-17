import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);

export const storiesTable = pgTable("stories", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => usersTable.id),
  mediaUrl: text("media_url").notNull(),
  mediaType: mediaTypeEnum("media_type").notNull(),
  text: text("text"),
  viewsCount: integer("views_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const storyViewsTable = pgTable("story_views", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().references(() => storiesTable.id),
  viewerId: text("viewer_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStorySchema = createInsertSchema(storiesTable).omit({ createdAt: true });
export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof storiesTable.$inferSelect;
