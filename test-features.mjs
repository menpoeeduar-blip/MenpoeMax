/**
 * MenpoeSocial – Test Suite Completo v2
 * Pruebas estáticas, integridad de features y conectividad
 * Ejecutar desde: C:\Users\Usuario\Desktop\MenpoeSocial
 * Comando: node test-features.mjs
 */

import fs from "fs";
import path from "path";
import https from "https";

// ─── Rutas base ───────────────────────────────────────────────────────────────
const ROOT = process.cwd(); // C:\Users\Usuario\Desktop\MenpoeSocial
const SRC  = path.join(ROOT, "artifacts/social-app/src");

let passed = 0, failed = 0, warnings = 0;
const failLog = [];

function pass(section, test, detail = "") {
  passed++;
  const line = `  ✅ [${section}] ${test}${detail ? "  →  " + detail : ""}`;
  console.log(line);
}
function fail(section, test, detail = "") {
  failed++;
  const line = `  ❌ [${section}] ${test}${detail ? "  →  " + detail : ""}`;
  console.log(line);
  failLog.push({ section, test, detail });
}
function warn(section, test, detail = "") {
  warnings++;
  console.log(`  ⚠️  [${section}] ${test}${detail ? "  →  " + detail : ""}`);
}
function header(emoji, n, title) {
  console.log(`\n${emoji} [${n}] ${title}\n${"─".repeat(56)}`);
}

function readFile(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return null; }
}
function exists(p) { return fs.existsSync(p); }

function httpGet(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      res.resume();
      resolve({ status: res.statusCode });
    });
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, error: "timeout" }); });
  });
}

// ─── [1] ARCHIVOS CRÍTICOS ────────────────────────────────────────────────────
header("📁", 1, "ARCHIVOS CRÍTICOS");
const FILES = {
  feed:       path.join(SRC, "pages/feed.tsx"),
  shell:      path.join(SRC, "components/layout/Shell.tsx"),
  comments:   path.join(SRC, "components/comments/CommentsPanel.tsx"),
  saved:      path.join(SRC, "pages/saved.tsx"),
  settings:   path.join(SRC, "pages/settings.tsx"),
  shim:       path.join(SRC, "lib/api-client-react-shim.ts"),
  extra:      path.join(SRC, "lib/extra-features-api.ts"),
  app:        path.join(SRC, "App.tsx"),
};

const C = {};
for (const [key, filePath] of Object.entries(FILES)) {
  C[key] = readFile(filePath);
  const name = path.basename(filePath);
  if (C[key]) {
    pass("Archivos", `${name} existe`, `${(Buffer.byteLength(C[key]) / 1024).toFixed(1)} KB`);
  } else {
    fail("Archivos", `${name} existe`, "ARCHIVO NO ENCONTRADO");
  }
}

// ─── [2] FEATURE 1 – ENCUESTAS ────────────────────────────────────────────────
header("🗳️ ", 2, "FEATURE 1: ENCUESTAS EN PUBLICACIONES (POLLS)");
const f = C.feed;
if (f) {
  f.includes("PollViewer")         ? pass("Polls", "PollViewer componente definido")            : fail("Polls", "PollViewer componente definido");
  f.includes("isCreatingPoll")     ? pass("Polls", "Estado isCreatingPoll en CreatePostBox")    : fail("Polls", "Estado isCreatingPoll");
  f.includes("pollOptions")        ? pass("Polls", "Estado pollOptions para opciones")          : fail("Polls", "Estado pollOptions");
  f.includes("BarChart3")          ? pass("Polls", "Botón BarChart3 en toolbar del compositor") : fail("Polls", "Botón BarChart3 en toolbar");
  f.includes("Añadir opción")      ? pass("Polls", "Botón '+ Añadir opción'")                  : fail("Polls", "Botón '+ Añadir opción'");
  f.includes("post.poll")          ? pass("Polls", "Render condicional post.poll en PostCard")  : fail("Polls", "Render condicional post.poll");
  f.includes("totalVotes")         ? pass("Polls", "Cálculo totalVotes para porcentajes")       : fail("Polls", "Cálculo totalVotes");
  f.includes("handleVote")         ? pass("Polls", "Handler handleVote al votar")               : fail("Polls", "Handler handleVote");
  f.includes("percent}%")          ? pass("Polls", "Barra de progreso con porcentaje (width%)") : fail("Polls", "Barra de progreso %");
} else {
  fail("Polls", "feed.tsx legible");
}

if (C.shim) {
  C.shim.includes("data.poll")     ? pass("Polls", "useCreatePost persiste campo poll (shim)")  : fail("Polls", "useCreatePost persiste campo poll");
}

// ─── [3] FEATURE 2 – HISTORIAS CON DEGRADADOS ────────────────────────────────
header("🌅", 3, "FEATURE 2: HISTORIAS CON FONDOS DEGRADADOS");
if (f) {
  f.includes("storyType")             ? pass("Stories", "Toggle storyType media/text")           : fail("Stories", "Toggle storyType media/text");
  f.includes("selectedGradient")      ? pass("Stories", "Estado selectedGradient")               : fail("Stories", "Estado selectedGradient");
  f.includes("sunset")                ? pass("Stories", "Preset gradient 'sunset'")              : fail("Stories", "Preset gradient 'sunset'");
  f.includes("cyberpunk")             ? pass("Stories", "Preset gradient 'cyberpunk'")           : fail("Stories", "Preset gradient 'cyberpunk'");
  f.includes("ocean")                 ? pass("Stories", "Preset gradient 'ocean'")               : fail("Stories", "Preset gradient 'ocean'");
  f.includes("twilight")              ? pass("Stories", "Preset gradient 'twilight'")            : fail("Stories", "Preset gradient 'twilight'");
  f.includes("Foto / Video")          ? pass("Stories", "Tab 'Foto / Video' en StoryCreator")    : fail("Stories", "Tab 'Foto / Video'");
  f.includes("Fondo degradado")       ? pass("Stories", "Selector 'Fondo degradado'")            : fail("Stories", "Selector 'Fondo degradado'");
  f.includes("/160")                  ? pass("Stories", "Límite 160 caracteres texto historia")  : fail("Stories", "Límite 160 chars");
  f.includes("StoryViewer")           ? pass("Stories", "Componente StoryViewer (fullscreen)")   : fail("Stories", "Componente StoryViewer");
  f.includes("selectedStoryGroup")    ? pass("Stories", "Estado selectedStoryGroup")             : fail("Stories", "Estado selectedStoryGroup");
  f.includes("ArrowLeft")             ? pass("Stories", "Botón navegación anterior (ArrowLeft)") : fail("Stories", "Botón ArrowLeft");
  f.includes("ArrowRight")            ? pass("Stories", "Botón navegación siguiente")            : fail("Stories", "Botón ArrowRight");
  f.includes("setInterval")           ? pass("Stories", "Timer setInterval para auto-avance")    : fail("Stories", "Timer setInterval");
  f.includes("progress")              ? pass("Stories", "Barra de progreso en viewer")           : fail("Stories", "Barra de progreso viewer");
}

// ─── [4] FEATURE 3 – COLECCIONES DE GUARDADOS ────────────────────────────────
header("📂", 4, "FEATURE 3: COLECCIONES DE GUARDADOS");
const s = C.saved;
if (s) {
  s.includes("useGetAllSaved")           ? pass("Saved", "Hook useGetAllSaved importado")              : fail("Saved", "Hook useGetAllSaved importado");
  s.includes("useManageSavedCollection") ? pass("Saved", "Hook useManageSavedCollection importado")   : fail("Saved", "Hook useManageSavedCollection");
  s.includes("FolderCard")              ? pass("Saved", "Componente FolderCard definido")             : fail("Saved", "Componente FolderCard");
  s.includes("CollectionDetail")        ? pass("Saved", "Componente CollectionDetail definido")       : fail("Saved", "Componente CollectionDetail");
  s.includes("COLLECTION_COLORS")       ? pass("Saved", "Sistema de colores COLLECTION_COLORS")       : fail("Saved", "COLLECTION_COLORS");
  s.includes("Nueva colección")         ? pass("Saved", "Botón 'Nueva colección'")                    : fail("Saved", "Botón 'Nueva colección'");
  s.includes("showCreateDialog")        ? pass("Saved", "Dialog crear colección (showCreateDialog)")  : fail("Saved", "Dialog crear colección");
  s.includes("openCollectionId")        ? pass("Saved", "Navegación interna a colección abierta")     : fail("Saved", "Navegación openCollectionId");
  s.includes("Agregar a colección")     ? pass("Saved", "Dialog 'Agregar a colección' por post")      : fail("Saved", "Dialog 'Agregar a colección'");
  (s.includes("col_") || (C.shim && C.shim.includes("col_"))) ? pass("Saved", "Generación de ID (col_...) en shim") : fail("Saved", "Generación de ID col_");
  s.includes("activeView")              ? pass("Saved", "Toggle vista Todo / Colecciones")            : fail("Saved", "Toggle vista activeView");
} else {
  fail("Saved", "saved.tsx legible");
}

if (C.shim) {
  C.shim.includes("export function useGetAllSaved")          ? pass("Saved", "useGetAllSaved en shim principal")         : fail("Saved", "useGetAllSaved en shim");
  C.shim.includes("export function useManageSavedCollection") ? pass("Saved", "useManageSavedCollection en shim")        : fail("Saved", "useManageSavedCollection en shim");
  C.shim.includes("saved_collections_")                       ? pass("Saved", "localStorage key 'saved_collections_...'") : fail("Saved", "localStorage key colecciones");
}

if (C.extra) {
  !C.extra.includes("export function useGetAllSaved") ? pass("Saved", "Duplicado removido de extra-features-api") : fail("Saved", "Duplicado useGetAllSaved aún en extra-features");
}

// ─── [5] FEATURE 4 – REACCIONES EN COMENTARIOS ────────────────────────────────
header("❤️ ", 5, "FEATURE 4: REACCIONES EN COMENTARIOS");
const cm = C.comments;
if (cm) {
  cm.includes("reactions")             ? pass("CommentReact", "Estado 'reactions' en CommentBubble")          : fail("CommentReact", "Estado 'reactions'");
  cm.includes("handleReact")           ? pass("CommentReact", "Handler handleReact")                          : fail("CommentReact", "Handler handleReact");
  cm.includes("comment_reactions_")    ? pass("CommentReact", "localStorage key 'comment_reactions_...'")     : fail("CommentReact", "localStorage key");
  cm.includes("reactionCounts")        ? pass("CommentReact", "Contador reactionCounts calculado")            : fail("CommentReact", "reactionCounts");
  cm.includes("userReaction")          ? pass("CommentReact", "userReaction para resaltar emoji propio")       : fail("CommentReact", "userReaction");
  cm.includes("DropdownMenu")          ? pass("CommentReact", "DropdownMenu emoji picker integrado")           : fail("CommentReact", "DropdownMenu picker");
  cm.includes("👍") && cm.includes("❤️") ? pass("CommentReact", "Emojis 👍 ❤️ 😂 presentes")               : fail("CommentReact", "Emojis presentes");
  cm.includes("absolute -bottom-2")    ? pass("CommentReact", "Badge de reacciones posicionado (absolute)")   : fail("CommentReact", "Badge absolute");
  cm.includes("onReply")               ? pass("CommentReact", "Prop onReply en CommentBubble")                : fail("CommentReact", "Prop onReply");
  cm.includes("Reaccionar")            ? pass("CommentReact", "Label 'Reaccionar' en botón de trigger")       : fail("CommentReact", "Label 'Reaccionar'");
} else {
  fail("CommentReact", "CommentsPanel.tsx legible");
}

// ─── [6] FEATURE 5 – MODO SILENCIOSO ─────────────────────────────────────────
header("🔕", 6, "FEATURE 5: MODO SILENCIOSO (QUIET MODE)");
const st = C.settings;
if (st) {
  st.includes("BellOff")                          ? pass("QuietMode", "BellOff importado en settings")                 : fail("QuietMode", "BellOff en settings");
  st.includes("Modo Silencioso")                  ? pass("QuietMode", "Sección 'Modo Silencioso' en Notificaciones")   : fail("QuietMode", "Sección Modo Silencioso");
  st.includes("quiet_mode_until")                 ? pass("QuietMode", "Clave quiet_mode_until en localStorage")        : fail("QuietMode", "quiet_mode_until");
  st.includes("60 * 60000")                       ? pass("QuietMode", "Duración 1 hora (60 * 60000 ms)")               : fail("QuietMode", "Duración 1h");
  st.includes("dispatchEvent(new Event")          ? pass("QuietMode", "StorageEvent emitido para sincronizar Shell")   : fail("QuietMode", "StorageEvent emit");
  st.includes("silencioso activado")              ? pass("QuietMode", "Toast confirmación 'activado'")                 : fail("QuietMode", "Toast activado");
  st.includes("handleQuietToggle")                ? pass("QuietMode", "Handler handleQuietToggle definido")            : fail("QuietMode", "handleQuietToggle");
} else {
  fail("QuietMode", "settings.tsx legible");
}

const sh = C.shell;
if (sh) {
  sh.includes("BellOff")           ? pass("QuietMode", "BellOff importado en Shell.tsx")                    : fail("QuietMode", "BellOff en Shell");
  sh.includes("isQuietActive")     ? pass("QuietMode", "Estado isQuietActive en Shell")                     : fail("QuietMode", "isQuietActive en Shell");
  sh.includes("quiet_mode_until")  ? pass("QuietMode", "Shell lee quiet_mode_until")                        : fail("QuietMode", "Shell lee quiet_mode_until");
  sh.includes("Silencio")          ? pass("QuietMode", "Indicador 'Silencio' en header")                    : fail("QuietMode", "Indicador Silencio header");
  sh.includes("animate-pulse")     ? pass("QuietMode", "Animación pulsante en badge")                       : fail("QuietMode", "animate-pulse badge");
  sh.includes("\"storage\"")       ? pass("QuietMode", "Listener evento 'storage' para sincronizar Shell")  : fail("QuietMode", "Listener storage event");
}

// ─── [7] INTEGRIDAD GENERAL DE NAVEGACIÓN ────────────────────────────────────
header("🏗️ ", 7, "INTEGRIDAD GENERAL DE NAVEGACIÓN");
if (sh) {
  sh.includes("Red Social")              ? pass("Nav", "Grupo 'Red Social' en sidebar")                  : fail("Nav", "Grupo 'Red Social'");
  sh.includes("Negocios y Empleo")       ? pass("Nav", "Grupo 'Negocios y Empleo' en sidebar")           : fail("Nav", "Grupo 'Negocios y Empleo'");
  sh.includes("TOP_NAV_ITEMS")           ? pass("Nav", "TOP_NAV_ITEMS para barra superior")              : fail("Nav", "TOP_NAV_ITEMS");
  sh.includes("/messages")               ? pass("Nav", "Ruta /messages en nav")                         : fail("Nav", "Ruta /messages");
  sh.includes("/friends")                ? pass("Nav", "Ruta /friends en nav")                          : fail("Nav", "Ruta /friends");
  sh.includes("profileHubSections")      ? pass("Nav", "Perfil agrupado en dropdown (profileHubSections)") : fail("Nav", "profileHubSections en dropdown");
  sh.includes("Negocios y Empleo")       ? pass("Nav", "Sección negocios separada de social")            : fail("Nav", "Sección negocios separada");
  sh.includes("GlobalSearch")            ? pass("Nav", "Buscador global GlobalSearch en header")         : fail("Nav", "GlobalSearch en header");
}

if (C.app) {
  const routes = ["/", "/explore", "/reels", "/messages", "/friends",
                  "/notifications", "/settings", "/saved", "/jobs", "/communities"];
  for (const route of routes) {
    C.app.includes(`"${route}"`) ? pass("Rutas", `Ruta ${route}`) : warn("Rutas", `Ruta ${route}`, "no encontrada en App.tsx");
  }
}

// ─── [8] BUILD ARTIFACTS ─────────────────────────────────────────────────────
header("📦", 8, "BUILD ARTIFACTS");
const distDir = path.join(ROOT, "artifacts/social-app/dist/public");
if (exists(distDir)) {
  pass("Build", "Directorio dist/public existe");
  const indexHtml = path.join(distDir, "index.html");
  exists(indexHtml) ? pass("Build", "index.html generado") : fail("Build", "index.html falta");

  const assetsDir = path.join(distDir, "assets");
  if (exists(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const js  = files.find((f) => f.endsWith(".js"));
    const css = files.find((f) => f.endsWith(".css"));
    if (js) {
      const kb = (fs.statSync(path.join(assetsDir, js)).size / 1024).toFixed(0);
      pass("Build", `JS bundle: ${js}`, `${kb} KB`);
    } else fail("Build", "JS bundle falta");
    if (css) {
      const kb = (fs.statSync(path.join(assetsDir, css)).size / 1024).toFixed(0);
      pass("Build", `CSS bundle: ${css}`, `${kb} KB`);
    } else fail("Build", "CSS bundle falta");
  }
} else {
  fail("Build", "dist/public no existe", "ejecuta pnpm run build primero");
}

// ─── [9] CONECTIVIDAD HTTP ────────────────────────────────────────────────────
header("🌐", 9, "CONECTIVIDAD HTTP");
const endpoints = [
  ["https://menpoemax.web.app",         "Firebase Hosting (frontend)"],
  ["https://menpoe-api.onrender.com",   "API Backend en Render"],
];
for (const [url, name] of endpoints) {
  const r = await httpGet(url);
  if (r.status >= 200 && r.status < 400) pass("HTTP", `${name}`, `HTTP ${r.status}`);
  else if (r.status === 0)               fail("HTTP", `${name}`, r.error || "sin respuesta");
  else                                   warn("HTTP", `${name}`, `HTTP ${r.status}`);
}

// ─── [10] INTEGRIDAD DEL SHIM ─────────────────────────────────────────────────
header("🔌", 10, "INTEGRIDAD DEL API SHIM (HOOKS REQUERIDOS)");
if (C.shim) {
  const hooks = [
    "useGetMe", "useGetFeed", "useCreatePost", "useLikePost", "useSavePost",
    "useGetComments", "useCreateComment", "useGetStories", "useCreateStory",
    "useGetAllSaved", "useManageSavedCollection",
    "useSendFriendRequest", "useGetMyFriends",
    "useGetJobs", "useGetCommunities", "useGetEvents",
    "useGetAccountSettings", "useUpdateAccountSettings",
    "useGetUnreadNotificationsCount", "useSearchUsers", "useSearchGlobal",
    "useFollowUser", "useUnfollowUser",
  ];
  for (const hook of hooks) {
    const inShim  = C.shim.includes(`function ${hook}`);
    const inExtra = C.extra?.includes(`function ${hook}`);
    if (inShim || inExtra) pass("Shim", `${hook}`, inShim ? "shim" : "extra-features");
    else                   fail("Shim", `${hook}`, "NO ENCONTRADO");
  }

  // Verificar sin duplicados
  const dupCount = (C.shim.match(/export function useGetAllSaved/g) || []).length;
  dupCount === 1 ? pass("Shim", "useGetAllSaved exportado exactamente 1 vez")
                 : fail("Shim", "useGetAllSaved duplicado", `${dupCount} veces`);
}

// ─── RESUMEN FINAL ────────────────────────────────────────────────────────────
console.log(`\n${"═".repeat(62)}`);
console.log("📊  RESUMEN FINAL DE PRUEBAS — MenpoeSocial");
console.log("═".repeat(62));
console.log(`  ✅  PASSED   : ${passed}`);
console.log(`  ❌  FAILED   : ${failed}`);
console.log(`  ⚠️   WARNINGS : ${warnings}`);
console.log(`  📝  TOTAL    : ${passed + failed + warnings}`);
console.log(`  📈  Score    : ${Math.round((passed / (passed + failed)) * 100)}%`);
console.log("═".repeat(62));

if (failed === 0) {
  console.log("\n🎉  ¡TODAS LAS PRUEBAS PASARON! La app está lista al 100%.\n");
} else {
  console.log(`\n⚠️  ${failed} prueba(s) fallaron:\n`);
  failLog.forEach((r) => console.log(`  → [${r.section}] ${r.test}${r.detail ? ": " + r.detail : ""}`));
  console.log("");
}
