import { Router } from "express";
import { db, usersTable, notificationsTable } from "@workspace/db";
import { eq, desc, inArray, and } from "drizzle-orm";
import { getOrCreateUser } from "../lib/clerk";

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

// GET /api/notifications
router.get("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  const actorIds = notifications.map((n) => n.actorId).filter(Boolean) as string[];
  const actors = actorIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, actorIds))
    : [];
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  const result = notifications.map((n) => {
    const actor = n.actorId ? actorMap.get(n.actorId) : undefined;
    return {
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      actionUrl: n.actionUrl ?? null,
      actor: actor ? serializeUser(actor) : undefined,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    };
  });

  return res.json(result);
});

// GET /api/notifications/unread-count
router.get("/unread-count", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { sql } = await import("drizzle-orm");
  const rows = await db.select({ count: sql<number>`count(*)` }).from(notificationsTable)
    .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));
  return res.json({ count: Number(rows[0]?.count ?? 0) });
});

// POST /api/notifications/read-all
router.post("/read-all", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, user.id));

  return res.json({ success: true, message: null });
});

export default router;
