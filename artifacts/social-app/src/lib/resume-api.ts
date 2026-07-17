import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, increment, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import { getDevUserId } from "./queryClient";
import { loadResumeDraft, saveResumeDraft, type ResumeForm } from "./resume-form";

type AnyObj = Record<string, unknown>;

const now = () => new Date().toISOString();
const rid = () => Math.random().toString(36).slice(2, 12);

function currentUserId() {
  return auth.currentUser?.uid || getDevUserId() || "";
}

function canUseFirestore() {
  return !!auth.currentUser;
}

const jobApplicationsCol = collection(db, "jobApplications");

export function useGetResumeDraft() {
  return useQuery({
    queryKey: ["resume-draft"],
    queryFn: async () => {
      const uid = currentUserId();
      if (!uid) return null;
      const local = loadResumeDraft(uid);
      if (canUseFirestore()) {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const resume = (snap.data() as { resume?: ResumeForm }).resume;
          if (resume) return { ...local, ...resume };
        }
      }
      return local;
    },
  });
}

export function useSaveResumeDraft() {
  return useMutation({
    mutationFn: async (form: ResumeForm) => {
      const uid = currentUserId();
      if (!uid) throw new Error("Inicia sesión para guardar");
      saveResumeDraft(uid, form);
      if (canUseFirestore()) {
        await setDoc(doc(db, "users", uid), { resume: form, resumeUpdatedAt: now() }, { merge: true });
      }
      return { saved: true };
    },
  });
}

export async function userHasAppliedToJob(jobId: string, userId: string): Promise<boolean> {
  try {
    const raw = localStorage.getItem("socialhub_data_v1");
    if (raw) {
      const d = JSON.parse(raw);
      if ((d.jobApplications || []).some((a: { jobId: string; userId: string }) => a.jobId === jobId && a.userId === userId)) {
        return true;
      }
    }
  } catch {
    /* ignore */
  }
  if (canUseFirestore()) {
    const snap = await getDocs(query(jobApplicationsCol, where("jobId", "==", jobId), where("userId", "==", userId)));
    return !snap.empty;
  }
  return false;
}

export function useApplyToJobWithResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, resume, jobTitle, companyName }: { jobId: string; resume: ResumeForm; jobTitle?: string; companyName?: string }) => {
      const uid = currentUserId();
      if (!uid) throw new Error("Inicia sesión para postular");

      const application = {
        id: rid(),
        jobId,
        userId: uid,
        jobTitle: jobTitle || "",
        companyName: companyName || "",
        resume,
        status: "submitted",
        employerNote: "",
        createdAt: now(),
      };

      saveResumeDraft(uid, resume);

      const raw = localStorage.getItem("socialhub_data_v1");
      if (raw) {
        const d = JSON.parse(raw);
        d.jobApplications = d.jobApplications || [];
        d.jobApplications.push(application);
        localStorage.setItem("socialhub_data_v1", JSON.stringify(d));
      }

      if (canUseFirestore()) {
        await setDoc(doc(jobApplicationsCol, application.id), application);
        await setDoc(doc(db, "users", uid), { resume, resumeUpdatedAt: now() }, { merge: true });
        const jobRef = doc(db, "jobs", jobId);
        const snap = await getDoc(jobRef);
        if (snap.exists()) await updateDoc(jobRef, { applicantsCount: increment(1) });
      }

      return application;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["resume-draft"] });
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      qc.invalidateQueries({ queryKey: ["my-job-applications"] });
    },
  });
}

export function useGetJobApplications(jobId: string, enabled = true) {
  return useQuery({
    queryKey: ["job-applications", jobId],
    enabled: !!jobId && enabled,
    queryFn: async () => {
      const apps: AnyObj[] = [];
      try {
        const raw = localStorage.getItem("socialhub_data_v1");
        if (raw) {
          const d = JSON.parse(raw);
          (d.jobApplications || []).filter((a: AnyObj) => a.jobId === jobId).forEach((a: AnyObj) => apps.push(a));
        }
      } catch {
        /* ignore */
      }
      if (canUseFirestore()) {
        const snap = await getDocs(query(jobApplicationsCol, where("jobId", "==", jobId)));
        snap.docs.forEach((docSnap) => {
          const item = { id: docSnap.id, ...(docSnap.data() as AnyObj) };
          if (!apps.some((a) => a.id === item.id)) apps.push(item);
        });
      }
      return apps.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
  });
}

export function useGetMyJobApplications() {
  return useQuery({
    queryKey: ["my-job-applications"],
    queryFn: async () => {
      const uid = currentUserId();
      if (!uid) return [];
      const apps: AnyObj[] = [];
      try {
        const raw = localStorage.getItem("socialhub_data_v1");
        if (raw) {
          const d = JSON.parse(raw);
          (d.jobApplications || []).filter((a: AnyObj) => a.userId === uid).forEach((a: AnyObj) => apps.push(a));
        }
      } catch {
        /* ignore */
      }
      if (canUseFirestore()) {
        const snap = await getDocs(query(jobApplicationsCol, where("userId", "==", uid)));
        snap.docs.forEach((docSnap) => {
          const item = { id: docSnap.id, ...(docSnap.data() as AnyObj) };
          if (!apps.some((a) => a.id === item.id)) apps.push(item);
        });
      }
      return apps.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
  });
}

export function useUpdateJobApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, status, employerNote }: { applicationId: string; status: string; employerNote?: string }) => {
      const patch = { status, employerNote: employerNote ?? "", updatedAt: now() };
      if (canUseFirestore()) {
        await updateDoc(doc(jobApplicationsCol, applicationId), patch);
      }
      const raw = localStorage.getItem("socialhub_data_v1");
      if (raw) {
        const d = JSON.parse(raw);
        const app = (d.jobApplications || []).find((a: AnyObj) => a.id === applicationId);
        if (app) Object.assign(app, patch);
        localStorage.setItem("socialhub_data_v1", JSON.stringify(d));
      }
      return { ok: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      qc.invalidateQueries({ queryKey: ["my-job-applications"] });
    },
  });
}
