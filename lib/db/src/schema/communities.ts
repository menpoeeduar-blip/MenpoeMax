import { pgTable, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const communityVisibilityEnum = pgEnum("community_visibility", ["public", "private", "premium"]);

export const communitiesTable = pgTable("communities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  coverUrl: text("cover_url"),
  avatarUrl: text("avatar_url"),
  visibility: communityVisibilityEnum("visibility").notNull().default("public"),
  membersCount: integer("members_count").notNull().default(0),
  postsCount: integer("posts_count").notNull().default(0),
  ownerId: text("owner_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communityMembersTable = pgTable("community_members", {
  id: text("id").primaryKey(),
  communityId: text("community_id").notNull().references(() => communitiesTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
  isModerator: boolean("is_moderator").notNull().default(false),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommunitySchema = createInsertSchema(communitiesTable).omit({ createdAt: true });
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communitiesTable.$inferSelect;
