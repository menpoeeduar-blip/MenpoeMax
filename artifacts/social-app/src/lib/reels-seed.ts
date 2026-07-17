import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const now = () => new Date().toISOString();

/** Incrementar al cambiar URLs de video para re-sincronizar Firestore. */
export const REEL_MEDIA_VERSION = 3;

/** URLs públicas que responden 200 (evitar gtv-videos-bucket — falla en muchos navegadores). */
const MDN = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos";
export const REEL_FALLBACK_VIDEO = `${MDN}/flower.mp4`;

export const MENPOE_REEL_AUTHORS = [
  {
    id: "menpoe_creator_sofia",
    username: "menpoe_sofia",
    displayName: "Sofia Tech | Menpoe",
    bio: "Contenido oficial Menpoe — tecnología y comunidad",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=menpoe_sofia",
    role: "creator",
    isVerified: true,
    followersCount: 1200,
    followingCount: 80,
    postsCount: 12,
    createdAt: now(),
  },
  {
    id: "menpoe_creator_carlos",
    username: "menpoe_carlos",
    displayName: "Carlos Dev | Menpoe",
    bio: "Reels de desarrollo y empleo en Menpoe",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=menpoe_carlos",
    role: "creator",
    isVerified: true,
    followersCount: 980,
    followingCount: 65,
    postsCount: 10,
    createdAt: now(),
  },
  {
    id: "menpoe_creator_ana",
    username: "menpoe_ana",
    displayName: "Ana Creativa | Menpoe",
    bio: "Diseño, inspiración y tendencias",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=menpoe_ana",
    role: "creator",
    isVerified: false,
    followersCount: 640,
    followingCount: 120,
    postsCount: 8,
    createdAt: now(),
  },
] as const;

export const MENPOE_DEMO_REELS = [
  {
    id: "menpoe_reel_1",
    authorId: "menpoe_creator_sofia",
    content: "Bienvenido a Reels Menpoe — descubre vacantes, comunidad y talento en un solo lugar.",
    postType: "reel" as const,
    mediaUrls: [`${MDN}/flower.mp4`],
    hashtags: ["menpoe", "reels", "empleo"],
    visibility: "publico",
    isMenpoeSeed: true,
    likesCount: 48,
    commentsCount: 6,
    sharesCount: 12,
    viewsCount: 2400,
  },
  {
    id: "menpoe_reel_2",
    authorId: "menpoe_creator_carlos",
    content: "Tips rápidos para destacar tu perfil profesional en Menpoe.",
    postType: "reel" as const,
    mediaUrls: ["https://www.w3schools.com/html/mov_bbb.mp4"],
    hashtags: ["menpoe", "carrera", "tips"],
    visibility: "publico",
    isMenpoeSeed: true,
    likesCount: 35,
    commentsCount: 4,
    sharesCount: 8,
    viewsCount: 1800,
  },
  {
    id: "menpoe_reel_3",
    authorId: "menpoe_creator_ana",
    content: "Creatividad e innovación: así vivimos la red astral de Menpoe.",
    postType: "reel" as const,
    mediaUrls: ["https://download.samplelib.com/mp4/sample-5s.mp4"],
    hashtags: ["menpoe", "creatividad", "redsocial"],
    visibility: "publico",
    isMenpoeSeed: true,
    likesCount: 62,
    commentsCount: 9,
    sharesCount: 15,
    viewsCount: 3100,
  },
  {
    id: "menpoe_reel_4",
    authorId: "menpoe_creator_sofia",
    content: "Empresas aliadas publican vacantes con datos legales — postula con tu hoja de vida.",
    postType: "reel" as const,
    mediaUrls: ["https://download.samplelib.com/mp4/sample-10s.mp4"],
    hashtags: ["vacantes", "menpoe", "trabajo"],
    visibility: "publico",
    isMenpoeSeed: true,
    likesCount: 41,
    commentsCount: 3,
    sharesCount: 6,
    viewsCount: 1500,
  },
  {
    id: "menpoe_reel_5",
    authorId: "menpoe_creator_carlos",
    content: "Tecnología en movimiento: conecta, comparte y crece con tu comunidad.",
    postType: "reel" as const,
    mediaUrls: ["https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4"],
    hashtags: ["tech", "menpoe", "comunidad"],
    visibility: "publico",
    isMenpoeSeed: true,
    likesCount: 29,
    commentsCount: 2,
    sharesCount: 5,
    viewsCount: 980,
  },
  {
    id: "menpoe_reel_6",
    authorId: "menpoe_creator_ana",
    content: "Tu próximo reel puede ser el que te abra puertas — publícalo hoy en Menpoe.",
    postType: "reel" as const,
    mediaUrls: ["https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_5MB.mp4"],
    hashtags: ["reels", "menpoe", "inspiracion"],
    visibility: "publico",
    isMenpoeSeed: true,
    likesCount: 55,
    commentsCount: 7,
    sharesCount: 11,
    viewsCount: 2200,
  },
];

const SEED_BY_ID = new Map(MENPOE_DEMO_REELS.map((r) => [r.id, r]));

/** URLs de Google Sample que ya no cargan en producción. */
export function isBrokenReelCdn(url: string): boolean {
  return /gtv-videos-bucket|commondatastorage\.googleapis\.com\/gtv/i.test(url);
}

function normalizeMediaUrls(raw: unknown): string[] {
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  if (!Array.isArray(raw)) return [];
  return raw.map((u) => String(u).trim()).filter((u) => u.startsWith("http"));
}

/** Devuelve la mejor URL de video para un reel (corrige Firestore/local con enlaces rotos). */
export function resolveReelMediaUrl(post: { id: string; mediaUrls?: unknown }): string {
  const seed = SEED_BY_ID.get(post.id);
  const urls = normalizeMediaUrls(post.mediaUrls);
  const first = urls[0];
  if (first && !isBrokenReelCdn(first)) return first;
  if (seed?.mediaUrls[0]) return seed.mediaUrls[0];
  return REEL_FALLBACK_VIDEO;
}

export function mergeMenpoeReelsIntoLocalData(d: {
  users: Record<string, unknown>[];
  posts: Record<string, unknown>[];
}) {
  for (const author of MENPOE_REEL_AUTHORS) {
    if (!d.users.some((u) => u.id === author.id)) {
      d.users.push({ ...author });
    }
  }
  for (const reel of MENPOE_DEMO_REELS) {
    const idx = d.posts.findIndex((p) => p.id === reel.id);
    if (idx < 0) {
      d.posts.unshift({
        ...reel,
        mediaVersion: REEL_MEDIA_VERSION,
        createdAt: now(),
        updatedAt: now(),
      });
    } else {
      d.posts[idx] = {
        ...d.posts[idx],
        ...reel,
        mediaUrls: reel.mediaUrls,
        mediaVersion: REEL_MEDIA_VERSION,
      };
    }
  }
}

export function canSeedReelsInFirestore() {
  return !!auth.currentUser;
}

export async function ensureMenpoeReelsInFirestore(): Promise<void> {
  if (!canSeedReelsInFirestore()) return;

  for (const author of MENPOE_REEL_AUTHORS) {
    await setDoc(doc(db, "users", author.id), { ...author, updatedAt: now() }, { merge: true });
  }

  for (const reel of MENPOE_DEMO_REELS) {
    const ref = doc(db, "posts", reel.id);
    const snap = await getDoc(ref);
    const data = snap.exists() ? (snap.data() as { mediaUrls?: string[]; mediaVersion?: number }) : null;
    const needsUpdate =
      !snap.exists() ||
      !data?.mediaUrls?.length ||
      data.mediaVersion !== REEL_MEDIA_VERSION ||
      isBrokenReelCdn(data.mediaUrls[0] || "");

    if (needsUpdate) {
      await setDoc(
        ref,
        {
          ...reel,
          mediaUrls: reel.mediaUrls,
          mediaVersion: REEL_MEDIA_VERSION,
          ...(snap.exists() ? {} : { createdAt: now() }),
          updatedAt: now(),
        },
        { merge: true },
      );
    }
  }
}

export function getLocalReelsPreview() {
  return MENPOE_DEMO_REELS.map((reel) => {
    const author = MENPOE_REEL_AUTHORS.find((a) => a.id === reel.authorId)!;
    return { ...reel, author, isLiked: false, isSaved: false, userReaction: null };
  });
}
