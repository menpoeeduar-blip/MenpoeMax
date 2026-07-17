import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const friendStatusEnum = pgEnum("friend_status", ["pending", "accepted", "rejected"]);

export const friendsTable = pgTable("friends", {
  id: text("id").primaryKey(),
  requesterId: text("requester_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  addresseeId: text("addressee_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: friendStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Friend = typeof friendsTable.$inferSelect;
