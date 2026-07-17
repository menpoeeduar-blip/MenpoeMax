import { Router } from "express";
import { db, usersTable, storiesTable, storyViewsTable, followsTable } from "@workspace/db";
import { eq, and, gt, inArray, desc } from "drizzle-orm";
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

// GET /api/stories
router.get("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const now = new Date();
  const stories = await db.select().from(storiesTable)
    .where(gt(storiesTable.expiresAt, now))
    .orderBy(desc(storiesTable.createdAt));

  const authorIds = [...new Set(stories.map((s) => s.authorId))];
  const authors = authorIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const viewedRows = await db.select().from(storyViewsTable).where(eq(storyViewsTable.viewerId, user.id));
  const viewedIds = new Set(viewedRows.map((v) => v.storyId));

  const grouped = new Map<string, { user: any; stories: any[]; hasUnviewed: boolean }>();
  for (const story of stories) {
    const author = authorMap.get(story.authorId);
    if (!author) continue;
    const isViewed = viewedIds.has(story.id);
    const storyObj = {
      id: story.id,
      authorId: story.authorId,
      author: serializeUser(author),
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType,
      text: story.text ?? null,
      viewsCount: story.viewsCount,
      isViewed,
      createdAt: story.createdAt.toISOString(),
      expiresAt: story.expiresAt.toISOString(),
    };
    if (!grouped.has(story.authorId)) {
      grouped.set(story.authorId, { user: serializeUser(author), stories: [], hasUnviewed: false });
    }
    const group = grouped.get(story.authorId)!;
    group.stories.push(storyObj);
    if (!isViewed) group.hasUnviewed = true;
  }

  return res.json([...grouped.values()]);
});

// POST /api/stories
router.post("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { mediaUrl, mediaType = "image", text } = req.body;
  if (!mediaUrl) return res.status(400).json({ error: "mediaUrl is required" });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const id = generateId();
  await db.insert(storiesTable).values({ id, authorId: user.id, mediaUrl, mediaType: mediaType as any, text, expiresAt });

  return res.status(201).json({
    id,
    authorId: user.id,
    author: serializeUser(user),
    mediaUrl,
    mediaType,
    text: text ?? null,
    viewsCount: 0,
    isViewed: false,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
});

// POST /api/stories/:storyId/view
router.post("/:storyId/view", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { storyId } = req.params;
  const existing = await db.select().from(storyViewsTable)
    .where(and(eq(storyViewsTable.storyId, storyId), eq(storyViewsTable.viewerId, user.id)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(storyViewsTable).values({ id: generateId(), storyId, viewerId: user.id });
    const { sql } = await import("drizzle-orm");
    await db.update(storiesTable).set({ viewsCount: sql`${storiesTable.viewsCount} + 1` }).where(eq(storiesTable.id, storyId));
  }

  return res.json({ viewed: true });
});

export default router;
