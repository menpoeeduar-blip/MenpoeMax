import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { getDevUserId } from "./queryClient";
import { getGiftById, TOKEN_TOPUP_PACKAGES } from "./gifts";

const EXTRA_KEY = "socialhub_extra_v1";
const now = () => new Date().toISOString();
const rid = () => Math.random().toString(36).slice(2, 12);

type WalletExtra = {
  wallets: Record<string, number>;
  walletTopUps: Array<{
    id: string;
    userId: string;
    tokens: number;
    packageId: string;
    priceLabel: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    reviewedAt?: string;
    reviewedBy?: string;
    note?: string;
  }>;
  postGifts: Array<{
    id: string;
    postId: string;
    senderId: string;
    receiverId: string;
    giftId: string;
    giftName: string;
    giftEmoji: string;
    tokens: number;
    createdAt: string;
  }>;
  walletTransactions: Array<{
    id: string;
    userId: string;
    type: "topup" | "gift_sent" | "gift_received" | "admin_adjust";
    amount: number;
    balanceAfter: number;
    meta?: Record<string, string>;
    createdAt: string;
  }>;
};

function loadWalletExtra(): WalletExtra {
  try {
    const raw = localStorage.getItem(EXTRA_KEY);
    const base = raw ? JSON.parse(raw) : {};
    return {
      wallets: base.wallets ?? {},
      walletTopUps: base.walletTopUps ?? [],
      postGifts: base.postGifts ?? [],
      walletTransactions: base.walletTransactions ?? [],
    };
  } catch {
    return { wallets: {}, walletTopUps: [], postGifts: [], walletTransactions: [] };
  }
}

function saveWalletExtra(patch: Partial<WalletExtra>) {
  try {
    const raw = localStorage.getItem(EXTRA_KEY);
    const base = raw ? JSON.parse(raw) : {};
    localStorage.setItem(EXTRA_KEY, JSON.stringify({ ...base, ...patch }));
  } catch {
    /* ignore */
  }
}

function currentUserId() {
  return auth.currentUser?.uid || getDevUserId() || "";
}

function canUseFirestoreWallet() {
  return !!auth.currentUser;
}

const walletsCol = collection(db, "wallets");
const topUpsCol = collection(db, "walletTopUps");
const postGiftsCol = collection(db, "postGifts");

const DEFAULT_BALANCE = 50;

async function getBalance(userId: string): Promise<number> {
  const extra = loadWalletExtra();
  if (canUseFirestoreWallet()) {
    const snap = await getDoc(doc(db, "wallets", userId));
    if (snap.exists()) return Number((snap.data() as { balance?: number }).balance ?? 0);
  }
  return extra.wallets[userId] ?? DEFAULT_BALANCE;
}

async function setBalance(userId: string, balance: number) {
  const extra = loadWalletExtra();
  extra.wallets[userId] = balance;
  saveWalletExtra({ wallets: extra.wallets });
  if (canUseFirestoreWallet()) {
    await setDoc(
      doc(db, "wallets", userId),
      { balance, updatedAt: now(), userId },
      { merge: true },
    );
  }
}

async function addTransaction(
  userId: string,
  type: WalletExtra["walletTransactions"][0]["type"],
  amount: number,
  balanceAfter: number,
  meta?: Record<string, string>,
) {
  const extra = loadWalletExtra();
  const tx = { id: rid(), userId, type, amount, balanceAfter, meta, createdAt: now() };
  extra.walletTransactions.unshift(tx);
  if (extra.walletTransactions.length > 200) extra.walletTransactions.length = 200;
  saveWalletExtra({ walletTransactions: extra.walletTransactions });
  if (canUseFirestoreWallet()) {
    await setDoc(doc(db, "walletTransactions", tx.id), tx);
  }
}

export function useGetWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const me = currentUserId();
      if (!me) return { balance: 0, packages: TOKEN_TOPUP_PACKAGES };
      const balance = await getBalance(me);
      const extra = loadWalletExtra();
      const pendingTopUp = extra.walletTopUps.find((t) => t.userId === me && t.status === "pending");
      return { balance, packages: TOKEN_TOPUP_PACKAGES, pendingTopUp };
    },
  });
}

export function useGetWalletTransactions() {
  return useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const me = currentUserId();
      if (!me) return [];
      if (canUseFirestoreWallet()) {
        const snap = await getDocs(
          query(collection(db, "walletTransactions"), where("userId", "==", me), limit(40)),
        );
        if (!snap.empty) {
          return snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as object) }))
            .sort((a, b) => ((a as { createdAt: string }).createdAt < (b as { createdAt: string }).createdAt ? 1 : -1));
        }
      }
      const extra = loadWalletExtra();
      return extra.walletTransactions.filter((t) => t.userId === me).slice(0, 40);
    },
  });
}

export function useRequestWalletTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ packageId }: { packageId: string }) => {
      const me = currentUserId();
      if (!me) throw new Error("Inicia sesión");
      const pack = TOKEN_TOPUP_PACKAGES.find((p) => p.id === packageId);
      if (!pack) throw new Error("Paquete no válido");

      const extra = loadWalletExtra();
      const pending = extra.walletTopUps.find((t) => t.userId === me && t.status === "pending");
      if (pending) throw new Error("Ya tienes una recarga pendiente de aprobación");

      const topUp = {
        id: rid(),
        userId: me,
        tokens: pack.tokens,
        packageId: pack.id,
        priceLabel: pack.priceLabel,
        status: "pending" as const,
        createdAt: now(),
      };

      extra.walletTopUps.unshift(topUp);
      saveWalletExtra({ walletTopUps: extra.walletTopUps });

      if (canUseFirestoreWallet()) {
        await setDoc(doc(db, "walletTopUps", topUp.id), topUp);
      }

      return topUp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-topups"] });
    },
  });
}

export function useSendPostGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, giftId, receiverId }: { postId: string; giftId: string; receiverId: string }) => {
      const me = currentUserId();
      if (!me) throw new Error("Inicia sesión");
      if (me === receiverId) throw new Error("No puedes enviarte regalos a ti mismo");

      const gift = getGiftById(giftId);
      if (!gift) throw new Error("Regalo no válido");

      const senderBal = await getBalance(me);
      if (senderBal < gift.tokens) throw new Error("Saldo insuficiente. Recarga tokens.");

      const newSenderBal = senderBal - gift.tokens;
      await setBalance(me, newSenderBal);
      await addTransaction(me, "gift_sent", -gift.tokens, newSenderBal, {
        postId,
        giftId,
        receiverId,
      });

      const receiverBal = await getBalance(receiverId);
      const newReceiverBal = receiverBal + gift.tokens;
      await setBalance(receiverId, newReceiverBal);
      await addTransaction(receiverId, "gift_received", gift.tokens, newReceiverBal, {
        postId,
        giftId,
        senderId: me,
      });

      const record = {
        id: rid(),
        postId,
        senderId: me,
        receiverId,
        giftId: gift.id,
        giftName: gift.name,
        giftEmoji: gift.emoji,
        tokens: gift.tokens,
        createdAt: now(),
      };

      const extra = loadWalletExtra();
      extra.postGifts.unshift(record);
      saveWalletExtra({ postGifts: extra.postGifts });

      if (canUseFirestoreWallet()) {
        await setDoc(doc(db, "postGifts", record.id), record);
        const postRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          await updateDoc(postRef, { giftsCount: increment(1), giftsTokens: increment(gift.tokens) });
        }
      }

      try {
        const raw = localStorage.getItem("socialhub_data_v1");
        if (raw) {
          const d = JSON.parse(raw);
          const post = (d.posts || []).find((p: { id: string }) => p.id === postId);
          if (post) {
            post.giftsCount = (post.giftsCount || 0) + 1;
            post.giftsTokens = (post.giftsTokens || 0) + gift.tokens;
            localStorage.setItem("socialhub_data_v1", JSON.stringify(d));
          }
        }
      } catch {
        /* ignore */
      }

      return { ...record, balance: newSenderBal };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
      qc.invalidateQueries({ queryKey: ["post-gifts", vars.postId] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useGetPostGifts(postId: string) {
  return useQuery({
    queryKey: ["post-gifts", postId],
    enabled: !!postId,
    queryFn: async () => {
      if (canUseFirestoreWallet()) {
        const snap = await getDocs(query(postGiftsCol, where("postId", "==", postId), limit(30)));
        if (!snap.empty) {
          return snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as object) }))
            .sort((a, b) => ((a as { createdAt: string }).createdAt < (b as { createdAt: string }).createdAt ? 1 : -1));
        }
      }
      const extra = loadWalletExtra();
      return extra.postGifts.filter((g) => g.postId === postId).slice(0, 30);
    },
  });
}

/** Panel admin */
export function useGetPendingTopUps() {
  return useQuery({
    queryKey: ["admin-pending-topups"],
    queryFn: async () => {
      if (canUseFirestoreWallet()) {
        const snap = await getDocs(query(topUpsCol, where("status", "==", "pending")));
        return snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as object) }))
          .sort((a, b) => ((a as { createdAt: string }).createdAt < (b as { createdAt: string }).createdAt ? 1 : -1));
      }
      const extra = loadWalletExtra();
      return extra.walletTopUps.filter((t) => t.status === "pending");
    },
  });
}

export function useAdminReviewTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      topUpId,
      action,
    }: {
      topUpId: string;
      action: "approve" | "reject";
    }) => {
      const adminId = currentUserId();
      if (!adminId) throw new Error("Sin sesión");

      const extra = loadWalletExtra();
      const idx = extra.walletTopUps.findIndex((t) => t.id === topUpId);
      const topUp = idx >= 0 ? extra.walletTopUps[idx] : null;

      let record = topUp;
      if (!record && canUseFirestoreWallet()) {
        const snap = await getDoc(doc(db, "walletTopUps", topUpId));
        if (snap.exists()) record = { id: snap.id, ...(snap.data() as typeof topUp) };
      }
      if (!record || record.status !== "pending") throw new Error("Solicitud no encontrada");

      if (action === "approve") {
        const bal = await getBalance(record.userId);
        const newBal = bal + record.tokens;
        await setBalance(record.userId, newBal);
        await addTransaction(record.userId, "topup", record.tokens, newBal, {
          topUpId,
          packageId: record.packageId,
        });
        record.status = "approved";
      } else {
        record.status = "rejected";
      }
      record.reviewedAt = now();
      record.reviewedBy = adminId;

      if (idx >= 0) {
        extra.walletTopUps[idx] = record;
        saveWalletExtra({ walletTopUps: extra.walletTopUps });
      }
      if (canUseFirestoreWallet()) {
        await setDoc(doc(db, "walletTopUps", topUpId), record, { merge: true });
      }

      return record;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pending-topups"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const me = currentUserId();
      if (!me) return false;
      try {
        const raw = localStorage.getItem("socialhub_data_v1");
        if (raw) {
          const d = JSON.parse(raw);
          const u = (d.users || []).find((x: { id: string }) => x.id === me);
          if (u?.role === "admin") return true;
        }
      } catch {
        /* ignore */
      }
      if (canUseFirestoreWallet()) {
        const snap = await getDoc(doc(db, "users", me));
        if (snap.exists() && (snap.data() as { role?: string }).role === "admin") return true;
      }
      return false;
    },
  });
}
