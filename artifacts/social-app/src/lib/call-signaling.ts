/** Señalización 1:1 para llamadas DM (reutiliza STUN + Firestore como live). */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { ICE_SERVERS } from "./live-signaling";

export { ICE_SERVERS };

export type CallSignalType =
  | "invite"
  | "accept"
  | "reject"
  | "hangup"
  | "offer"
  | "answer"
  | "ice";

export type CallMode = "audio" | "video";

export type CallSignal = {
  id: string;
  callId: string;
  from: string;
  to: string;
  type: CallSignalType;
  mode?: CallMode;
  payload?: string;
  at: number;
};

const localKey = (callId: string) => `menpoe_call_rtc_${callId}`;

function readLocal(callId: string): CallSignal[] {
  try {
    const raw = localStorage.getItem(localKey(callId));
    return raw ? (JSON.parse(raw) as CallSignal[]) : [];
  } catch {
    return [];
  }
}

export function pushCallSignal(callId: string, signal: Omit<CallSignal, "id" | "at">) {
  const at = Date.now();
  if (auth.currentUser) {
    void addDoc(collection(db, "callSignals", callId, "signals"), { ...signal, at });
    return;
  }
  const list = readLocal(callId);
  list.push({ ...signal, id: `${at}_${Math.random().toString(36).slice(2, 7)}`, at });
  localStorage.setItem(localKey(callId), JSON.stringify(list.slice(-100)));
}

export function subscribeCallSignals(callId: string, cb: (signals: CallSignal[]) => void) {
  if (auth.currentUser) {
    const q = query(collection(db, "callSignals", callId, "signals"), orderBy("at", "asc"), limit(120));
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CallSignal, "id">) })));
    });
  }
  cb(readLocal(callId));
  const handler = (e: StorageEvent) => {
    if (e.key === localKey(callId)) cb(readLocal(callId));
  };
  window.addEventListener("storage", handler);
  const poll = window.setInterval(() => cb(readLocal(callId)), 800);
  return () => {
    window.removeEventListener("storage", handler);
    window.clearInterval(poll);
  };
}

export async function clearCallSignals(callId: string) {
  if (auth.currentUser) {
    try {
      const snap = await getDocs(query(collection(db, "callSignals", callId, "signals"), limit(200)));
      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "callSignals", callId, "signals", d.id))));
    } catch {
      /* ignore */
    }
    return;
  }
  localStorage.removeItem(localKey(callId));
}

/** Ringing inbox: documento por usuario para recibir invitaciones entrantes. */
export async function publishIncomingCall(input: {
  toUserId: string;
  fromUserId: string;
  fromName: string;
  fromAvatar?: string | null;
  callId: string;
  conversationId: string;
  mode: CallMode;
}) {
  if (!auth.currentUser) {
    localStorage.setItem(
      `menpoe_incoming_${input.toUserId}`,
      JSON.stringify({ ...input, at: Date.now() }),
    );
    return;
  }
  await setDoc(doc(db, "incomingCalls", input.toUserId), {
    ...input,
    status: "ringing",
    at: Date.now(),
  });
}

export async function clearIncomingCall(userId: string) {
  if (!auth.currentUser) {
    localStorage.removeItem(`menpoe_incoming_${userId}`);
    return;
  }
  try {
    await deleteDoc(doc(db, "incomingCalls", userId));
  } catch {
    /* ignore */
  }
}

export function subscribeIncomingCall(
  userId: string,
  cb: (ring: null | {
    callId: string;
    conversationId: string;
    mode: CallMode;
    fromUserId: string;
    fromName: string;
    fromAvatar?: string | null;
  }) => void,
) {
  if (auth.currentUser) {
    return onSnapshot(doc(db, "incomingCalls", userId), (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      const data = snap.data() as AnyObj;
      if (data.status !== "ringing") {
        cb(null);
        return;
      }
      cb({
        callId: data.callId,
        conversationId: data.conversationId,
        mode: data.mode,
        fromUserId: data.fromUserId,
        fromName: data.fromName,
        fromAvatar: data.fromAvatar,
      });
    });
  }
  const read = () => {
    try {
      const raw = localStorage.getItem(`menpoe_incoming_${userId}`);
      cb(raw ? JSON.parse(raw) : null);
    } catch {
      cb(null);
    }
  };
  read();
  const poll = window.setInterval(read, 1000);
  return () => window.clearInterval(poll);
}

type AnyObj = Record<string, any>;
