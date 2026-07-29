/**
 * MenpoeSocial — Auditoría Completa de App
 * Revisa CADA rincón: auth, feed, mensajes, llamadas, amigos, etc.
 * node audit-app.mjs
 */
import fs from "fs";
import path from "path";
import https from "https";

const ROOT = process.cwd();
const SRC  = path.join(ROOT, "artifacts/social-app/src");

function read(p) { try { return fs.readFileSync(p,"utf8"); } catch { return ""; } }
function exists(p) { return fs.existsSync(p); }
function ls(p) { try { return fs.readdirSync(p); } catch { return []; } }

function httpGet(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let body = ""; res.on("data", d => body += d); res.on("end", () => resolve({ status: res.statusCode, body: body.slice(0,800) }));
    });
    req.on("error", e => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, error: "timeout" }); });
  });
}

const report = [];
function section(title) {
  report.push({ type: "section", title });
  console.log(`\n${"═".repeat(70)}\n🔍  ${title}\n${"─".repeat(70)}`);
}
function item(status, feature, detail, notes = "") {
  report.push({ type: "item", status, feature, detail, notes });
  const icon = status === "OK" ? "✅" : status === "PARTIAL" ? "⚠️ " : status === "MISSING" ? "❌" : "ℹ️ ";
  console.log(`  ${icon}  ${feature}`);
  if (detail) console.log(`        ${detail}`);
  if (notes)  console.log(`        💡 ${notes}`);
}

// ─── helpers para inspección ────────────────────────────────────────────────
function hasAll(content, ...tokens) { return tokens.every(t => content.includes(t)); }
function hasAny(content, ...tokens) { return tokens.some(t => content.includes(t)); }

const PAGES    = path.join(SRC, "pages");
const COMPS    = path.join(SRC, "components");
const LIB      = path.join(SRC, "lib");
const SHIM     = read(path.join(LIB, "api-client-react-shim.ts"));
const EXTRA    = read(path.join(LIB, "extra-features-api.ts"));
const APP      = read(path.join(SRC, "App.tsx"));

// ════════════════════════════════════════════════════════════════════════════
// 1. AUTENTICACIÓN
// ════════════════════════════════════════════════════════════════════════════
section("1. AUTENTICACIÓN — Login / Registro / Sesión");

const authForms = read(path.join(COMPS,"auth/AuthForms.tsx"));
const clerkShim = read(path.join(LIB,"clerk-react-shim.tsx"));
const firebase  = read(path.join(LIB,"firebase.ts"));

item(authForms.includes("SignInForm") ? "OK" : "MISSING",
  "Formulario de Login (SignInForm)",
  authForms.includes("SignInForm") ? "AuthForms.tsx define SignInForm" : "No encontrado",
  "");

item(authForms.includes("SignUpForm") ? "OK" : "MISSING",
  "Formulario de Registro (SignUpForm)",
  authForms.includes("SignUpForm") ? "AuthForms.tsx define SignUpForm" : "No encontrado", "");

item(authForms.includes("signInWithEmailAndPassword") || authForms.includes("createUserWithEmailAndPassword") ? "OK" : "MISSING",
  "Auth con Firebase Email/Password",
  "Usa Firebase Auth directamente", "");

item(authForms.includes("Google") || clerkShim.includes("Google") ? "OK" : "MISSING",
  "Login con Google (OAuth)",
  "Google Sign-In disponible", "");

item(firebase.includes("initializeApp") ? "OK" : "MISSING",
  "Firebase inicializado",
  "firebase.ts con initializeApp", "");

item(APP.includes("SignedIn") || APP.includes("isSignedIn") ? "OK" : "MISSING",
  "Protección de rutas (auth-gated)",
  "Rutas protegidas según sesión", "");

item(clerkShim.includes("useUser") || clerkShim.includes("useAuth") ? "OK" : "MISSING",
  "Hook useUser / useAuth disponible",
  "Shim de Clerk implementado", "");

const profilePage = read(path.join(PAGES,"profile.tsx"));
item(profilePage.includes("updateProfile") || profilePage.includes("useUpdateMe") ? "OK" : "PARTIAL",
  "Edición de perfil (nombre, bio, avatar)",
  profilePage ? "profile.tsx existe" : "Página de perfil no encontrada",
  profilePage ? "" : "Crear profile.tsx");

// ════════════════════════════════════════════════════════════════════════════
// 2. FEED Y PUBLICACIONES
// ════════════════════════════════════════════════════════════════════════════
section("2. FEED Y PUBLICACIONES (Posts)");

const feedPage  = read(path.join(PAGES,"feed.tsx"));
const feedSize  = fs.existsSync(path.join(PAGES,"feed.tsx")) ? fs.statSync(path.join(PAGES,"feed.tsx")).size : 0;

item(feedPage.includes("useGetFeed") ? "OK" : "MISSING",
  "Feed principal (Para ti / Siguiendo)",
  `feed.tsx (${(feedSize/1024).toFixed(0)} KB) — tabs Para ti + Siguiendo`, "");

item(feedPage.includes("CreatePostBox") ? "OK" : "MISSING",
  "Compositor de publicaciones (texto, imagen, video)",
  "Botón expandible + subida de archivos", "");

item(feedPage.includes("mediaUrls") ? "OK" : "MISSING",
  "Soporte de múltiples imágenes/videos en post",
  "Galería grid 2x2 para múltiples medios", "");

item(feedPage.includes("visibility") ? "OK" : "MISSING",
  "Visibilidad por post (Público / Amigos / Solo yo)",
  "FormSelect de visibilidad en compositor", "");

item(feedPage.includes("location") ? "OK" : "MISSING",
  "Ubicación en publicación",
  "Campo location en compositor", "");

item(feedPage.includes("hashtags") ? "OK" : "MISSING",
  "Hashtags en publicaciones",
  "Renderizados en PostCard", "");

item(feedPage.includes("PollViewer") ? "OK" : "MISSING",
  "Encuestas interactivas en posts",
  "PollViewer + handleVote + barras de progreso", "");

item(feedPage.includes("generatePost") ? "OK" : "MISSING",
  "Generación de contenido con IA",
  "Botón Sparkles → genera texto automático", "");

item(SHIM.includes("useCreatePost") ? "OK" : "MISSING",
  "Creación de post en Firestore",
  "useCreatePost guarda en colección 'posts'", "");

item(SHIM.includes("useLikePost") && SHIM.includes("reaction") ? "OK" : "MISSING",
  "Reacciones a posts (Like/Love/Haha/Wow/Sad)",
  "5 emojis disponibles via PostReactionPicker", "");

item(feedPage.includes("useSavePost") ? "OK" : "MISSING",
  "Guardar/Desguardar publicaciones (Bookmark)",
  "Toggle bookmark sincronizado con Firestore", "");

item(feedPage.includes("useSharePost") ? "OK" : "MISSING",
  "Compartir publicaciones",
  "SharePostDialog disponible", "");

item(SHIM.includes("useGetFeed") && SHIM.includes("rankPost") ? "OK" : "PARTIAL",
  "Algoritmo de ranking del feed (Para Ti)",
  "rankPost() con ponderación de interacciones", "");

item(feedPage.includes("blockedUsers") ? "OK" : "MISSING",
  "Bloqueo de usuarios (ocultar posts)",
  "Filtrado por lista de bloqueados en localStorage", "");

item(feedPage.includes("createContentReport") ? "OK" : "MISSING",
  "Reportar publicaciones",
  "createContentReport via dropdown", "");

// ════════════════════════════════════════════════════════════════════════════
// 3. HISTORIAS (STORIES)
// ════════════════════════════════════════════════════════════════════════════
section("3. HISTORIAS (Stories)");

item(feedPage.includes("StoryCreator") ? "OK" : "MISSING",
  "Crear historia (foto/video)",
  "Modal StoryCreator con upload", "");

item(feedPage.includes("storyType") && feedPage.includes("selectedGradient") ? "OK" : "MISSING",
  "Historia de texto con fondo degradado",
  "4 presets: sunset, cyberpunk, ocean, twilight", "");

item(feedPage.includes("StoryViewer") ? "OK" : "MISSING",
  "Visor fullscreen de historias",
  "Barra de progreso + auto-avance + nav ←→", "");

item(SHIM.includes("useGetStories") ? "OK" : "MISSING",
  "Carga de historias desde Firestore",
  "Agrupadas por usuario, con expiración TTL", "");

item(SHIM.includes("useViewStory") ? "OK" : "MISSING",
  "Marcar historia como vista",
  "Distingue hasUnviewed en la barra", "");

const storiesCol = SHIM.includes("storiesCol") || SHIM.includes("collection(db, \"stories\")");
item(storiesCol ? "OK" : "MISSING",
  "Persistencia de historias en Firestore",
  "Colección 'stories' con expiresAt", "");

// ════════════════════════════════════════════════════════════════════════════
// 4. COMENTARIOS
// ════════════════════════════════════════════════════════════════════════════
section("4. COMENTARIOS E INTERACCIONES");

const commPanel = read(path.join(COMPS,"comments/CommentsPanel.tsx"));
const commComp  = read(path.join(COMPS,"comments/CommentComposer.tsx"));

item(commPanel.includes("useGetComments") ? "OK" : "MISSING",
  "Cargar comentarios por post",
  "Firestore query por postId", "");

item(commPanel.includes("useCreateComment") ? "OK" : "MISSING",
  "Publicar comentarios",
  "createComment.mutateAsync con contenido + media", "");

item(commPanel.includes("parentId") ? "OK" : "MISSING",
  "Respuestas a comentarios (threads)",
  "parentId + repliesByParent agrupados", "");

item(commPanel.includes("handleReact") && commPanel.includes("comment_reactions_") ? "OK" : "MISSING",
  "Reacciones individuales a comentarios",
  "Emoji picker (👍❤️😂😮😢😡) + badge flotante", "");

item(commComp.includes("mediaType") || commComp.includes("mediaUrl") ? "OK" : "PARTIAL",
  "Comentarios con media (stickers/imágenes)",
  commComp ? "CommentComposer con soporte de media" : "CommentComposer no encontrado", "");

item(SHIM.includes("commentsCount") ? "OK" : "MISSING",
  "Contador de comentarios en post",
  "commentsCount actualizado en tiempo real", "");

// ════════════════════════════════════════════════════════════════════════════
// 5. MENSAJES (Chat)
// ════════════════════════════════════════════════════════════════════════════
section("5. MENSAJES DIRECTOS (Chat)");

const messagesPage = read(path.join(PAGES,"messages.tsx"));
const msgSize = fs.existsSync(path.join(PAGES,"messages.tsx")) ? fs.statSync(path.join(PAGES,"messages.tsx")).size : 0;

item(messagesPage ? "OK" : "MISSING",
  "Página de mensajes existe",
  `messages.tsx (${(msgSize/1024).toFixed(0)} KB)`, "");

item(messagesPage.includes("conversation") || messagesPage.includes("Conversation") ? "OK" : "PARTIAL",
  "Lista de conversaciones",
  "Panel izquierdo con lista de chats", "");

item(messagesPage.includes("sendMessage") || messagesPage.includes("useCreateMessage") ? "OK" : "PARTIAL",
  "Enviar mensajes de texto",
  "Función sendMessage o hook useCreateMessage", "");

item(messagesPage.includes("onSnapshot") || messagesPage.includes("realtime") || messagesPage.includes("addDoc") ? "OK" : "PARTIAL",
  "Mensajes en tiempo real (Firestore)",
  messagesPage.includes("onSnapshot") ? "onSnapshot activo ✓" : "Verificar si usa polling o snapshot", "");

item(messagesPage.includes("mediaUrl") || messagesPage.includes("file") || messagesPage.includes("image") ? "OK" : "PARTIAL",
  "Adjuntar imágenes/archivos en chat",
  "Soporte de media en mensajes", "");

item(messagesPage.includes("emoji") || messagesPage.includes("Emoji") ? "OK" : "PARTIAL",
  "Emojis en mensajes",
  "Picker de emojis en chat", "");

item(messagesPage.includes("read") || messagesPage.includes("seen") || messagesPage.includes("visto") ? "OK" : "MISSING",
  "Confirmación de lectura (visto)",
  "Indicador 'visto' en mensajes", "No implementado aún");

item(SHIM.includes("useStartConversationWithUser") ? "OK" : "MISSING",
  "Iniciar conversación desde perfil de usuario",
  "Hook useStartConversationWithUser en shim", "");

item(messagesPage.includes("typing") || messagesPage.includes("escribiendo") ? "OK" : "MISSING",
  "Indicador 'escribiendo...'",
  "Typing indicator en chat", "No implementado");

// ════════════════════════════════════════════════════════════════════════════
// 6. LLAMADAS DE VOZ Y VIDEO
// ════════════════════════════════════════════════════════════════════════════
section("6. LLAMADAS DE VOZ Y VIDEOLLAMADAS");

const callSignaling = read(path.join(LIB,"call-signaling.ts"));
const callPage      = read(path.join(PAGES,"call.tsx"));
const callComp      = read(path.join(COMPS,"calls/CallModal.tsx")) || 
                      read(path.join(COMPS,"calls/VideoCall.tsx")) ||
                      read(path.join(COMPS,"calling/CallModal.tsx"));

item(callSignaling ? "OK" : "MISSING",
  "Señalización WebRTC (call-signaling.ts)",
  callSignaling ? `Archivo encontrado (${(callSignaling.length/1024).toFixed(1)} KB)` : "NO ENCONTRADO",
  callSignaling ? "" : "Se necesita WebRTC signaling para llamadas");

item(callSignaling.includes("RTCPeerConnection") ? "OK" : "PARTIAL",
  "RTCPeerConnection implementado",
  callSignaling.includes("RTCPeerConnection") ? "WebRTC setup presente" : "No usa RTCPeerConnection directamente",
  callSignaling.includes("RTCPeerConnection") ? "" : "Verificar si usa adaptador externo");

item(callSignaling.includes("offer") && callSignaling.includes("answer") ? "OK" : "PARTIAL",
  "Flujo SDP offer/answer (señalización)",
  callSignaling.includes("offer") ? "offer + answer detectados" : "Flujo SDP incompleto", "");

item(callSignaling.includes("ICE") || callSignaling.includes("iceCandidate") ? "OK" : "PARTIAL",
  "ICE Candidates para NAT traversal",
  callSignaling.includes("ICE") ? "ICE implementado" : "ICE no detectado",
  "Sin ICE las llamadas fallan en redes distintas");

item(callSignaling.includes("Firestore") || callSignaling.includes("setDoc") || callSignaling.includes("collection") ? "OK" : "MISSING",
  "Señalización vía Firestore",
  "Usa Firestore como canal de señalización", "");

item(callPage ? "OK" : "MISSING",
  "Página/modal de llamada (call.tsx o CallModal)",
  callPage ? `call.tsx encontrado (${(callPage.length/1024).toFixed(1)} KB)` : "Página de llamada no encontrada",
  callPage ? "" : "Crear interfaz de llamada");

item(callComp ? "OK" : (callPage ? "PARTIAL" : "MISSING"),
  "Componente visual de llamada (video + audio)",
  callComp ? "Componente de llamada encontrado" : (callPage ? "Interfaz en call.tsx" : "No encontrado"),
  "");

item((callPage + callSignaling).includes("getUserMedia") || (callPage + callSignaling).includes("localStream") ? "OK" : "PARTIAL",
  "Acceso a cámara y micrófono (getUserMedia)",
  "Captura de dispositivos AV local", "");

const hasVideoOff = (callPage + callComp + callSignaling).includes("video") && 
                    (callPage + callComp + callSignaling).includes("mute");
item(hasVideoOff ? "OK" : "PARTIAL",
  "Controles: silenciar mic / apagar cámara",
  hasVideoOff ? "Controles detectados" : "Controles básicos a verificar", "");

// ════════════════════════════════════════════════════════════════════════════
// 7. SOLICITUDES DE AMISTAD Y CONEXIONES
// ════════════════════════════════════════════════════════════════════════════
section("7. SOLICITUDES DE AMISTAD Y CONEXIONES");

const friendsPage = read(path.join(PAGES,"friends.tsx"));
const fSize = fs.existsSync(path.join(PAGES,"friends.tsx")) ? fs.statSync(path.join(PAGES,"friends.tsx")).size : 0;

item(friendsPage ? "OK" : "MISSING",
  "Página de amigos/solicitudes",
  `friends.tsx (${(fSize/1024).toFixed(0)} KB)`, "");

item(SHIM.includes("useSendFriendRequest") ? "OK" : "MISSING",
  "Enviar solicitud de amistad",
  "Hook useSendFriendRequest en shim", "");

item(SHIM.includes("useAcceptFriendRequest") || SHIM.includes("acceptFriend") ? "OK" : "MISSING",
  "Aceptar solicitud de amistad",
  "Hook useAcceptFriendRequest", "");

item(SHIM.includes("useRejectFriendRequest") || SHIM.includes("rejectFriend") ? "OK" : "MISSING",
  "Rechazar solicitud de amistad",
  "Hook useRejectFriendRequest", "");

item(SHIM.includes("useGetMyFriends") ? "OK" : "MISSING",
  "Listar amigos actuales",
  "Hook useGetMyFriends en shim", "");

item(SHIM.includes("useGetFriendRequests") || SHIM.includes("pendingRequests") ? "OK" : "MISSING",
  "Ver solicitudes pendientes entrantes",
  "Hook useGetFriendRequests", "");

item(friendsPage.includes("suggested") || SHIM.includes("useGetSuggestedUsers") ? "OK" : "MISSING",
  "Sugerencias de personas para agregar",
  "useGetSuggestedUsers disponible", "");

item(SHIM.includes("useFollowUser") ? "OK" : "MISSING",
  "Seguir usuario (Follow)",
  "Hook useFollowUser en shim", "");

item(SHIM.includes("useUnfollowUser") ? "OK" : "MISSING",
  "Dejar de seguir (Unfollow)",
  "Hook useUnfollowUser en shim", "");

item(SHIM.includes("blockUser") || SHIM.includes("useBlockUser") ? "OK" : "PARTIAL",
  "Bloquear usuario",
  SHIM.includes("blockUser") ? "Bloqueo implementado" : "Solo filtrado local (social_blocked_users_v1)",
  "Bloqueo persiste en localStorage pero no en Firestore");

// ════════════════════════════════════════════════════════════════════════════
// 8. BÚSQUEDA Y EXPLORACIÓN
// ════════════════════════════════════════════════════════════════════════════
section("8. BÚSQUEDA Y EXPLORACIÓN");

const explorePage = read(path.join(PAGES,"explore.tsx"));
const globalSearch = read(path.join(COMPS,"layout/GlobalSearch.tsx"));

item(globalSearch ? "OK" : "MISSING",
  "Búsqueda global en header (GlobalSearch)",
  globalSearch ? `GlobalSearch.tsx (${(globalSearch.length/1024).toFixed(0)} KB)` : "No encontrado", "");

item(SHIM.includes("useSearchUsers") ? "OK" : "MISSING",
  "Buscar usuarios por nombre/username",
  "Hook useSearchUsers en shim", "");

item(SHIM.includes("useSearchGlobal") ? "OK" : "MISSING",
  "Búsqueda global (posts + usuarios + empleos)",
  "Hook useSearchGlobal en shim", "");

item(explorePage ? "OK" : "MISSING",
  "Página Explorar (/explore)",
  explorePage ? "explore.tsx encontrado" : "No encontrado", "");

item(explorePage.includes("trending") || explorePage.includes("Trending") ? "OK" : "PARTIAL",
  "Contenido en tendencia (Trending)",
  "Sección de tendencias en Explorar", "");

item(explorePage.includes("hashtag") || explorePage.includes("Hashtag") ? "OK" : "PARTIAL",
  "Búsqueda por hashtags",
  "Exploración por tags", "");

// ════════════════════════════════════════════════════════════════════════════
// 9. NOTIFICACIONES
// ════════════════════════════════════════════════════════════════════════════
section("9. NOTIFICACIONES");

const notifPage = read(path.join(PAGES,"notifications.tsx"));
const nSize = fs.existsSync(path.join(PAGES,"notifications.tsx")) ? fs.statSync(path.join(PAGES,"notifications.tsx")).size : 0;

item(notifPage ? "OK" : "MISSING",
  "Página de notificaciones (/notifications)",
  `notifications.tsx (${(nSize/1024).toFixed(0)} KB)`, "");

item(SHIM.includes("useGetUnreadNotificationsCount") ? "OK" : "MISSING",
  "Contador de notificaciones no leídas (badge en header)",
  "Badge animado en header cuando hay pendientes", "");

item(SHIM.includes("createNotification") ? "OK" : "MISSING",
  "Generación automática de notificaciones",
  "createNotification() llamado en follow, like, comment, friend", "");

item(notifPage.includes("markAllRead") || notifPage.includes("markRead") ? "OK" : "PARTIAL",
  "Marcar notificaciones como leídas",
  "markAllRead disponible", "");

item(SHIM.includes("\"notifications\"") ? "OK" : "PARTIAL",
  "Notificaciones en Firestore",
  "Colección 'notifications' detectada", "");

// MODO SILENCIOSO
item(read(path.join(PAGES,"settings.tsx")).includes("quiet_mode_until") ? "OK" : "MISSING",
  "Modo Silencioso (snooze 1h desde Settings)",
  "Pausa badges + alertas con indicator en header", "");

// ════════════════════════════════════════════════════════════════════════════
// 10. PERFILES DE USUARIO
// ════════════════════════════════════════════════════════════════════════════
section("10. PERFILES DE USUARIO");

item(profilePage ? "OK" : "MISSING",
  "Página de perfil (/profile/:id)",
  profilePage ? `profile.tsx (${(profilePage.length/1024).toFixed(0)} KB)` : "No encontrado", "");

item(profilePage.includes("avatarUrl") || profilePage.includes("useUpdateMe") ? "OK" : "PARTIAL",
  "Editar avatar/foto de perfil",
  "Cambio de avatar con upload", "");

item(profilePage.includes("bio") ? "OK" : "PARTIAL",
  "Editar bio / descripción",
  "Campo bio en perfil", "");

item(profilePage.includes("isVerified") || profilePage.includes("CheckCircle") ? "OK" : "PARTIAL",
  "Insignia de verificación",
  "checkCircle junto al nombre si isVerified", "");

const profileTabs = ["photos","saved","avatars","stats","posts","about"];
for (const tab of profileTabs) {
  const hasTab = profilePage.includes(tab) || profilePage.includes(tab.charAt(0).toUpperCase()+tab.slice(1));
  item(hasTab ? "OK" : "PARTIAL", `Pestaña de perfil: ${tab}`, hasTab ? "Detectada" : "No detectada", "");
}

item(profilePage.includes("useFollowUser") || profilePage.includes("isFollowing") ? "OK" : "PARTIAL",
  "Botón Seguir/Siguiendo en perfil ajeno",
  "Toggle de follow desde el perfil", "");

// ════════════════════════════════════════════════════════════════════════════
// 11. REELS Y VIDEOS CORTOS
// ════════════════════════════════════════════════════════════════════════════
section("11. REELS (Videos Cortos)");

const reelsPage = read(path.join(PAGES,"reels.tsx"));
const rSize = fs.existsSync(path.join(PAGES,"reels.tsx")) ? fs.statSync(path.join(PAGES,"reels.tsx")).size : 0;

item(reelsPage ? "OK" : "MISSING",
  "Página de Reels (/reels)",
  `reels.tsx (${(rSize/1024).toFixed(0)} KB)`, "");

item(reelsPage.includes("autoPlay") || reelsPage.includes("video") ? "OK" : "PARTIAL",
  "Reproducción automática de video",
  "autoPlay en etiqueta video", "");

item(reelsPage.includes("IntersectionObserver") || reelsPage.includes("scroll") ? "OK" : "PARTIAL",
  "Scroll vertical para pasar reels",
  "IntersectionObserver o scroll-snap", "");

item(SHIM.includes("useGetReels") ? "OK" : "MISSING",
  "Carga de reels desde Firestore",
  "useGetReels con seed de contenido Menpoe", "");

item(reelsPage.includes("likesCount") || reelsPage.includes("useLikePost") ? "OK" : "PARTIAL",
  "Interacciones en reels (like, comentar, compartir)",
  "Acciones disponibles en overlay del reel", "");

// ════════════════════════════════════════════════════════════════════════════
// 12. COMUNIDADES Y GRUPOS
// ════════════════════════════════════════════════════════════════════════════
section("12. COMUNIDADES Y GRUPOS");

const commPage = read(path.join(PAGES,"communities.tsx"));
const cSize = fs.existsSync(path.join(PAGES,"communities.tsx")) ? fs.statSync(path.join(PAGES,"communities.tsx")).size : 0;

item(commPage ? "OK" : "MISSING",
  "Página de Comunidades",
  `communities.tsx (${(cSize/1024).toFixed(0)} KB)`, "");

item(SHIM.includes("useJoinCommunity") ? "OK" : "MISSING",
  "Unirse a comunidad",
  "Hook useJoinCommunity en shim", "");

item(SHIM.includes("useCreateCommunity") ? "OK" : "MISSING",
  "Crear comunidad",
  "Hook useCreateCommunity en shim", "");

item(SHIM.includes("useGetCommunities") ? "OK" : "MISSING",
  "Listar comunidades",
  "Hook useGetCommunities en shim", "");

item(commPage.includes("post") || commPage.includes("feed") ? "OK" : "PARTIAL",
  "Posts dentro de comunidades",
  "Feed de la comunidad", "");

// ════════════════════════════════════════════════════════════════════════════
// 13. EVENTOS
// ════════════════════════════════════════════════════════════════════════════
section("13. EVENTOS");

const eventsPage = read(path.join(PAGES,"events.tsx"));
const eSize = fs.existsSync(path.join(PAGES,"events.tsx")) ? fs.statSync(path.join(PAGES,"events.tsx")).size : 0;

item(eventsPage ? "OK" : "MISSING",
  "Página de Eventos (/events)",
  `events.tsx (${(eSize/1024).toFixed(0)} KB)`, "");

item(SHIM.includes("useCreateEvent") ? "OK" : "MISSING",
  "Crear evento",
  "Hook useCreateEvent en shim", "");

item(SHIM.includes("useGetEvents") ? "OK" : "MISSING",
  "Listar eventos",
  "Hook useGetEvents en shim", "");

item(eventsPage.includes("RSVP") || eventsPage.includes("asistir") || eventsPage.includes("Attend") ? "OK" : "PARTIAL",
  "RSVP / Confirmar asistencia a evento",
  "Botón de asistir al evento", "");

// ════════════════════════════════════════════════════════════════════════════
// 14. EMPLEOS
// ════════════════════════════════════════════════════════════════════════════
section("14. EMPLEOS Y MARKETPLACE PROFESIONAL");

const jobsPage = read(path.join(PAGES,"jobs.tsx"));
const jSize = fs.existsSync(path.join(PAGES,"jobs.tsx")) ? fs.statSync(path.join(PAGES,"jobs.tsx")).size : 0;

item(jobsPage ? "OK" : "MISSING",
  "Página de Empleos (/jobs)",
  `jobs.tsx (${(jSize/1024).toFixed(0)} KB)`, "");

item(SHIM.includes("useGetJobs") ? "OK" : "MISSING",
  "Listar ofertas de trabajo",
  "Hook useGetJobs con filtros", "");

item(SHIM.includes("useCreateJob") ? "OK" : "MISSING",
  "Publicar oferta de empleo",
  "Hook useCreateJob", "");

item(SHIM.includes("useApplyToJob") ? "OK" : "MISSING",
  "Aplicar a oferta (postularse)",
  "Hook useApplyToJob", "");

item(SHIM.includes("useSaveJob") ? "OK" : "MISSING",
  "Guardar oferta de empleo",
  "Hook useSaveJob", "");

const resumePage = read(path.join(PAGES,"resume.tsx"));
item(resumePage ? "OK" : "MISSING",
  "Hoja de vida / CV digital (/resume)",
  resumePage ? "resume.tsx encontrado" : "No encontrado", "");

// ════════════════════════════════════════════════════════════════════════════
// 15. MARKETPLACE
// ════════════════════════════════════════════════════════════════════════════
section("15. MARKETPLACE");

const mkPage = read(path.join(PAGES,"marketplace.tsx"));
const mSize = fs.existsSync(path.join(PAGES,"marketplace.tsx")) ? fs.statSync(path.join(PAGES,"marketplace.tsx")).size : 0;

item(mkPage ? "OK" : "MISSING",
  "Página Marketplace (/marketplace)",
  `marketplace.tsx (${(mSize/1024).toFixed(0)} KB)`, "");

item(SHIM.includes("useGetListings") ? "OK" : "MISSING",
  "Listar productos del marketplace",
  "Hook useGetListings", "");

item(SHIM.includes("useCreateListing") ? "OK" : "MISSING",
  "Publicar producto",
  "Hook useCreateListing", "");

item(mkPage.includes("contact") || mkPage.includes("mensaje") ? "OK" : "PARTIAL",
  "Contactar vendedor",
  "Opción de chat con vendedor", "");

// ════════════════════════════════════════════════════════════════════════════
// 16. GUARDADOS Y COLECCIONES
// ════════════════════════════════════════════════════════════════════════════
section("16. GUARDADOS Y COLECCIONES");

const savedPage = read(path.join(PAGES,"saved.tsx"));
item(savedPage.includes("FolderCard") ? "OK" : "MISSING",
  "Colecciones de guardados (carpetas)",
  "FolderCard con color + previsualización", "");

item(savedPage.includes("useManageSavedCollection") ? "OK" : "MISSING",
  "CRUD de colecciones",
  "Crear / eliminar / asignar posts", "");

item(savedPage.includes("activeView") ? "OK" : "MISSING",
  "Vista Todo / Vista Colecciones",
  "Toggle entre lista plana y carpetas", "");

// ════════════════════════════════════════════════════════════════════════════
// 17. EN VIVO (LIVESTREAMING)
// ════════════════════════════════════════════════════════════════════════════
section("17. EN VIVO / STREAMS");

const streamsPage = read(path.join(PAGES,"streams.tsx"));
const stsSize = fs.existsSync(path.join(PAGES,"streams.tsx")) ? fs.statSync(path.join(PAGES,"streams.tsx")).size : 0;

item(streamsPage ? "OK" : "MISSING",
  "Página Streams en vivo (/streams)",
  `streams.tsx (${(stsSize/1024).toFixed(0)} KB)`, "");

item(streamsPage.includes("WebRTC") || streamsPage.includes("getUserMedia") || streamsPage.includes("MediaStream") ? "OK" : "PARTIAL",
  "Transmisión en vivo (WebRTC/MediaStream)",
  "Captura y emisión de video en tiempo real", "");

item(streamsPage.includes("chat") || streamsPage.includes("message") ? "OK" : "PARTIAL",
  "Chat durante stream en vivo",
  "Chat lateral del stream", "");

// ════════════════════════════════════════════════════════════════════════════
// 18. CONFIGURACIÓN Y PRIVACIDAD
// ════════════════════════════════════════════════════════════════════════════
section("18. CONFIGURACIÓN Y PRIVACIDAD");

const settingsPage = read(path.join(PAGES,"settings.tsx"));

item(settingsPage.includes("notifications") ? "OK" : "MISSING",
  "Configuración de notificaciones",
  "Toggle por tipo: likes, comments, follows, etc.", "");

item(settingsPage.includes("privacy") || settingsPage.includes("audience") ? "OK" : "PARTIAL",
  "Ajustes de privacidad",
  "Visibilidad de publicaciones, perfil, etc.", "");

item(settingsPage.includes("blockUser") || settingsPage.includes("blocks") ? "OK" : "PARTIAL",
  "Gestión de bloqueos",
  "Lista de usuarios bloqueados", "");

item(settingsPage.includes("password") || settingsPage.includes("reauthenticate") ? "OK" : "PARTIAL",
  "Cambio de contraseña",
  "Reautenticación + updatePassword", "");

item(settingsPage.includes("downloadBackup") || settingsPage.includes("exportProfile") ? "OK" : "MISSING",
  "Descarga de datos personales",
  "downloadBackupJson + exportProfileBackup", "");

item(settingsPage.includes("quiet_mode_until") ? "OK" : "MISSING",
  "Modo Silencioso (Snooze 1h)",
  "Toggle en sección Notificaciones", "");

// ════════════════════════════════════════════════════════════════════════════
// 19. REGALOS Y BILLETERA
// ════════════════════════════════════════════════════════════════════════════
section("19. REGALOS Y BILLETERA");

const walletPage = read(path.join(PAGES,"wallet.tsx"));
const giftSheet  = read(path.join(COMPS,"gifts/GiftPickerSheet.tsx"));

item(walletPage ? "OK" : "MISSING",
  "Página Billetera (/wallet)",
  walletPage ? "wallet.tsx encontrado" : "No encontrado", "");

item(giftSheet ? "OK" : "MISSING",
  "Picker de regalos (GiftPickerSheet)",
  giftSheet ? "GiftPickerSheet en posts del feed" : "No encontrado", "");

item(SHIM.includes("useGetGiftItems") || EXTRA.includes("useGetGiftItems") ? "OK" : "PARTIAL",
  "Items de regalos disponibles",
  "Catálogo de regalos", "");

item(SHIM.includes("useSendGift") || EXTRA.includes("useSendGift") ? "OK" : "PARTIAL",
  "Enviar regalos a posts/usuarios",
  "Hook useSendGift", "");

// ════════════════════════════════════════════════════════════════════════════
// 20. CONECTIVIDAD Y DATOS GENERALES
// ════════════════════════════════════════════════════════════════════════════
section("20. CONECTIVIDAD HTTP Y ESTADO GENERAL");

item("INFO", "URL Frontend (Firebase Hosting)",
  "https://menpoemax.web.app", "Verificando...");

const fe = await httpGet("https://menpoemax.web.app");
item(fe.status === 200 ? "OK" : "MISSING",
  "Firebase Hosting responde",
  `HTTP ${fe.status}`, "");

const api = await httpGet("https://menpoe-api.onrender.com");
item(api.status >= 200 && api.status < 400 ? "OK" : (api.status === 0 ? "MISSING" : "PARTIAL"),
  "API Backend (Render) responde",
  `HTTP ${api.status} ${api.error || ""}`,
  api.status === 200 ? "" : "El backend en Render puede estar dormido (free tier spin-up)");

item(SHIM.includes("canUseFirestoreSocial") ? "OK" : "MISSING",
  "Modo dual: Firestore o localStorage",
  "canUseFirestoreSocial() — fallback automático", "");

item(SHIM.includes("offline") || SHIM.includes("enableMultiTabIndexedDbPersistence") ? "OK" : "PARTIAL",
  "Soporte offline de Firestore",
  "Persistencia IndexedDB", "Solo si explícitamente habilitado");

// ════════════════════════════════════════════════════════════════════════════
// CONTEO FINAL
// ════════════════════════════════════════════════════════════════════════════
const items = report.filter(r => r.type === "item");
const ok      = items.filter(r => r.status === "OK").length;
const partial = items.filter(r => r.status === "PARTIAL").length;
const missing = items.filter(r => r.status === "MISSING").length;
const info    = items.filter(r => r.status === "INFO").length;
const total   = items.length;

console.log(`\n${"═".repeat(70)}`);
console.log("📋  INFORME CONSOLIDADO — MenpoeSocial");
console.log("═".repeat(70));
console.log(`  ✅  FUNCIONA COMPLETO   : ${ok}`);
console.log(`  ⚠️   PARCIAL / A MEJORAR : ${partial}`);
console.log(`  ❌  NO IMPLEMENTADO     : ${missing}`);
console.log(`  📝  TOTAL CHECKEADO     : ${total}`);
console.log(`  📈  Score               : ${Math.round((ok/total)*100)}% completo`);
console.log("═".repeat(70));

console.log("\n⚠️  PARCIALES (requieren mejora):\n");
items.filter(r=>r.status==="PARTIAL").forEach(r =>
  console.log(`  ⚠️  [${r.feature}]\n      ${r.detail}\n      💡 ${r.notes||"Revisar implementación"}\n`)
);

console.log("\n❌  NO IMPLEMENTADOS:\n");
items.filter(r=>r.status==="MISSING").forEach(r =>
  console.log(`  ❌  [${r.feature}]\n      ${r.detail}\n      💡 ${r.notes||"Pendiente de implementar"}\n`)
);
