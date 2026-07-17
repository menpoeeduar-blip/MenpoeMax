import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, doc, getDoc, getDocs, setDoc, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import { getDevUserId } from "./queryClient";
import {
  loadAccountSettings,
  saveAccountSettings,
  loadActivityLog,
  type AccountSettings,
} from "./account-settings";

const KEY = "socialhub_extra_v1";
const now = () => new Date().toISOString();
const rid = () => Math.random().toString(36).slice(2, 12);

type ExtraData = {
  albums: Array<{ id: string; userId: string; name: string; description?: string; createdAt: string }>;
  albumPhotos: Array<{ id: string; albumId: string; mediaUrl: string; caption?: string; taggedUserIds: string[]; isFeatured: boolean; createdAt: string }>;
  privacy: Record<string, { defaultVisibility: string; allowMessages: boolean; showOnline: boolean; blockedIds: string[] }>;
  helpTickets: Array<{ id: string; userId: string; subject: string; message: string; status: string; createdAt: string }>;
  businessPages: Array<{ id: string; ownerId: string; name: string; slug: string; description: string; category: string; pageType?: string; followersCount: number; createdAt: string }>;
  communityMeta: Array<{ communityId: string; rules: string; requireApproval: boolean; admins: string[]; mods: string[]; pendingMembers: Array<{ userId: string; createdAt: string }> }>;
  credits: Record<string, number>;
  boostedPosts: Array<{ postId: string; userId: string; until: string }>;
};

function empty(): ExtraData {
  return { albums: [], albumPhotos: [], privacy: {}, helpTickets: [], businessPages: [], communityMeta: [], credits: {}, boostedPosts: [] };
}

function loadExtra(): ExtraData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

function saveExtra(d: ExtraData) {
  localStorage.setItem(KEY, JSON.stringify(d));
}

export function getCurrentUserIdForExtra(): string {
  return auth.currentUser?.uid || getDevUserId() || "9c8cnoxhr31nvvjiom";
}

const businessPagesCol = collection(db, "businessPages");

function canUseFirestorePages() {
  return !!auth.currentUser;
}

async function mergeBusinessPagesFromFirestore(d: ExtraData) {
  if (!canUseFirestorePages()) return d.businessPages;
  const snap = await getDocs(businessPagesCol);
  const byId = new Map<string, (typeof d.businessPages)[0]>();
  d.businessPages.forEach((p) => byId.set(p.id, p));
  snap.docs.forEach((docSnap) => {
    const row = { id: docSnap.id, ...(docSnap.data() as Omit<(typeof d.businessPages)[0], "id">) };
    byId.set(docSnap.id, { ...byId.get(docSnap.id), ...row });
  });
  const merged = [...byId.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  d.businessPages = merged;
  saveExtra(d);
  return merged;
}

export function loadAllBusinessPages(): Promise<(ExtraData["businessPages"][0])[]> {
  const d = loadExtra();
  return mergeBusinessPagesFromFirestore(d);
}

export function useGetAlbums() {
  return useQuery({
    queryKey: ["albums"],
    queryFn: async () => {
      const d = loadExtra();
      const me = getCurrentUserIdForExtra();
      return d.albums.filter((a) => a.userId === me).map((a) => ({
        ...a,
        photosCount: d.albumPhotos.filter((p) => p.albumId === a.id).length,
        coverUrl: d.albumPhotos.find((p) => p.albumId === a.id && p.isFeatured)?.mediaUrl
          || d.albumPhotos.find((p) => p.albumId === a.id)?.mediaUrl,
      }));
    },
  });
}

export function useCreateAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const d = loadExtra();
      const album = { id: rid(), userId: getCurrentUserIdForExtra(), name, description, createdAt: now() };
      d.albums.unshift(album);
      saveExtra(d);
      return album;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["albums"] }),
  });
}

export function useAddAlbumPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ albumId, mediaUrl, caption, isFeatured }: { albumId: string; mediaUrl: string; caption?: string; isFeatured?: boolean }) => {
      const d = loadExtra();
      const photo = { id: rid(), albumId, mediaUrl, caption, taggedUserIds: [], isFeatured: !!isFeatured, createdAt: now() };
      if (isFeatured) d.albumPhotos.forEach((p) => { if (p.albumId === albumId) p.isFeatured = false; });
      d.albumPhotos.unshift(photo);
      saveExtra(d);
      return photo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["albums"] });
      qc.invalidateQueries({ queryKey: ["album-photos"] });
    },
  });
}

export function useUpdateBusinessPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pageId, data }: { pageId: string; data: Partial<{ avatarUrl: string; coverUrl: string; name: string; description: string }> }) => {
      const d = loadExtra();
      const idx = d.businessPages.findIndex((p) => p.id === pageId);
      if (idx >= 0) d.businessPages[idx] = { ...d.businessPages[idx], ...data };
      saveExtra(d);
      if (canUseFirestorePages()) {
        await setDoc(doc(db, "businessPages", pageId), { ...data, updatedAt: now() }, { merge: true });
      }
      return d.businessPages[idx];
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["business-pages"] });
      qc.invalidateQueries({ queryKey: ["business-page", vars.pageId] });
    },
  });
}

export function useGetAlbumPhotos(albumId: string) {
  return useQuery({
    queryKey: ["album-photos", albumId],
    enabled: !!albumId,
    queryFn: async () => loadExtra().albumPhotos.filter((p) => p.albumId === albumId),
  });
}

export function useGetAllSaved() {
  return useQuery({
    queryKey: ["all-saved"],
    queryFn: async () => {
      const raw = localStorage.getItem("socialhub_data_v1");
      const d = raw ? JSON.parse(raw) : { posts: [], jobs: [], savedPosts: [], savedJobs: [], users: [] };
      const me = getCurrentUserIdForExtra();
      let savedPostIds: string[] = (d.savedPosts || [])
        .filter((s: { userId: string }) => s.userId === me)
        .map((s: { postId: string }) => s.postId);
      let savedJobIds: string[] = (d.savedJobs || [])
        .filter((s: { userId: string }) => s.userId === me)
        .map((s: { jobId: string }) => s.jobId);

      if (auth.currentUser) {
        const uid = auth.currentUser.uid;
        const [savedPostsSnap, savedJobsSnap, postsSnap, jobsSnap, usersSnap] = await Promise.all([
          getDocs(query(collection(db, "savedPosts"), where("userId", "==", uid))),
          getDocs(query(collection(db, "savedJobs"), where("userId", "==", uid))).catch(() => ({ docs: [] as { data: () => { jobId: string } }[] })),
          getDocs(collection(db, "posts")),
          getDocs(collection(db, "jobs")),
          getDocs(collection(db, "users")),
        ]);
        savedPostsSnap.forEach((docSnap) => savedPostIds.push((docSnap.data() as { postId: string }).postId));
        (savedJobsSnap as { docs: { data: () => { jobId: string } }[] }).docs?.forEach((docSnap) =>
          savedJobIds.push(docSnap.data().jobId),
        );
        savedPostIds = [...new Set(savedPostIds.filter(Boolean))];
        savedJobIds = [...new Set(savedJobIds.filter(Boolean))];

        const usersMap = new Map<string, Record<string, unknown>>();
        usersSnap.forEach((u) => usersMap.set(u.id, { id: u.id, ...u.data() }));
        const localUsers = d.users || [];

        const postsById = new Map<string, Record<string, unknown>>();
        postsSnap.docs.forEach((docSnap) => postsById.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
        (d.posts || []).forEach((post: { id: string }) => {
          if (!postsById.has(post.id)) postsById.set(post.id, post as Record<string, unknown>);
        });

        const jobsById = new Map<string, Record<string, unknown>>();
        jobsSnap.docs.forEach((docSnap) => jobsById.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
        (d.jobs || []).forEach((job: { id: string }) => {
          if (!jobsById.has(job.id)) jobsById.set(job.id, job as Record<string, unknown>);
        });

        const posts = savedPostIds
          .map((id) => postsById.get(id))
          .filter(Boolean)
          .map((post) => {
            const item = post as Record<string, unknown>;
            return {
              ...item,
              author:
                usersMap.get(String(item.authorId)) ||
                localUsers.find((u: { id: string }) => u.id === item.authorId) ||
                { displayName: "Usuario", id: item.authorId },
            };
          });

        const jobs = savedJobIds.map((id) => jobsById.get(id)).filter(Boolean);
        return { posts, jobs, listings: [] };
      }

      const posts = (d.posts || [])
        .filter((post: { id: string }) => savedPostIds.includes(post.id))
        .map((post: { authorId: string }) => ({
          ...post,
          author: d.users?.find((u: { id: string }) => u.id === post.authorId),
        }));
      const jobs = (d.jobs || []).filter((job: { id: string }) => savedJobIds.includes(job.id));
      return { posts, jobs, listings: [] };
    },
  });
}

export function useGetAccountSettings() {
  return useQuery({
    queryKey: ["account-settings"],
    queryFn: async () => {
      const me = getCurrentUserIdForExtra();
      return loadAccountSettings(me);
    },
  });
}

export function useUpdateAccountSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AccountSettings>) => {
      const me = getCurrentUserIdForExtra();
      const current = loadAccountSettings(me);
      const merged = { ...current, ...patch };
      if (patch.notifications) merged.notifications = { ...current.notifications, ...patch.notifications };
      if (patch.accessibility) merged.accessibility = { ...current.accessibility, ...patch.accessibility };
      if (patch.ads) merged.ads = { ...current.ads, ...patch.ads };
      saveAccountSettings(me, merged);
      return merged;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account-settings"] });
      qc.invalidateQueries({ queryKey: ["privacy-settings"] });
    },
  });
}

export function useGetActivityLog() {
  return useQuery({
    queryKey: ["activity-log"],
    queryFn: async () => loadActivityLog(getCurrentUserIdForExtra()),
  });
}

export function useGetPrivacySettings() {
  return useQuery({
    queryKey: ["privacy-settings"],
    queryFn: async () => {
      const s = loadAccountSettings(getCurrentUserIdForExtra());
      return {
        defaultVisibility: s.defaultVisibility,
        allowMessages: s.allowMessages !== "nadie",
        showOnline: s.showOnline,
        blockedIds: s.blockedIds,
      };
    },
  });
}

export function useUpdatePrivacySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<{ defaultVisibility: string; allowMessages: boolean; showOnline: boolean; blockedIds: string[] }>) => {
      const me = getCurrentUserIdForExtra();
      const current = loadAccountSettings(me);
      const patch: Partial<AccountSettings> = {};
      if (settings.defaultVisibility) patch.defaultVisibility = settings.defaultVisibility as AccountSettings["defaultVisibility"];
      if (settings.allowMessages !== undefined) patch.allowMessages = settings.allowMessages ? "todos" : "nadie";
      if (settings.showOnline !== undefined) patch.showOnline = settings.showOnline;
      if (settings.blockedIds) patch.blockedIds = settings.blockedIds;
      const merged = { ...current, ...patch };
      saveAccountSettings(me, merged);
      return merged;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["privacy-settings"] });
      qc.invalidateQueries({ queryKey: ["account-settings"] });
    },
  });
}

export function useGetHelpTickets() {
  return useQuery({
    queryKey: ["help-tickets"],
    queryFn: async () => {
      const d = loadExtra();
      const me = getCurrentUserIdForExtra();
      return d.helpTickets.filter((t) => t.userId === me).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
  });
}

export function useCreateHelpTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ subject, message }: { subject: string; message: string }) => {
      const d = loadExtra();
      const t = { id: rid(), userId: getCurrentUserIdForExtra(), subject, message, status: "open", createdAt: now() };
      d.helpTickets.unshift(t);
      saveExtra(d);
      return t;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["help-tickets"] }),
  });
}

export function useGetBusinessPages(params?: { q?: string; mine?: boolean; discover?: boolean }) {
  return useQuery({
    queryKey: ["business-pages", params],
    queryFn: async () => {
      const all = await loadAllBusinessPages();
      const me = getCurrentUserIdForExtra();
      let list = params?.discover ? all : all.filter((p) => p.ownerId === me);
      if (params?.mine) list = all.filter((p) => p.ownerId === me);
      if (params?.q) {
        const q = params.q.toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            (p.pageType || "").toLowerCase().includes(q),
        );
      }
      return list;
    },
  });
}

export function useGetBusinessPage(id: string) {
  return useQuery({
    queryKey: ["business-page", id],
    enabled: !!id,
    queryFn: async () => {
      const all = await loadAllBusinessPages();
      const found = all.find((p) => p.id === id);
      if (found) return found;
      if (canUseFirestorePages()) {
        const snap = await getDoc(doc(db, "businessPages", id));
        if (snap.exists()) return { id: snap.id, ...(snap.data() as Omit<ExtraData["businessPages"][0], "id">) };
      }
      return undefined;
    },
  });
}

export function useCreateBusinessPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      category,
      pageType,
    }: {
      name: string;
      description: string;
      category: string;
      pageType?: string;
    }) => {
      const d = loadExtra();
      const page = {
        id: rid(),
        ownerId: getCurrentUserIdForExtra(),
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        description,
        category,
        pageType: pageType || "brand",
        followersCount: 0,
        createdAt: now(),
      };
      if (canUseFirestorePages()) {
        await setDoc(doc(db, "businessPages", page.id), page);
      }
      d.businessPages.unshift(page);
      saveExtra(d);
      return page;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-pages"] });
      qc.invalidateQueries({ queryKey: ["search-global"] });
    },
  });
}

export function useGetCommunityAdminList() {
  return useQuery({
    queryKey: ["community-admin-list"],
    queryFn: async () => {
      const raw = localStorage.getItem("socialhub_data_v1");
      const extra = loadExtra();
      const me = getCurrentUserIdForExtra();
      if (!raw) return [];
      const d = JSON.parse(raw);
      const joined = (d.communityMembers || []).filter((m: any) => m.userId === me).map((m: any) => m.communityId);
      const adminOf = extra.communityMeta.filter((m) => m.admins?.includes(me)).map((m) => m.communityId);
      const created = (d.communities || []).filter((c: any) => c.creatorId === me).map((c: any) => c.id);
      const manageable = new Set([...joined, ...adminOf, ...created]);
      return (d.communities || [])
        .filter((c: any) => manageable.has(c.id))
        .map((c: any) => {
          const meta = extra.communityMeta.find((m) => m.communityId === c.id) || {
            communityId: c.id,
            rules: "Sé respetuoso. No spam. Contenido relevante al grupo.",
            requireApproval: false,
            admins: [me],
            mods: [],
            pendingMembers: [],
          };
          return { ...c, meta };
        });
    },
  });
}

export function useUpdateCommunityMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ communityId, rules, requireApproval }: { communityId: string; rules?: string; requireApproval?: boolean }) => {
      const d = loadExtra();
      let meta = d.communityMeta.find((m) => m.communityId === communityId);
      if (!meta) {
        meta = { communityId, rules: rules || "", requireApproval: !!requireApproval, admins: [getCurrentUserIdForExtra()], mods: [], pendingMembers: [] };
        d.communityMeta.push(meta);
      } else {
        if (rules !== undefined) meta.rules = rules;
        if (requireApproval !== undefined) meta.requireApproval = requireApproval;
      }
      saveExtra(d);
      return meta;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community-admin-list"] }),
  });
}

export function useApproveCommunityMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ communityId, userId }: { communityId: string; userId: string }) => {
      const d = loadExtra();
      const meta = d.communityMeta.find((m) => m.communityId === communityId);
      if (meta) meta.pendingMembers = meta.pendingMembers.filter((p) => p.userId !== userId);
      const raw = localStorage.getItem("socialhub_data_v1");
      if (raw) {
        const app = JSON.parse(raw);
        if (!app.communityMembers.some((m: any) => m.communityId === communityId && m.userId === userId)) {
          app.communityMembers.push({ communityId, userId });
          localStorage.setItem("socialhub_data_v1", JSON.stringify(app));
        }
      }
      saveExtra(d);
      return { ok: true };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community-admin-list"] }),
  });
}

export function useGetAnalytics() {
  return useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: async () => {
      const raw = localStorage.getItem("socialhub_data_v1");
      const d = raw ? JSON.parse(raw) : { posts: [], follows: [] };
      const me = getCurrentUserIdForExtra();

      if (auth.currentUser) {
        const uid = auth.currentUser.uid;
        const [followers, following, postsSnap] = await Promise.all([
          getDocs(query(collection(db, "follows"), where("followingId", "==", uid))),
          getDocs(query(collection(db, "follows"), where("followerId", "==", uid))),
          getDocs(query(collection(db, "posts"), where("authorId", "==", uid))),
        ]);
        const myPosts = postsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Record<string, unknown>) }));
        const likesReceived = myPosts.reduce((sum, item) => sum + (Number(item.likesCount) || 0), 0);
        const viewsReceived = myPosts.reduce((sum, item) => sum + (Number(item.viewsCount) || 0), 0);
        const sharesReceived = myPosts.reduce((sum, item) => sum + (Number(item.sharesCount) || 0), 0);
        const commentsReceived = myPosts.reduce((sum, item) => sum + (Number(item.commentsCount) || 0), 0);
        const engagement = likesReceived + commentsReceived + sharesReceived;
        const weeklyGrowth = Math.min(99, Math.round(5 + Math.sqrt(engagement + myPosts.length) * 3));
        const topPost = [...myPosts].sort(
          (a, b) => (Number(b.likesCount) || 0) - (Number(a.likesCount) || 0),
        )[0];
        return {
          postsCount: myPosts.length,
          followersCount: followers.size,
          followingCount: following.size,
          likesReceived,
          viewsReceived,
          sharesReceived,
          weeklyGrowth,
          topPost: topPost || null,
        };
      }

      const myPosts = (d.posts || []).filter((item: { authorId: string }) => item.authorId === me);
      const followers = (d.follows || []).filter((f: { followingId: string }) => f.followingId === me).length;
      const following = (d.follows || []).filter((f: { followerId: string }) => f.followerId === me).length;
      const likesReceived = myPosts.reduce((sum: number, item: { likesCount?: number }) => sum + (item.likesCount || 0), 0);
      const viewsReceived = myPosts.reduce((sum: number, item: { viewsCount?: number }) => sum + (item.viewsCount || 0), 0);
      const sharesReceived = myPosts.reduce((sum: number, item: { sharesCount?: number }) => sum + (item.sharesCount || 0), 0);
      return {
        postsCount: myPosts.length,
        followersCount: followers,
        followingCount: following,
        likesReceived,
        viewsReceived,
        sharesReceived,
        weeklyGrowth: Math.min(99, 8 + myPosts.length * 2),
        topPost: myPosts.sort((a: { likesCount?: number }, b: { likesCount?: number }) => (b.likesCount || 0) - (a.likesCount || 0))[0] || null,
      };
    },
  });
}

export function useGetPromoteCredits() {
  return useQuery({
    queryKey: ["promote-credits"],
    queryFn: async () => {
      const d = loadExtra();
      const me = getCurrentUserIdForExtra();
      return { balance: d.credits[me] ?? 100, packages: [{ id: "starter", credits: 50, price: "$4.99" }, { id: "pro", credits: 200, price: "$14.99" }] };
    },
  });
}

export function useBoostPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, credits }: { postId: string; credits: number }) => {
      const d = loadExtra();
      const me = getCurrentUserIdForExtra();
      const bal = d.credits[me] ?? 100;
      if (bal < credits) throw new Error("Créditos insuficientes");
      d.credits[me] = bal - credits;
      d.boostedPosts.push({ postId, userId: me, until: new Date(Date.now() + 7 * 864e5).toISOString() });
      saveExtra(d);
      return { ok: true, balance: d.credits[me] };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promote-credits"] }),
  });
}
