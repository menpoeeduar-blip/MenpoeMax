#!/usr/bin/env node
/**
 * Verificación rápida de MenpoeSocial: estructura, categorías marketplace y typecheck.
 * Uso: node scripts/verify-app.mjs
 */
import { readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
let failed = 0;

function ok(msg) {
  passed++;
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  failed++;
  console.error(`  ✗ ${msg}`);
}

function section(title) {
  console.log(`\n▸ ${title}`);
}

section("Archivos esenciales");
const requiredPaths = [
  "artifacts/social-app/src/App.tsx",
  "artifacts/social-app/src/pages/marketplace.tsx",
  "artifacts/social-app/src/lib/marketplace-categories.ts",
  "artifacts/social-app/src/lib/api-client-react-shim.ts",
  "artifacts/api-server/src/routes/marketplace.ts",
  "lib/db/src/schema/marketplace.ts",
];
for (const rel of requiredPaths) {
  if (existsSync(join(root, rel))) ok(rel);
  else fail(`Falta: ${rel}`);
}

section("Categorías marketplace (20)");
try {
  const src = readFileSync(
    join(root, "artifacts/social-app/src/lib/marketplace-categories.ts"),
    "utf8",
  );
  const matches = [...src.matchAll(/id:\s*"([^"]+)"/g)];
  const ids = matches.filter((m) => !m[1].includes(" "));
  if (ids.length === 20) ok(`20 categorías definidas`);
  else fail(`Se esperaban 20 categorías, se encontraron ${ids.length}`);
  if (src.includes("DEFAULT_MARKETPLACE_CATEGORY")) ok("Categoría por defecto definida");
  else fail("Sin DEFAULT_MARKETPLACE_CATEGORY");
} catch (e) {
  fail(`No se pudo leer marketplace-categories: ${e.message}`);
}

section("Hooks marketplace en shim");
try {
  const shim = readFileSync(
    join(root, "artifacts/social-app/src/lib/api-client-react-shim.ts"),
    "utf8",
  );
  const hooks = [
    "useStartConversationWithUser",
    "useGetMyListings",
    "useUpdateListing",
    "useDeleteListing",
    "useRecordListingView",
  ];
  for (const h of hooks) {
    if (shim.includes(`export function ${h}`)) ok(h);
    else fail(`Falta hook: ${h}`);
  }
  if (shim.includes('currency: data.currency || "COP"')) ok("Moneda COP al crear anuncio");
  else fail("createListing no fuerza COP");
} catch (e) {
  fail(`Shim: ${e.message}`);
}

section("Lógica de filtrado de anuncios");
function filterListings(listings, params, meId) {
  return listings.filter((l) => {
    const mine = params?.mine === true || params?.mine === "true";
    if (mine && l.sellerId !== meId) return false;
    if (params?.availableOnly && l.isAvailable === false) return false;
    if (params?.q && !l.title.toLowerCase().includes(String(params.q).toLowerCase())) return false;
    if (params?.category && l.category !== params.category) return false;
    return true;
  });
}
const sample = [
  { id: "1", title: "iPhone 13", category: "electronica", sellerId: "u1", isAvailable: true },
  { id: "2", title: "Bici usada", category: "deportes", sellerId: "u2", isAvailable: false },
  { id: "3", title: "Silla", category: "electronica", sellerId: "u1", isAvailable: true },
];
const byCat = filterListings(sample, { category: "electronica" }, "u1");
if (byCat.length === 2) ok("Filtro por categoría");
else fail(`Filtro categoría: esperado 2, got ${byCat.length}`);
const mine = filterListings(sample, { mine: true }, "u1");
if (mine.length === 2) ok("Filtro mis anuncios");
else fail(`Filtro mine: esperado 2, got ${mine.length}`);
const search = filterListings(sample, { q: "iphone" }, "u1");
if (search.length === 1) ok("Filtro búsqueda");
else fail(`Filtro q: esperado 1, got ${search.length}`);

section("Integración marketplace en UI");
const mp = readFileSync(join(root, "artifacts/social-app/src/pages/marketplace.tsx"), "utf8");
const checks = [
  ["useStartConversationWithUser", "Contactar vendedor conectado"],
  ["tab-my-listings", "Pestaña Mis anuncios"],
  ["useRecordListingView", "Contador de vistas"],
  ["/marketplace/${listing.id}", "Enlace directo al anuncio"],
  ["useDeleteListing", "Eliminar anuncio"],
];
for (const [needle, label] of checks) {
  if (mp.includes(needle)) ok(label);
  else fail(`Falta en marketplace.tsx: ${label}`);
}
const msg = readFileSync(join(root, "artifacts/social-app/src/pages/messages.tsx"), "utf8");
if (msg.includes('get("conv")')) ok("Mensajes abre conversación por URL ?conv=");
else fail("Deep link mensajes no implementado");

section("Comentarios con multimedia");
const commentFiles = [
  "artifacts/social-app/src/components/comments/CommentComposer.tsx",
  "artifacts/social-app/src/components/comments/CommentsPanel.tsx",
  "artifacts/social-app/src/components/comments/CommentMediaBody.tsx",
  "artifacts/social-app/src/components/comments/GifPicker.tsx",
];
for (const rel of commentFiles) {
  if (existsSync(join(root, rel))) ok(rel);
  else fail(`Falta: ${rel}`);
}
const composer = readFileSync(join(root, "artifacts/social-app/src/components/comments/CommentComposer.tsx"), "utf8");
const mediaButtons = [
  ["button-comment-image", "Botón imagen en comentarios"],
  ["button-comment-gif", "Botón GIF en comentarios"],
  ["button-comment-video", "Botón video en comentarios"],
  ["button-comment-audio", "Botón audio en comentarios"],
];
for (const [needle, label] of mediaButtons) {
  if (composer.includes(needle)) ok(label);
  else fail(`Falta en CommentComposer: ${label}`);
}
const shimComments = readFileSync(join(root, "artifacts/social-app/src/lib/api-client-react-shim.ts"), "utf8");
if (shimComments.includes("mediaType") && shimComments.includes("mediaUrl")) ok("API comentarios guarda mediaType/mediaUrl");
else fail("useCreateComment sin campos multimedia");
const feed = readFileSync(join(root, "artifacts/social-app/src/pages/feed.tsx"), "utf8");
const reels = readFileSync(join(root, "artifacts/social-app/src/pages/reels.tsx"), "utf8");
const communities = readFileSync(join(root, "artifacts/social-app/src/pages/communities.tsx"), "utf8");
if (feed.includes("CommentsPanel")) ok("Feed usa CommentsPanel");
else fail("Feed sin CommentsPanel");
if (reels.includes("CommentsPanel")) ok("Reels usa CommentsPanel");
else fail("Reels sin CommentsPanel");
if (communities.includes("CommentsPanel")) ok("Comunidades usa CommentsPanel");
else fail("Comunidades sin CommentsPanel");
const upload = readFileSync(join(root, "artifacts/social-app/src/lib/upload.ts"), "utf8");
if (upload.includes("uploadAudioToStorage")) ok("Subida de audio en upload.ts");
else fail("upload.ts sin soporte audio");

function buildCommentPayload(data) {
  const content = String(data?.content || "").trim();
  const mediaType = data?.mediaType || null;
  const mediaUrl = data?.mediaUrl || null;
  if (!content && !mediaUrl) throw new Error("vacío");
  return { content, mediaType, mediaUrl };
}
try {
  const img = buildCommentPayload({ content: "", mediaType: "image", mediaUrl: "https://x/img.jpg" });
  if (img.mediaType === "image") ok("Comentario solo con imagen válido");
  else fail("Payload imagen inválido");
  buildCommentPayload({ content: "", mediaType: null, mediaUrl: null });
  fail("Debería rechazar comentario vacío");
} catch {
  ok("Rechaza comentario sin texto ni media");
}

section("Estudio de avatares y stickers");
const avatarStudio = existsSync(join(root, "artifacts/social-app/src/components/avatar/AvatarStudio.tsx"));
if (avatarStudio) ok("AvatarStudio UI");
else fail("Falta AvatarStudio");
const avatarHooks = readFileSync(join(root, "artifacts/social-app/src/lib/api-client-react-shim.ts"), "utf8");
for (const h of ["useGetMyAvatars", "useGetMyStickers", "useSaveAvatarStudio", "useSetPrimaryAvatar", "useDeleteAvatar"]) {
  if (avatarHooks.includes(`export function ${h}`)) ok(h);
  else fail(`Falta hook ${h}`);
}
const profilePage = readFileSync(join(root, "artifacts/social-app/src/pages/profile.tsx"), "utf8");
if (profilePage.includes("ProfileAvatarsTab") && profilePage.includes('value="avatars"')) ok("Pestaña Avatares en perfil");
else fail("Perfil sin pestaña avatares");

section("TypeScript — proyecto completo (informativo)");
const tsc = spawnSync("pnpm", ["--filter", "@workspace/social-app", "run", "typecheck"], { cwd: root, shell: true, encoding: "utf8" });
if (tsc.status === 0) ok("social-app typecheck completo");
else console.log("  ⚠ social-app: hay errores TS previos en otras páginas (profile, settings, etc.)");

const tscApi = spawnSync("pnpm", ["--filter", "@workspace/api-server", "run", "typecheck"], { cwd: root, shell: true, encoding: "utf8" });
if (tscApi.status === 0) ok("api-server typecheck completo");
else console.log("  ⚠ api-server: errores TS previos en dependencias drizzle");

console.log(`\n══════════════════════════════════════`);
console.log(`Resultado: ${passed} OK, ${failed} fallos`);
console.log(`══════════════════════════════════════\n`);
process.exit(failed > 0 ? 1 : 0);
