/** Preferencias de cuenta y privacidad (estilo Facebook Settings). */

export type AccountSettings = {
  defaultVisibility: "publico" | "amigos" | "solo_yo";
  profileVisibility: "publico" | "amigos" | "solo_yo";
  storiesVisibility: "publico" | "amigos" | "solo_yo";
  allowMessages: "todos" | "amigos" | "nadie";
  showOnline: boolean;
  showReadReceipts: boolean;
  whoCanFindByEmail: "todos" | "amigos" | "nadie";
  whoCanSendFriendRequest: "todos" | "amigos";
  allowTagging: boolean;
  reviewTagsBeforeShow: boolean;
  followersVisibility: "publico" | "amigos" | "solo_yo";
  locationSharing: boolean;
  professionalMode: boolean;
  limitedProfile: boolean;
  defaultReaction: "like" | "love" | "haha" | "wow" | "sad";
  showReactionCounts: boolean;
  locale: string;
  region: string;
  accessibility: {
    reduceMotion: boolean;
    largeText: boolean;
    highContrast: boolean;
  };
  notifications: {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    messages: boolean;
    birthdays: boolean;
    memories: boolean;
    system: boolean;
    emailDigest: boolean;
    pushEnabled: boolean;
  };
  ads: {
    personalizedAds: boolean;
    activityBasedAds: boolean;
  };
  blockedIds: string[];
};

const KEY = "social_account_settings_v1";
const ACTIVITY_KEY = "social_activity_log_v1";

export const DEFAULT_SETTINGS: AccountSettings = {
  defaultVisibility: "publico",
  profileVisibility: "publico",
  storiesVisibility: "amigos",
  allowMessages: "todos",
  showOnline: true,
  showReadReceipts: true,
  whoCanFindByEmail: "todos",
  whoCanSendFriendRequest: "todos",
  allowTagging: true,
  reviewTagsBeforeShow: false,
  followersVisibility: "publico",
  locationSharing: false,
  professionalMode: false,
  limitedProfile: false,
  defaultReaction: "like",
  showReactionCounts: true,
  locale: "es",
  region: "ES",
  accessibility: { reduceMotion: false, largeText: false, highContrast: false },
  notifications: {
    likes: true,
    comments: true,
    follows: true,
    messages: true,
    birthdays: true,
    memories: true,
    system: true,
    emailDigest: false,
    pushEnabled: true,
  },
  ads: { personalizedAds: false, activityBasedAds: false },
  blockedIds: [],
};

export function loadAccountSettings(userId: string): AccountSettings {
  try {
    const raw = localStorage.getItem(`${KEY}_${userId}`);
    const blocked = JSON.parse(localStorage.getItem("social_blocked_users_v1") || "[]") as string[];
    const notifRaw = localStorage.getItem("social_notif_prefs_v1");
    const legacyNotif = notifRaw ? JSON.parse(notifRaw) : {};
    const base = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    base.blockedIds = blocked;
    if (legacyNotif.like !== undefined) {
      base.notifications.likes = legacyNotif.like ?? true;
      base.notifications.comments = legacyNotif.comment ?? true;
      base.notifications.follows = legacyNotif.follow ?? true;
      base.notifications.messages = legacyNotif.message ?? true;
      base.notifications.system = legacyNotif.system ?? true;
    }
    return base;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveAccountSettings(userId: string, settings: AccountSettings) {
  localStorage.setItem(`${KEY}_${userId}`, JSON.stringify(settings));
  localStorage.setItem("social_blocked_users_v1", JSON.stringify(settings.blockedIds));
  localStorage.setItem(
    "social_notif_prefs_v1",
    JSON.stringify({
      like: settings.notifications.likes,
      comment: settings.notifications.comments,
      follow: settings.notifications.follows,
      message: settings.notifications.messages,
      birthday: settings.notifications.birthdays,
      system: settings.notifications.system,
    }),
  );
  applyAccessibility(settings.accessibility);
  document.documentElement.lang = settings.locale === "en" ? "en" : "es";
}

export function applyAccessibility(a: AccountSettings["accessibility"]) {
  const root = document.documentElement;
  root.classList.toggle("a11y-large-text", a.largeText);
  root.classList.toggle("a11y-high-contrast", a.highContrast);
  root.classList.toggle("a11y-reduce-motion", a.reduceMotion);
}

export type ActivityEntry = {
  id: string;
  type: string;
  label: string;
  createdAt: string;
};

export function appendActivity(userId: string, entry: Omit<ActivityEntry, "id" | "createdAt">) {
  try {
    const key = `${ACTIVITY_KEY}_${userId}`;
    const list: ActivityEntry[] = JSON.parse(localStorage.getItem(key) || "[]");
    list.unshift({
      ...entry,
      id: Math.random().toString(36).slice(2, 10),
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
  } catch {
    /* noop */
  }
}

export function loadActivityLog(userId: string): ActivityEntry[] {
  try {
    return JSON.parse(localStorage.getItem(`${ACTIVITY_KEY}_${userId}`) || "[]");
  } catch {
    return [];
  }
}
