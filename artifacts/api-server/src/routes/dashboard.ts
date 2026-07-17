import { Router } from "express";
import { db, usersTable, postsTable, eventsTable } from "@workspace/db";
import { eq, desc, gt, sql, inArray } from "drizzle-orm";
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

// GET /api/dashboard/summary
router.get("/summary", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const [userCount, postCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(usersTable),
    db.select({ count: sql<number>`count(*)` }).from(postsTable),
  ]);

  const suggestedUsers = await db.select().from(usersTable)
    .where(eq(usersTable.isVerified, true))
    .limit(5);

  const now = new Date();
  const upcomingEvents = await db.select().from(eventsTable)
    .where(gt(eventsTable.startsAt, now))
    .orderBy(eventsTable.startsAt)
    .limit(3);

  const organizerIds = [...new Set(upcomingEvents.map((e) => e.organizerId))];
  const organizers = organizerIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, organizerIds))
    : [];
  const organizerMap = new Map(organizers.map((o) => [o.id, o]));

  return res.json({
    totalUsers: Number(userCount[0]?.count ?? 0),
    activePosts: Number(postCount[0]?.count ?? 0),
    onlineNow: Math.floor(Math.random() * 500) + 100,
    newNotifications: 0,
    trendingHashtags: ["#Technology", "#AI", "#Innovation", "#Design", "#Startup"],
    suggestedUsers: suggestedUsers.map(serializeUser),
    upcomingEvents: upcomingEvents.map((e) => {
      const organizer = organizerMap.get(e.organizerId);
      return {
        id: e.id,
        title: e.title,
        description: e.description ?? null,
        coverUrl: e.coverUrl ?? null,
        organizerId: e.organizerId,
        organizer: organizer ? serializeUser(organizer) : null,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt ? e.endsAt.toISOString() : null,
        eventType: e.eventType,
        location: e.location ?? null,
        streamUrl: e.streamUrl ?? null,
        attendeesCount: e.attendeesCount,
        isAttending: false,
        createdAt: e.createdAt.toISOString(),
      };
    }),
  });
});

export default router;
