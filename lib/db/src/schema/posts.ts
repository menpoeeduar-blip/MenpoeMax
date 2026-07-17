import { pgTable, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const postTypeEnum = pgEnum("post_type", ["text", "image", "video", "audio", "reel", "poll", "gif"]);
export const reactionTypeEnum = pgEnum("reaction_type", ["like", "love", "haha", "wow", "sad", "angry"]);

export const postsTable = pgTable("posts", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  postType: postTypeEnum("post_type").notNull().default("text"),
  mediaUrls: text("media_urls").array().notNull().default([]),
  thumbnailUrl: text("thumbnail_url"),
  hashtags: text("hashtags").array().notNull().default([]),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  sharesCount: integer("shares_count").notNull().default(0),
  viewsCount: integer("views_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const postReactionsTable = pgTable("post_reactions", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => postsTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
  reaction: reactionTypeEnum("reaction").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savedPostsTable = pgTable("saved_posts", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => postsTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commentsTable = pgTable("comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => postsTable.id),
  authorId: text("author_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  parentId: text("parent_id"),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({ createdAt: true, updatedAt: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;
export type Comment = typeof commentsTable.$inferSelect;
