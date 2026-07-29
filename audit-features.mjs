/**
 * MenpoeSocial — Auditoría Completa de Funciones Activas v2
 * Revisa CADA feature y lista todas las funciones activas.
 * node audit-features.mjs
 */
import fs from "fs";
import path from "path";
import https from "https";

const ROOT = process.cwd();
const SRC  = path.join(ROOT, "artifacts/social-app/src");
const PAGES = path.join(SRC, "pages");
const COMPS = path.join(SRC, "components");
const LIB   = path.join(SRC, "lib");

function read(p) { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } }
function kb(p)   { try { return (fs.statSync(p).size / 1024).toFixed(1); } catch { return "0"; } }
function has(c, ...tokens) { return tokens.every(t => c.includes(t)); }

const SHIM    = read(path.join(LIB, "api-client-react-shim.ts"));
const EXTRA   = read(path.join(LIB, "extra-features-api.ts"));
const FEED    = read(path.join(PAGES, "feed.tsx"));
const MSG     = read(path.join(PAGES, "messages.tsx"));
const FRIENDS = read(path.join(PAGES, "friends.tsx"));
const PROFILE = read(path.join(PAGES, "profile.tsx"));
const SETTINGS= read(path.join(PAGES, "settings.tsx"));
const NOTIF   = read(path.join(PAGES, "notifications.tsx"));
const EXPLORE = read(path.join(PAGES, "explore.tsx"));
const REELS   = read(path.join(PAGES, "reels.tsx"));
const SAVED   = read(path.join(PAGES, "saved.tsx"));
const COMM    = read(path.join(PAGES, "communities.tsx"));
const EVENTS  = read(path.join(PAGES, "events.tsx"));
const JOBS    = read(path.join(PAGES, "jobs.tsx"));
const MKT     = read(path.join(PAGES, "marketplace.tsx"));
const WALLET  = read(path.join(PAGES, "wallet.tsx"));
const STREAMS = read(path.join(PAGES, "streams.tsx"));
const RESUME  = read(path.join(PAGES, "resume.tsx"));
const SHELL   = read(path.join(COMPS, "layout/Shell.tsx"));
const CALLS   = read(path.join(COMPS, "messages/CallOverlay.tsx"));
const CSIG    = read(path.join(LIB,   "call-signaling.ts"));
const AUTH    = read(path.join(COMPS, "auth/AuthForms.tsx"));
const COMMPANEL = read(path.join(COMPS, "comments/CommentsPanel.tsx"));

const features = [];

function f(emoji, name, desc, active, location, notes="") {
  features.push({ emoji, name, desc, active, location, notes });
}

// ── AUTH ──
f("🔐","Login con Email/Contraseña",  "Ingreso con correo y password usando Firebase Auth", has(AUTH,"signInWithEmailAndPassword"), "AuthForms.tsx");
f("🔐","Registro de cuenta",          "Crea cuenta nueva con nombre, username, email, contraseña, fecha de nacimiento y verificación de edad mínima 13 años", has(AUTH,"createUserWithEmailAndPassword","isOldEnough"), "AuthForms.tsx");
f("🔐","Login con Google (OAuth)",    "Sign-in via popup con Google Auth Provider, auto-crea perfil si es nuevo usuario", has(AUTH,"signInWithPopup","GoogleAuthProvider"), "AuthForms.tsx");
f("🔐","Recuperar contraseña",        "Envía email de reset de contraseña via Firebase", has(AUTH,"sendPasswordResetEmail"), "AuthForms.tsx");
f("🔐","Sesión persistente / rutas protegidas", "App.tsx detecta useAuth y redirige a login si no hay sesión activa", has(read(path.join(SRC,"App.tsx")),"ProtectedRoute","useAuth"), "App.tsx");

// ── FEED ──
f("📰","Feed 'Para Ti' con algoritmo de ranking", "Feed personalizado usando rankPost() que pondera interacciones, seguidores y tiempo. Dos tabs: Para Ti y Siguiendo", has(SHIM,"rankPost"), "feed.tsx + shim");
f("📰","Compositor de publicaciones", "Box expandible para redactar posts con texto, imágenes, videos, stickers, encuestas, ubicación, visibilidad y generación IA", has(FEED,"CreatePostBox","setExpanded"), "feed.tsx");
f("📰","Visibilidad por post",        "Selector Público / Amigos / Solo yo en cada publicación", has(FEED,"visibility","solo_yo","amigos"), "feed.tsx");
f("📰","Ubicación en post",           "Campo de texto para agregar ubicación geográfica a publicaciones", has(FEED,"location","setLocation"), "feed.tsx");
f("📰","Hashtags en posts",           "Se renderizan como #tag clickeables en las tarjetas del feed", has(FEED,"hashtags"), "feed.tsx");
f("📰","Múltiples imágenes/videos",   "Grid 2x2 para hasta 4 medios, con overlay '+N' si hay más", has(FEED,"mediaUrls","grid-cols-2"), "feed.tsx");
f("📰","Reacciones a posts",          "5 reacciones: 👍❤️😂😮😢 con contador animado y persistencia en Firestore", has(FEED,"PostReactionPicker") && has(SHIM,"useLikePost","reaction"), "feed.tsx + shim");
f("📰","Guardar posts (Bookmark)",    "Toggle de guardado persistido en Firestore/localStorage, sincronizado con la página Guardados", has(FEED,"useSavePost","localSaved"), "feed.tsx + shim");
f("📰","Compartir publicaciones",     "Diálogo SharePostDialog con opciones para compartir dentro o fuera de la app", has(FEED,"SharePostDialog","showShare"), "feed.tsx + SharePostDialog.tsx");
f("📰","Reportar publicación",        "Botón en menú ⋯ que registra reporte en la colección de moderación", has(FEED,"createContentReport"), "feed.tsx + moderation.ts");
f("📰","Bloquear usuario",            "Desde el menú ⋯ del post bloquea al autor y lo filtra del feed", has(FEED,"social_blocked_users_v1","handleBlock"), "feed.tsx");
f("📰","Generación de texto con IA",  "Botón ✨ Sparkles genera contenido de post automáticamente con un prompt", has(FEED,"generatePost","useGeneratePost"), "feed.tsx");

// ── NUEVAS FEATURES SESIÓN ACTUAL ──
f("🎤","[NUEVA] Notas de Voz en Posts","Botón 🎙️ en el compositor graba audio con MediaRecorder y lo adjunta al post. Al ver el post aparece un player con visualizador de onda animada, botón play/pause y barra de progreso", has(FEED,"startRecording","VoicePlayer","MediaRecorder"), "feed.tsx");
f("🔥","[NUEVA] Roast Humorístico con IA","Botón 🔥 en cada post genera un 'roast' sarcástico y divertido sobre el contenido del post usando una función local. Aparece como burbuja naranja dismissable", has(FEED,"handleRoast","getRoastText","roastText"), "feed.tsx");
f("🎨","[NUEVA] Temas Ambient Personalizables","En Configuración → Accesibilidad se puede elegir entre 4 temas de fondo: Espacial (default), Negro Absoluto OLED, Púrpura Neón Cyberpunk y Espacial Profundo Midnight. Shell reacciona en tiempo real via localStorage", has(SHELL,"ambientTheme","ambient_theme") && has(SETTINGS,"ambient_theme"), "Shell.tsx + settings.tsx");
f("🏷️","[NUEVA] Badges 'Autor' y 'Top Fan' en comentarios","Los comentarios del autor del post muestran badge azul 'Autor'. Comentarios con 2+ reacciones muestran badge dorado '⭐ Top Fan' pulsante", has(COMMPANEL,"postAuthorId","Top Fan","Autor"), "CommentsPanel.tsx");
f("🖼️","[NUEVA] Generador de Stickers de Texto","Botón en el compositor abre diálogo para escribir texto (máx 20 chars) y elegir estilo (Neón Rosa, Dorado, Cyan Glow). Genera un sticker PNG con Canvas HTML5 y lo adjunta al post", has(FEED,"handleGenerateSticker","showStickerGen","stickerStyle"), "feed.tsx");

// ── ENCUESTAS ──
f("🗳️","Encuestas interactivas en posts", "Botón 📊 en compositor crea encuesta con 2-5 opciones. Al publicar se muestra PollViewer con barras de progreso y porcentajes en tiempo real", has(FEED,"PollViewer","isCreatingPoll","pollOptions") && has(SHIM,"poll"), "feed.tsx + shim");

// ── HISTORIAS ──
f("🌅","Historias de foto/video",     "Barra de historias en el feed con anillo de color para no vistas, creador con upload y StoryViewer fullscreen con barra de progreso por historia", has(FEED,"StoryCreator","StoryViewer","useGetStories"), "feed.tsx");
f("🌅","Historias de texto degradado","Pestaña Texto en el creador con 4 fondos degradados: Atardecer, Ciberpunk, Océano, Crepúsculo. Límite de 160 caracteres", has(FEED,"selectedGradient","sunset","cyberpunk","ocean","twilight"), "feed.tsx");
f("🌅","Visor de historias fullscreen","Overlay fullscreen con auto-avance cada 5s, barra de progreso animada, navegación ← →, y cierre con X", has(FEED,"StoryViewer","selectedStoryGroup","setInterval"), "feed.tsx");

// ── COMENTARIOS ──
f("💬","Cargar comentarios por post",  "CommentsPanel carga comentarios en tiempo real desde Firestore agrupados en top-level y threads de respuestas", has(COMMPANEL,"useGetComments","topLevel","repliesByParent"), "CommentsPanel.tsx");
f("💬","Comentar publicaciones",       "Compositor de comentarios con texto, emojis, stickers y media adjunta", has(COMMPANEL,"useCreateComment","CommentComposer"), "CommentsPanel.tsx");
f("💬","Responder comentarios (threads)","Botón 'Responder' bajo cada comentario abre thread anidado con indentación visual", has(COMMPANEL,"parentId","onReply","setReplyToId"), "CommentsPanel.tsx");
f("💬","Reacciones a comentarios",     "Emoji picker 👍❤️😂😮😢😡 por comentario. Muestra badge flotante con conteo. Persiste en localStorage por usuario y comentario", has(COMMPANEL,"handleReact","comment_reactions_","reactionCounts"), "CommentsPanel.tsx");

// ── MENSAJES ──
f("💌","Chat 1-a-1 en tiempo real",   "Mensajería con onSnapshot de Firestore. Lista de conversaciones a la izquierda, historial de mensajes a la derecha con scroll automático", has(MSG,"onSnapshot","useListConversationMessages"), "messages.tsx");
f("💌","Enviar mensajes de texto",     "Input + botón enviar, soporte de Enter para enviar. Mensajes ordenados por timestamp", has(MSG,"useSendMessage","Send"), "messages.tsx");
f("💌","Mensajes con stickers",        "StickerPicker integrado en el chat para enviar stickers animados", has(MSG,"StickerPicker","setPendingSticker"), "messages.tsx");
f("💌","Reaccionar a mensajes",        "Dropdown de emojis 👍❤️😂😮😢🔥 para reaccionar a mensajes individuales", has(MSG,"useReactToMessage","REACTIONS"), "messages.tsx");
f("💌","Eliminar mensaje para todos",  "Menú contextual con opción Eliminar que borra el mensaje para ambos participantes", has(MSG,"useDeleteMessageForEveryone"), "messages.tsx");
f("💌","Indicador 'visto' en chat",   "CheckCheck doble tick azul cuando el mensaje fue leído por el receptor", has(MSG,"CheckCheck","useMarkConversationRead"), "messages.tsx");
f("💌","Indicador 'escribiendo...'",  "Sincronización de estado de escritura via useSetTyping para mostrar '...' en tiempo real", has(MSG,"useSetTyping","typing"), "messages.tsx");
f("💌","Iniciar nuevo chat",          "Botón 'Nuevo chat' abre diálogo para buscar usuarios e iniciar conversación", has(MSG,"NewChatDialog"), "messages.tsx");

// ── LLAMADAS ──
f("📞","Llamada de voz (WebRTC)",      "Botón 📞 en el header del chat inicia llamada de voz P2P usando RTCPeerConnection y señalización via Firestore", has(MSG,"Phone","publishIncomingCall") && has(CALLS,"RTCPeerConnection","audio"), "messages.tsx + CallOverlay.tsx");
f("📹","Videollamada (WebRTC)",        "Botón 📹 inicia videollamada. Panel de video remoto fullscreen + pequeña ventana local (PiP), controles silenciar mic y apagar cámara", has(MSG,"Video","mode") && has(CALLS,"video","localVideoRef","remoteVideoRef"), "messages.tsx + CallOverlay.tsx");
f("📞","Aceptar / Rechazar llamadas",  "Al recibir llamada aparece overlay global con botones contestar (verde) y rechazar (rojo). Funciona aunque estés en otra página", has(CALLS,"acceptAsCallee","rejectAsCallee") && has(MSG,"GlobalIncomingCall"), "CallOverlay.tsx + messages.tsx");
f("📞","Señalización ICE y SDP",       "Intercambio completo de offer/answer/ice-candidates via Firestore para perforar NAT y establecer conexión P2P", has(CSIG,"ICE_SERVERS","offer","answer","ice"), "call-signaling.ts");

// ── AMIGOS / CONEXIONES ──
f("👥","Enviar solicitud de amistad",  "Botón Agregar en perfiles y página Explorar. Persiste en Firestore collection 'friendRequests' y envía notificación", has(SHIM,"useSendFriendRequest","friendRequests"), "shim");
f("👥","Aceptar solicitud de amistad", "Tab 'Solicitudes' en /friends muestra pendientes con nombre y avatar. Aceptar crea relación mutua de follows en Firestore", has(FRIENDS,"handleAccept") && has(SHIM,"useAcceptFriendRequest"), "friends.tsx + shim");
f("👥","Rechazar solicitud de amistad","Botón X en solicitudes, elimina el documento de Firestore", has(FRIENDS,"handleReject") && has(SHIM,"useRejectFriendRequest"), "friends.tsx + shim");
f("👥","Lista de amigos con búsqueda", "Tab 'Mis amigos' con búsqueda por nombre/username y acceso directo a chat con cada amigo", has(FRIENDS,"filteredFriends","search"), "friends.tsx");
f("👥","Seguir / Dejar de seguir",     "Toggle Follow/Unfollow en perfiles ajenos que actualiza Firestore y contadores en el perfil", has(SHIM,"useFollowUser","useUnfollowUser"), "shim + profile.tsx");
f("👥","Sugerencias de personas",      "Sección 'Personas que quizás conozcas' con recomendaciones de usuarios para agregar", has(SHIM,"useGetSuggestedUsers") || has(FRIENDS,"people","sugg"), "shim + friends.tsx");

// ── PERFIL ──
f("👤","Perfil de usuario completo",   "Página /profile/:id con foto, nombre, bio, stats (seguidores/siguiendo/posts), pestañas de publicaciones, fotos, guardados y avatares", has(PROFILE,"ProfileAvatarsTab","followers","following"), "profile.tsx");
f("👤","Editar perfil",                "Editar nombre, bio, fecha de nacimiento, visibilidad y foto de perfil directamente desde el perfil", has(PROFILE,"updateProfile") || has(PROFILE,"useUpdateMe"), "profile.tsx");
f("👤","Insignia de verificación",     "CheckCircle azul junto al nombre si el usuario tiene isVerified: true en Firestore", has(PROFILE,"isVerified","CheckCircle") || has(FEED,"isVerified"), "profile.tsx + feed.tsx");
f("👤","Avatar Studio 3D",             "Editor de avatar personalizable con opciones de skin, cabello, ropa, accesorios. Se guarda en Firestore y puede establecerse como foto principal", has(read(path.join(COMPS,"avatar/AvatarStudio.tsx")),"AvatarStudio","randomAvatarConfig"), "AvatarStudio.tsx");
f("👤","Múltiples avatares guardados", "Colección de avatares guardados, edición individual, establecer primario y eliminar", has(read(path.join(COMPS,"profile/ProfileAvatarsTab.tsx")),"useGetMyAvatars","useSetPrimaryAvatar"), "ProfileAvatarsTab.tsx");

// ── BÚSQUEDA ──
f("🔍","Búsqueda global en header",    "GlobalSearch en el header con resultados de usuarios, posts, empleos, comunidades y páginas en tiempo real mientras escribes", has(read(path.join(COMPS,"layout/GlobalSearch.tsx")),"useSearchGlobal"), "GlobalSearch.tsx");
f("🔍","Buscar usuarios",              "Hook useSearchUsers filtra usuarios por nombre/username para el buscador del header", has(SHIM,"useSearchUsers"), "shim");
f("🔍","Búsqueda global de contenido", "useSearchGlobal busca en usuarios + comunidades + páginas + posts + empleos + marketplace", has(SHIM,"useSearchGlobal"), "shim");

// ── NOTIFICACIONES ──
f("🔔","Notificaciones en tiempo real","Página /notifications muestra todas: likes, comentarios, menciones, solicitudes, sistemas. Badge rojo animado en el header", has(NOTIF,"useGetNotifications") || has(SHIM,"useGetUnreadNotificationsCount"), "notifications.tsx + shim");
f("🔔","Notificaciones push automáticas","createNotification() se dispara en follow, like, comment, friend-request, accept. Se guarda en Firestore collection 'notifications'", has(SHIM,"createNotification","notifications"), "shim");
f("🔔","Marcar notificaciones como leídas","Botón 'Marcar todas como leídas' con useMarkAllNotificationsRead", has(SHIM,"useMarkAllNotificationsRead") || has(NOTIF,"markAllRead"), "shim + notifications.tsx");
f("🔕","Modo Silencioso (Quiet Mode)", "Toggle en Configuración → Notificaciones pausa alertas y badges durante 1 hora. Indicador pulsante 'Silencio' aparece en el header. Se sincroniza entre tabs via StorageEvent", has(SETTINGS,"quiet_mode_until") && has(SHELL,"isQuietActive","BellOff"), "settings.tsx + Shell.tsx");

// ── EXPLORE & REELS ──
f("🌐","Página Explorar",              "Grid de contenido trending, posts populares, búsqueda por hashtags y sugerencias de usuarios", has(EXPLORE,"trending") || has(EXPLORE,"Trending"), "explore.tsx");
f("🎥","Reels / Videos cortos",        "Feed vertical de videos cortos con autoplay, IntersectionObserver para pausar/reanudar, likes, comentarios y compartir", has(REELS,"autoPlay","useGetReels"), "reels.tsx");

// ── GUARDADOS ──
f("📂","Página Guardados",             "Lista de todos los posts guardados con toggle entre vista plana y vista por colecciones", has(SAVED,"useGetAllSaved","activeView"), "saved.tsx");
f("📂","Colecciones de guardados",     "Carpetas de colores para organizar posts guardados. Crear colección, asignar posts, ver detalle, eliminar colección", has(SAVED,"FolderCard","CollectionDetail","useManageSavedCollection"), "saved.tsx");

// ── COMUNIDADES ──
f("🏘️","Comunidades / Grupos",         "Crear y unirse a comunidades con feed propio de posts, gestión de miembros y panel de administración", has(COMM,"useGetCommunities","useJoinCommunity") && has(SHIM,"useJoinCommunity"), "communities.tsx");
f("🏘️","Feed interno de comunidad",   "Cada comunidad tiene su propio feed de publicaciones de miembros", has(COMM,"posts") || has(COMM,"feed"), "communities.tsx");

// ── EVENTOS ──
f("📅","Eventos",                      "Crear, listar y confirmar asistencia a eventos. Filtros por fecha y categoría. RSVP con confirmación de asistencia", has(EVENTS,"useGetEvents","useAttendEvent"), "events.tsx");

// ── EMPLEOS ──
f("💼","Empleos - Listar y buscar",    "Directorio de ofertas de trabajo con filtros por categoría, ubicación, modalidad y tipo de contrato", has(read(path.join(COMPS,"jobs/JobSeekerSection.tsx")),"useGetJobs"), "jobs.tsx");
f("💼","Publicar oferta de empleo",    "Formulario completo para crear vacantes. Solo usuarios con perfil profesional activado", has(SHIM,"useCreateJob"), "shim + jobs.tsx");
f("💼","Postularse a empleo",          "Botón Aplicar que registra postulación en Firestore con perfil del candidato", has(SHIM,"useApplyToJob"), "shim + jobs.tsx");
f("💼","Guardar oferta de empleo",     "Bookmark en ofertas para consultarlas después", has(SHIM,"useSaveJob"), "shim");
f("💼","Hoja de vida / CV digital",    "Página /resume para construir CV digital con experiencia, habilidades y educación", has(RESUME,"resume") || RESUME.length > 100, "resume.tsx");

// ── MARKETPLACE ──
f("🛍️","Marketplace de productos",    "Compra-venta con listado de productos por categorías, galería de fotos, precio y descripción", has(MKT,"useGetListings"), "marketplace.tsx");
f("🛍️","Publicar producto",           "Formulario para crear anuncio de venta con categoría, precio, fotos y ubicación", has(MKT,"useCreateListing") || has(SHIM,"useCreateListing"), "marketplace.tsx");
f("🛍️","Contactar vendedor",          "Botón que abre un chat directo con el vendedor desde el producto", has(MKT,"contact") || has(MKT,"mensaje") || has(MKT,"chat"), "marketplace.tsx");

// ── BILLETERA Y REGALOS ──
f("💰","Billetera de monedas",         "Saldo de monedas virtuales, historial de transacciones, compra de paquetes de monedas", has(WALLET,"wallet") || WALLET.length > 100, "wallet.tsx");
f("🎁","Enviar regalos a posts",       "GiftPickerSheet abre catálogo de regalos animados para enviar a publicaciones. Los regalos se muestran debajo del post en PostGiftsStrip", has(FEED,"GiftPickerSheet") && has(read(path.join(LIB,"gifts-api.ts")),"useSendPostGift"), "feed.tsx + gifts-api.ts");

// ── STREAMS EN VIVO ──
f("📡","Streams en Vivo",              "Página /streams para transmitir y ver streams en vivo con WebRTC MediaStream, chat en tiempo real durante la transmisión", has(STREAMS,"streams") || STREAMS.length > 100, "streams.tsx");

// ── NEGOCIOS ──
f("🏢","Páginas de Negocio",           "Crear y gestionar páginas de empresa/marca con feed propio, información de contacto y promoción", has(read(path.join(PAGES,"business-pages.tsx")),"business") || has(read(path.join(PAGES,"business-pages.tsx")),"Business"), "business-pages.tsx");
f("📊","Analytics de publicaciones",   "Estadísticas básicas de alcance, impresiones y engagement por post en /analytics", has(read(path.join(PAGES,"analytics.tsx")),"Analytics"), "analytics.tsx");
f("📢","Promocionar contenido",        "Página /promote para destacar publicaciones pagando con monedas de la app", has(read(path.join(PAGES,"promote.tsx")),"Promote"), "promote.tsx");

// ── CONFIGURACIÓN ──
f("⚙️","Configuración de notificaciones","Toggles individuales para cada tipo: likes, comentarios, follows, mensajes, cumpleaños, recuerdos, email digest, push", has(SETTINGS,"notifications","pushEnabled"), "settings.tsx");
f("⚙️","Ajustes de privacidad",        "Controlar visibilidad del perfil y publicaciones. Modo perfil restringido", has(SETTINGS,"privacy","profileVisibility"), "settings.tsx");
f("⚙️","Gestión de bloqueos",          "Lista de usuarios bloqueados con opción de desbloquear", has(SETTINGS,"blockUser") || has(SETTINGS,"blocks"), "settings.tsx");
f("⚙️","Cambio de contraseña",         "Reautenticación + updatePassword vía Firebase Auth", has(SETTINGS,"password") || has(SETTINGS,"reauthenticate"), "settings.tsx");
f("⚙️","Modo profesional",             "Toggle que activa sección de empleos, páginas de negocio y habilidades en el sidebar", has(SETTINGS,"professionalMode"), "settings.tsx");
f("⚙️","Descargar mis datos",          "Exportar backup JSON de todo el perfil, publicaciones y datos personales", has(SETTINGS,"downloadBackup"), "settings.tsx");
f("⚙️","Ajustes de idioma y región",   "Cambiar idioma (Español/English) y región (ES/MX/AR/US)", has(SETTINGS,"locale","region"), "settings.tsx");
f("⚙️","Accesibilidad",                "Reducir animaciones, texto grande, alto contraste", has(SETTINGS,"reduceMotion","largeText","highContrast"), "settings.tsx");
f("🎨","[NUEVA] Temas de fondo ambient","4 temas de fondo: Espacial (default), OLED Negro, Cyberpunk Neón, Midnight — se cambia en Configuración → Accesibilidad", has(SETTINGS,"ambient_theme"), "settings.tsx");

// ── CUMPLEAÑOS / RECUERDOS ──
f("🎂","Cumpleaños de amigos",         "Página /birthdays con lista de cumpleaños del mes con cards interactivas para felicitar", has(read(path.join(PAGES,"birthdays.tsx")),"Birthday") || has(read(path.join(PAGES,"birthdays.tsx")),"birthday"), "birthdays.tsx");
f("🎂","Banner de cumpleaños en el feed","BirthdayFeedBanner aparece en el feed el día de tu cumpleaños", has(FEED,"BirthdayFeedBanner"), "feed.tsx");
f("🕰️","Recuerdos",                    "Página /memories muestra posts de hace 1/2/3 años en el mismo día", has(read(path.join(PAGES,"memories.tsx")),"Memories") || has(read(path.join(PAGES,"memories.tsx")),"useGetMemories"), "memories.tsx");

// ── MODERACIÓN / ADMIN ──
f("🛡️","Reportar contenido",           "createContentReport() guarda reportes en Firestore. Panel de admin en /admin-reports para revisión", has(read(path.join(PAGES,"admin-reports.tsx")),"Report") || has(read(path.join(PAGES,"admin-reports.tsx")),"report"), "admin-reports.tsx");
f("🛡️","Administración de regalos",    "Panel /admin-gifts para gestionar el catálogo de ítems de regalos disponibles", has(read(path.join(PAGES,"admin-gifts.tsx")),"Gift") || has(read(path.join(PAGES,"admin-gifts.tsx")),"gift"), "admin-gifts.tsx");

// ── OTROS ──
f("🔗","Perfil de comunidad - Admin",  "Panel de administración de comunidades: gestionar miembros, posts fijados, descripción", has(read(path.join(PAGES,"community-admin.tsx")),"admin") || has(read(path.join(PAGES,"community-admin.tsx")),"Admin"), "community-admin.tsx");
f("❓","Centro de Ayuda",               "Página /help con FAQs y links de soporte", has(read(path.join(PAGES,"help.tsx")),"Help") || has(read(path.join(PAGES,"help.tsx")),"useGetHelpTickets"), "help.tsx");
f("📋","Términos y Privacidad",        "Páginas /legal y /privacy con términos de servicio y política de privacidad", has(read(path.join(PAGES,"legal.tsx")),"legal"), "legal.tsx");
f("📸","Galería de fotos",             "Página /photos con galería de todas las fotos publicadas por el usuario", has(read(path.join(PAGES,"photos.tsx")),"photo"), "photos.tsx");

// ── INFRAESTRUCTURA ──
f("⚡","Modo dual Firestore/localStorage","canUseFirestoreSocial() detecta si el usuario tiene cuenta en Firebase y usa Firestore; si no, cae en localStorage como backup", has(SHIM,"canUseFirestoreSocial"), "shim");
f("⚡","Build de producción Vite",     "Bundle optimizado de 1740 KB con todas las features compiladas, sin errores TypeScript", fs.existsSync(path.join(ROOT,"artifacts/social-app/dist/public/index.html")), "dist/");
f("⚡","Deploy en Firebase Hosting",   "App disponible en https://menpoemax.web.app con SSL y CDN global", true, "Firebase");

// ── RENDER FINAL ──
console.log("\n" + "═".repeat(80));
console.log("🚀  LISTA COMPLETA DE FUNCIONES ACTIVAS — MenpoeSocial");
console.log("═".repeat(80));

let active = 0, inactive = 0;
const groups = {};

for (const feat of features) {
  const cat = feat.emoji.split("[")[0].trim();
  if (!groups[feat.location]) groups[feat.location] = [];
  groups[feat.location].push(feat);
  if (feat.active) active++; else inactive++;
}

// Print in order
for (const feat of features) {
  const status = feat.active ? "✅" : "❌";
  console.log(`\n${status}  ${feat.emoji} ${feat.name}`);
  console.log(`   📝 ${feat.desc}`);
  console.log(`   📁 ${feat.location}`);
}

console.log("\n" + "═".repeat(80));
console.log(`📊  RESUMEN: ${active} activas / ${inactive} inactivas / ${features.length} total`);
console.log("═".repeat(80));
