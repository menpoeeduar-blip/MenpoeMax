import { Router } from "express";
import {
  db, usersTable, followsTable, postsTable,
  userSkillsTable, userExperienceTable, userEducationTable,
  userLanguagesTable, userLinksTable,
} from "@workspace/db";
import { eq, ne, sql, ilike, and, inArray } from "drizzle-orm";
import { getOrCreateUser } from "../lib/clerk";
import { generateId } from "../lib/id";

const router = Router();

async function buildUserExtras(userId: string) {
  const [skills, experience, education, languages, socialLinks] = await Promise.all([
    db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, userId)),
    db.select().from(userExperienceTable).where(eq(userExperienceTable.userId, userId)),
    db.select().from(userEducationTable).where(eq(userEducationTable.userId, userId)),
    db.select().from(userLanguagesTable).where(eq(userLanguagesTable.userId, userId)),
    db.select().from(userLinksTable).where(eq(userLinksTable.userId, userId)),
  ]);
  return {
    skills: skills.map((s) => ({ id: s.id, skill: s.skill, level: s.level })),
    experience: experience.map((e) => ({
      id: e.id, company: e.company, title: e.title, description: e.description,
      startDate: e.startDate, endDate: e.endDate, current: e.current,
    })),
    education: education.map((e) => ({
      id: e.id, institution: e.institution, degree: e.degree, field: e.field,
      startYear: e.startYear, endYear: e.endYear, current: e.current,
    })),
    languages: languages.map((l) => ({ id: l.id, language: l.language, proficiency: l.proficiency })),
    socialLinks: socialLinks.map((l) => ({ id: l.id, platform: l.platform, url: l.url })),
  };
}

function serializeUser(user: typeof usersTable.$inferSelect, extras?: { isFollowing?: boolean; extended?: any }) {
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
    birthDate: user.birthDate ?? null,
    gender: user.gender ?? null,
    phone: user.phone ?? null,
    role: user.role,
    isVerified: user.isVerified,
    isPremium: user.isPremium,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    postsCount: user.postsCount,
    isFollowing: extras?.isFollowing ?? false,
    skills: extras?.extended?.skills ?? [],
    experience: extras?.extended?.experience ?? [],
    education: extras?.extended?.education ?? [],
    languages: extras?.extended?.languages ?? [],
    socialLinks: extras?.extended?.socialLinks ?? [],
    createdAt: user.createdAt.toISOString(),
  };
}

// GET /api/users/me
router.get("/me", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const extended = await buildUserExtras(user.id);
  return res.json(serializeUser(user, { extended }));
});

// PATCH /api/users/me
router.patch("/me", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const {
    displayName, bio, location, website, avatarUrl, coverUrl,
    birthDate, gender, phone, role,
    skills, experience, education, languages, socialLinks,
  } = req.body;

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (bio !== undefined) updates.bio = bio;
  if (location !== undefined) updates.location = location;
  if (website !== undefined) updates.website = website;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (coverUrl !== undefined) updates.coverUrl = coverUrl;
  if (birthDate !== undefined) updates.birthDate = birthDate;
  if (gender !== undefined) updates.gender = gender;
  if (phone !== undefined) updates.phone = phone;
  if (role !== undefined) updates.role = role as any;

  await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));

  // Sync arrays
  if (skills !== undefined) {
    await db.delete(userSkillsTable).where(eq(userSkillsTable.userId, user.id));
    for (const s of skills) {
      await db.insert(userSkillsTable).values({ id: generateId(), userId: user.id, skill: s.skill, level: s.level ?? "beginner" });
    }
  }
  if (experience !== undefined) {
    await db.delete(userExperienceTable).where(eq(userExperienceTable.userId, user.id));
    for (const e of experience) {
      await db.insert(userExperienceTable).values({
        id: generateId(), userId: user.id,
        company: e.company, title: e.title, description: e.description,
        startDate: e.startDate, endDate: e.endDate, current: e.current ?? false,
      });
    }
  }
  if (education !== undefined) {
    await db.delete(userEducationTable).where(eq(userEducationTable.userId, user.id));
    for (const e of education) {
      await db.insert(userEducationTable).values({
        id: generateId(), userId: user.id,
        institution: e.institution, degree: e.degree, field: e.field,
        startYear: e.startYear, endYear: e.endYear, current: e.current ?? false,
      });
    }
  }
  if (languages !== undefined) {
    await db.delete(userLanguagesTable).where(eq(userLanguagesTable.userId, user.id));
    for (const l of languages) {
      await db.insert(userLanguagesTable).values({
        id: generateId(), userId: user.id, language: l.language, proficiency: l.proficiency ?? "conversational",
      });
    }
  }
  if (socialLinks !== undefined) {
    await db.delete(userLinksTable).where(eq(userLinksTable.userId, user.id));
    for (const l of socialLinks) {
      await db.insert(userLinksTable).values({
        id: generateId(), userId: user.id, platform: l.platform, url: l.url,
      });
    }
  }

  const updated = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
  const extended = await buildUserExtras(user.id);
  return res.json(serializeUser(updated[0], { extended }));
});

// GET /api/users/me/stats
router.get("/me/stats", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const postRows = await db.select({ count: sql<number>`count(*)` }).from(postsTable).where(eq(postsTable.authorId, user.id));
  return res.json({
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    postsCount: user.postsCount,
    likesReceived: 0,
    viewsReceived: 0,
  });
});

// GET /api/users/suggestions
router.get("/suggestions", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const users = await db.select().from(usersTable).where(ne(usersTable.id, user.id)).limit(8);
  return res.json(users.map((u) => serializeUser(u)));
});

// GET /api/users/search
router.get("/search", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const q = req.query.q as string;
  if (!q) return res.json([]);

  const users = await db.select().from(usersTable).where(ilike(usersTable.displayName, `%${q}%`)).limit(20);
  return res.json(users.map((u) => serializeUser(u)));
});

// GET /api/users/:userId
router.get("/:userId", async (req, res) => {
  const currentUser = await getOrCreateUser(req);
  if (!currentUser) return res.status(401).json({ error: "Unauthorized" });

  const { userId } = req.params;
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "User not found" });

  const targetUser = rows[0];
  const followRow = await db.select().from(followsTable)
    .where(and(eq(followsTable.followerId, currentUser.id), eq(followsTable.followingId, targetUser.id)))
    .limit(1);

  const extended = await buildUserExtras(targetUser.id);
  return res.json(serializeUser(targetUser, { isFollowing: followRow.length > 0, extended }));
});

// POST /api/users/:userId/follow
router.post("/:userId/follow", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { userId } = req.params;
  const existing = await db.select().from(followsTable)
    .where(and(eq(followsTable.followerId, user.id), eq(followsTable.followingId, userId)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(followsTable).values({ id: generateId(), followerId: user.id, followingId: userId });
    await db.update(usersTable).set({ followersCount: sql`${usersTable.followersCount} + 1` }).where(eq(usersTable.id, userId));
    await db.update(usersTable).set({ followingCount: sql`${usersTable.followingCount} + 1` }).where(eq(usersTable.id, user.id));
  }

  const target = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return res.json({ following: true, followersCount: target[0]?.followersCount ?? 0 });
});

// DELETE /api/users/:userId/follow
router.delete("/:userId/follow", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { userId } = req.params;
  const existing = await db.select().from(followsTable)
    .where(and(eq(followsTable.followerId, user.id), eq(followsTable.followingId, userId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(followsTable).where(and(eq(followsTable.followerId, user.id), eq(followsTable.followingId, userId)));
    await db.update(usersTable).set({ followersCount: sql`GREATEST(${usersTable.followersCount} - 1, 0)` }).where(eq(usersTable.id, userId));
    await db.update(usersTable).set({ followingCount: sql`GREATEST(${usersTable.followingCount} - 1, 0)` }).where(eq(usersTable.id, user.id));
  }

  const target = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return res.json({ following: false, followersCount: target[0]?.followersCount ?? 0 });
});

// GET /api/users/me/friends
router.get("/me/friends", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const following = await db.select({ userId: followsTable.followingId })
    .from(followsTable).where(eq(followsTable.followerId, user.id));
  const followedByMe = new Set(following.map((r) => r.userId));

  const followers = await db.select({ userId: followsTable.followerId })
    .from(followsTable).where(eq(followsTable.followingId, user.id));
  const followerIds = new Set(followers.map((r) => r.userId));

  const mutualIds = [...followedByMe].filter((id) => followerIds.has(id));

  const friends = mutualIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, mutualIds))
    : [];

  return res.json({ friends: friends.map((u) => serializeUser(u)), incoming: [] });
});

// POST /api/users/:userId/friends
router.post("/:userId/friends", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  return res.json({ status: "pending" });
});

export default router;
