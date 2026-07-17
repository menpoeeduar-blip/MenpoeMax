import { clerkClient, getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateId } from "./id";
import type { Request } from "express";

export async function getOrCreateUser(req: Request): Promise<typeof usersTable.$inferSelect | null> {
  // Dev-mode bypass: accept X-Dev-User-Id header
  if (process.env.NODE_ENV === "development") {
    const devUserId = req.headers["x-dev-user-id"] as string | undefined;
    if (devUserId) {
      const devUser = await db.select().from(usersTable).where(eq(usersTable.id, devUserId)).limit(1);
      if (devUser.length > 0) return devUser[0];
    }
  }

  const auth = getAuth(req);
  if (!auth?.userId) return null;

  const clerkId = auth.userId;

  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (existing.length > 0) return existing[0];

  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(clerkId);
  } catch {
    return null;
  }

  const username =
    clerkUser.username ??
    clerkUser.emailAddresses[0]?.emailAddress?.split("@")[0] ??
    `user_${clerkId.slice(-8)}`;

  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    username;

  const newUser = {
    id: generateId(),
    clerkId,
    username,
    displayName,
    avatarUrl: clerkUser.imageUrl ?? null,
    role: "user" as const,
    isVerified: false,
    isPremium: false,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
  };

  await db.insert(usersTable).values(newUser);
  const created = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  return created[0] ?? null;
}
