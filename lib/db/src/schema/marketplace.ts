import { pgTable, text, real, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const listingConditionEnum = pgEnum("listing_condition", ["new", "like_new", "good", "fair", "for_parts"]);

export const listingsTable = pgTable("listings", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  price: real("price").notNull(),
  currency: text("currency").notNull().default("USD"),
  category: text("category").notNull(),
  condition: listingConditionEnum("condition").notNull(),
  imageUrls: text("image_urls").array().notNull().default([]),
  location: text("location"),
  sellerId: text("seller_id").notNull().references(() => usersTable.id),
  isAvailable: boolean("is_available").notNull().default(true),
  viewsCount: integer("views_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertListingSchema = createInsertSchema(listingsTable).omit({ createdAt: true });
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listingsTable.$inferSelect;
