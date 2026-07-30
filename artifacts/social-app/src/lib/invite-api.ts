/**
 * invite-api.ts
 * Handles sending invitations to groups, communities, and pages.
 * Creates a notification of type group_invite / community_invite / page_invite
 * on the recipient's notifications feed.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { auth, db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { getDevUserId } from "./queryClient";

type InviteType = "group" | "community" | "page";

const now = () => new Date().toISOString();
const rid = () => Math.random().toString(36).slice(2, 12);

function currentUserId(): string {
  return auth.currentUser?.uid || getDevUserId() || "";
}

function canUseFirestore(): boolean {
  return !!auth.currentUser;
}

/**
 * Stores a pending invite in localStorage (fallback)
 */
const INVITES_KEY = "socialhub_invites_v1";

type LocalInvite = {
  id: string;
  fromUserId: string;
  toUserId: string;
  targetId: string;
  targetName: string;
  targetType: InviteType;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
};

function loadInvites(): LocalInvite[] {
  try {
    const raw = localStorage.getItem(INVITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveInvites(list: LocalInvite[]) {
  localStorage.setItem(INVITES_KEY, JSON.stringify(list));
}

/** Send an invite notification to a user */
export function useInviteToGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      targetId,
      targetName,
      targetType,
    }: {
      userId: string;
      targetId: string;
      targetName: string;
      targetType: InviteType;
    }) => {
      const me = currentUserId();
      if (!me) throw new Error("No autenticado");

      const inviteId = rid();
      const typeLabel = targetType === "group" ? "grupo" : targetType === "community" ? "comunidad" : "página";
      const notifType = `${targetType}_invite`;

      if (canUseFirestore()) {
        // Check if there's already a pending invite
        // Write the notification directly
        const meDoc = await getDoc(doc(db, "users", me));
        const myName = meDoc.exists() ? ((meDoc.data() as any).displayName ?? "Alguien") : "Alguien";

        await setDoc(doc(collection(db, "notifications")), {
          type: notifType,
          recipientId: userId,
          actorId: me,
          actorName: myName,
          targetId,
          targetName,
          targetType,
          inviteId,
          text: `${myName} te invitó a unirte a ${typeLabel} "${targetName}"`,
          read: false,
          createdAt: now(),
        });

        return { inviteId, ok: true };
      }

      // localStorage fallback
      const invites = loadInvites();
      // Avoid duplicate
      const already = invites.find(
        (i) => i.fromUserId === me && i.toUserId === userId && i.targetId === targetId && i.status === "pending"
      );
      if (already) return { inviteId: already.id, ok: true };

      const invite: LocalInvite = {
        id: inviteId,
        fromUserId: me,
        toUserId: userId,
        targetId,
        targetName,
        targetType,
        status: "pending",
        createdAt: now(),
      };
      invites.push(invite);
      saveInvites(invites);

      // Also add to notifications store
      try {
        const raw = localStorage.getItem("socialhub_data_v1");
        if (raw) {
          const d = JSON.parse(raw);
          if (!d.notifications) d.notifications = [];
          const me_user = (d.users ?? []).find((u: any) => u.id === me);
          const myName = me_user?.displayName ?? "Alguien";
          const typeLabel2 = targetType === "group" ? "grupo" : targetType === "community" ? "comunidad" : "página";
          d.notifications.unshift({
            id: rid(),
            type: notifType,
            recipientId: userId,
            actorId: me,
            targetId,
            targetName,
            targetType,
            inviteId,
            title: `Invitación a "${targetName}"`,
            body: `${myName} te invitó a unirte al ${typeLabel2} "${targetName}"`,
            isRead: false,
            createdAt: now(),
          });
          localStorage.setItem("socialhub_data_v1", JSON.stringify(d));
        }
      } catch { /* best-effort */ }

      return { inviteId, ok: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

/** Accept an invite */
export function useAcceptGroupInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ inviteId, targetId, targetType }: { inviteId: string; targetId: string; targetType: InviteType }) => {
      const invites = loadInvites();
      const idx = invites.findIndex((i) => i.id === inviteId);
      if (idx >= 0) { invites[idx].status = "accepted"; saveInvites(invites); }

      if (canUseFirestore() && targetType === "community") {
        const me = currentUserId();
        await setDoc(doc(db, "communityMembers", `${me}_${targetId}`), {
          userId: me,
          communityId: targetId,
          joinedAt: now(),
        });
      }
      return { ok: true };
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

/** Reject an invite */
export function useRejectGroupInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string }) => {
      const invites = loadInvites();
      const idx = invites.findIndex((i) => i.id === inviteId);
      if (idx >= 0) { invites[idx].status = "rejected"; saveInvites(invites); }
      return { ok: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
