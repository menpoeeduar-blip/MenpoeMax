import { Router } from "express";
import { db, usersTable, streamsTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
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

async function serializeStream(stream: typeof streamsTable.$inferSelect, hostMap: Map<string, typeof usersTable.$inferSelect>) {
  const host = hostMap.get(stream.hostId);
  if (!host) return null;
  return {
    id: stream.id,
    title: stream.title,
    description: stream.description ?? null,
    thumbnailUrl: stream.thumbnailUrl ?? null,
    hostId: stream.hostId,
    host: serializeUser(host),
    isLive: stream.isLive,
    viewersCount: stream.viewersCount,
    peakViewers: stream.peakViewers,
    category: stream.category ?? null,
    startedAt: stream.startedAt ? stream.startedAt.toISOString() : null,
    endedAt: stream.endedAt ? stream.endedAt.toISOString() : null,
    createdAt: stream.createdAt.toISOString(),
  };
}

// GET /api/streams
router.get("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const streams = await db.select().from(streamsTable)
    .where(eq(streamsTable.isLive, true))
    .orderBy(desc(streamsTable.viewersCount))
    .limit(20);

  const hostIds = [...new Set(streams.map((s) => s.hostId))];
  const hosts = hostIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, hostIds))
    : [];
  const hostMap = new Map(hosts.map((h) => [h.id, h]));

  const result = (await Promise.all(streams.map((s) => serializeStream(s, hostMap)))).filter(Boolean);
  return res.json(result);
});

// GET /api/streams/:streamId
router.get("/:streamId", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { streamId } = req.params;
  const rows = await db.select().from(streamsTable).where(eq(streamsTable.id, streamId)).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Stream not found" });

  const host = await db.select().from(usersTable).where(eq(usersTable.id, rows[0].hostId)).limit(1);
  const hostMap = new Map(host.map((h) => [h.id, h]));
  return res.json(await serializeStream(rows[0], hostMap));
});

// POST /api/streams
router.post("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { title, description, thumbnailUrl, category } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });

  const id = generateId();
  await db.insert(streamsTable).values({ id, title, description, thumbnailUrl, hostId: user.id, category, startedAt: new Date() });
  const streams = await db.select().from(streamsTable).where(eq(streamsTable.id, id)).limit(1);
  const hostMap = new Map([[user.id, user]]);
  return res.status(201).json(await serializeStream(streams[0], hostMap));
});

// POST /api/streams/:streamId/end
router.post("/:streamId/end", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { streamId } = req.params;
  await db.update(streamsTable).set({ isLive: false, endedAt: new Date() })
    .where(eq(streamsTable.id, streamId));

  return res.json({ success: true, message: null });
});

export default router;
