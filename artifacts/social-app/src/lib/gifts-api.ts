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
    type: "topup" | "gift_sent" | "gift_received" | "admin_adjust" | "ad_campaign";
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

const DEFAULT_BALANCE = 100000;

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

export function useSendStreamGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ streamId, giftId, receiverId }: { streamId: string; giftId: string; receiverId: string }) => {
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
        streamId,
        giftId,
        receiverId,
      });

      const receiverBal = await getBalance(receiverId);
      const newReceiverBal = receiverBal + gift.tokens;
      await setBalance(receiverId, newReceiverBal);
      await addTransaction(receiverId, "gift_received", gift.tokens, newReceiverBal, {
        streamId,
        giftId,
        senderId: me,
      });

      const record = {
        id: rid(),
        streamId,
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
        await setDoc(doc(db, "streamGifts", record.id), record);
      }

      return { ...record, gift, balance: newSenderBal };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
      qc.invalidateQueries({ queryKey: ["stream-gifts", vars.streamId] });
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

export function useDeductWalletBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ amount, description }: { amount: number; description: string }) => {
      const me = currentUserId();
      if (!me) throw new Error("Debes iniciar sesión para publicar anuncios.");
      const currentBal = await getBalance(me);
      if (currentBal < amount) {
        throw new Error(
          `Saldo insuficiente en tu billetera. Necesitas $${amount.toLocaleString("es-CO")} COP (Tienes: $${currentBal.toLocaleString("es-CO")} COP)`
        );
      }
      const newBal = currentBal - amount;
      await setBalance(me, newBal);
      await addTransaction(me, "ad_campaign", -amount, newBal, {
        description,
        type: "ad_campaign",
      });
      return { balance: newBal };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
  });
}

export function useDemoTopUpWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number = 100000) => {
      const me = currentUserId();
      if (!me) throw new Error("Inicia sesión para recargar");
      const currentBal = await getBalance(me);
      const newBal = currentBal + amount;
      await setBalance(me, newBal);
      await addTransaction(me, "topup", amount, newBal, {
        description: "Recarga Demo $100.000 COP",
      });
      return { balance: newBal };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
  });
}

export type BankingConfig = {
  nequiPhone: string;
  nequiName: string;
  nequiQrUrl?: string;
  nequiEnabled: boolean;

  mpAlias: string;
  mpEmail: string;
  mpPaymentLink?: string;
  mpName: string;
  mpQrUrl?: string;
  mpEnabled: boolean;

  bancolombiaAccount: string;
  bancolombiaType: "Ahorros" | "Corriente";
  bancolombiaName: string;
  bancolombiaEnabled: boolean;

  daviplataPhone: string;
  daviplataName: string;
  daviplataEnabled: boolean;
};

export const DEFAULT_BANKING_CONFIG: BankingConfig = {
  nequiPhone: "3123456789",
  nequiName: "Menpoe Social Pagos",
  nequiQrUrl: "",
  nequiEnabled: true,

  mpAlias: "menpoe.mp",
  mpEmail: "pagos@menpoe.com",
  mpPaymentLink: "https://link.mercadopago.com.co/menpoesocial",
  mpName: "Menpoe Colombia Oficial",
  mpQrUrl: "",
  mpEnabled: true,

  bancolombiaAccount: "123-456789-01",
  bancolombiaType: "Ahorros",
  bancolombiaName: "Menpoe Social S.A.S.",
  bancolombiaEnabled: true,

  daviplataPhone: "3123456789",
  daviplataName: "Menpoe Social Pagos",
  daviplataEnabled: true,
};

const BANKING_STORAGE_KEY = "menpoe_banking_config_v1";

export function useGetBankingConfig() {
  return useQuery({
    queryKey: ["banking-config"],
    queryFn: async (): Promise<BankingConfig> => {
      if (canUseFirestoreWallet()) {
        try {
          const snap = await getDoc(doc(db, "system_config", "banking"));
          if (snap.exists()) {
            return { ...DEFAULT_BANKING_CONFIG, ...(snap.data() as Partial<BankingConfig>) };
          }
        } catch {
          /* fallback */
        }
      }
      try {
        const raw = localStorage.getItem(BANKING_STORAGE_KEY);
        if (raw) return { ...DEFAULT_BANKING_CONFIG, ...JSON.parse(raw) };
      } catch {}
      return DEFAULT_BANKING_CONFIG;
    },
  });
}

export function useUpdateBankingConfigAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: Partial<BankingConfig>) => {
      const current = (await qc.getQueryData<BankingConfig>(["banking-config"])) || DEFAULT_BANKING_CONFIG;
      const updated: BankingConfig = { ...current, ...config };

      try {
        localStorage.setItem(BANKING_STORAGE_KEY, JSON.stringify(updated));
      } catch {}

      if (canUseFirestoreWallet()) {
        try {
          await setDoc(doc(db, "system_config", "banking"), updated, { merge: true });
        } catch (err) {
          console.warn("[banking] setDoc failed", err);
        }
      }
      return updated;
    },
    onSuccess: (data) => {
      qc.setQueryData(["banking-config"], data);
      qc.invalidateQueries({ queryKey: ["banking-config"] });
    },
  });
}

export function useRequestCustomTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      amount,
      paymentMethod,
      paymentMethodLabel,
      receiptUrl,
      reference,
      note,
    }: {
      amount: number;
      paymentMethod: "nequi" | "mercadopago" | "bancolombia" | "daviplata" | "otro";
      paymentMethodLabel: string;
      receiptUrl?: string;
      reference?: string;
      note?: string;
    }) => {
      const me = currentUserId();
      if (!me) throw new Error("Debes iniciar sesión para realizar un depósito.");
      if (!amount || amount < 5000) throw new Error("El monto mínimo de depósito es de $5.000 COP.");

      const extra = loadWalletExtra();
      const topUp = {
        id: `dep_${Date.now()}_${rid()}`,
        userId: me,
        tokens: amount,
        packageId: `custom_${amount}`,
        priceLabel: `$ ${amount.toLocaleString("es-CO")} COP`,
        paymentMethod,
        paymentMethodLabel,
        receiptUrl: receiptUrl || "",
        reference: reference || "",
        note: note || "",
        status: "pending" as const,
        createdAt: now(),
      };

      extra.walletTopUps.unshift(topUp);
      saveWalletExtra({ walletTopUps: extra.walletTopUps });

      if (canUseFirestoreWallet()) {
        try {
          await setDoc(doc(db, "walletTopUps", topUp.id), topUp);
        } catch (err) {
          console.warn("[walletTopUps] setDoc failed", err);
        }
      }

      return topUp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-topups"] });
    },
  });
}

export function useTransferFundsToUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recipientUserId,
      recipientName,
      amount,
      concept,
    }: {
      recipientUserId: string;
      recipientName?: string;
      amount: number;
      concept?: string;
    }) => {
      const me = currentUserId();
      if (!me) throw new Error("Debes iniciar sesión para transferir fondos.");
      if (me === recipientUserId) throw new Error("No puedes transferirte fondos a ti mismo.");
      if (!amount || amount < 1000) throw new Error("El monto mínimo de transferencia es $1.000 COP.");

      // 1. Validar saldo del remitente
      const senderBal = await getBalance(me);
      if (senderBal < amount) {
        throw new Error(
          `Saldo insuficiente. Tienes $${senderBal.toLocaleString("es-CO")} COP disponibles y deseas transferir $${amount.toLocaleString("es-CO")} COP.`
        );
      }

      // Obtener nombre del remitente
      let senderName = "Usuario";
      try {
        const raw = localStorage.getItem("socialhub_data_v1");
        if (raw) {
          const d = JSON.parse(raw);
          const u = (d.users || []).find((x: any) => x.id === me);
          if (u) senderName = u.displayName || u.username || senderName;
        }
      } catch {}

      // 2. Deducir saldo del remitente
      const newSenderBal = senderBal - amount;
      await setBalance(me, newSenderBal);
      await addTransaction(me, "transfer_sent" as any, -amount, newSenderBal, {
        recipientId: recipientUserId,
        recipientName: recipientName || "Usuario Menpoe",
        concept: concept || "Transferencia directa",
        description: `Envío a ${recipientName || "usuario"}: -$${amount.toLocaleString("es-CO")} COP`,
      });

      // 3. Acreditar saldo al destinatario
      const receiverBal = await getBalance(recipientUserId);
      const newReceiverBal = receiverBal + amount;
      await setBalance(recipientUserId, newReceiverBal);
      await addTransaction(recipientUserId, "transfer_received" as any, amount, newReceiverBal, {
        senderId: me,
        senderName,
        concept: concept || "Transferencia directa",
        description: `Recibido de ${senderName}: +$${amount.toLocaleString("es-CO")} COP`,
      });

      // 4. Crear notificación en Firestore para el destinatario
      if (canUseFirestoreWallet()) {
        try {
          const notifId = `notif_tx_${Date.now()}_${rid()}`;
          await setDoc(doc(db, "notifications", notifId), {
            id: notifId,
            userId: recipientUserId,
            actorId: me,
            actorName: senderName,
            type: "transfer_received",
            title: "¡Transferencia recibida! 💰",
            body: `${senderName} te ha transferido $${amount.toLocaleString("es-CO")} COP.${concept ? ` Motivo: "${concept}"` : ""}`,
            read: false,
            createdAt: now(),
          });
        } catch (err) {
          console.warn("[notifications] transfer notification failed", err);
        }
      }

      return {
        success: true,
        amount,
        senderBalance: newSenderBal,
        recipientUserId,
        recipientName,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useSearchUsersForTransfer(searchTerm: string) {
  return useQuery({
    queryKey: ["search-users-transfer", searchTerm],
    enabled: searchTerm.trim().length >= 2,
    queryFn: async () => {
      const q = searchTerm.toLowerCase().trim();
      const me = currentUserId();
      let users: Array<{
        id: string;
        displayName: string;
        username: string;
        avatarUrl?: string;
        email?: string;
        phone?: string;
        isVerified?: boolean;
      }> = [];

      try {
        const raw = localStorage.getItem("socialhub_data_v1");
        if (raw) {
          const d = JSON.parse(raw);
          users = (d.users || []).map((u: any) => ({
            id: u.id,
            displayName: u.displayName || u.name || "Usuario",
            username: u.username || "user",
            avatarUrl: u.avatarUrl,
            email: u.email,
            phone: u.phone,
            isVerified: u.isVerified,
          }));
        }
      } catch {}

      if (canUseFirestoreWallet()) {
        try {
          const snap = await getDocs(query(collection(db, "users"), limit(60)));
          if (!snap.empty) {
            const fsUsers = snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            }));
            const map = new Map<string, any>();
            [...users, ...fsUsers].forEach((u) => map.set(u.id, u));
            users = Array.from(map.values());
          }
        } catch {}
      }

      return users.filter((u) => {
        if (u.id === me) return false;
        return (
          (u.displayName || "").toLowerCase().includes(q) ||
          (u.username || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.phone || "").includes(q)
        );
      }).slice(0, 10);
    },
  });
}

