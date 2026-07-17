/** Señalización WebRTC para Live (Firestore + fallback localStorage).
 * Objetivo: que el host y los viewers se conecten entre distintas sesiones/usuarios.
 */

import { addDoc, collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db, auth } from "./firebase";

export type LiveRtcSignal = {
  id: string;
  streamId: string;
  from: string;
  to: string;
  type: "offer" | "answer" | "ice" | "join";
  payload: string;
  at: number;
};

const key = (streamId: string) => `socialhub_live_rtc_${streamId}`;

export function readSignals(streamId: string): LiveRtcSignal[] {
  if (auth.currentUser) {
    throw new Error("readSignals is async when Firestore is enabled.");
  }
  try {
    const raw = localStorage.getItem(key(streamId));
    return raw ? (JSON.parse(raw) as LiveRtcSignal[]) : [];
  } catch {
    return [];
  }
}

export function pushSignal(streamId: string, signal: Omit<LiveRtcSignal, "id" | "at">) {
  if (auth.currentUser) {
    void (async () => {
      const col = collection(db, "liveSignals", streamId, "signals");
      await addDoc(col, { ...signal, at: Date.now() });
    })();
    return;
  }

  const list = readSignals(streamId);
  list.push({ ...signal, id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, at: Date.now() });
  localStorage.setItem(key(streamId), JSON.stringify(list.slice(-80)));
}

export function clearSignals(streamId: string) {
  if (auth.currentUser) {
    void (async () => {
      const col = collection(db, "liveSignals", streamId, "signals");
      const q = query(col, orderBy("at", "desc"), limit(200));
      const snap = await getDocs(q);
      await Promise.all(
        snap.docs.map((d) =>
          deleteDoc(doc(db, "liveSignals", streamId, "signals", d.id)),
        ),
      );
    })().catch(() => undefined);
    return;
  }

  localStorage.removeItem(key(streamId));
}

export function subscribeSignals(streamId: string, cb: (signals: LiveRtcSignal[]) => void) {
  if (auth.currentUser) {
    const col = collection(db, "liveSignals", streamId, "signals");
    const q = query(col, orderBy("at", "asc"), limit(80));
    const unsub = onSnapshot(q, (snap) => {
      const signals = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<LiveRtcSignal, "id">) }))
        .filter((s) => s && s.type);
      cb(signals as LiveRtcSignal[]);
    });
    return () => unsub();
  }

  const handler = (e: StorageEvent) => {
    if (e.key === key(streamId)) cb(readSignals(streamId));
  };
  // Emitimos un primer snapshot inmediato para no depender del poll.
  cb(readSignals(streamId));
  window.addEventListener("storage", handler);
  const poll = window.setInterval(() => cb(readSignals(streamId)), 1500);
  return () => {
    window.removeEventListener("storage", handler);
    window.clearInterval(poll);
  };
}

export const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export async function captureVideoThumbnail(video: HTMLVideoElement): Promise<string | null> {
  if (!video.videoWidth) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}
