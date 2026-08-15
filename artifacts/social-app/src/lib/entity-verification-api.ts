import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth, db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  addDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

export type EntityVerificationRequest = {
  id: string;
  entityType: "profile" | "user" | "group" | "page" | "community";
  entityId: string;
  entityTitle?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  documentType: string;
  documentNumber: string;
  frontImageUrl: string;
  backImageUrl?: string;
  selfieImageUrl?: string;
  additionalInfo?: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
};

const LOCAL_STORAGE_KEY = "menpoe_entity_verifications_v1";

function loadLocal(): EntityVerificationRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(list: EntityVerificationRequest[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

/** Check if current user is logged in via Firestore */
function canUseFirestore() {
  return !!auth.currentUser;
}

/** Submit a verification request for a User Profile, Group, Page, or Community */
export function useSubmitEntityVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<EntityVerificationRequest, "id" | "status" | "createdAt">) => {
      const id = `verif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const payload: EntityVerificationRequest = {
        ...data,
        id,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      if (canUseFirestore()) {
        try {
          await setDoc(doc(db, "entityVerifications", id), {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          console.warn("[entityVerification] Firestore save failed, using local", err);
        }
      }

      const list = loadLocal();
      // Remove any previous pending request for same user & entity
      const filtered = list.filter((r) => !(r.entityId === data.entityId && r.userId === data.userId));
      filtered.unshift(payload);
      saveLocal(filtered);

      return payload;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["entity-verifications", vars.entityId] });
      qc.invalidateQueries({ queryKey: ["my-entity-verifications", vars.userId] });
      qc.invalidateQueries({ queryKey: ["all-verifications-admin"] });
    },
  });
}

/** Get all verification requests across all entities for Master Admin */
export function useGetAllVerificationsAdmin() {
  return useQuery({
    queryKey: ["all-verifications-admin"],
    queryFn: async () => {
      if (canUseFirestore()) {
        try {
          const snap = await getDocs(collection(db, "entityVerifications"));
          if (!snap.empty) {
            const list: EntityVerificationRequest[] = snap.docs.map((d) => {
              const row = d.data();
              return {
                id: d.id,
                entityType: row.entityType || "profile",
                entityId: row.entityId || row.userId,
                entityTitle: row.entityTitle,
                userId: row.userId,
                userName: row.userName || "Usuario",
                userAvatar: row.userAvatar,
                documentType: row.documentType || "DNI",
                documentNumber: row.documentNumber || "",
                frontImageUrl: row.frontImageUrl || "",
                backImageUrl: row.backImageUrl || "",
                selfieImageUrl: row.selfieImageUrl || "",
                additionalInfo: row.additionalInfo || "",
                status: row.status || "pending",
                rejectionReason: row.rejectionReason,
                createdAt: row.createdAt?.toDate ? row.createdAt.toDate().toISOString() : row.createdAt || new Date().toISOString(),
              };
            });
            // Merge with local items if any
            const local = loadLocal();
            const byId = new Map<string, EntityVerificationRequest>();
            local.forEach((item) => byId.set(item.id, item));
            list.forEach((item) => byId.set(item.id, item));
            const merged = Array.from(byId.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
            saveLocal(merged);
            return merged;
          }
        } catch (err) {
          console.warn("[entityVerification] Firestore fetch all failed", err);
        }
      }

      return loadLocal().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
  });
}

/** Get all verification requests for a specific Group, Page, or Community (for Owners/Admins) */
export function useGetEntityVerifications(entityId?: string) {
  return useQuery({
    queryKey: ["entity-verifications", entityId],
    enabled: !!entityId,
    queryFn: async () => {
      if (!entityId) return [];

      if (canUseFirestore()) {
        try {
          const snap = await getDocs(
            query(collection(db, "entityVerifications"), where("entityId", "==", entityId))
          );
          if (!snap.empty) {
            const list: EntityVerificationRequest[] = snap.docs.map((d) => {
              const row = d.data();
              return {
                id: d.id,
                entityType: row.entityType || "community",
                entityId: row.entityId,
                entityTitle: row.entityTitle,
                userId: row.userId,
                userName: row.userName || "Usuario",
                userAvatar: row.userAvatar,
                documentType: row.documentType || "DNI",
                documentNumber: row.documentNumber || "",
                frontImageUrl: row.frontImageUrl || "",
                backImageUrl: row.backImageUrl || "",
                selfieImageUrl: row.selfieImageUrl || "",
                additionalInfo: row.additionalInfo || "",
                status: row.status || "pending",
                rejectionReason: row.rejectionReason,
                createdAt: row.createdAt?.toDate ? row.createdAt.toDate().toISOString() : row.createdAt || new Date().toISOString(),
              };
            });
            saveLocal(list);
            return list;
          }
        } catch (err) {
          console.warn("[entityVerification] Firestore fetch failed", err);
        }
      }

      const list = loadLocal();
      return list.filter((r) => r.entityId === entityId);
    },
  });
}

/** Get verification status for a specific user in an entity or profile */
export function useGetUserEntityVerification(entityId?: string, userId?: string) {
  return useQuery({
    queryKey: ["user-entity-verification", entityId, userId],
    enabled: !!entityId && !!userId,
    queryFn: async () => {
      if (!entityId || !userId) return null;

      if (canUseFirestore()) {
        try {
          const snap = await getDocs(
            query(
              collection(db, "entityVerifications"),
              where("entityId", "==", entityId),
              where("userId", "==", userId)
            )
          );
          if (!snap.empty) {
            const row = snap.docs[0].data();
            return {
              id: snap.docs[0].id,
              ...row,
              createdAt: row.createdAt?.toDate ? row.createdAt.toDate().toISOString() : row.createdAt,
            } as EntityVerificationRequest;
          }
        } catch {}
      }

      const list = loadLocal();
      return list.find((r) => r.entityId === entityId && r.userId === userId) || null;
    },
  });
}

/** Approve or Reject a verification request (Master Admin / Owner) */
export function useReviewEntityVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      entityType,
      entityId,
      userId,
      status,
      rejectionReason,
    }: {
      requestId: string;
      entityType: "profile" | "user" | "group" | "page" | "community";
      entityId: string;
      userId: string;
      status: "approved" | "rejected";
      rejectionReason?: string;
    }) => {
      if (canUseFirestore()) {
        try {
          await updateDoc(doc(db, "entityVerifications", requestId), {
            status,
            rejectionReason: rejectionReason || null,
            updatedAt: serverTimestamp(),
          });

          if (status === "approved") {
            if (entityType === "profile" || entityType === "user" || entityId === userId) {
              // Update user profile directly
              await updateDoc(doc(db, "users", userId), {
                isVerified: true,
                updatedAt: new Date().toISOString(),
              });
            } else {
              // Update entity document (pages, groups, or communities) to include verified user or set verified flag
              const colName = entityType === "page" ? "pages" : entityType === "group" ? "groups" : "communities";
              const entityRef = doc(db, colName, entityId);
              const entitySnap = await getDoc(entityRef);
              if (entitySnap.exists()) {
                const currentVerified: string[] = entitySnap.data().verifiedUserIds || [];
                if (!currentVerified.includes(userId)) {
                  await updateDoc(entityRef, {
                    isVerified: true,
                    verifiedUserIds: [...currentVerified, userId],
                    updatedAt: serverTimestamp(),
                  });
                }
              }
            }
          }
        } catch (err) {
          console.warn("[entityVerification] Review Firestore update failed", err);
        }
      }

      // Local storage update for verifications
      const list = loadLocal();
      const item = list.find((r) => r.id === requestId);
      if (item) {
        item.status = status;
        item.rejectionReason = rejectionReason;
        item.updatedAt = new Date().toISOString();
        saveLocal(list);
      }

      // Also update local database user if profile verification
      if (status === "approved" && (entityType === "profile" || entityType === "user" || entityId === userId)) {
        try {
          const raw = localStorage.getItem("socialhub_data_v1");
          if (raw) {
            const data = JSON.parse(raw);
            const user = (data.users || []).find((u: any) => u.id === userId);
            if (user) {
              user.isVerified = true;
              localStorage.setItem("socialhub_data_v1", JSON.stringify(data));
            }
          }
        } catch {}
      }

      return { requestId, status };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["all-verifications-admin"] });
      qc.invalidateQueries({ queryKey: ["entity-verifications", vars.entityId] });
      qc.invalidateQueries({ queryKey: ["user-entity-verification", vars.entityId, vars.userId] });
      qc.invalidateQueries({ queryKey: ["community", vars.entityId] });
      qc.invalidateQueries({ queryKey: ["group", vars.entityId] });
      qc.invalidateQueries({ queryKey: ["business-page", vars.entityId] });
      qc.invalidateQueries({ queryKey: ["user", vars.userId] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries();
    },
  });
}
