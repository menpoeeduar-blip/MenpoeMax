import { pgTable, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const jobTypeEnum = pgEnum("job_type", ["full_time", "part_time", "contract", "freelance", "internship"]);
export const applicationStatusEnum = pgEnum("application_status", ["pending", "reviewing", "shortlisted", "rejected", "hired"]);

export const jobsTable = pgTable("jobs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  companyLogoUrl: text("company_logo_url"),
  location: text("location").notNull(),
  isRemote: boolean("is_remote").notNull().default(false),
  salary: text("salary"),
  jobType: jobTypeEnum("job_type").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements").array().notNull().default([]),
  applicantsCount: integer("applicants_count").notNull().default(0),
  postedById: text("posted_by_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobApplicationsTable = pgTable("job_applications", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobsTable.id),
  applicantId: text("applicant_id").notNull().references(() => usersTable.id),
  coverLetter: text("cover_letter"),
  status: applicationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savedJobsTable = pgTable("saved_jobs", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobsTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ createdAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
export type JobApplication = typeof jobApplicationsTable.$inferSelect;
