import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "./firebase";
import {
  addDoc,
  collection,
  deleteDoc,
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
import { updateProfile } from "firebase/auth";
import { db } from "./firebase";
import { getDevUserId } from "./queryClient";
import {
  canViewBirthDate,
  daysUntilNextBirthday,
  formatBirthdayLabel,
  isBirthdayToday,
} from "./birthday";
import { loadAllBusinessPages } from "./extra-features-api";
import { userHasAppliedToJob } from "./resume-api";
import {
  ensureMenpoeReelsInFirestore,
  mergeMenpoeReelsIntoLocalData,
  MENPOE_REEL_AUTHORS,
  resolveReelMediaUrl,
} from "./reels-seed";

type AnyObj = Record<string, any>;

type AppData = {
  users: AnyObj[];
  posts: AnyObj[];
  comments: AnyObj[];
  stories: AnyObj[];
  conversations: AnyObj[];
  messages: AnyObj[];
  notifications: AnyObj[];
  jobs: AnyObj[];
  savedJobs: AnyObj[];
  jobApplications: AnyObj[];
  listings: AnyObj[];
  communities: AnyObj[];
  communityMembers: AnyObj[];
  events: AnyObj[];
  eventAttendees: AnyObj[];
  streams: AnyObj[];
  follows: AnyObj[];
  friendRequests: AnyObj[];
  savedPosts: AnyObj[];
  reactions: AnyObj[];
  userAvatars: AnyObj[];
};

const KEY = "socialhub_data_v1";
const now = () => new Date().toISOString();
const rid = () => Math.random().toString(36).slice(2, 12);

function baseUsers() {
  const today = new Date();
  const birthThisMonth = `${today.getFullYear() - 25}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return [
    {
      id: "2l0s8v0kapbei4esxc",
      clerkId: "2l0s8v0kapbei4esxc",
      username: "sofia_tech",
      displayName: "Sofia Tech",
      bio: "Construyendo productos digitales",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sofia",
      role: "admin",
      isVerified: true,
      followersCount: 1,
      followingCount: 1,
      postsCount: 1,
      birthDate: birthThisMonth,
      birthDateVisibility: "amigos",
      createdAt: now(),
    },
    {
      id: "9c8cnoxhr31nvvjiom",
      clerkId: "9c8cnoxhr31nvvjiom",
      username: "carlos_dev",
      displayName: "Carlos Dev",
      bio: "Frontend y Firebase",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=carlos",
      role: "user",
      isVerified: false,
      followersCount: 1,
      followingCount: 1,
      postsCount: 1,
      birthDate: "1998-06-15",
      birthDateVisibility: "publico",
      createdAt: now(),
    },
  ];
}

function seed(): AppData {
  const users = baseUsers();
  const [u1, u2] = users;
  const post1 = {
    id: rid(),
    authorId: u1.id,
    content: "Bienvenido a MenpoeSocial en Firebase!",
    postType: "text",
    hashtags: ["firebase", "social"],
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 10,
    createdAt: now(),
  };
  const post2 = {
    id: rid(),
    authorId: u2.id,
    content: "Todo listo para crear y compartir contenido.",
    postType: "text",
    hashtags: ["espanol", "comunidad"],
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 7,
    createdAt: now(),
  };
  const reel1 = {
    id: rid(),
    authorId: u1.id,
    content: "Demo Reel: naturaleza y paisajes",
    postType: "reel",
    mediaUrls: ["https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"],
    hashtags: ["reel", "video"],
    likesCount: 5,
    commentsCount: 1,
    sharesCount: 1,
    viewsCount: 120,
    createdAt: now(),
  };
  const reel2 = {
    id: rid(),
    authorId: u2.id,
    content: "Demo Reel: aventura y travel",
    postType: "reel",
    mediaUrls: ["https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"],
    hashtags: ["reels", "explorar"],
    likesCount: 3,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 95,
    createdAt: now(),
  };
  return {
    users,
    posts: [reel1, reel2, post1, post2],
    comments: [],
    stories: [],
    conversations: [],
    messages: [],
    notifications: [],
    jobs: [
      { id: rid(), title: "Desarrollador Frontend", company: "Menpoe", location: "Remoto", isRemote: true, jobType: "full_time", createdAt: now(), postedById: u1.id, applicantsCount: 0 },
    ],
    savedJobs: [],
    jobApplications: [],
    listings: [],
    communities: [{ id: rid(), name: "Programacion", slug: "programacion", description: "Comunidad tecnica", visibility: "public", membersCount: 1, createdAt: now() }],
    communityMembers: [],
    events: [{ id: rid(), title: "Meetup Firebase", organizerId: u1.id, startsAt: now(), eventType: "online", attendeesCount: 0, createdAt: now() }],
    eventAttendees: [],
    streams: [],
    follows: [{ followerId: u1.id, followingId: u2.id }, { followerId: u2.id, followingId: u1.id }],
    friendRequests: [],
    savedPosts: [],
    reactions: [],
    userAvatars: [],
  };
}

function ensureReels(d: AppData) {
  mergeMenpoeReelsIntoLocalData(d);
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const d = seed();
      ensureReels(d);
      localStorage.setItem(KEY, JSON.stringify(d));
      return d;
    }
    const d = JSON.parse(raw) as AppData;
    if (!d.userAvatars) d.userAvatars = [];
    ensureReels(d);
    save(d);
    return d;
  } catch {
    const d = seed();
    ensureReels(d);
    return d;
  }
}
function save(d: AppData) {
  // Guardrail: si el storage local se infla (por DataURLs), recortamos media en posts antiguos.
  // Mantiene la app estable en modo 100% gratis sin Storage.
  const raw = JSON.stringify(d);
  const bytes = raw.length;
  const SOFT_LIMIT = 4_600_000; // ~4.6MB por seguridad (localStorage suele ~5MB)
  if (bytes <= SOFT_LIMIT) {
    localStorage.setItem(KEY, raw);
    return;
  }

  try {
    // Prune: quitar mediaUrls de posts más antiguos (conserva texto y metadata).
    const posts = [...d.posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    for (let i = posts.length - 1; i >= 0; i--) {
      const p = posts[i];
      if (Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0) {
        p.mediaUrls = [];
        p.postType = p.postType === "reel" ? "reel" : "text";
      }
      const pruned = JSON.stringify(d);
      if (pruned.length <= SOFT_LIMIT) {
        localStorage.setItem(KEY, pruned);
        return;
      }
    }
    // Último recurso: guardar lo que se pueda (sin media).
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    localStorage.setItem(KEY, raw.slice(0, SOFT_LIMIT));
  }
}
function usernameFromAuth() {
  const emailUser = auth.currentUser?.email?.split("@")[0]?.trim();
  if (emailUser) return emailUser.toLowerCase();
  const display = auth.currentUser?.displayName?.trim();
  if (display) return display.toLowerCase().replace(/\s+/g, "_");
  return "";
}
function currentUserId() {
  // Always prioritize the real Firebase session over local dev shortcuts.
  return auth.currentUser?.uid || getDevUserId() || "9c8cnoxhr31nvvjiom";
}
function ensureCurrentUser(d: AppData) {
  const id = currentUserId();
  let u = d.users.find((x) => x.id === id || x.clerkId === id);
  const authEmail = auth.currentUser?.email || `usuario_${id}@local.dev`;
  const authUsername = usernameFromAuth() || authEmail.split("@")[0];
  const authDisplayName =
    auth.currentUser?.displayName?.trim() ||
    authUsername ||
    authEmail.split("@")[0];
  const authAvatar =
    auth.currentUser?.photoURL ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`;

  if (!u) {
    u = {
      id,
      clerkId: id,
      username: authUsername,
      displayName: authDisplayName,
      avatarUrl: authAvatar,
      role: "user",
      isVerified: false,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      createdAt: now(),
    };
    d.users.push(u);
  } else {
    // Keep profile aligned with Firebase Auth identity for author attribution.
    if (auth.currentUser) {
      u.clerkId = id;
      if (!u.username || u.username.startsWith("usuario_")) u.username = authUsername;
      if (!u.displayName || u.displayName === u.username) u.displayName = authDisplayName;
      const isDefaultAvatar =
        !u.avatarUrl || /dicebear\.com\/7\.x\/avataaars\/svg\?seed=/i.test(u.avatarUrl);
      if (isDefaultAvatar) {
        u.avatarUrl = authAvatar;
      }
    }
  }
  return u;
}
function withAuthor(d: AppData, p: AnyObj, meId: string) {
  const a = d.users.find((u) => u.id === p.authorId) || d.users[0];
  const reaction = d.reactions.find((r) => r.postId === p.id && r.userId === meId)?.reaction ?? null;
  const saved = d.savedPosts.some((s) => s.postId === p.id && s.userId === meId);
  const commentsCount = d.comments.filter((c) => c.postId === p.id).length;
  return { ...p, author: a, userReaction: reaction, isSaved: saved, commentsCount, isLiked: !!reaction };
}

const USE_FIRESTORE_SOCIAL = true;
const usersCol = collection(db, "users");
const postsCol = collection(db, "posts");
const commentsCol = collection(db, "comments");
const userAvatarsCol = collection(db, "userAvatars");
const followsCol = collection(db, "follows");
const notificationsCol = collection(db, "notifications");
const reactionsCol = collection(db, "reactions");
const savedPostsCol = collection(db, "savedPosts");
const storiesCol = collection(db, "stories");
const storyViewsCol = collection(db, "storyViews");
const communitiesCol = collection(db, "communities");
const communityMembersCol = collection(db, "communityMembers");
const jobsCol = collection(db, "jobs");
const eventsCol = collection(db, "events");
const streamsCol = collection(db, "streams");

function communityMemberDocId(communityId: string, userId: string) {
  return `${communityId}_${userId}`;
}

async function resolveUserId(userIdOrUsername: string, d: AppData): Promise<string> {
  if (canUseFirestoreSocial()) {
    const direct = await getDoc(doc(db, "users", userIdOrUsername));
    if (direct.exists()) return userIdOrUsername;
    const snap = await getDocs(usersCol);
    for (const u of snap.docs) {
      const data = u.data() as AnyObj;
      if (
        u.id === userIdOrUsername ||
        data.username === userIdOrUsername ||
        data.clerkId === userIdOrUsername
      ) {
        return u.id;
      }
    }
  }
  const local = d.users.find(
    (x) =>
      x.id === userIdOrUsername ||
      x.username === userIdOrUsername ||
      x.clerkId === userIdOrUsername,
  );
  return local?.id || userIdOrUsername;
}

async function isCommunityMemberFs(communityId: string, userId: string) {
  const snap = await getDoc(
    doc(db, "communityMembers", communityMemberDocId(communityId, userId)),
  );
  return snap.exists();
}

function isCommunityMemberLocal(d: AppData, communityId: string, userId: string) {
  return d.communityMembers.some((m) => m.communityId === communityId && m.userId === userId);
}

function canUseFirestoreSocial() {
  return USE_FIRESTORE_SOCIAL && !!auth.currentUser;
}

function rankPost(post: AnyObj, atMs: number = Date.now()) {
  const likes = post.likesCount || 0;
  const comments = post.commentsCount || 0;
  const shares = post.sharesCount || 0;
  const views = post.viewsCount || 0;
  const createdAt = Date.parse(post.createdAt || now());
  const ageHours = Math.max(0, (atMs - createdAt) / 36e5);
  return likes * 3 + comments * 2 + shares * 4 + views * 0.1 - ageHours * 0.15;
}

const BLOCKED_KEY = "social_blocked_users_v1";
const SEARCH_HISTORY_KEY = "social_search_history_v1";
const STORY_VIEWS_KEY = "social_story_views_v1";
const STORY_TTL_MS = 24 * 60 * 60 * 1000;

function getBlockedUserIds(): string[] {
  try {
    const raw = localStorage.getItem(BLOCKED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function recordSearchQuery(q: string) {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return;
  const prev = getSearchHistory().filter((x) => x !== term);
  const next = [term, ...prev].slice(0, 8);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
}

function getFriendIds(d: AppData, meId: string): Set<string> {
  const ids = new Set<string>();
  d.friendRequests
    .filter((r) => r.status === "accepted")
    .forEach((r) => {
      if (r.requesterId === meId) ids.add(r.addresseeId);
      if (r.addresseeId === meId) ids.add(r.requesterId);
    });
  d.users.forEach((u) => {
    if (u.id === meId) return;
    const a = d.follows.some((f) => f.followerId === meId && f.followingId === u.id);
    const b = d.follows.some((f) => f.followerId === u.id && f.followingId === meId);
    if (a && b) ids.add(u.id);
  });
  return ids;
}

function canViewPost(
  post: AnyObj,
  meId: string,
  followingIds: Set<string>,
  friendIds: Set<string>,
): boolean {
  if (!post || post.communityId) return true;
  if (post.authorId === meId) return true;
  const vis = post.visibility || "publico";
  if (vis === "solo_yo") return false;
  if (vis === "publico") return true;
  if (vis === "amigos") return friendIds.has(post.authorId) || followingIds.has(post.authorId);
  return true;
}

function filterVisiblePosts(
  posts: AnyObj[],
  meId: string,
  followingIds: Set<string>,
  friendIds: Set<string>,
) {
  const blocked = new Set(getBlockedUserIds());
  return posts.filter(
    (p) =>
      !blocked.has(p.authorId) &&
      !p.communityId &&
      canViewPost(p, meId, followingIds, friendIds),
  );
}

function findOrCreateLocalConversation(d: AppData, meId: string, otherId: string) {
  const meUser = d.users.find((u) => u.id === meId) || ensureCurrentUser(d);
  const other = d.users.find((u) => u.id === otherId);
  if (!other) throw new Error("Usuario no encontrado");
  let conv = d.conversations.find((c) => {
    const ids = (c.participantIds as string[]) || c.participants?.map((p: AnyObj) => p.id) || [];
    return ids.includes(meId) && ids.includes(otherId);
  });
  if (!conv) {
    conv = {
      id: rid(),
      participantIds: [meId, otherId],
      participants: [meUser, other],
      createdAt: now(),
    };
    d.conversations.push(conv);
  }
  return conv;
}

async function incrementPostShares(postId: string, d: AppData) {
  if (canUseFirestoreSocial()) {
    await updateDoc(doc(db, "posts", postId), { sharesCount: increment(1), updatedAt: now() });
    const postDoc = await getDoc(doc(db, "posts", postId));
    return postDoc.exists() ? ((postDoc.data() as AnyObj).sharesCount || 0) : 0;
  }
  const p = d.posts.find((x) => x.id === postId);
  if (p) p.sharesCount = (p.sharesCount || 0) + 1;
  save(d);
  return p?.sharesCount || 0;
}

async function uniqueUsername(base: string, uid: string) {
  let candidate = (base || `usuario_${uid.slice(0, 6)}`).toLowerCase().replace(/[^\w]/g, "_");
  let index = 1;
  while (true) {
    const taken = await getDocs(query(usersCol, where("username", "==", candidate), limit(1)));
    if (taken.empty || taken.docs[0]?.id === uid) return candidate;
    candidate = `${base}_${index++}`;
  }
}

async function ensureCurrentUserInFirestore(d: AppData) {
  if (!auth.currentUser) return ensureCurrentUser(d);

  const uid = auth.currentUser.uid;
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  const email = auth.currentUser.email || `usuario_${uid}@local.dev`;
  const usernameBase = usernameFromAuth() || email.split("@")[0];
  const displayName = auth.currentUser.displayName?.trim() || usernameBase;
  const avatarUrl = auth.currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;

  if (!snap.exists()) {
    const username = await uniqueUsername(usernameBase, uid);
    const created = {
      id: uid,
      clerkId: uid,
      username,
      displayName,
      avatarUrl,
      role: "user",
      isVerified: false,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      birthDate: null,
      birthDateVisibility: "amigos",
      createdAt: now(),
      updatedAt: now(),
    };
    await setDoc(userRef, created);
    if (!auth.currentUser.displayName && username) {
      await updateProfile(auth.currentUser, { displayName: username });
    }
    const idx = d.users.findIndex((x) => x.id === uid || x.clerkId === uid);
    if (idx >= 0) d.users[idx] = created;
    else d.users.push(created);
    save(d);
    return created;
  }

  const existing = snap.data() as AnyObj;
  const updates: AnyObj = { updatedAt: now() };
  if (!existing.displayName && displayName) updates.displayName = displayName;
  if (!existing.username) updates.username = await uniqueUsername(usernameBase, uid);
  if (!existing.avatarUrl && avatarUrl) updates.avatarUrl = avatarUrl;
  if (Object.keys(updates).length > 1) await updateDoc(userRef, updates);
  const merged = { ...existing, ...updates, id: uid, clerkId: uid };

  const idx = d.users.findIndex((x) => x.id === uid || x.clerkId === uid);
  if (idx >= 0) d.users[idx] = merged;
  else d.users.push(merged);
  save(d);
  return merged;
}

async function createNotification(data: AnyObj) {
  if (!canUseFirestoreSocial()) return;
  await addDoc(notificationsCol, {
    id: rid(),
    isRead: false,
    createdAt: now(),
    ...data,
  });
}

export const getGetFeedQueryKey = (mode?: "foryou" | "following") =>
  mode ? ["feed", mode] : ["feed"];
export const getGetCommentsQueryKey = (postId: string) => ["comments", postId];
export const getGetStoriesQueryKey = () => ["stories"];
export const getGetUserQueryKey = (userId: string) => ["user", userId];
export const getSearchUsersQueryKey = (q: AnyObj) => ["search-users", q?.q || ""];
export const getSearchGlobalQueryKey = (q: AnyObj) => ["search-global", q?.q || ""];
export const getGetEventQueryKey = (id: string) => ["event", id];
export const getGetStreamQueryKey = (id: string) => ["stream", id];
export const getGetJobQueryKey = (id: string) => ["job", id];
export const getGetListingQueryKey = (id: string) => ["listing", id];
export const getGetCommunityQueryKey = (id: string) => ["community", id];
export const getGetUserPostsQueryKey = (userId: string) => ["user-posts", userId];
export const getListConversationMessagesQueryKey = (id: string) => ["conversation-messages", id];

export function useGetMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const d = load();
      const me = canUseFirestoreSocial()
        ? await ensureCurrentUserInFirestore(d)
        : ensureCurrentUser(d);
      save(d);
      return me;
    },
  });
}
export function useGetUser(userId: string, opts?: AnyObj) {
  return useQuery({
    queryKey: getGetUserQueryKey(userId),
    enabled: opts?.query?.enabled ?? true,
    queryFn: async () => {
      const d = load();
      const meId = currentUserId();
      if (canUseFirestoreSocial()) {
        await ensureCurrentUserInFirestore(d);
        let userData: AnyObj | null = null;
        const byId = await getDoc(doc(db, "users", userId));
        if (byId.exists()) userData = byId.data();
        if (!userData) {
          const byUsername = await getDocs(query(usersCol, where("username", "==", userId.toLowerCase()), limit(1)));
          if (!byUsername.empty) userData = byUsername.docs[0].data();
        }
        if (!userData) return null;
        const followSnap = await getDoc(doc(db, "follows", `${meId}_${userData.id}`));
        return {
          ...userData,
          isFollowing: followSnap.exists(),
          skills: userData.skills || [],
          experience: userData.experience || [],
          education: userData.education || [],
          languages: userData.languages || [],
          socialLinks: userData.socialLinks || [],
        };
      }
      const u = d.users.find(
        (x) =>
          x.id === userId ||
          x.clerkId === userId ||
          x.username === userId ||
          x.username?.toLowerCase?.() === userId?.toLowerCase?.(),
      );
      if (!u) return null;
      return { ...u, isFollowing: d.follows.some((f) => f.followerId === meId && f.followingId === u.id), skills: [], experience: [], education: [], languages: [], socialLinks: [] };
    },
  });
}
export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: AnyObj) => {
      const d = load();
      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        await updateDoc(doc(db, "users", me.id), { ...data, updatedAt: now() });
        if (auth.currentUser && (data.displayName || data.avatarUrl)) {
          await updateProfile(auth.currentUser, {
            displayName: data.displayName ?? auth.currentUser.displayName ?? undefined,
            photoURL: data.avatarUrl ?? auth.currentUser.photoURL ?? undefined,
          });
        }
        const merged = { ...me, ...data };
        const idx = d.users.findIndex((x) => x.id === me.id);
        if (idx >= 0) d.users[idx] = merged;
        else d.users.push(merged);
        save(d);
        return merged;
      }
      const me = ensureCurrentUser(d);
      Object.assign(me, data);
      save(d);
      return me;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["stories"] });
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("user") });
    },
  });
}
export function useGetFeed(_params?: AnyObj, opts?: AnyObj) {
  const feedMode: "foryou" | "following" = _params?.following ? "following" : "foryou";
  return useQuery({
    queryKey: opts?.query?.queryKey || getGetFeedQueryKey(feedMode),
    enabled: opts?.query?.enabled ?? true,
    staleTime: 90_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const d = load();
      const meId = currentUserId();
      const rankedAt = Date.now();
      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        const postSnap = await getDocs(postsCol);
        const userSnap = await getDocs(usersCol);
        const commentSnap = await getDocs(commentsCol);
        const reactionSnap = await getDocs(query(reactionsCol, where("userId", "==", me.id)));
        const savedSnap = await getDocs(query(savedPostsCol, where("userId", "==", me.id)));
        const followSnap = await getDocs(query(followsCol, where("followerId", "==", me.id)));

        const usersMap = new Map<string, AnyObj>();
        userSnap.forEach((u) => usersMap.set(u.id, { id: u.id, ...(u.data() as AnyObj) }));
        const commentsByPost = new Map<string, number>();
        commentSnap.forEach((c) => {
          const p = c.data().postId;
          commentsByPost.set(p, (commentsByPost.get(p) || 0) + 1);
        });
        const reactionsByPost = new Map<string, string>();
        reactionSnap.forEach((r) => reactionsByPost.set(r.data().postId, r.data().reaction || "like"));
        const savedIds = new Set<string>();
        savedSnap.forEach((s) => savedIds.add(s.data().postId));
        const followingIds = new Set<string>();
        followSnap.forEach((f) => followingIds.add(f.data().followingId));

        const posts = postSnap.docs.map((p) => {
          const item = { id: p.id, ...(p.data() as AnyObj) };
          const author = usersMap.get(item.authorId) || d.users.find((u) => u.id === item.authorId) || me;
          const commentsCount = commentsByPost.get(item.id) || item.commentsCount || 0;
          const userReaction = reactionsByPost.get(item.id) ?? null;
          return {
            ...item,
            commentsCount,
            author,
            userReaction,
            isLiked: !!userReaction,
            isSaved: savedIds.has(item.id),
          };
        });

        const friendIds = getFriendIds(d, me.id);
        const onlyFollowing = !!_params?.following;
        let filtered = onlyFollowing ? posts.filter((p) => followingIds.has(p.authorId)) : posts;
        filtered = filterVisiblePosts(filtered, me.id, followingIds, friendIds);
        const sorted = onlyFollowing
          ? filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          : filtered.sort((a, b) => rankPost(b, rankedAt) - rankPost(a, rankedAt));
        return { posts: sorted, hasMore: false, nextCursor: null };
      }
      const onlyFollowing = !!_params?.following;
      const followingSet = new Set(d.follows.filter((f) => f.followerId === meId).map((f) => f.followingId));
      const friendIds = getFriendIds(d, meId);
      const basePosts = [...d.posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      let filtered = onlyFollowing ? basePosts.filter((p) => followingSet.has(p.authorId)) : basePosts;
      filtered = filterVisiblePosts(filtered, meId, followingSet, friendIds);
      return { posts: filtered.map((p) => withAuthor(d, p, meId)), hasMore: false, nextCursor: null };
    },
  });
}
export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: AnyObj) => {
      const d = load();
      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        const created = {
          id: rid(),
          authorId: me.id,
          content: data.content,
          postType: data.postType || "text",
          mediaUrls: data.mediaUrls || [],
          hashtags: data.hashtags || [],
          visibility: data.visibility || "publico",
          location: data.location || null,
          likesCount: 0,
          sharesCount: 0,
          viewsCount: 0,
          createdAt: now(),
          updatedAt: now(),
        };
        await setDoc(doc(db, "posts", created.id), created);
        await updateDoc(doc(db, "users", me.id), { postsCount: increment(1), updatedAt: now() });
        return created;
      }
      const me = ensureCurrentUser(d);
      const p = { id: rid(), authorId: me.id, content: data.content, postType: data.postType || "text", mediaUrls: data.mediaUrls || [], hashtags: data.hashtags || [], visibility: data.visibility || "publico", location: data.location || null, likesCount: 0, sharesCount: 0, viewsCount: 0, createdAt: now() };
      d.posts.unshift(p);
      me.postsCount = (me.postsCount || 0) + 1;
      save(d);
      return p;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
export function useLikePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, data }: AnyObj) => {
      const d = load();
      const meId = currentUserId();
      const reaction: string | null = (data?.reaction ?? "like") as any;

      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        const reactionRef = doc(db, "reactions", `${postId}_${me.id}`);

        if (!reaction || reaction === "remove") {
          await deleteDoc(reactionRef);
        } else {
          await setDoc(reactionRef, { postId, userId: me.id, reaction, updatedAt: now() });
        }

        const snap = await getDocs(query(reactionsCol, where("postId", "==", postId)));
        await updateDoc(doc(db, "posts", postId), { likesCount: snap.size, updatedAt: now() });

        const postDoc = await getDoc(doc(db, "posts", postId));
        const post = postDoc.exists() ? (postDoc.data() as AnyObj) : null;
        if (reaction && reaction !== "remove" && post && post.authorId && post.authorId !== me.id) {
          await createNotification({ type: "like", recipientId: post.authorId, actorId: me.id, postId, text: `${me.displayName} reaccionó a tu publicación` });
        }
        return { reaction, likesCount: snap.size };
      }

      d.reactions = d.reactions.filter((r) => !(r.postId === postId && r.userId === meId));
      if (reaction && reaction !== "remove") d.reactions.push({ postId, userId: meId, reaction });
      const p = d.posts.find((x) => x.id === postId);
      if (p) p.likesCount = d.reactions.filter((r) => r.postId === postId).length;
      save(d);
      return { reaction, likesCount: p?.likesCount || 0 };
    },
    onSuccess: () => {
      // Mantener consistencia entre pestañas/dispositivos y al refrescar.
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
export function useSavePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId }: AnyObj) => {
      const d = load();
      const meId = currentUserId();
      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        const saveRef = doc(db, "savedPosts", `${postId}_${me.id}`);
        const found = await getDoc(saveRef);
        if (found.exists()) await deleteDoc(saveRef);
        else await setDoc(saveRef, { postId, userId: me.id, createdAt: now() });
        return { saved: !found.exists() };
      }
      const found = d.savedPosts.find((s) => s.postId === postId && s.userId === meId);
      if (found) d.savedPosts = d.savedPosts.filter((s) => !(s.postId === postId && s.userId === meId));
      else d.savedPosts.push({ postId, userId: meId });
      save(d);
      return { saved: !found };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-saved"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
export function useSharePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId }: AnyObj) => {
      const d = load();
      const sharesCount = await incrementPostShares(postId, d);
      return { shared: true, sharesCount, destination: "link" };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useSharePostTo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      destination,
      communityId,
      targetUserId,
      caption,
    }: AnyObj) => {
      const d = load();
      const meId = currentUserId();
      let original: AnyObj | null = null;

      if (canUseFirestoreSocial()) {
        const snap = await getDoc(doc(db, "posts", postId));
        if (snap.exists()) original = { id: snap.id, ...(snap.data() as AnyObj) };
      } else {
        original = d.posts.find((p) => p.id === postId) ?? null;
      }
      if (!original) throw new Error("Publicación no encontrada");

      const shareNote =
        caption?.trim() ||
        `↪ ${(original.content || "Publicación compartida").slice(0, 240)}`;

      if (destination === "feed") {
        const newPost = {
          id: rid(),
          authorId: meId,
          content: shareNote,
          postType: original.postType || "text",
          mediaUrls: original.mediaUrls || [],
          sharedPostId: postId,
          visibility: "publico",
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          viewsCount: 0,
          createdAt: now(),
          updatedAt: now(),
        };
        if (canUseFirestoreSocial()) {
          const me = await ensureCurrentUserInFirestore(d);
          newPost.authorId = me.id;
          await setDoc(doc(db, "posts", newPost.id), newPost);
        } else {
          d.posts.unshift(newPost);
          save(d);
        }
      } else if (destination === "community" && communityId) {
        const newPost = {
          id: rid(),
          authorId: meId,
          communityId,
          content: shareNote,
          postType: original.postType || "text",
          mediaUrls: original.mediaUrls || [],
          sharedPostId: postId,
          visibility: "publico",
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          createdAt: now(),
          updatedAt: now(),
        };
        if (canUseFirestoreSocial()) {
          await setDoc(doc(db, "posts", newPost.id), newPost);
        } else {
          d.posts.unshift(newPost);
          const comm = d.communities.find((c) => c.id === communityId);
          if (comm) comm.postsCount = (comm.postsCount || 0) + 1;
          save(d);
        }
      } else if (destination === "message" && targetUserId) {
        const content = `${shareNote}\n\nVer publicación: #post-${postId}`;
        if (canUseFirestoreSocial()) {
          const me = await ensureCurrentUserInFirestore(d);
          const convSnap = await getDocs(collection(db, "conversations"));
          let conv = convSnap.docs.find((c) => {
            const ids = (c.data() as AnyObj).participantIds || [];
            return ids.includes(me.id) && ids.includes(targetUserId);
          });
          let convId = conv?.id;
          if (!convId) {
            convId = rid();
            await setDoc(doc(db, "conversations", convId), {
              participantIds: [me.id, targetUserId],
              createdAt: now(),
            });
          }
          const m = {
            id: rid(),
            conversationId: convId,
            senderId: me.id,
            content,
            sharedPostId: postId,
            createdAt: now(),
          };
          await setDoc(doc(db, "messages", m.id), m);
        } else {
          const conv = findOrCreateLocalConversation(d, meId, targetUserId);
          d.messages.push({
            id: rid(),
            conversationId: conv.id,
            senderId: meId,
            content,
            sharedPostId: postId,
            createdAt: now(),
          });
          save(d);
        }
      }

      const sharesCount = await incrementPostShares(postId, d);
      return { shared: true, destination: destination || "link", sharesCount };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
export function useGetComments(postId: string, opts?: AnyObj) {
  return useQuery({
    queryKey: opts?.query?.queryKey || getGetCommentsQueryKey(postId),
    enabled: opts?.query?.enabled ?? !!postId,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const d = load();

      const attachAuthor = (comment: AnyObj, users: Map<string, AnyObj> | null) => {
        const author =
          (users?.get(comment.authorId) as AnyObj | undefined) ||
          d.users.find((u) => u.id === comment.authorId) ||
          null;
        return { ...comment, author };
      };

      if (canUseFirestoreSocial()) {
        await ensureCurrentUserInFirestore(d);
        const [commentsSnap, usersSnap] = await Promise.all([
          getDocs(query(commentsCol, where("postId", "==", postId))),
          getDocs(usersCol),
        ]);
        const users = new Map<string, AnyObj>();
        usersSnap.forEach((u) => users.set(u.id, { id: u.id, ...(u.data() as AnyObj) }));
        const all = commentsSnap.docs
          .map((c) => ({ id: c.id, ...(c.data() as AnyObj) }))
          .map((c) => attachAuthor(c, users))
          .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));

        const top = all.filter((c) => !c.parentId);
        const repliesByParent = new Map<string, AnyObj[]>();
        for (const c of all) {
          if (!c.parentId) continue;
          const arr = repliesByParent.get(c.parentId) ?? [];
          arr.push(c);
          repliesByParent.set(c.parentId, arr);
        }

        return { topLevel: top, repliesByParent: Object.fromEntries(repliesByParent.entries()) };
      }

      const all = d.comments
        .filter((c) => c.postId === postId)
        .map((c) => attachAuthor(c, null))
        .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
      const top = all.filter((c) => !c.parentId);
      const repliesByParent = new Map<string, AnyObj[]>();
      for (const c of all) {
        if (!c.parentId) continue;
        const arr = repliesByParent.get(c.parentId) ?? [];
        arr.push(c);
        repliesByParent.set(c.parentId, arr);
      }
      return { topLevel: top, repliesByParent: Object.fromEntries(repliesByParent.entries()) };
    },
  });
}
export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, data }: AnyObj) => {
      const d = load();
      const parentId: string | undefined = data?.parentId || undefined;

      const content = String(data?.content || "").trim();
      const mediaType = data?.mediaType || null;
      const mediaUrl = data?.mediaUrl || null;
      if (!content && !mediaUrl) throw new Error("Escribe un comentario o adjunta un archivo");

      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        const comment = {
          id: rid(),
          postId,
          parentId: parentId ?? null,
          authorId: me.id,
          content,
          mediaType,
          mediaUrl,
          createdAt: now(),
        };
        await setDoc(doc(db, "comments", comment.id), comment);
        const countSnap = await getDocs(query(commentsCol, where("postId", "==", postId)));
        await updateDoc(doc(db, "posts", postId), { commentsCount: countSnap.size, updatedAt: now() });
        const postDoc = await getDoc(doc(db, "posts", postId));
        const post = postDoc.exists() ? (postDoc.data() as AnyObj) : null;
        if (post && post.authorId && post.authorId !== me.id) {
          await createNotification({ type: "comment", recipientId: post.authorId, actorId: me.id, postId, text: `${me.displayName} comentó tu publicación` });
        }
        return comment;
      }

      const me = ensureCurrentUser(d);
      const c = {
        id: rid(),
        postId,
        parentId: parentId ?? null,
        authorId: me.id,
        content,
        mediaType,
        mediaUrl,
        createdAt: now(),
      };
      d.comments.push(c);
      const p = d.posts.find((x) => x.id === postId);
      if (p) p.commentsCount = d.comments.filter((x) => x.postId === postId).length;
      save(d);
      return c;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
function storyViewsMap(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORY_VIEWS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function isStoryActive(s: AnyObj) {
  const exp = Date.parse(s.expiresAt || "");
  return !exp || exp > Date.now();
}

export function useGetStories() {
  return useQuery({
    queryKey: getGetStoriesQueryKey(),
    queryFn: async () => {
      const d = load();
      const meId = currentUserId();
      const views = storyViewsMap();

      if (canUseFirestoreSocial()) {
        await ensureCurrentUserInFirestore(d);
        const [storiesSnap, usersSnap, viewsSnap] = await Promise.all([
          getDocs(storiesCol),
          getDocs(usersCol),
          getDocs(storyViewsCol),
        ]);

        const usersMap = new Map<string, AnyObj>();
        usersSnap.forEach((u) => usersMap.set(u.id, { id: u.id, ...(u.data() as AnyObj) }));
        const viewsByStory = new Map<string, Set<string>>();
        viewsSnap.forEach((v) => {
          const row = v.data() as AnyObj;
          if (!row.storyId || !row.viewerId) return;
          const set = viewsByStory.get(row.storyId) ?? new Set<string>();
          set.add(row.viewerId);
          viewsByStory.set(row.storyId, set);
        });

        const activeStories = storiesSnap.docs
          .map((s) => ({ id: s.id, ...(s.data() as AnyObj) }))
          .filter((s) => isStoryActive(s));

        const byUser = new Map<string, AnyObj[]>();
        for (const s of activeStories) {
          const list = byUser.get(s.authorId) ?? [];
          const storyViewers = viewsByStory.get(s.id) ?? new Set<string>();
          list.push({
            ...s,
            viewsCount: storyViewers.size,
            viewedByMe: storyViewers.has(meId),
          });
          byUser.set(s.authorId, list);
        }

        return [...byUser.entries()]
          .map(([authorId, stories]) => {
            const user = usersMap.get(authorId) || d.users.find((u) => u.id === authorId) || { id: authorId, username: "usuario" };
            const hasUnviewed = authorId !== meId && stories.some((s) => !s.viewedByMe);
            return { user, stories: stories.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), hasUnviewed };
          })
          .filter((g) => g.stories.length > 0);
      }

      return d.users
        .map((u) => {
          const stories = d.stories
            .filter((s) => s.authorId === u.id && isStoryActive(s))
            .map((s) => ({
              ...s,
              viewsCount: (views[s.id] || []).length,
              viewedByMe: (views[s.id] || []).includes(meId),
            }));
          const hasUnviewed = u.id !== meId && stories.some((s) => !s.viewedByMe);
          return { user: u, stories, hasUnviewed };
        })
        .filter((g) => g.stories.length);
    },
  });
}

export function useCreateStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: AnyObj) => {
      const d = load();
      const me = canUseFirestoreSocial()
        ? await ensureCurrentUserInFirestore(d)
        : ensureCurrentUser(d);
      const expiresAt = new Date(Date.now() + STORY_TTL_MS).toISOString();
      const s = {
        id: rid(),
        authorId: me.id,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType || "image",
        text: data.text || "",
        createdAt: now(),
        expiresAt,
      };
      if (canUseFirestoreSocial()) {
        await setDoc(doc(db, "stories", s.id), s);
      }
      d.stories.push(s);
      save(d);
      return s;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useViewStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ storyId }: AnyObj) => {
      const meId = currentUserId();
      if (canUseFirestoreSocial()) {
        const viewId = `${storyId}_${meId}`;
        await setDoc(doc(db, "storyViews", viewId), {
          storyId,
          viewerId: meId,
          createdAt: now(),
        });
        return { viewsCount: 1 };
      }
      const views = storyViewsMap();
      const list = views[storyId] || [];
      if (!list.includes(meId)) list.push(meId);
      views[storyId] = list;
      localStorage.setItem(STORY_VIEWS_KEY, JSON.stringify(views));
      return { viewsCount: list.length };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
export function useGetMyStats() { return useQuery({ queryKey: ["my-stats"], queryFn: async () => { const d = load(); if (canUseFirestoreSocial()) { const me = await ensureCurrentUserInFirestore(d); const [followers, following, posts] = await Promise.all([getDocs(query(followsCol, where("followingId", "==", me.id))), getDocs(query(followsCol, where("followerId", "==", me.id))), getDocs(query(postsCol, where("authorId", "==", me.id)))]); return { followersCount: followers.size, followingCount: following.size, postsCount: posts.size, likesReceived: 0, viewsReceived: 0 }; } const me = ensureCurrentUser(d); return { followersCount: d.follows.filter((f) => f.followingId === me.id).length, followingCount: d.follows.filter((f) => f.followerId === me.id).length, postsCount: d.posts.filter((p) => p.authorId === me.id).length, likesReceived: 0, viewsReceived: 0 }; } }); }
export function useGetSuggestedUsers() { return useQuery({ queryKey: ["suggested-users"], queryFn: async () => { const d = load(); const meId = currentUserId(); if (canUseFirestoreSocial()) { await ensureCurrentUserInFirestore(d); const [usersSnap, followSnap] = await Promise.all([getDocs(usersCol), getDocs(query(followsCol, where("followerId", "==", meId)))]); const following = new Set<string>(); followSnap.forEach((f) => following.add((f.data() as AnyObj).followingId)); return usersSnap.docs.map((u) => ({ ...(u.data() as AnyObj), isFollowing: following.has(u.id) })).filter((u) => u.id !== meId); } return d.users.filter((u) => u.id !== meId).map((u) => ({ ...u, isFollowing: d.follows.some((f) => f.followerId === meId && f.followingId === u.id) })); } }); }
export function useFollowUser() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({ userId }: AnyObj) => { const d = load(); const meId = currentUserId(); if (canUseFirestoreSocial()) { const me = await ensureCurrentUserInFirestore(d); await setDoc(doc(db, "follows", `${me.id}_${userId}`), { followerId: me.id, followingId: userId, createdAt: now() }); await createNotification({ type: "follow", recipientId: userId, actorId: me.id, text: `${me.displayName} empezó a seguirte` }); return { following: true }; } const exists = d.follows.some((f) => f.followerId === meId && f.followingId === userId); if (!exists) d.follows.push({ followerId: meId, followingId: userId }); save(d); return { following: true }; }, onSuccess: () => qc.invalidateQueries() }); }
export function useUnfollowUser() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({ userId }: AnyObj) => { const d = load(); const meId = currentUserId(); if (canUseFirestoreSocial()) { await deleteDoc(doc(db, "follows", `${meId}_${userId}`)); return { following: false }; } d.follows = d.follows.filter((f) => !(f.followerId === meId && f.followingId === userId)); save(d); return { following: false }; }, onSuccess: () => qc.invalidateQueries() }); }
export function useGeneratePost() { return useMutation({ mutationFn: async ({ data }: AnyObj) => ({ content: `Idea para "${data.topic}": Comparte tu experiencia, agrega valor practico y termina con una pregunta para tu audiencia.` }) }); }
export function useGetTrendingPosts() {
  return useQuery({
    queryKey: ["trending-posts"],
    queryFn: async () => {
      const d = load();
      const me = currentUserId();
      return [...d.posts]
        .sort((a, b) => (a.likesCount || 0) < (b.likesCount || 0) ? 1 : -1)
        .slice(0, 10)
        .map((p) => withAuthor(d, p, me));
    },
  });
}
export function useGetReels() {
  return useQuery({
    queryKey: ["reels"],
    staleTime: 45_000,
    queryFn: async () => {
      const d = load();
      ensureReels(d);
      save(d);
      const meId = currentUserId();

      if (canUseFirestoreSocial()) {
        await ensureMenpoeReelsInFirestore();
        const me = await ensureCurrentUserInFirestore(d);
        const [postSnap, userSnap, reactionSnap, savedSnap] = await Promise.all([
          getDocs(postsCol),
          getDocs(usersCol),
          getDocs(query(reactionsCol, where("userId", "==", me.id))),
          getDocs(query(savedPostsCol, where("userId", "==", me.id))),
        ]);

        const usersMap = new Map<string, AnyObj>();
        userSnap.forEach((u) => usersMap.set(u.id, { id: u.id, ...(u.data() as AnyObj) }));
        for (const a of MENPOE_REEL_AUTHORS) {
          if (!usersMap.has(a.id)) usersMap.set(a.id, { ...a });
        }

        const reactionsByPost = new Map<string, string>();
        reactionSnap.forEach((r) => reactionsByPost.set(r.data().postId, r.data().reaction || "like"));
        const savedIds = new Set<string>();
        savedSnap.forEach((s) => savedIds.add(s.data().postId));

        const reels = postSnap.docs
          .map((p) => ({ id: p.id, ...(p.data() as AnyObj) }))
          .filter((p) => p.postType === "reel" && Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0)
          .filter((p) => p.isMenpoeSeed || canViewPost(p, me.id, new Set(), new Set()))
          .map((p) => {
            const author =
              usersMap.get(p.authorId) ||
              d.users.find((u) => u.id === p.authorId) ||
              MENPOE_REEL_AUTHORS[0];
            const userReaction = reactionsByPost.get(p.id) ?? null;
            const mediaUrl = resolveReelMediaUrl(p);
            return {
              ...p,
              mediaUrls: mediaUrl ? [mediaUrl] : [],
              author,
              userReaction,
              isLiked: !!userReaction,
              isSaved: savedIds.has(p.id),
            };
          })
          .filter((p) => p.mediaUrls.length > 0)
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

        return { posts: reels };
      }

      const reels = d.posts
        .filter((p) => p.postType === "reel")
        .map((p) => {
          const mediaUrl = resolveReelMediaUrl(p);
          return withAuthor(d, { ...p, mediaUrls: mediaUrl ? [mediaUrl] : [] }, meId);
        })
        .filter((p) => p.mediaUrls?.length)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return { posts: reels };
    },
  });
}
export function useGetTrendingTopics() { return useQuery({ queryKey: ["topics"], queryFn: async () => [{ topic: "firebase", postsCount: 10, trend: "rising" }, { topic: "empleo", postsCount: 8, trend: "stable" }] }); }
export function useSearchUsers(params?: AnyObj, opts?: AnyObj) {
  return useQuery({
    queryKey: opts?.query?.queryKey || getSearchUsersQueryKey(params),
    enabled: opts?.query?.enabled ?? true,
    queryFn: async () => {
      const q = (params?.q || "").toLowerCase();
      const d = load();
      const meId = currentUserId();

      if (canUseFirestoreSocial()) {
        await ensureCurrentUserInFirestore(d);
        const [usersSnap, followsSnap] = await Promise.all([
          getDocs(usersCol),
          getDocs(query(followsCol, where("followerId", "==", meId))),
        ]);
        const following = new Set<string>();
        followsSnap.forEach((f) => following.add((f.data() as AnyObj).followingId));
        return usersSnap.docs
          .map((u) => ({ id: u.id, ...(u.data() as AnyObj) }))
          .filter((u) => u.id !== meId)
          .filter((u) => !q || (u.displayName || "").toLowerCase().includes(q) || (u.username || "").toLowerCase().includes(q))
          .map((u) => ({ ...u, isFollowing: following.has(u.id) }));
      }

      return d.users
        .filter((u) => u.id !== meId)
        .filter((u) => !q || u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
        .map((u) => ({ ...u, isFollowing: d.follows.some((f) => f.followerId === meId && f.followingId === u.id) }));
    },
  });
}
export function useSearchGlobal(params?: AnyObj, opts?: AnyObj) {
  return useQuery({
    queryKey: opts?.query?.queryKey || getSearchGlobalQueryKey(params),
    enabled: opts?.query?.enabled ?? true,
    queryFn: async () => {
      const q = String(params?.q || "").toLowerCase().trim();
      const d = load();
      if (!q) return { users: [], communities: [], pages: [], posts: [], jobs: [], listings: [] };
      recordSearchQuery(q);

      if (canUseFirestoreSocial()) {
        await ensureCurrentUserInFirestore(d);
        const [usersSnap, communitiesSnap, followsSnap, membersSnap, allPages] = await Promise.all([
          getDocs(usersCol),
          getDocs(collection(db, "communities")),
          getDocs(query(followsCol, where("followerId", "==", currentUserId()))),
          getDocs(collection(db, "communityMembers")),
          loadAllBusinessPages(),
        ]);
        const following = new Set<string>();
        followsSnap.forEach((f) => following.add((f.data() as AnyObj).followingId));
        const joined = new Set<string>();
        membersSnap.forEach((m) => {
          const row = m.data() as AnyObj;
          if (row.userId === currentUserId()) joined.add(row.communityId);
        });

        const users = usersSnap.docs
          .map((u) => ({ id: u.id, ...(u.data() as AnyObj) }))
          .filter((u) => (u.displayName || "").toLowerCase().includes(q) || (u.username || "").toLowerCase().includes(q))
          .map((u) => ({ ...u, isFollowing: following.has(u.id) }));
        const communities = communitiesSnap.docs
          .map((c) => ({ id: c.id, ...(c.data() as AnyObj) }))
          .filter(
            (c) =>
              (c.name || "").toLowerCase().includes(q) ||
              (c.description || "").toLowerCase().includes(q) ||
              (c.category || "").toLowerCase().includes(q) ||
              (c.pageType || "").toLowerCase().includes(q),
          )
          .map((c) => ({ ...c, isJoined: joined.has(c.id) }));
        const pages = allPages.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            (p.pageType || "").toLowerCase().includes(q),
        );
        const postSnap = await getDocs(postsCol);
        const meId = currentUserId();
        const friendIds = getFriendIds(d, meId);
        const posts = postSnap.docs
          .map((p) => ({ id: p.id, ...(p.data() as AnyObj) }))
          .filter((p) => (p.content || "").toLowerCase().includes(q))
          .filter((p) => canViewPost(p, meId, following, friendIds));
        const jobs = (await getDocs(jobsCol)).docs
          .map((j) => ({ id: j.id, ...(j.data() as AnyObj) }))
          .filter(
            (j) =>
              (j.title || "").toLowerCase().includes(q) ||
              (j.company || "").toLowerCase().includes(q) ||
              (j.location || "").toLowerCase().includes(q) ||
              (j.description || "").toLowerCase().includes(q),
          );
        const listings = d.listings.filter(
          (l) =>
            (l.title || "").toLowerCase().includes(q) ||
            (l.description || "").toLowerCase().includes(q) ||
            (l.category || "").toLowerCase().includes(q),
        );
        return { users, communities, pages, posts, jobs, listings };
      }

      const meId = currentUserId();
      const followingSet = new Set(d.follows.filter((f) => f.followerId === meId).map((f) => f.followingId));
      const friendIds = getFriendIds(d, meId);
      const users = d.users
        .filter((u) => (u.displayName || "").toLowerCase().includes(q) || (u.username || "").toLowerCase().includes(q))
        .map((u) => ({ ...u, isFollowing: d.follows.some((f) => f.followerId === meId && f.followingId === u.id) }));
      const communities = d.communities
        .filter(
          (c) =>
            (c.name || "").toLowerCase().includes(q) ||
            (c.description || "").toLowerCase().includes(q) ||
            (c.category || "").toLowerCase().includes(q) ||
            (c.pageType || "").toLowerCase().includes(q),
        )
        .map((c) => ({ ...c, isJoined: d.communityMembers.some((m) => m.communityId === c.id && m.userId === meId) }));
      const allPages = await loadAllBusinessPages();
      const pages = allPages.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.pageType || "").toLowerCase().includes(q),
      );
      const posts = d.posts
        .filter((p) => (p.content || "").toLowerCase().includes(q))
        .filter((p) => canViewPost(p, meId, followingSet, friendIds))
        .map((p) => withAuthor(d, p, meId));
      const jobs = d.jobs.filter(
        (j) =>
          (j.title || "").toLowerCase().includes(q) ||
          (j.company || "").toLowerCase().includes(q) ||
          (j.location || "").toLowerCase().includes(q) ||
          (j.description || "").toLowerCase().includes(q),
      );
      const listings = d.listings.filter(
        (l) =>
          (l.title || "").toLowerCase().includes(q) ||
          (l.description || "").toLowerCase().includes(q) ||
          (l.category || "").toLowerCase().includes(q),
      );
      return { users, communities, pages, posts, jobs, listings };
    },
  });
}
export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId }: AnyObj) => {
      const d = load();
      const me = ensureCurrentUser(d);
      const meId = me.id;

      const addresseeId = userId;
      const alreadyPending = d.friendRequests.some(
        (r) => r.requesterId === meId && r.addresseeId === addresseeId && r.status === "pending",
      );
      if (alreadyPending) return { status: "pending" };

      d.friendRequests.push({
        id: rid(),
        requesterId: meId,
        addresseeId,
        status: "pending",
        createdAt: now(),
      });
      save(d);

      const body = `${me.displayName} te envió una solicitud de amistad`;
      const title = "Solicitud de amistad";
      const actor = { id: me.id, displayName: me.displayName, avatarUrl: me.avatarUrl };

      if (canUseFirestoreSocial()) {
        await createNotification({
          type: "system",
          recipientId: addresseeId,
          actorId: meId,
          actor,
          title,
          body,
          text: body,
        });
      } else {
        d.notifications.push({
          id: rid(),
          type: "system",
          recipientId: addresseeId,
          actorId: meId,
          actor,
          title,
          body,
          text: body,
          isRead: false,
          createdAt: now(),
        });
        save(d);
      }

      return { status: "pending" };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useGetMyPostedJobs() {
  return useQuery({
    queryKey: ["my-posted-jobs"],
    queryFn: async () => {
      const d = load();
      const meId = currentUserId();
      let jobs = [...d.jobs];
      if (canUseFirestoreSocial()) {
        const snap = await getDocs(jobsCol);
        const fsJobs = snap.docs.map((j) => ({ id: j.id, ...(j.data() as AnyObj) }));
        const byId = new Map<string, AnyObj>();
        jobs.forEach((j) => byId.set(j.id, j));
        fsJobs.forEach((j) => byId.set(j.id, { ...byId.get(j.id), ...j }));
        jobs = [...byId.values()];
      }
      return jobs
        .filter((j) => j.postedById === meId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((j) => ({
          ...j,
          applicantsCount: j.applicantsCount ?? d.jobApplications.filter((a) => a.jobId === j.id).length,
        }));
    },
  });
}

export function useGetJobs(params?: AnyObj) {
  return useQuery({
    queryKey: ["jobs", params],
    queryFn: async () => {
      const d = load();
      const meId = currentUserId();
      let jobs = [...d.jobs];
      if (canUseFirestoreSocial()) {
        const snap = await getDocs(jobsCol);
        const fsJobs = snap.docs.map((j) => ({ id: j.id, ...(j.data() as AnyObj) }));
        const byId = new Map<string, AnyObj>();
        jobs.forEach((j) => byId.set(j.id, j));
        fsJobs.forEach((j) => byId.set(j.id, { ...byId.get(j.id), ...j }));
        jobs = [...byId.values()];
        d.jobs = jobs;
        save(d);
      }
      const filtered = jobs
        .filter((j) => !params?.q || j.title.toLowerCase().includes(params.q.toLowerCase()) || j.company?.toLowerCase().includes(params.q.toLowerCase()))
        .filter((j) => {
          if (params?.workMode && params.workMode !== "all") {
            const wm = j.workMode || (j.isRemote ? "remote" : "on_site");
            return wm === params.workMode;
          }
          if (params?.remote) return j.isRemote || j.workMode === "remote";
          return true;
        });
      const withMeta = await Promise.all(
        filtered.map(async (j) => ({
          ...j,
          isSaved: d.savedJobs.some((s) => s.jobId === j.id && s.userId === meId),
          hasApplied: await userHasAppliedToJob(j.id, meId),
        })),
      );
      return withMeta.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
  });
}
export function useGetJob(jobId: string, opts?: AnyObj) {
  return useQuery({
    queryKey: getGetJobQueryKey(jobId),
    enabled: opts?.query?.enabled ?? true,
    queryFn: async () => {
      const d = load();
      const meId = currentUserId();
      if (canUseFirestoreSocial()) {
        const snap = await getDoc(doc(db, "jobs", jobId));
        if (snap.exists()) {
          const j = { id: snap.id, ...(snap.data() as AnyObj) };
          const hasApplied = await userHasAppliedToJob(j.id, meId);
          return {
            ...j,
            isSaved: d.savedJobs.some((s) => s.jobId === j.id && s.userId === meId),
            hasApplied,
          };
        }
      }
      const j = d.jobs.find((x) => x.id === jobId);
      if (!j) return undefined;
      const hasApplied = await userHasAppliedToJob(j.id, meId);
      return {
        ...j,
        isSaved: d.savedJobs.some((s) => s.jobId === j.id && s.userId === meId),
        hasApplied,
      };
    },
  });
}
export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: AnyObj) => {
      const d = load();
      const me = canUseFirestoreSocial()
        ? await ensureCurrentUserInFirestore(d)
        : ensureCurrentUser(d);
      const j = {
        id: rid(),
        title: data.title,
        company: data.company,
        description: data.description || "",
        location: data.location || "Remoto",
        isRemote: !!data.isRemote,
        workMode: data.workMode || (data.isRemote ? "remote" : "on_site"),
        jobType: data.jobType || "full_time",
        salary: data.salary || data.employer?.salaryRange || undefined,
        requirements: data.requirements || [],
        companyLogoUrl: data.companyLogoUrl || undefined,
        employer: data.employer || null,
        contractType: data.employer?.contractType || data.contractType || null,
        postedById: me.id,
        poster: { id: me.id, displayName: me.displayName, avatarUrl: me.avatarUrl },
        applicantsCount: 0,
        isVerifiedEmployer: !!data.employer?.legalAcceptedAt,
        createdAt: now(),
      };
      if (canUseFirestoreSocial()) {
        await setDoc(doc(db, "jobs", j.id), j);
      }
      d.jobs.unshift(j);
      save(d);
      return j;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
export function useApplyToJob() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({ jobId, data }: AnyObj) => { const d = load(); d.jobApplications.push({ id: rid(), jobId, userId: currentUserId(), coverLetter: data?.coverLetter || "", createdAt: now() }); const j = d.jobs.find((x) => x.id === jobId); if (j) j.applicantsCount = (j.applicantsCount || 0) + 1; if (canUseFirestoreSocial()) { const ref = doc(db, "jobs", jobId); const snap = await getDoc(ref); if (snap.exists()) await updateDoc(ref, { applicantsCount: increment(1) }); } save(d); return { ok: true }; }, onSuccess: () => qc.invalidateQueries() }); }
export function useSaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId }: AnyObj) => {
      const d = load();
      const me = canUseFirestoreSocial() ? await ensureCurrentUserInFirestore(d) : ensureCurrentUser(d);
      const meId = me.id;
      const ex = d.savedJobs.find((s) => s.userId === meId && s.jobId === jobId);
      if (ex) d.savedJobs = d.savedJobs.filter((s) => !(s.userId === meId && s.jobId === jobId));
      else d.savedJobs.push({ userId: meId, jobId });
      save(d);
      if (canUseFirestoreSocial()) {
        const ref = doc(db, "savedJobs", `${jobId}_${meId}`);
        if (ex) await deleteDoc(ref);
        else await setDoc(ref, { jobId, userId: meId, createdAt: now() });
      }
      return { saved: !ex };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-jobs"] });
      qc.invalidateQueries({ queryKey: ["all-saved"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
export function useGetSavedJobs() {
  return useQuery({
    queryKey: ["saved-jobs"],
    queryFn: async () => {
      const d = load();
      const me = currentUserId();
      let ids = d.savedJobs.filter((s) => s.userId === me).map((s) => s.jobId);
      if (canUseFirestoreSocial()) {
        const snap = await getDocs(query(collection(db, "savedJobs"), where("userId", "==", me)));
        snap.forEach((s) => ids.push((s.data() as { jobId: string }).jobId));
        ids = [...new Set(ids)];
        const jobsSnap = await getDocs(jobsCol);
        const byId = new Map(jobsSnap.docs.map((j) => [j.id, { id: j.id, ...(j.data() as AnyObj) }]));
        (d.jobs || []).forEach((j) => {
          if (!byId.has(j.id)) byId.set(j.id, j);
        });
        return ids.map((id) => byId.get(id)).filter(Boolean);
      }
      return d.jobs.filter((j) => ids.includes(j.id));
    },
  });
}
export function useGetRecommendedJobs() { return useQuery({ queryKey: ["recommended-jobs"], queryFn: async () => { const d = load(); if (canUseFirestoreSocial()) { const snap = await getDocs(jobsCol); const jobs = snap.docs.map((j) => ({ id: j.id, ...(j.data() as AnyObj) })); return jobs.slice(0, 3); } return d.jobs.slice(0, 3); } }); }

export function useGetListings(params?: AnyObj) {
  return useQuery({
    queryKey: ["listings", params],
    queryFn: async () => {
      const d = load();
      const mine = params?.mine === true || params?.mine === "true";
      const meId = currentUserId();
      return d.listings.filter((l) => {
        if (mine && l.sellerId !== meId) return false;
        if (params?.availableOnly && l.isAvailable === false) return false;
        if (params?.q && !l.title.toLowerCase().includes(String(params.q).toLowerCase())) return false;
        if (params?.category && l.category !== params.category) return false;
        return true;
      });
    },
  });
}
export function useGetMyListings() {
  return useGetListings({ mine: true, availableOnly: false });
}
export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: AnyObj) => {
      const d = load();
      const me = ensureCurrentUser(d);
      const l = {
        id: rid(),
        ...data,
        sellerId: me.id,
        seller: me,
        currency: data.currency || "COP",
        isAvailable: true,
        viewsCount: 0,
        createdAt: now(),
      };
      d.listings.unshift(l);
      save(d);
      return l;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
export function useUpdateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, data }: AnyObj) => {
      const d = load();
      const l = d.listings.find((x) => x.id === listingId);
      if (!l) throw new Error("Anuncio no encontrado");
      if (l.sellerId !== currentUserId()) throw new Error("No tienes permiso para editar este anuncio");
      Object.assign(l, data);
      save(d);
      return l;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
export function useDeleteListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId }: AnyObj) => {
      const d = load();
      const l = d.listings.find((x) => x.id === listingId);
      if (!l) throw new Error("Anuncio no encontrado");
      if (l.sellerId !== currentUserId()) throw new Error("No tienes permiso para eliminar este anuncio");
      d.listings = d.listings.filter((x) => x.id !== listingId);
      save(d);
      return { deleted: true };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
export function useRecordListingView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId }: AnyObj) => {
      const d = load();
      const l = d.listings.find((x) => x.id === listingId);
      if (l) l.viewsCount = (l.viewsCount || 0) + 1;
      save(d);
      return { viewsCount: l?.viewsCount ?? 0 };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: getGetListingQueryKey(vars.listingId) });
    },
  });
}
export function useStartConversationWithUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, initialMessage }: { userId: string; initialMessage?: string }) => {
      const d = load();
      const meId = currentUserId();
      if (userId === meId) throw new Error("No puedes enviarte mensajes a ti mismo");

      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        const convSnap = await getDocs(
          query(collection(db, "conversations"), where("participantIds", "array-contains", me.id)),
        );
        let conv = convSnap.docs.find((c) => {
          const ids = (c.data() as AnyObj).participantIds || [];
          return ids.includes(userId);
        });
        let convId = conv?.id;
        if (!convId) {
          convId = rid();
          await setDoc(doc(db, "conversations", convId), {
            participantIds: [me.id, userId],
            createdAt: now(),
            unreadCounts: { [me.id]: 0, [userId]: 0 },
            lastMessage: null,
            lastMessageAt: now(),
          });
        }
        if (initialMessage?.trim()) {
          const m = {
            id: rid(),
            conversationId: convId,
            senderId: me.id,
            content: initialMessage.trim(),
            createdAt: now(),
          };
          await setDoc(doc(db, "messages", m.id), m);
          await updateDoc(doc(db, "conversations", convId), {
            lastMessage: { id: m.id, content: m.content, senderId: me.id, createdAt: m.createdAt },
            lastMessageAt: m.createdAt,
            [`unreadCounts.${userId}`]: increment(1),
            [`unreadCounts.${me.id}`]: 0,
          });
        }
        return { conversationId: convId };
      }

      const conv = findOrCreateLocalConversation(d, meId, userId);
      if (initialMessage?.trim()) {
        d.messages.push({
          id: rid(),
          conversationId: conv.id,
          senderId: meId,
          content: initialMessage.trim(),
          createdAt: now(),
        });
      }
      save(d);
      return { conversationId: conv.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}
export function useGetListing(id: string, opts?: AnyObj) { return useQuery({ queryKey: getGetListingQueryKey(id), enabled: opts?.query?.enabled ?? true, queryFn: async () => load().listings.find((l) => l.id === id) }); }
export function useGetMarketplaceCategories() {
  return useQuery({
    queryKey: ["marketplace-categories"],
    queryFn: async () => {
      const { MARKETPLACE_CATEGORIES } = await import("./marketplace-categories");
      return MARKETPLACE_CATEGORIES.map((c) => ({ ...c, listingsCount: 0 }));
    },
  });
}

export function useGetCommunities(params?: AnyObj) {
  return useQuery({
    queryKey: ["communities", params],
    queryFn: async () => {
      const d = load();
      const me = canUseFirestoreSocial()
        ? await ensureCurrentUserInFirestore(d)
        : ensureCurrentUser(d);
      const meId = me.id;
      let communities = [...d.communities];

      if (canUseFirestoreSocial()) {
        const [commSnap, memberSnap] = await Promise.all([
          getDocs(communitiesCol),
          getDocs(query(communityMembersCol, where("userId", "==", meId))),
        ]);
        const joinedIds = new Set<string>();
        memberSnap.forEach((m) => joinedIds.add((m.data() as AnyObj).communityId));
        const fsList = commSnap.docs.map((c) => {
          const data = c.data() as AnyObj;
          return {
            id: c.id,
            ...data,
            isJoined: joinedIds.has(c.id) || data.creatorId === meId,
          };
        });
        const byId = new Map<string, AnyObj>();
        communities.forEach((c) => byId.set(c.id, c));
        fsList.forEach((c) => byId.set(c.id, { ...byId.get(c.id), ...c }));
        communities = [...byId.values()];
        d.communities = communities;
        save(d);
      } else {
        communities = communities.map((c) => ({
          ...c,
          isJoined:
            isCommunityMemberLocal(d, c.id, meId) || c.creatorId === meId,
        }));
      }

      let list = communities;
      if (params?.joined) list = list.filter((c) => c.isJoined);
      if (params?.q) {
        const q = String(params.q).toLowerCase();
        list = list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.description || "").toLowerCase().includes(q) ||
            (c.category || "").toLowerCase().includes(q) ||
            (c.pageType || "").toLowerCase().includes(q),
        );
      }
      return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
  });
}
export function useCreateCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: AnyObj) => {
      const d = load();
      const me = canUseFirestoreSocial()
        ? await ensureCurrentUserInFirestore(d)
        : ensureCurrentUser(d);
      const c = {
        id: rid(),
        ...data,
        creatorId: me.id,
        slug: data.name.toLowerCase().replace(/\s+/g, "-"),
        membersCount: 1,
        postsCount: 0,
        createdAt: now(),
      };
      if (canUseFirestoreSocial()) {
        await setDoc(doc(db, "communities", c.id), c);
        await setDoc(doc(db, "communityMembers", communityMemberDocId(c.id, me.id)), {
          communityId: c.id,
          userId: me.id,
          role: "admin",
          createdAt: now(),
        });
      }
      d.communities.unshift(c);
      if (!isCommunityMemberLocal(d, c.id, me.id)) {
        d.communityMembers.push({ communityId: c.id, userId: me.id, role: "admin" });
      }
      save(d);
      return { ...c, isJoined: true };
    },
    onSuccess: () => {
      qc.invalidateQueries();
      qc.invalidateQueries({ queryKey: ["search-global"] });
    },
  });
}

export function useUpdateCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ communityId, data }: { communityId: string; data: AnyObj }) => {
      const d = load();
      const comm = d.communities.find((c) => c.id === communityId);
      if (comm) Object.assign(comm, data);
      save(d);
      if (canUseFirestoreSocial()) {
        await updateDoc(doc(db, "communities", communityId), { ...data, updatedAt: now() });
      }
      return comm;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useGetCommunity(id: string, opts?: AnyObj) {
  return useQuery({
    queryKey: getGetCommunityQueryKey(id),
    enabled: opts?.query?.enabled ?? true,
    queryFn: async () => {
      const d = load();
      const me = canUseFirestoreSocial()
        ? await ensureCurrentUserInFirestore(d)
        : ensureCurrentUser(d);
      const meId = me.id;

      if (canUseFirestoreSocial()) {
        const snap = await getDoc(doc(db, "communities", id));
        if (snap.exists()) {
          const data = snap.data() as AnyObj;
          const fsJoined = await isCommunityMemberFs(id, meId);
          const c = {
            id: snap.id,
            ...data,
            isJoined: fsJoined || data.creatorId === meId,
          };
          const idx = d.communities.findIndex((x) => x.id === id);
          if (idx >= 0) d.communities[idx] = { ...d.communities[idx], ...c };
          else d.communities.push(c);
          save(d);
          return c;
        }
      }

      const c = d.communities.find((x) => x.id === id);
      if (!c) return undefined;
      return {
        ...c,
        isJoined:
          isCommunityMemberLocal(d, id, meId) || c.creatorId === meId,
      };
    },
  });
}
export function useJoinCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ communityId }: AnyObj) => {
      const d = load();
      const me = canUseFirestoreSocial()
        ? await ensureCurrentUserInFirestore(d)
        : ensureCurrentUser(d);
      const meId = me.id;
      const ex = isCommunityMemberLocal(d, communityId, meId);
      if (!ex) d.communityMembers.push({ communityId, userId: meId, role: "member" });
      const comm = d.communities.find((c) => c.id === communityId);
      if (comm && !ex) comm.membersCount = (comm.membersCount || 0) + 1;

      if (canUseFirestoreSocial()) {
        const memberRef = doc(
          db,
          "communityMembers",
          communityMemberDocId(communityId, meId),
        );
        const memberSnap = await getDoc(memberRef);
        if (!memberSnap.exists()) {
          await setDoc(memberRef, {
            communityId,
            userId: meId,
            role: "member",
            createdAt: now(),
          });
          const commRef = doc(db, "communities", communityId);
          const commSnap = await getDoc(commRef);
          if (commSnap.exists()) {
            await updateDoc(commRef, { membersCount: increment(1) });
          }
        }
      }
      save(d);
      return { success: true, message: "Te uniste a la comunidad" };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
export function useGetSuggestedCommunities() {
  return useQuery({
    queryKey: ["suggested-communities"],
    queryFn: async () => {
      const d = load();
      if (canUseFirestoreSocial()) {
        const snap = await getDocs(communitiesCol);
        return snap.docs
          .map((c) => ({ id: c.id, ...(c.data() as AnyObj) }))
          .slice(0, 4);
      }
      return d.communities.slice(0, 4);
    },
  });
}

export function useGetEvents(params?: AnyObj) {
  return useQuery({
    queryKey: ["events", params],
    queryFn: async () => {
      const d = load();
      let events = [...d.events];
      if (canUseFirestoreSocial()) {
        const snap = await getDocs(eventsCol);
        const fsEvents = snap.docs.map((e) => ({ id: e.id, ...(e.data() as AnyObj) }));
        const byId = new Map<string, AnyObj>();
        events.forEach((e) => byId.set(e.id, e));
        fsEvents.forEach((e) => byId.set(e.id, { ...byId.get(e.id), ...e }));
        events = [...byId.values()];
        d.events = events;
        save(d);
      }
      if (params?.communityId) {
        events = events.filter((e) => e.communityId === params.communityId);
      }
      return events.sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1));
    },
  });
}
export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: AnyObj) => {
      const d = load();
      const me = canUseFirestoreSocial()
        ? await ensureCurrentUserInFirestore(d)
        : ensureCurrentUser(d);
      const e = {
        id: rid(),
        ...data,
        organizerId: me.id,
        attendeesCount: 0,
        createdAt: now(),
      };
      if (canUseFirestoreSocial()) {
        await setDoc(doc(db, "events", e.id), e);
      }
      d.events.unshift(e);
      save(d);
      return e;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
export function useGetEvent(id: string, opts?: AnyObj) {
  return useQuery({
    queryKey: getGetEventQueryKey(id),
    enabled: opts?.query?.enabled ?? true,
    queryFn: async () => {
      const d = load();
      const meId = currentUserId();
      let event: AnyObj | undefined;
      if (canUseFirestoreSocial()) {
        const snap = await getDoc(doc(db, "events", id));
        if (snap.exists()) event = { id: snap.id, ...(snap.data() as AnyObj) };
      }
      if (!event) event = d.events.find((ev) => ev.id === id);
      if (!event) return undefined;

      const organizer =
        d.users.find((u) => u.id === event!.organizerId) ||
        (canUseFirestoreSocial()
          ? await getDoc(doc(db, "users", event.organizerId)).then((s) => (s.exists() ? { id: s.id, ...s.data() } : null))
          : null) ||
        { id: event.organizerId, displayName: "Organizador", avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${event.organizerId}` };

      const isAttending = d.eventAttendees.some((x) => x.eventId === id && x.userId === meId);
      return { ...event, organizer, isAttending };
    },
  });
}
export function useAttendEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId }: AnyObj) => {
      const d = load();
      const me = canUseFirestoreSocial() ? await ensureCurrentUserInFirestore(d) : ensureCurrentUser(d);
      const meId = me.id;
      if (!d.eventAttendees.some((x) => x.eventId === eventId && x.userId === meId)) {
        d.eventAttendees.push({ eventId, userId: meId });
      }
      const e = d.events.find((x) => x.id === eventId);
      if (e) e.attendeesCount = d.eventAttendees.filter((x) => x.eventId === eventId).length;
      save(d);
      if (canUseFirestoreSocial()) {
        await setDoc(doc(db, "eventAttendees", `${eventId}_${meId}`), {
          eventId,
          userId: meId,
          createdAt: now(),
        });
        const ref = doc(db, "events", eventId);
        const snap = await getDoc(ref);
        if (snap.exists()) await updateDoc(ref, { attendeesCount: increment(1) });
      }
      return { success: true, message: "Asistencia confirmada" };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useGetLiveStreams() {
  return useQuery({
    queryKey: ["live-streams"],
    queryFn: async () => {
      const d = load();
      if (canUseFirestoreSocial()) {
        const snap = await getDocs(query(streamsCol, where("isLive", "==", true)));
        const streams = snap.docs.map((s) => ({ id: s.id, ...(s.data() as AnyObj) }));

        const hostIds = [...new Set(streams.map((s) => s.hostId).filter(Boolean))];
        const usersSnap = await getDocs(usersCol);
        const usersMap = new Map(usersSnap.docs.map((u) => [u.id, { id: u.id, ...(u.data() as AnyObj) }]));

        return streams
          .map((s) => ({
            ...s,
            host: usersMap.get(s.hostId) ?? d.users.find((u) => u.id === s.hostId),
          }))
          .sort((a, b) => (a.viewersCount ?? 0) < (b.viewersCount ?? 0) ? 1 : -1)
          .slice(0, 20);
      }
      return d.streams.filter((s) => s.isLive);
    },
  });
}

export function useStartStream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: AnyObj) => {
      const d = load();
      const me = canUseFirestoreSocial() ? await ensureCurrentUserInFirestore(d) : ensureCurrentUser(d);
      const meId = me.id;

      const streamId = rid();
      const localStream = {
        id: streamId,
        title: data.title,
        description: data.description ?? "",
        thumbnailUrl: null,
        category: data.category ?? null,
        hostId: meId,
        host: { id: meId, displayName: me.displayName, avatarUrl: me.avatarUrl, isVerified: me.isVerified },
        isLive: true,
        viewersCount: 1,
        peakViewers: 1,
        startedAt: new Date().toISOString(),
        createdAt: now(),
      };

      d.streams.unshift(localStream);
      save(d);

      if (canUseFirestoreSocial()) {
        await setDoc(doc(db, "streams", streamId), {
          title: localStream.title,
          description: localStream.description,
          thumbnailUrl: null,
          hostId: localStream.hostId,
          isLive: true,
          viewersCount: localStream.viewersCount,
          peakViewers: localStream.peakViewers,
          category: localStream.category,
          startedAt: localStream.startedAt,
          createdAt: localStream.createdAt,
        });
      }

      return localStream;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useGetStream(id: string, opts?: AnyObj) {
  return useQuery({
    queryKey: getGetStreamQueryKey(id),
    enabled: opts?.query?.enabled ?? true,
    queryFn: async () => {
      const d = load();
      if (canUseFirestoreSocial()) {
        const snap = await getDoc(doc(db, "streams", id));
        if (!snap.exists()) return undefined;
        const stream = { id: snap.id, ...(snap.data() as AnyObj) };
        const hostSnap = await getDoc(doc(db, "users", stream.hostId));
        const host = hostSnap.exists() ? { id: hostSnap.id, ...(hostSnap.data() as AnyObj) } : undefined;
        return { ...stream, host };
      }
      return d.streams.find((s) => s.id === id);
    },
  });
}

export function useEndStream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ streamId }: AnyObj) => {
      const d = load();
      const s = d.streams.find((x) => x.id === streamId);
      if (s) s.isLive = false;
      save(d);

      if (canUseFirestoreSocial()) {
        await updateDoc(doc(db, "streams", streamId), { isLive: false, endedAt: now() });
      }

      return { success: true, message: "Transmision finalizada" };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useGetConversations() {
  return useQuery({
    queryKey: ["conversations"],
    staleTime: 8_000,
    refetchInterval: 12_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const d = load();
      const me = canUseFirestoreSocial()
        ? await ensureCurrentUserInFirestore(d)
        : ensureCurrentUser(d);
      const meId = me.id;

      if (canUseFirestoreSocial()) {
        const convSnap = await getDocs(
          query(collection(db, "conversations"), where("participantIds", "array-contains", meId)),
        );
        const conversations = convSnap.docs.map((c) => ({ id: c.id, ...(c.data() as AnyObj) }));

        const otherIds = new Set<string>();
        for (const c of conversations) {
          for (const pid of c.participantIds || []) {
            if (pid !== meId) otherIds.add(pid);
          }
        }

        const users = new Map<string, AnyObj>();
        await Promise.all(
          [...otherIds].map(async (uid) => {
            try {
              const snap = await getDoc(doc(db, "users", uid));
              if (snap.exists()) users.set(uid, { id: snap.id, ...(snap.data() as AnyObj) });
            } catch {
              /* ignore */
            }
          }),
        );

        return conversations
          .map((c) => {
            const participants = (c.participantIds || [])
              .map((id: string) => (id === meId ? me : users.get(id)))
              .filter(Boolean);
            const unreadMap = c.unreadCounts || {};
            return {
              ...c,
              participants,
              lastMessage: c.lastMessage || null,
              unreadCount: Number(unreadMap[meId] || 0),
            };
          })
          .sort((a, b) => {
            const at = a.lastMessageAt || a.lastMessage?.createdAt || a.createdAt || "";
            const bt = b.lastMessageAt || b.lastMessage?.createdAt || b.createdAt || "";
            return at < bt ? 1 : -1;
          });
      }

      return (d.conversations || []).map((c) => {
        const ids = c.participantIds || c.participants?.map((p: AnyObj) => p.id) || [];
        const participants =
          c.participants ||
          ids.map((id: string) => d.users.find((u) => u.id === id)).filter(Boolean);
        const convMessages = d.messages
          .filter((m) => m.conversationId === c.id && !m.deletedForEveryone)
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        return {
          ...c,
          participants,
          lastMessage: convMessages[0] || null,
          unreadCount: convMessages.filter((m) => m.senderId !== meId && !m.readAt).length,
        };
      });
    },
  });
}
export function useListConversationMessages(conversationId: string, opts?: AnyObj) {
  return useQuery({
    queryKey: getListConversationMessagesQueryKey(conversationId),
    enabled: opts?.query?.enabled ?? true,
    staleTime: 2_000,
    refetchInterval: 5_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const d = load();
      if (canUseFirestoreSocial()) {
        await ensureCurrentUserInFirestore(d);
        const msgSnap = await getDocs(
          query(collection(db, "messages"), where("conversationId", "==", conversationId)),
        );
        const rows = msgSnap.docs
          .map((m) => ({ id: m.id, ...(m.data() as AnyObj) }))
          .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));

        const senderIds = [...new Set(rows.map((m) => m.senderId).filter(Boolean))];
        const users = new Map<string, AnyObj>();
        await Promise.all(
          senderIds.map(async (uid) => {
            const cached = d.users.find((u) => u.id === uid);
            if (cached) {
              users.set(uid, cached);
              return;
            }
            try {
              const snap = await getDoc(doc(db, "users", uid));
              if (snap.exists()) users.set(uid, { id: snap.id, ...(snap.data() as AnyObj) });
            } catch {
              /* ignore */
            }
          }),
        );

        return rows.map((m) => ({
          ...m,
          sender: users.get(m.senderId) || d.users.find((u) => u.id === m.senderId) || {
            id: m.senderId,
            displayName: "Usuario",
          },
        }));
      }
      return d.messages
        .filter((m) => m.conversationId === conversationId)
        .map((m) => ({ ...m, sender: d.users.find((u) => u.id === m.senderId) }));
    },
  });
}
export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, data }: AnyObj) => {
      const d = load();
      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        const m = {
          id: rid(),
          conversationId,
          senderId: me.id,
          content: data.content,
          mediaUrl: data.mediaUrl || null,
          mediaType: data.mediaType || null,
          replyToId: data.replyToId || null,
          replySnippet: data.replySnippet || null,
          reactions: {},
          deletedForEveryone: false,
          createdAt: now(),
        };
        await setDoc(doc(db, "messages", m.id), m);
        try {
          const convRef = doc(db, "conversations", conversationId);
          const convSnap = await getDoc(convRef);
          const convData = convSnap.exists() ? (convSnap.data() as AnyObj) : {};
          const unreadCounts = { ...(convData.unreadCounts || {}) };
          for (const pid of convData.participantIds || []) {
            if (pid !== me.id) unreadCounts[pid] = (Number(unreadCounts[pid]) || 0) + 1;
          }
          unreadCounts[me.id] = 0;
          await updateDoc(convRef, {
            lastMessage: {
              id: m.id,
              content: m.content,
              senderId: me.id,
              mediaType: m.mediaType,
              createdAt: m.createdAt,
              deletedForEveryone: false,
            },
            lastMessageAt: m.createdAt,
            unreadCounts,
            [`typing.${me.id}`]: null,
            updatedAt: now(),
          });
        } catch {
          /* ignore */
        }
        return m;
      }
      const m = {
        id: rid(),
        conversationId,
        senderId: currentUserId(),
        content: data.content,
        mediaUrl: data.mediaUrl || null,
        mediaType: data.mediaType || null,
        replyToId: data.replyToId || null,
        replySnippet: data.replySnippet || null,
        reactions: {},
        deletedForEveryone: false,
        createdAt: now(),
      };
      d.messages.push(m);
      save(d);
      return m;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteMessageForEveryone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId }: AnyObj) => {
      const d = load();
      if (canUseFirestoreSocial()) {
        await updateDoc(doc(db, "messages", messageId), {
          deletedForEveryone: true,
          content: "",
          mediaUrl: null,
          mediaType: null,
          deletedAt: now(),
        });
      }
      const msg = d.messages.find((m) => m.id === messageId);
      if (msg) {
        msg.deletedForEveryone = true;
        msg.content = "";
        msg.mediaUrl = null;
        msg.mediaType = null;
      }
      save(d);
      return { ok: true };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useReactToMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, emoji }: AnyObj) => {
      const me = currentUserId();
      const d = load();
      if (canUseFirestoreSocial()) {
        const snap = await getDoc(doc(db, "messages", messageId));
        if (!snap.exists()) throw new Error("Mensaje no encontrado");
        const data = snap.data() as AnyObj;
        const reactions = { ...(data.reactions || {}) };
        if (reactions[me] === emoji) delete reactions[me];
        else reactions[me] = emoji;
        await updateDoc(doc(db, "messages", messageId), { reactions });
        return { reactions };
      }
      const msg = d.messages.find((m) => m.id === messageId);
      if (!msg) throw new Error("Mensaje no encontrado");
      msg.reactions = msg.reactions || {};
      if (msg.reactions[me] === emoji) delete msg.reactions[me];
      else msg.reactions[me] = emoji;
      save(d);
      return { reactions: msg.reactions };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useSetTyping() {
  return useMutation({
    mutationFn: async ({ conversationId, typing }: AnyObj) => {
      const me = currentUserId();
      if (canUseFirestoreSocial()) {
        try {
          await updateDoc(doc(db, "conversations", conversationId), {
            [`typing.${me}`]: typing ? now() : null,
          });
        } catch {
          /* ignore */
        }
      } else {
        localStorage.setItem(`typing_${conversationId}_${me}`, typing ? "1" : "0");
      }
      return { ok: true };
    },
  });
}

export function useGetNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const d = load();
      const normalizeTitle = (type: string, raw?: AnyObj) => {
        if (raw?.title) return raw.title;
        if (type === "like") return "Reacción";
        if (type === "comment") return "Nuevo comentario";
        if (type === "follow") return "Nuevo seguidor";
        if (type === "share") return "Publicación compartida";
        if (type === "job_match") return "Match de empleo";
        if (type === "message") return "Nuevo mensaje";
        if (type === "system") return "Actualización";
        if (type === "birthday") return "Cumpleaños";
        return "Notificación";
      };

      const toIso = (v: any) => {
        if (!v) return now();
        // Firestore timestamps may arrive as objects with toDate().
        if (typeof v === "object" && typeof v.toDate === "function") return v.toDate().toISOString();
        return String(v);
      };

      let rawNotifs: AnyObj[] = [];
      let actorIds = new Set<string>();

      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        const snap = await getDocs(query(notificationsCol, where("recipientId", "==", me.id)));
        rawNotifs = snap.docs.map((n) => ({ id: n.id, ...(n.data() as AnyObj) }));
      } else {
        rawNotifs = d.notifications ?? [];
      }

      for (const n of rawNotifs) {
        const actorId = n.actor?.id ?? n.actorId;
        if (actorId) actorIds.add(String(actorId));
      }

      // Build actor map to populate UI (notif.actor).
      const userMap = new Map<string, AnyObj>();
      if (actorIds.size > 0) {
        if (canUseFirestoreSocial()) {
          const usersSnap = await getDocs(usersCol);
          usersSnap.docs.forEach((u) => userMap.set(u.id, { id: u.id, ...(u.data() as AnyObj) }));
        } else {
          d.users.forEach((u) => userMap.set(u.id, u));
        }
      }

      const normalized = rawNotifs
        .map((n) => {
          const type = n.type ? String(n.type) : "system";
          const title = normalizeTitle(type, n);
          const body = n.body ?? n.text ?? null;
          const actorId = n.actor?.id ?? n.actorId;
          const actor =
            n.actor ??
            (actorId ? (() => {
              const u = userMap.get(String(actorId));
              return u ? { id: u.id, displayName: u.displayName, avatarUrl: u.avatarUrl } : undefined;
            })() : undefined);
          return {
            ...n,
            type,
            title,
            body,
            createdAt: toIso(n.createdAt),
            isRead: !!n.isRead,
            actor,
          };
        })
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

      return normalized;
    },
  });
}
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const d = load();
      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        const snap = await getDocs(query(notificationsCol, where("recipientId", "==", me.id), where("isRead", "==", false)));
        await Promise.all(snap.docs.map((n) => updateDoc(doc(db, "notifications", n.id), { isRead: true, readAt: now() })));
        return { success: true, message: "Notificaciones marcadas como leidas" };
      }
      d.notifications = d.notifications.map((n) => ({ ...n, isRead: true }));
      save(d);
      return { success: true, message: "Notificaciones marcadas como leidas" };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
export function useGetMyFriends(opts?: AnyObj) {
  return useQuery({
    queryKey: ["my-friends"],
    enabled: opts?.query?.enabled ?? true,
    staleTime: 60_000,
    queryFn: async () => {
      const d = load();
      const me = canUseFirestoreSocial()
        ? await ensureCurrentUserInFirestore(d)
        : ensureCurrentUser(d);
      const meId = me.id;

      const incoming = d.friendRequests
        .filter((r) => r.addresseeId === meId && r.status === "pending")
        .map((r) => ({
          ...r,
          sender: d.users.find((u) => u.id === r.requesterId),
        }));
      const outgoing = d.friendRequests.filter((r) => r.requesterId === meId && r.status === "pending");

      if (canUseFirestoreSocial()) {
        const [followOut, followIn] = await Promise.all([
          getDocs(query(followsCol, where("followerId", "==", meId))),
          getDocs(query(followsCol, where("followingId", "==", meId))),
        ]);
        const following = new Set(followOut.docs.map((x) => (x.data() as AnyObj).followingId));
        const followers = new Set(followIn.docs.map((x) => (x.data() as AnyObj).followerId));
        const mutualIds = [...following].filter((id) => followers.has(id));
        const localFriendIds = getFriendIds(d, meId);
        const allFriendIds = [...new Set([...mutualIds, ...localFriendIds])].filter((id) => id !== meId);

        const friends = (
          await Promise.all(
            allFriendIds.map(async (uid) => {
              const local = d.users.find((u) => u.id === uid);
              if (local) return local;
              try {
                const snap = await getDoc(doc(db, "users", uid));
                return snap.exists() ? { id: snap.id, ...(snap.data() as AnyObj) } : null;
              } catch {
                return null;
              }
            }),
          )
        ).filter(Boolean) as AnyObj[];

        // Personas recientes / buscables: también following no mutuo
        const peopleIds = [...new Set([...following, ...allFriendIds])].filter((id) => id !== meId).slice(0, 80);
        const people = (
          await Promise.all(
            peopleIds.map(async (uid) => {
              const found = friends.find((f) => f.id === uid) || d.users.find((u) => u.id === uid);
              if (found) return found;
              try {
                const snap = await getDoc(doc(db, "users", uid));
                return snap.exists() ? { id: snap.id, ...(snap.data() as AnyObj) } : null;
              } catch {
                return null;
              }
            }),
          )
        ).filter(Boolean) as AnyObj[];

        return { incoming, outgoing, friends, people };
      }

      const friendIds = getFriendIds(d, meId);
      const friends = d.users.filter((u) => friendIds.has(u.id) && u.id !== meId);
      const people = d.users.filter((u) => u.id !== meId);
      return { incoming, outgoing, friends, people };
    },
  });
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId }: AnyObj) => {
      const d = load();
      const me = currentUserId();
      const req = d.friendRequests.find((r) => r.id === requestId && r.addresseeId === me);
      if (!req) throw new Error("Solicitud no encontrada");

      // Capture for notifications before mutating
      const requesterId = req.requesterId;

      req.status = "accepted";
      if (!d.follows.some((f) => f.followerId === me && f.followingId === requesterId)) {
        d.follows.push({ followerId: me, followingId: requesterId });
      }
      if (!d.follows.some((f) => f.followerId === requesterId && f.followingId === me)) {
        d.follows.push({ followerId: requesterId, followingId: me });
      }
      save(d);

      const actor = d.users.find((u) => u.id === me) ?? ensureCurrentUser(d);
      const actorMini = { id: actor.id, displayName: actor.displayName, avatarUrl: actor.avatarUrl };
      const body = `${actor.displayName} aceptó tu solicitud de amistad`;
      const title = "Amistad confirmada";

      if (canUseFirestoreSocial()) {
        await createNotification({
          type: "system",
          recipientId: requesterId,
          actorId: me,
          actor: actorMini,
          title,
          body,
          text: body,
        });
      } else {
        d.notifications.push({
          id: rid(),
          type: "system",
          recipientId: requesterId,
          actorId: me,
          actor: actorMini,
          title,
          body,
          text: body,
          isRead: false,
          createdAt: now(),
        });
        save(d);
      }

      return { ok: true };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useRejectFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId }: AnyObj) => {
      const d = load();
      const me = currentUserId();
      const req = d.friendRequests.find((r) => r.id === requestId && r.addresseeId === me);
      const requesterId = req?.requesterId;
      d.friendRequests = d.friendRequests.filter((r) => !(r.id === requestId && r.addresseeId === me));
      save(d);

      if (requesterId) {
        const actor = d.users.find((u) => u.id === me) ?? ensureCurrentUser(d);
        const actorMini = { id: actor.id, displayName: actor.displayName, avatarUrl: actor.avatarUrl };
        const body = `${actor.displayName} rechazó tu solicitud de amistad`;
        const title = "Solicitud rechazada";

        if (canUseFirestoreSocial()) {
          await createNotification({
            type: "system",
            recipientId: requesterId,
            actorId: me,
            actor: actorMini,
            title,
            body,
            text: body,
          });
        } else {
          d.notifications.push({
            id: rid(),
            type: "system",
            recipientId: requesterId,
            actorId: me,
            actor: actorMini,
            title,
            body,
            text: body,
            isRead: false,
            createdAt: now(),
          });
          save(d);
        }
      }

      return { ok: true };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useGetCommunityPosts(communityId: string, opts?: AnyObj) {
  return useQuery({
    queryKey: ["community-posts", communityId],
    enabled: opts?.query?.enabled ?? !!communityId,
    queryFn: async () => {
      const d = load();
      const meId = currentUserId();
      const localPosts = d.posts
        .filter((p) => p.communityId === communityId)
        .map((p) => withAuthor(d, p, meId));

      if (canUseFirestoreSocial()) {
        const snap = await getDocs(query(postsCol, where("communityId", "==", communityId)));
        const userSnap = await getDocs(usersCol);
        const users = new Map<string, AnyObj>();
        userSnap.forEach((u) => users.set(u.id, { id: u.id, ...(u.data() as AnyObj) }));
        const fsPosts = snap.docs.map((p) => {
          const item = { id: p.id, ...(p.data() as AnyObj) };
          return {
            ...item,
            author: users.get(item.authorId) || d.users.find((u) => u.id === item.authorId),
          };
        });
        const byId = new Map<string, AnyObj>();
        localPosts.forEach((p) => byId.set(p.id, p));
        fsPosts.forEach((p) => byId.set(p.id, p));
        return [...byId.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      }
      return localPosts.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
  });
}

export function useCreateCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ communityId, data }: AnyObj) => {
      const d = load();
      const me = canUseFirestoreSocial()
        ? await ensureCurrentUserInFirestore(d)
        : ensureCurrentUser(d);
      const p = {
        id: rid(),
        authorId: me.id,
        communityId,
        content: data.content,
        postType: data.postType || "text",
        mediaUrls: data.mediaUrls || [],
        visibility: "publico",
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        createdAt: now(),
      };
      if (canUseFirestoreSocial()) {
        await setDoc(doc(db, "posts", p.id), p);
        const commRef = doc(db, "communities", communityId);
        const commSnap = await getDoc(commRef);
        if (commSnap.exists()) {
          await updateDoc(commRef, { postsCount: increment(1) });
        }
      }
      d.posts.unshift(p);
      const comm = d.communities.find((c) => c.id === communityId);
      if (comm) comm.postsCount = (comm.postsCount || 0) + 1;
      save(d);
      return p;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useGetUserPosts(userId: string, opts?: AnyObj) {
  return useQuery({
    queryKey: getGetUserPostsQueryKey(userId),
    enabled: opts?.query?.enabled ?? !!userId,
    queryFn: async () => {
      const d = load();
      const meId = currentUserId();
      const authorId = await resolveUserId(userId, d);
      const followingSet = new Set(
        d.follows.filter((f) => f.followerId === meId).map((f) => f.followingId),
      );
      const friendIds = getFriendIds(d, meId);

      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        const followSnap = await getDocs(query(followsCol, where("followerId", "==", me.id)));
        followSnap.forEach((f) => followingSet.add((f.data() as AnyObj).followingId));

        const [postSnap, userSnap, commentSnap, reactionSnap, savedSnap] =
          await Promise.all([
            getDocs(query(postsCol, where("authorId", "==", authorId))),
            getDocs(usersCol),
            getDocs(commentsCol),
            getDocs(query(reactionsCol, where("userId", "==", me.id))),
            getDocs(query(savedPostsCol, where("userId", "==", me.id))),
          ]);

        const usersMap = new Map<string, AnyObj>();
        userSnap.forEach((u) => usersMap.set(u.id, { id: u.id, ...(u.data() as AnyObj) }));
        const commentsByPost = new Map<string, number>();
        commentSnap.forEach((c) => {
          const pid = (c.data() as AnyObj).postId;
          commentsByPost.set(pid, (commentsByPost.get(pid) || 0) + 1);
        });
        const reactionsByPost = new Map<string, string>();
        reactionSnap.forEach((r) =>
          reactionsByPost.set((r.data() as AnyObj).postId, (r.data() as AnyObj).reaction || "like"),
        );
        const savedIds = new Set<string>();
        savedSnap.forEach((s) => savedIds.add((s.data() as AnyObj).postId));

        const posts = postSnap.docs
          .map((p) => ({ id: p.id, ...(p.data() as AnyObj) }))
          .filter((p) => !p.communityId)
          .map((item) => {
            const author = usersMap.get(item.authorId) || me;
            const commentsCount = commentsByPost.get(item.id) || item.commentsCount || 0;
            const userReaction = reactionsByPost.get(item.id) ?? null;
            return {
              ...item,
              commentsCount,
              author,
              userReaction,
              isLiked: !!userReaction,
              isSaved: savedIds.has(item.id),
            };
          });

        const visible = filterVisiblePosts(
          posts,
          me.id,
          followingSet,
          getFriendIds(d, me.id),
        );
        return visible.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      }

      return d.posts
        .filter((p) => p.authorId === authorId && !p.communityId)
        .filter((p) => canViewPost(p, meId, followingSet, friendIds))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((p) => withAuthor(d, p, meId));
    },
  });
}

export function useGetSearchHistory() {
  return useQuery({ queryKey: ["search-history"], queryFn: async () => getSearchHistory() });
}

export function useClearSearchHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
      return { ok: true };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["search-history"] }),
  });
}

export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId }: AnyObj) => {
      const meId = currentUserId();
      const key = `social_read_conv_${conversationId}_${meId}`;
      localStorage.setItem(key, now());
      if (canUseFirestoreSocial()) {
        try {
          await updateDoc(doc(db, "conversations", conversationId), {
            [`unreadCounts.${meId}`]: 0,
          });
        } catch {
          /* ignore */
        }
        // Marca vistos solo de mensajes del otro (en paralelo, sin bloquear UI)
        try {
          const snap = await getDocs(
            query(collection(db, "messages"), where("conversationId", "==", conversationId)),
          );
          const pending = snap.docs.filter((m) => {
            const data = m.data() as AnyObj;
            return data.senderId !== meId && !data.readAt && !data.deletedForEveryone;
          });
          await Promise.all(
            pending.slice(0, 40).map((m) =>
              updateDoc(doc(db, "messages", m.id), { readAt: now(), readBy: meId }),
            ),
          );
        } catch {
          /* ignore */
        }
      } else {
        const d = load();
        d.messages.forEach((m) => {
          if (m.conversationId === conversationId && m.senderId !== meId) {
            m.readAt = now();
          }
        });
        save(d);
      }
      return { ok: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useGetUnreadNotificationsCount() {
  return useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const d = load();
      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        const snap = await getDocs(
          query(notificationsCol, where("recipientId", "==", me.id), where("isRead", "==", false)),
        );
        return snap.size;
      }
      return d.notifications.filter((n) => !n.isRead).length;
    },
  });
}

export function useGetBirthdays() {
  return useQuery({
    queryKey: ["birthdays"],
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const d = load();
      const me = canUseFirestoreSocial()
        ? await ensureCurrentUserInFirestore(d)
        : ensureCurrentUser(d);
      const meId = me.id;
      const friendIds = getFriendIds(d, meId);
      const followingSet = new Set(
        d.follows.filter((f) => f.followerId === meId).map((f) => f.followingId),
      );

      let users: AnyObj[] = [];
      if (canUseFirestoreSocial()) {
        const [usersSnap, followSnap] = await Promise.all([
          getDocs(usersCol),
          getDocs(query(followsCol, where("followerId", "==", meId))),
        ]);
        followSnap.forEach((f) => followingSet.add((f.data() as AnyObj).followingId));
        users = usersSnap.docs.map((u) => ({ id: u.id, ...(u.data() as AnyObj) }));
      } else {
        users = [...d.users];
      }

      const candidates = users.filter(
        (u) =>
          u.id !== meId &&
          u.birthDate &&
          canViewBirthDate(u, meId, friendIds),
      );

      const today: AnyObj[] = [];
      const upcoming: AnyObj[] = [];

      for (const u of candidates) {
        const days = daysUntilNextBirthday(u.birthDate);
        const entry = {
          ...u,
          daysUntil: days,
          birthdayLabel: formatBirthdayLabel(u.birthDate),
          isToday: isBirthdayToday(u.birthDate),
        };
        if (days === 0) today.push(entry);
        else if (days > 0 && days <= 30) upcoming.push(entry);
      }

      upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

      return {
        today,
        upcoming,
        myBirthDate: me.birthDate || null,
        myBirthdayLabel: me.birthDate ? formatBirthdayLabel(me.birthDate) : null,
        isMyBirthdayToday: me.birthDate ? isBirthdayToday(me.birthDate) : false,
      };
    },
  });
}

export function useSendBirthdayWish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, message }: AnyObj) => {
      const d = load();
      const me = canUseFirestoreSocial()
        ? await ensureCurrentUserInFirestore(d)
        : ensureCurrentUser(d);
      const text =
        message?.trim() ||
        `¡Feliz cumpleaños! 🎂 — ${me.displayName}`;
      if (canUseFirestoreSocial()) {
        await createNotification({
          type: "birthday",
          recipientId: userId,
          actorId: me.id,
          text,
        });
      } else {
        d.notifications.push({
          id: rid(),
          type: "birthday",
          recipientId: userId,
          actorId: me.id,
          text,
          isRead: false,
          createdAt: now(),
        });
        save(d);
      }
      return { ok: true };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["birthdays"] }),
  });
}

export function useGetMemories() {
  return useQuery({
    queryKey: ["memories"],
    staleTime: 180_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const d = load();
      const me = canUseFirestoreSocial()
        ? await ensureCurrentUserInFirestore(d)
        : ensureCurrentUser(d);
      const meId = me.id;
      const friendIds = getFriendIds(d, meId);
      const followingSet = new Set(
        d.follows.filter((f) => f.followerId === meId).map((f) => f.followingId),
      );
      const today = new Date();
      const month = today.getMonth();
      const day = today.getDate();
      const year = today.getFullYear();

      const matchesDay = (createdAt: string) => {
        const d = new Date(createdAt);
        return d.getMonth() === month && d.getDate() === day && d.getFullYear() < year;
      };

      if (canUseFirestoreSocial()) {
        const followSnap = await getDocs(query(followsCol, where("followerId", "==", meId)));
        followSnap.forEach((f) => followingSet.add((f.data() as AnyObj).followingId));
        const [postSnap, userSnap] = await Promise.all([getDocs(postsCol), getDocs(usersCol)]);
        const usersMap = new Map<string, AnyObj>();
        userSnap.forEach((u) => usersMap.set(u.id, { id: u.id, ...(u.data() as AnyObj) }));

        const posts = postSnap.docs
          .map((p) => ({ id: p.id, ...(p.data() as AnyObj) }))
          .filter((p) => !p.communityId && matchesDay(p.createdAt))
          .filter((p) => p.authorId === meId || friendIds.has(p.authorId) || followingSet.has(p.authorId))
          .filter((p) => canViewPost(p, meId, followingSet, friendIds))
          .map((p) => ({
            ...p,
            author: usersMap.get(p.authorId),
            yearsAgo: year - new Date(p.createdAt).getFullYear(),
          }))
          .sort((a, b) => b.yearsAgo - a.yearsAgo);

        return { posts, dateLabel: today.toLocaleDateString("es-ES", { day: "numeric", month: "long" }) };
      }

      const posts = d.posts
        .filter((p) => !p.communityId && matchesDay(p.createdAt))
        .filter((p) => p.authorId === meId || friendIds.has(p.authorId) || followingSet.has(p.authorId))
        .filter((p) => canViewPost(p, meId, followingSet, friendIds))
        .map((p) => ({
          ...withAuthor(d, p, meId),
          yearsAgo: year - new Date(p.createdAt).getFullYear(),
        }))
        .sort((a, b) => b.yearsAgo - a.yearsAgo);

      return {
        posts,
        dateLabel: today.toLocaleDateString("es-ES", { day: "numeric", month: "long" }),
      };
    },
  });
}

export function useGetMyAvatars(opts?: AnyObj) {
  return useQuery({
    queryKey: ["my-avatars"],
    enabled: opts?.query?.enabled ?? true,
    queryFn: async () => {
      const d = load();
      const meId = currentUserId();
      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        const snap = await getDocs(query(userAvatarsCol, where("userId", "==", me.id)));
        return snap.docs
          .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as AnyObj) }))
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      }
      return (d.userAvatars ?? []).filter((a) => a.userId === meId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
  });
}

export function useGetMyStickers(opts?: AnyObj) {
  return useQuery({
    queryKey: ["my-stickers"],
    enabled: opts?.query?.enabled ?? true,
    queryFn: async () => {
      const d = load();
      const meId = currentUserId();
      let avatars: AnyObj[] = [];
      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        const snap = await getDocs(query(userAvatarsCol, where("userId", "==", me.id)));
        avatars = snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as AnyObj) }));
      } else {
        avatars = (d.userAvatars ?? []).filter((a) => a.userId === meId);
      }
      const { resolveStickerImageUrl } = await import("./avatar-studio/render");
      const flat: AnyObj[] = [];
      for (const av of avatars) {
        const config = av.config as AnyObj | undefined;
        for (const s of av.stickers ?? []) {
          flat.push({
            ...s,
            avatarId: av.id,
            avatarName: av.name,
            userId: av.userId,
            avatarConfig: config,
            imageUrl: config
              ? resolveStickerImageUrl(config as AnyObj, s.expressionKey, s.imageUrl)
              : s.imageUrl,
          });
        }
      }
      return flat;
    },
  });
}

export function useSaveAvatarStudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ config, name }: AnyObj) => {
      const d = load();
      const { generateAvatarPreviewUrl, generateAvatarStickers } = await import("./avatar-studio/render");
      const previewUrl = generateAvatarPreviewUrl(config);
      const stickers = generateAvatarStickers(config).map(({ id, label, expressionKey }) => ({
        id,
        label,
        expressionKey,
      }));
      const isFirst = (d.userAvatars ?? []).length === 0;
      const record = {
        id: rid(),
        userId: currentUserId(),
        name: name || "Mi avatar",
        config,
        previewUrl,
        stickers,
        isPrimary: isFirst,
        createdAt: now(),
        updatedAt: now(),
      };

      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        record.userId = me.id;
        const existing = await getDocs(query(userAvatarsCol, where("userId", "==", me.id)));
        record.isPrimary = existing.empty;
        await setDoc(doc(db, "userAvatars", record.id), record);
        if (record.isPrimary) {
          await updateDoc(doc(db, "users", me.id), { avatarUrl: previewUrl, updatedAt: now() });
        }
        const idx = (d.userAvatars ?? []).findIndex((a) => a.id === record.id);
        if (!d.userAvatars) d.userAvatars = [];
        if (idx >= 0) d.userAvatars[idx] = record;
        else d.userAvatars.unshift(record);
        save(d);
        return record;
      }

      const me = ensureCurrentUser(d);
      record.userId = me.id;
      if (!d.userAvatars) d.userAvatars = [];
      record.isPrimary = d.userAvatars.filter((a) => a.userId === me.id).length === 0;
      d.userAvatars.unshift(record);
      if (record.isPrimary) {
        me.avatarUrl = previewUrl;
      }
      save(d);
      return record;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-avatars"] });
      qc.invalidateQueries({ queryKey: ["my-stickers"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useSetPrimaryAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ avatarId }: AnyObj) => {
      const d = load();
      if (canUseFirestoreSocial()) {
        const me = await ensureCurrentUserInFirestore(d);
        const snap = await getDocs(query(userAvatarsCol, where("userId", "==", me.id)));
        const { generateAvatarPreviewUrl } = await import("./avatar-studio/render");
        let previewUrl: string | null = null;
        for (const docSnap of snap.docs) {
          const data = docSnap.data() as AnyObj;
          const isPrimary = docSnap.id === avatarId;
          if (isPrimary) {
            previewUrl =
              data.previewUrl || (data.config ? generateAvatarPreviewUrl(data.config) : null);
          }
          await updateDoc(doc(db, "userAvatars", docSnap.id), { isPrimary, updatedAt: now() });
        }
        if (previewUrl) await updateDoc(doc(db, "users", me.id), { avatarUrl: previewUrl, updatedAt: now() });
      }
      const meId = currentUserId();
      for (const a of d.userAvatars ?? []) {
        if (a.userId !== meId) continue;
        a.isPrimary = a.id === avatarId;
        if (a.isPrimary) {
          const me = d.users.find((u) => u.id === meId);
          if (me) me.avatarUrl = a.previewUrl;
        }
      }
      save(d);
      return { ok: true };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ avatarId }: AnyObj) => {
      const d = load();
      if (canUseFirestoreSocial()) {
        await deleteDoc(doc(db, "userAvatars", avatarId));
      }
      d.userAvatars = (d.userAvatars ?? []).filter((a) => a.id !== avatarId);
      save(d);
      return { ok: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-avatars"] });
      qc.invalidateQueries({ queryKey: ["my-stickers"] });
    },
  });
}

export function useRequestUploadUrl() { return useMutation({ mutationFn: async () => ({ uploadURL: "", objectPath: "" }) }); }

export * from "./extra-features-api";
export * from "./gifts-api";
export * from "./resume-api";
