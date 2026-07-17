import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const router = Router();

const DEV_USER_IDS = [
  "2l0s8v0kapbei4esxc",
  "9c8cnoxhr31nvvjiom",
];

router.get("/users", async (_req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ error: "Not found" });
  }
  const users = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    displayName: usersTable.displayName,
    avatarUrl: usersTable.avatarUrl,
    role: usersTable.role,
    isVerified: usersTable.isVerified,
  }).from(usersTable).where(inArray(usersTable.id, DEV_USER_IDS));

  const ordered = DEV_USER_IDS.map((id) => users.find((u) => u.id === id)).filter(Boolean);
  return res.json(ordered);
});

export default router;
