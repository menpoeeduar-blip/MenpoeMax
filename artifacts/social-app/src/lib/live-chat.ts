import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export type LiveChatMessage = {
  id: string;
  streamId: string;
  userId: string;
  displayName: string;
  text: string;
  at: string;
};

const localKey = (streamId: string) => `socialhub_live_chat_${streamId}`;

function readLocal(streamId: string): LiveChatMessage[] {
  try {
    const raw = localStorage.getItem(localKey(streamId));
    return raw ? (JSON.parse(raw) as LiveChatMessage[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(streamId: string, list: LiveChatMessage[]) {
  localStorage.setItem(localKey(streamId), JSON.stringify(list.slice(-200)));
}

/** Chat en vivo: Firestore en tiempo real; respaldo localStorage. */
export function readLiveChat(streamId: string): LiveChatMessage[] {
  return readLocal(streamId);
}

export async function sendLiveChat(msg: Omit<LiveChatMessage, "id" | "at">) {
  const payload: LiveChatMessage = {
    ...msg,
    id: `msg_${Date.now()}`,
    at: new Date().toISOString(),
  };

  const list = readLocal(msg.streamId);
  list.push(payload);
  writeLocal(msg.streamId, list);

  if (auth.currentUser) {
    try {
      await addDoc(collection(db, "streams", msg.streamId, "chat"), {
        userId: msg.userId,
        displayName: msg.displayName,
        text: msg.text,
        at: payload.at,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("[live-chat] Firestore send failed, local only", err);
    }
  }
}

export function subscribeLiveChat(streamId: string, cb: (msgs: LiveChatMessage[]) => void) {
  cb(readLocal(streamId));

  if (auth.currentUser) {
    const q = query(
      collection(db, "streams", streamId, "chat"),
      orderBy("at", "asc"),
      limit(200),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs: LiveChatMessage[] = snap.docs.map((d) => {
          const data = d.data() as Omit<LiveChatMessage, "id" | "streamId">;
          return {
            id: d.id,
            streamId,
            userId: data.userId,
            displayName: data.displayName,
            text: data.text,
            at: data.at || new Date().toISOString(),
          };
        });
        writeLocal(streamId, msgs);
        cb(msgs);
      },
      () => {
        /* índice / perms: polling local */
        const poll = window.setInterval(() => cb(readLocal(streamId)), 1200);
        (unsub as unknown as { _poll?: number })._poll = poll;
      },
    );
    return () => {
      unsub();
    };
  }

  const handler = (e: StorageEvent) => {
    if (e.key === localKey(streamId)) cb(readLocal(streamId));
  };
  window.addEventListener("storage", handler);
  const poll = window.setInterval(() => cb(readLocal(streamId)), 1200);
  return () => {
    window.removeEventListener("storage", handler);
    window.clearInterval(poll);
  };
}
