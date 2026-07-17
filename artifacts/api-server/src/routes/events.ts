import { Router } from "express";
import { db, usersTable, eventsTable, eventAttendeesTable } from "@workspace/db";
import { eq, desc, inArray, and, sql, gt } from "drizzle-orm";
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

async function serializeEvent(event: typeof eventsTable.$inferSelect, organizerMap: Map<string, typeof usersTable.$inferSelect>, attendingIds?: Set<string>) {
  const organizer = organizerMap.get(event.organizerId);
  if (!organizer) return null;
  return {
    id: event.id,
    title: event.title,
    description: event.description ?? null,
    coverUrl: event.coverUrl ?? null,
    organizerId: event.organizerId,
    organizer: serializeUser(organizer),
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    eventType: event.eventType,
    location: event.location ?? null,
    streamUrl: event.streamUrl ?? null,
    attendeesCount: event.attendeesCount,
    isAttending: attendingIds ? attendingIds.has(event.id) : false,
    createdAt: event.createdAt.toISOString(),
  };
}

// GET /api/events
router.get("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  let events = await db.select().from(eventsTable).orderBy(eventsTable.startsAt).limit(50);

  if (req.query.upcoming === "true") {
    const now = new Date();
    events = events.filter((e) => e.startsAt > now);
  }

  const organizerIds = [...new Set(events.map((e) => e.organizerId))];
  const organizers = organizerIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, organizerIds))
    : [];
  const organizerMap = new Map(organizers.map((o) => [o.id, o]));

  const attendingRows = await db.select().from(eventAttendeesTable).where(eq(eventAttendeesTable.userId, user.id));
  const attendingIds = new Set(attendingRows.map((r) => r.eventId));

  const result = (await Promise.all(events.map((e) => serializeEvent(e, organizerMap, attendingIds)))).filter(Boolean);
  return res.json(result);
});

// GET /api/events/:eventId
router.get("/:eventId", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { eventId } = req.params;
  const rows = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Event not found" });

  const organizer = await db.select().from(usersTable).where(eq(usersTable.id, rows[0].organizerId)).limit(1);
  const organizerMap = new Map(organizer.map((o) => [o.id, o]));

  const attendingRows = await db.select().from(eventAttendeesTable)
    .where(and(eq(eventAttendeesTable.eventId, eventId), eq(eventAttendeesTable.userId, user.id)));
  const attendingIds = new Set(attendingRows.map((r) => r.eventId));

  return res.json(await serializeEvent(rows[0], organizerMap, attendingIds));
});

// POST /api/events
router.post("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { title, description, coverUrl, startsAt, endsAt, eventType, location } = req.body;
  if (!title || !startsAt || !eventType) return res.status(400).json({ error: "Missing required fields" });

  const id = generateId();
  await db.insert(eventsTable).values({
    id, title, description, coverUrl,
    organizerId: user.id,
    startsAt: new Date(startsAt),
    endsAt: endsAt ? new Date(endsAt) : undefined,
    eventType,
    location,
  });
  const events = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
  const organizerMap = new Map([[user.id, user]]);
  return res.status(201).json(await serializeEvent(events[0], organizerMap, new Set()));
});

// POST /api/events/:eventId/attend
router.post("/:eventId/attend", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { eventId } = req.params;
  const existing = await db.select().from(eventAttendeesTable)
    .where(and(eq(eventAttendeesTable.eventId, eventId), eq(eventAttendeesTable.userId, user.id)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(eventAttendeesTable).values({ id: generateId(), eventId, userId: user.id });
    await db.update(eventsTable).set({ attendeesCount: sql`${eventsTable.attendeesCount} + 1` }).where(eq(eventsTable.id, eventId));
  }

  return res.json({ success: true, message: null });
});

export default router;
