import { Router } from "express";
import { db, usersTable, postsTable, commentsTable, postReactionsTable, savedPostsTable } from "@workspace/db";
import { eq, desc, sql, and, ilike, inArray } from "drizzle-orm";
import { getOrCreateUser } from "../lib/clerk";
import { generateId } from "../lib/id";

const router = Router();

async function serializePost(
  post: typeof postsTable.$inferSelect,
  authorMap: Map<string, typeof usersTable.$inferSelect>,
  userId?: string
) {
  const author = authorMap.get(post.authorId);
  if (!author) return null;
  return {
    id: post.id,
    authorId: post.authorId,
    author: {
      id: author.id,
      clerkId: author.clerkId,
      username: author.username,
      displayName: author.displayName,
      bio: author.bio ?? null,
      avatarUrl: author.avatarUrl ?? null,
      coverUrl: author.coverUrl ?? null,
      location: author.location ?? null,
      website: author.website ?? null,
      role: author.role,
      isVerified: author.isVerified,
      isPremium: author.isPremium,
      followersCount: author.followersCount,
      followingCount: author.followingCount,
      postsCount: author.postsCount,
      isFollowing: false,
      createdAt: author.createdAt.toISOString(),
    },
    content: post.content,
    postType: post.postType,
    mediaUrls: post.mediaUrls,
    thumbnailUrl: post.thumbnailUrl ?? null,
    hashtags: post.hashtags,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    sharesCount: post.sharesCount,
    userReaction: null as string | null,
    isSaved: false,
    isShared: false,
    viewsCount: post.viewsCount,
    createdAt: post.createdAt.toISOString(),
  };
}

// GET /api/posts (feed)
router.get("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(limit);

  const authorIds = [...new Set(posts.map((p) => p.authorId))];
  const authors = authorIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const serialized = (await Promise.all(posts.map((p) => serializePost(p, authorMap, user.id)))).filter(Boolean);
  return res.json({ posts: serialized, nextCursor: null, hasMore: false });
});

// POST /api/posts
router.post("/", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { content, postType = "text", mediaUrls = [], hashtags = [] } = req.body;
  if (!content) return res.status(400).json({ error: "content is required" });

  const id = generateId();
  await db.insert(postsTable).values({
    id,
    authorId: user.id,
    content,
    postType: postType as any,
    mediaUrls,
    hashtags,
  });
  await db.update(usersTable).set({ postsCount: sql`${usersTable.postsCount} + 1` }).where(eq(usersTable.id, user.id));

  const posts = await db.select().from(postsTable).where(eq(postsTable.id, id)).limit(1);
  const authorMap = new Map([[user.id, user]]);
  const serialized = await serializePost(posts[0], authorMap, user.id);
  return res.status(201).json(serialized);
});

// GET /api/posts/trending
router.get("/trending", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const posts = await db.select().from(postsTable).orderBy(desc(postsTable.likesCount)).limit(10);
  const authorIds = [...new Set(posts.map((p) => p.authorId))];
  const authors = authorIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const serialized = (await Promise.all(posts.map((p) => serializePost(p, authorMap, user.id)))).filter(Boolean);
  return res.json(serialized);
});

// GET /api/posts/reels
router.get("/reels", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const posts = await db.select().from(postsTable)
    .where(eq(postsTable.postType, "reel"))
    .orderBy(desc(postsTable.createdAt))
    .limit(20);
  const authorIds = [...new Set(posts.map((p) => p.authorId))];
  const authors = authorIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const serialized = (await Promise.all(posts.map((p) => serializePost(p, authorMap, user.id)))).filter(Boolean);
  return res.json({ posts: serialized, nextCursor: null, hasMore: false });
});

// GET /api/posts/saved
router.get("/saved", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const saved = await db.select().from(savedPostsTable).where(eq(savedPostsTable.userId, user.id));
  const postIds = saved.map((s) => s.postId);
  if (postIds.length === 0) return res.json([]);

  const posts = await db.select().from(postsTable).where(inArray(postsTable.id, postIds));
  const authorIds = [...new Set(posts.map((p) => p.authorId))];
  const authors = authorIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const serialized = (await Promise.all(posts.map((p) => serializePost(p, authorMap, user.id)))).filter(Boolean);
  return res.json(serialized);
});

// GET /api/posts/hashtag/:tag
router.get("/hashtag/:tag", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { tag } = req.params;
  const allPosts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(50);
  const filtered = allPosts.filter((p) => p.hashtags.includes(tag));
  const authorIds = [...new Set(filtered.map((p) => p.authorId))];
  const authors = authorIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const serialized = (await Promise.all(filtered.map((p) => serializePost(p, authorMap, user.id)))).filter(Boolean);
  return res.json(serialized);
});

// GET /api/posts/:postId
router.get("/:postId", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { postId } = req.params;
  const rows = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Post not found" });

  const post = rows[0];
  const authors = await db.select().from(usersTable).where(eq(usersTable.id, post.authorId)).limit(1);
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  return res.json(await serializePost(post, authorMap, user.id));
});

// DELETE /api/posts/:postId
router.delete("/:postId", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { postId } = req.params;
  await db.delete(postsTable).where(and(eq(postsTable.id, postId), eq(postsTable.authorId, user.id)));
  return res.status(204).send();
});

// POST /api/posts/:postId/like
router.post("/:postId/like", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { postId } = req.params;
  const { reaction = "like" } = req.body;

  const existing = await db.select().from(postReactionsTable)
    .where(and(eq(postReactionsTable.postId, postId), eq(postReactionsTable.userId, user.id)))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].reaction === reaction) {
      await db.delete(postReactionsTable).where(eq(postReactionsTable.id, existing[0].id));
      await db.update(postsTable).set({ likesCount: sql`GREATEST(${postsTable.likesCount} - 1, 0)` }).where(eq(postsTable.id, postId));
      const updated = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
      return res.json({ reaction: null, likesCount: updated[0]?.likesCount ?? 0 });
    } else {
      await db.update(postReactionsTable).set({ reaction: reaction as any }).where(eq(postReactionsTable.id, existing[0].id));
    }
  } else {
    await db.insert(postReactionsTable).values({ id: generateId(), postId, userId: user.id, reaction: reaction as any });
    await db.update(postsTable).set({ likesCount: sql`${postsTable.likesCount} + 1` }).where(eq(postsTable.id, postId));
  }

  const updated = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  return res.json({ reaction, likesCount: updated[0]?.likesCount ?? 0 });
});

// POST /api/posts/:postId/save
router.post("/:postId/save", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { postId } = req.params;
  const existing = await db.select().from(savedPostsTable)
    .where(and(eq(savedPostsTable.postId, postId), eq(savedPostsTable.userId, user.id)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(savedPostsTable).where(eq(savedPostsTable.id, existing[0].id));
    return res.json({ saved: false });
  } else {
    await db.insert(savedPostsTable).values({ id: generateId(), postId, userId: user.id });
    return res.json({ saved: true });
  }
});

// POST /api/posts/:postId/share
router.post("/:postId/share", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { postId } = req.params;
  await db.update(postsTable).set({ sharesCount: sql`${postsTable.sharesCount} + 1` }).where(eq(postsTable.id, postId));
  const updated = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  return res.json({ shared: true, sharesCount: updated[0]?.sharesCount ?? 0 });
});

// GET /api/posts/:postId/comments
router.get("/:postId/comments", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { postId } = req.params;
  const comments = await db.select().from(commentsTable)
    .where(and(eq(commentsTable.postId, postId), sql`${commentsTable.parentId} IS NULL`))
    .orderBy(desc(commentsTable.createdAt));

  const authorIds = [...new Set(comments.map((c) => c.authorId))];
  const authors = authorIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const serialized = comments.map((c) => {
    const author = authorMap.get(c.authorId);
    return {
      id: c.id,
      postId: c.postId,
      authorId: c.authorId,
      author: author ? {
        id: author.id,
        clerkId: author.clerkId,
        username: author.username,
        displayName: author.displayName,
        bio: author.bio ?? null,
        avatarUrl: author.avatarUrl ?? null,
        coverUrl: author.coverUrl ?? null,
        location: author.location ?? null,
        website: author.website ?? null,
        role: author.role,
        isVerified: author.isVerified,
        isPremium: author.isPremium,
        followersCount: author.followersCount,
        followingCount: author.followingCount,
        postsCount: author.postsCount,
        isFollowing: false,
        createdAt: author.createdAt.toISOString(),
      } : null,
      content: c.content,
      likesCount: c.likesCount,
      parentId: c.parentId ?? null,
      replies: [],
      createdAt: c.createdAt.toISOString(),
    };
  }).filter((c) => c.author !== null);

  return res.json(serialized);
});

// POST /api/posts/:postId/comments
router.post("/:postId/comments", async (req, res) => {
  const user = await getOrCreateUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { postId } = req.params;
  const { content, parentId } = req.body;
  if (!content) return res.status(400).json({ error: "content is required" });

  const id = generateId();
  await db.insert(commentsTable).values({ id, postId, authorId: user.id, content, parentId });
  await db.update(postsTable).set({ commentsCount: sql`${postsTable.commentsCount} + 1` }).where(eq(postsTable.id, postId));

  return res.status(201).json({
    id,
    postId,
    authorId: user.id,
    author: {
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
    },
    content,
    likesCount: 0,
    parentId: parentId ?? null,
    replies: [],
    createdAt: new Date().toISOString(),
  });
});

export default router;
