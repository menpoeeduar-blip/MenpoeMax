import { Router } from "express";
import { db, usersTable, jobsTable, jobApplicationsTable, savedJobsTable } from "@workspace/db";
import { eq, desc, ilike, and, or, inArray, sql } from "drizzle-orm";
import { getOrCreateUser } from "../lib/clerk";
import { generateId } from "../lib/id";

const router = Router();

function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    clerkId: user.clerkId,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    coverUrl: user.coverUrl ?? null,
    location: user.location ?? null,
    website: user.website ?? null,
    role: user.role,
    isVerified: user.isVerified,
    isPremium: user.isPremium,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    postsCount: user.postsCount,
    isFollowing: false,
    createdAt: user.createdAt.toISOString(),
  };
}

async function serializeJob(job: typeof jobsTable.$inferSelect, userId?: string, savedJobIds?: Set<string>, appliedJobIds?: Set<string>, posterMap?: Map<string, typeof usersTable.$inferSelect>) {
  const poster = posterMap?.get(job.postedById) ?? null;
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    companyLogoUrl: job.companyLogoUrl ?? null,
    location: job.location,
    isRemote: job.isRemote,
    salary: job.salary ?? null,
    jobType: job.jobType,
    description: job.description,
    requirements: job.requirements,
    applicantsCount: job.applicantsCount,
    isSaved: savedJobIds ? savedJobIds.has(job.id) : false,
    hasApplied: appliedJobIds ? appliedJobIds.has(job.id) : false,
    postedById: job.postedById,
    poster: poster ? serializeUser(poster) : null,
    createdAt: job.createdAt.toISOString(),
  };
}

// GET /api/jobs
router.get("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  let jobs = await db.select().from(jobsTable).orderBy(desc(jobsTable.createdAt)).limit(50);

  const { q, location, remote, type } = req.query;
  if (q) jobs = jobs.filter((j) => j.title.toLowerCase().includes((q as string).toLowerCase()) || j.company.toLowerCase().includes((q as string).toLowerCase()));
  if (location) jobs = jobs.filter((j) => j.location.toLowerCase().includes((location as string).toLowerCase()));
  if (remote === "true") jobs = jobs.filter((j) => j.isRemote);
  if (type) jobs = jobs.filter((j) => j.jobType === type);

  const [savedRows, appliedRows] = await Promise.all([
    db.select().from(savedJobsTable).where(eq(savedJobsTable.userId, user.id)),
    db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.applicantId, user.id)),
  ]);
  const savedIds = new Set(savedRows.map((r) => r.jobId));
  const appliedIds = new Set(appliedRows.map((r) => r.jobId));

  const posterIds = [...new Set(jobs.map((j) => j.postedById))];
  const posters = posterIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, posterIds))
    : [];
  const posterMap = new Map(posters.map((p) => [p.id, p]));

  const result = await Promise.all(jobs.map((j) => serializeJob(j, user.id, savedIds, appliedIds, posterMap)));
  return res.json(result);
});

// GET /api/jobs/saved
router.get("/saved", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const savedRows = await db.select().from(savedJobsTable).where(eq(savedJobsTable.userId, user.id));
  const jobIds = savedRows.map((r) => r.jobId);
  if (jobIds.length === 0) return res.json([]);

  const jobs = await db.select().from(jobsTable).where(inArray(jobsTable.id, jobIds));
  const savedIds = new Set(jobIds);
  const appliedRows = await db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.applicantId, user.id));
  const appliedIds = new Set(appliedRows.map((r) => r.jobId));

  const result = await Promise.all(jobs.map((j) => serializeJob(j, user.id, savedIds, appliedIds)));
  return res.json(result);
});

// GET /api/jobs/recommended
router.get("/recommended", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const jobs = await db.select().from(jobsTable).orderBy(desc(jobsTable.createdAt)).limit(5);
  const result = await Promise.all(jobs.map((j) => serializeJob(j)));
  return res.json(result);
});

// GET /api/jobs/:jobId
router.get("/:jobId", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { jobId } = req.params;
  const rows = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Job not found" });

  const savedRows = await db.select().from(savedJobsTable).where(and(eq(savedJobsTable.userId, user.id), eq(savedJobsTable.jobId, jobId)));
  const appliedRows = await db.select().from(jobApplicationsTable).where(and(eq(jobApplicationsTable.applicantId, user.id), eq(jobApplicationsTable.jobId, jobId)));

  return res.json(await serializeJob(rows[0], user.id, new Set(savedRows.map((r) => r.jobId)), new Set(appliedRows.map((r) => r.jobId))));
});

// POST /api/jobs
router.post("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { title, company, location, isRemote = false, salary, jobType, description, requirements = [] } = req.body;
  if (!title || !company || !location || !jobType || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const id = generateId();
  await db.insert(jobsTable).values({ id, title, company, location, isRemote, salary, jobType, description, requirements, postedById: user.id });
  const jobs = await db.select().from(jobsTable).where(eq(jobsTable.id, id)).limit(1);
  return res.status(201).json(await serializeJob(jobs[0]));
});

// POST /api/jobs/:jobId/apply
router.post("/:jobId/apply", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { jobId } = req.params;
  const { coverLetter } = req.body;

  const id = generateId();
  await db.insert(jobApplicationsTable).values({ id, jobId, applicantId: user.id, coverLetter });
  await db.update(jobsTable).set({ applicantsCount: sql`${jobsTable.applicantsCount} + 1` }).where(eq(jobsTable.id, jobId));

  return res.status(201).json({ id, jobId, applicantId: user.id, coverLetter: coverLetter ?? null, status: "pending", createdAt: new Date().toISOString() });
});

// POST /api/jobs/:jobId/save
router.post("/:jobId/save", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { jobId } = req.params;
  const existing = await db.select().from(savedJobsTable).where(and(eq(savedJobsTable.userId, user.id), eq(savedJobsTable.jobId, jobId))).limit(1);

  if (existing.length > 0) {
    await db.delete(savedJobsTable).where(eq(savedJobsTable.id, existing[0].id));
    return res.json({ saved: false });
  } else {
    await db.insert(savedJobsTable).values({ id: generateId(), jobId, userId: user.id });
    return res.json({ saved: true });
  }
});

export default router;
