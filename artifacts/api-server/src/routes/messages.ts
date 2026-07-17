import { Router } from "express";
import { db, usersTable, conversationsTable, conversationParticipantsTable, messagesTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
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

// GET /api/conversations
router.get("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const participantRows = await db.select().from(conversationParticipantsTable)
    .where(eq(conversationParticipantsTable.userId, user.id));
  const convIds = participantRows.map((p) => p.conversationId);
  if (convIds.length === 0) return res.json([]);

  const conversations = await db.select().from(conversationsTable)
    .where(inArray(conversationsTable.id, convIds))
    .orderBy(desc(conversationsTable.updatedAt));

  const allParticipants = await db.select().from(conversationParticipantsTable)
    .where(inArray(conversationParticipantsTable.conversationId, convIds));

  const userIds = [...new Set(allParticipants.map((p) => p.userId))];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const lastMessages = await db.select().from(messagesTable)
    .where(inArray(messagesTable.conversationId, convIds))
    .orderBy(desc(messagesTable.createdAt));
  const lastMsgMap = new Map<string, typeof messagesTable.$inferSelect>();
  for (const msg of lastMessages) {
    if (!lastMsgMap.has(msg.conversationId)) lastMsgMap.set(msg.conversationId, msg);
  }

  const result = conversations.map((conv) => {
    const participants = allParticipants
      .filter((p) => p.conversationId === conv.id)
      .map((p) => userMap.get(p.userId))
      .filter(Boolean)
      .map((u) => serializeUser(u!));

    const lastMsg = lastMsgMap.get(conv.id);
    const sender = lastMsg ? userMap.get(lastMsg.senderId) : undefined;

    return {
      id: conv.id,
      participants,
      lastMessage: lastMsg && sender ? {
        id: lastMsg.id,
        conversationId: lastMsg.conversationId,
        senderId: lastMsg.senderId,
        sender: serializeUser(sender),
        content: lastMsg.content,
        mediaUrl: lastMsg.mediaUrl ?? null,
        mediaType: lastMsg.mediaType ?? null,
        isRead: lastMsg.isRead,
        isEdited: lastMsg.isEdited,
        createdAt: lastMsg.createdAt.toISOString(),
      } : undefined,
      isGroup: conv.isGroup,
      groupName: conv.groupName ?? null,
      unreadCount: 0,
      createdAt: conv.createdAt.toISOString(),
    };
  });

  return res.json(result);
});

// POST /api/conversations
router.post("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { participantIds, isGroup = false, groupName } = req.body;
  if (!participantIds || !Array.isArray(participantIds)) {
    return res.status(400).json({ error: "participantIds is required" });
  }

  const convId = generateId();
  await db.insert(conversationsTable).values({ id: convId, isGroup, groupName });

  const allIds = [...new Set([user.id, ...participantIds])];
  for (const uid of allIds) {
    await db.insert(conversationParticipantsTable).values({ id: generateId(), conversationId: convId, userId: uid });
  }

  const users = await db.select().from(usersTable).where(inArray(usersTable.id, allIds));

  return res.json({
    id: convId,
    participants: users.map(serializeUser),
    lastMessage: undefined,
    isGroup,
    groupName: groupName ?? null,
    unreadCount: 0,
    createdAt: new Date().toISOString(),
  });
});

// GET /api/conversations/:conversationId/messages
router.get("/:conversationId/messages", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { conversationId } = req.params;
  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(50);

  const senderIds = [...new Set(messages.map((m) => m.senderId))];
  const senders = senderIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, senderIds))
    : [];
  const senderMap = new Map(senders.map((s) => [s.id, s]));

  const result = messages.map((msg) => {
    const sender = senderMap.get(msg.senderId);
    if (!sender) return null;
    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      sender: serializeUser(sender),
      content: msg.content,
      mediaUrl: msg.mediaUrl ?? null,
      mediaType: msg.mediaType ?? null,
      isRead: msg.isRead,
      isEdited: msg.isEdited,
      createdAt: msg.createdAt.toISOString(),
    };
  }).filter(Boolean).reverse();

  return res.json(result);
});

// POST /api/conversations/:conversationId/messages
router.post("/:conversationId/messages", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { conversationId } = req.params;
  const { content, mediaUrl, mediaType } = req.body;
  if (!content) return res.status(400).json({ error: "content is required" });

  const msgId = generateId();
  await db.insert(messagesTable).values({ id: msgId, conversationId, senderId: user.id, content, mediaUrl, mediaType });
  await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));

  return res.status(201).json({
    id: msgId,
    conversationId,
    senderId: user.id,
    sender: serializeUser(user),
    content,
    mediaUrl: mediaUrl ?? null,
    mediaType: mediaType ?? null,
    isRead: false,
    isEdited: false,
    createdAt: new Date().toISOString(),
  });
});

export default router;
