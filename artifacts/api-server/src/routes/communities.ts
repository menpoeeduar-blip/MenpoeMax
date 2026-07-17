import { Router } from "express";
import { db, usersTable, communitiesTable, communityMembersTable } from "@workspace/db";
import { eq, desc, inArray, and, sql } from "drizzle-orm";
import { getOrCreateUser } from "../lib/clerk";
import { generateId } from "../lib/id";

const router = Router();

async function serializeCommunity(community: typeof communitiesTable.$inferSelect, userId?: string, memberSet?: Set<string>, modSet?: Set<string>) {
  return {
    id: community.id,
    name: community.name,
    slug: community.slug,
    description: community.description ?? null,
    coverUrl: community.coverUrl ?? null,
    avatarUrl: community.avatarUrl ?? null,
    visibility: community.visibility,
    membersCount: community.membersCount,
    postsCount: community.postsCount,
    isJoined: memberSet ? memberSet.has(community.id) : false,
    isModerator: modSet ? modSet.has(community.id) : false,
    createdAt: community.createdAt.toISOString(),
  };
}

// GET /api/communities
router.get("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  let communities = await db.select().from(communitiesTable).orderBy(desc(communitiesTable.membersCount)).limit(50);

  const { q, joined } = req.query;
  const memberRows = await db.select().from(communityMembersTable).where(eq(communityMembersTable.userId, user.id));
  const joinedIds = new Set(memberRows.map((m) => m.communityId));
  const modIds = new Set(memberRows.filter((m) => m.isModerator).map((m) => m.communityId));

  if (q) communities = communities.filter((c) => c.name.toLowerCase().includes((q as string).toLowerCase()));
  if (joined === "true") communities = communities.filter((c) => joinedIds.has(c.id));

  const result = await Promise.all(communities.map((c) => serializeCommunity(c, user.id, joinedIds, modIds)));
  return res.json(result);
});

// GET /api/communities/suggested
router.get("/suggested", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const memberRows = await db.select().from(communityMembersTable).where(eq(communityMembersTable.userId, user.id));
  const joinedIds = new Set(memberRows.map((m) => m.communityId));

  const communities = await db.select().from(communitiesTable).orderBy(desc(communitiesTable.membersCount)).limit(20);
  const notJoined = communities.filter((c) => !joinedIds.has(c.id)).slice(0, 6);
  const result = await Promise.all(notJoined.map((c) => serializeCommunity(c)));
  return res.json(result);
});

// GET /api/communities/:communityId
router.get("/:communityId", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { communityId } = req.params;
  const rows = await db.select().from(communitiesTable).where(eq(communitiesTable.id, communityId)).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Community not found" });

  const memberRows = await db.select().from(communityMembersTable).where(and(eq(communityMembersTable.communityId, communityId), eq(communityMembersTable.userId, user.id)));
  const joinedIds = new Set(memberRows.map((m) => m.communityId));
  const modIds = new Set(memberRows.filter((m) => m.isModerator).map((m) => m.communityId));

  return res.json(await serializeCommunity(rows[0], user.id, joinedIds, modIds));
});

// POST /api/communities
router.post("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { name, description, visibility = "public", coverUrl } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();
  const id = generateId();
  await db.insert(communitiesTable).values({ id, name, slug, description, visibility, coverUrl, ownerId: user.id });
  await db.insert(communityMembersTable).values({ id: generateId(), communityId: id, userId: user.id, isModerator: true });

  const communities = await db.select().from(communitiesTable).where(eq(communitiesTable.id, id)).limit(1);
  return res.status(201).json(await serializeCommunity(communities[0], user.id, new Set([id]), new Set([id])));
});

// POST /api/communities/:communityId/join
router.post("/:communityId/join", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { communityId } = req.params;
  const existing = await db.select().from(communityMembersTable)
    .where(and(eq(communityMembersTable.communityId, communityId), eq(communityMembersTable.userId, user.id)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(communityMembersTable).values({ id: generateId(), communityId, userId: user.id });
    await db.update(communitiesTable).set({ membersCount: sql`${communitiesTable.membersCount} + 1` }).where(eq(communitiesTable.id, communityId));
  }

  return res.json({ success: true, message: null });
});

export default router;
