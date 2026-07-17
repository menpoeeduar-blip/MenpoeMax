import { auth, db } from "./firebase";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  updateDoc,
  doc,
  limit,
  where,
} from "firebase/firestore";

export type ReportTargetType = "post" | "comment" | "user" | "message";
export type ReportStatus = "pending" | "reviewed" | "dismissed" | "actioned";

export type ContentReport = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
  reporterId: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
};

const LOCAL_KEY = "social_reports_v1";

function rid() {
  return `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function loadLocal(): ContentReport[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(list: ContentReport[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(-200)));
}

export async function createContentReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason?: string;
  details?: string;
}): Promise<ContentReport> {
  const reporterId = auth.currentUser?.uid || "anon";
  const record: ContentReport = {
    id: rid(),
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason || "contenido_inapropiado",
    details: input.details || "",
    reporterId,
    status: "pending",
    createdAt: now(),
  };

  if (auth.currentUser) {
    try {
      const ref = await addDoc(collection(db, "reports"), {
        ...record,
        id: undefined,
      });
      record.id = ref.id;
      await updateDoc(doc(db, "reports", ref.id), { id: ref.id });
    } catch (err) {
      console.warn("[moderation] Firestore report fallback local", err);
      const list = loadLocal();
      list.push(record);
      saveLocal(list);
    }
  } else {
    const list = loadLocal();
    list.push(record);
    saveLocal(list);
  }
  return record;
}

export async function listPendingReports(): Promise<ContentReport[]> {
  if (auth.currentUser) {
    try {
      const snap = await getDocs(
        query(collection(db, "reports"), where("status", "==", "pending"), orderBy("createdAt", "desc"), limit(50)),
      );
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ContentReport, "id">) }));
    } catch {
      // índice compuesto puede faltar: lectura simple
      try {
        const snap = await getDocs(query(collection(db, "reports"), limit(80)));
        return snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<ContentReport, "id">) }))
          .filter((r) => r.status === "pending")
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      } catch {
        /* fall through */
      }
    }
  }
  return loadLocal().filter((r) => r.status === "pending");
}

export async function resolveReport(
  reportId: string,
  status: "reviewed" | "dismissed" | "actioned",
): Promise<void> {
  const resolvedBy = auth.currentUser?.uid || "admin";
  if (auth.currentUser) {
    try {
      await updateDoc(doc(db, "reports", reportId), {
        status,
        resolvedAt: now(),
        resolvedBy,
      });
      return;
    } catch {
      /* local */
    }
  }
  const list = loadLocal().map((r) =>
    r.id === reportId ? { ...r, status, resolvedAt: now(), resolvedBy } : r,
  );
  saveLocal(list);
}
