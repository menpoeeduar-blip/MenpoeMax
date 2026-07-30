import { useState, useRef } from "react";
import { Link, useParams } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useGetBusinessPage,
  useGetMe,
  useUpdateBusinessPage,
  useCreatePost,
} from "@workspace/api-client-react";
import {
  useIsFollowingPage,
  useFollowPage,
  useUnfollowPage,
  useGetPageFollowersCount,
  useGetPagePosts,
} from "@/lib/extra-features-api";
import { getPageTypeLabel } from "@/lib/page-types";
import { InviteToGroupModal } from "@/components/InviteToGroupModal";
import { SharePostDialog } from "@/components/SharePostDialog";
import {
  ArrowLeft, Camera, Settings, X, Plus, ImageIcon, Save, Shield,
  Trash2, Globe, Lock, Users, Building2, Briefcase, UserPlus,
  Heart, MessageCircle, Share2, Edit3, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadFile } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { CommentsPanel } from "@/components/comments/CommentsPanel";

type PageTab = "feed" | "about" | "settings";
type SettingsSection = "general" | "roles";

export default function BusinessPageDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";

  const { data: page, isLoading } = useGetBusinessPage(id);
  const { data: me } = useGetMe();
  const { data: isFollowing } = useIsFollowingPage(id);
  const { data: liveFollowers } = useGetPageFollowersCount(id);
  const { data: pagePosts } = useGetPagePosts(id);
  const followPage = useFollowPage();
  const unfollowPage = useUnfollowPage();
  const updatePage = useUpdateBusinessPage();
  const createPost = useCreatePost();
  const qc = useQueryClient();
  const { toast } = useToast();

  const coverRef = useRef<HTMLInputElement>(null);
  const postMediaRef = useRef<HTMLInputElement>(null);

  const p = page as any;
  const isOwner = p?.ownerId === (me as any)?.id;
  const followersCount = liveFollowers ?? p?.followersCount ?? 0;

  const [activeTab, setActiveTab] = useState<PageTab>("feed");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");
  const [showInvite, setShowInvite] = useState(false);
  const [sharePost, setSharePost] = useState<any>(null);
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);

  // Settings form
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // Post composer
  const [postText, setPostText] = useState("");
  const [postImageUrl, setPostImageUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [postVisibility, setPostVisibility] = useState<"publico" | "privado">("publico");

  const openSettings = () => {
    setEditName(p?.name ?? "");
    setEditDesc(p?.description ?? "");
    setEditCategory(p?.category ?? "");
    setEditPhone(p?.phone ?? "");
    setEditWebsite(p?.website ?? "");
    setEditLocation(p?.location ?? "");
    setActiveTab("settings");
  };

  const uploadCover = async (file: File) => {
    try {
      const url = await uploadFile(file, { purpose: "cover" });
      updatePage.mutate({ pageId: id, data: { coverUrl: url } }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["business-page", id] }); toast({ title: "Portada actualizada ✓" }); },
      });
    } catch {
      toast({ title: "Error al subir imagen", variant: "destructive" });
    }
  };

  const saveGeneralInfo = async () => {
    setSavingInfo(true);
    updatePage.mutate(
      { pageId: id, data: { name: editName || undefined, description: editDesc || undefined, category: editCategory || undefined, phone: editPhone || undefined, website: editWebsite || undefined, location: editLocation || undefined } },
      {
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["business-page", id] }); qc.invalidateQueries({ queryKey: ["business-pages"] }); toast({ title: "Información guardada ✓" }); setSavingInfo(false); },
        onError: () => { toast({ title: "Error al guardar", variant: "destructive" }); setSavingInfo(false); },
      }
    );
  };

  const handlePostMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      const url = await uploadFile(file, { purpose: "post" });
      setPostImageUrl(url);
    } catch {
      toast({ title: "Error al subir imagen", variant: "destructive" });
    } finally {
      setUploadingMedia(false);
    }
  };

  const handlePublishPost = () => {
    if (!postText.trim() && !postImageUrl) return;
    createPost.mutate(
      { data: { content: postText.trim(), mediaUrls: postImageUrl ? [postImageUrl] : [], visibility: postVisibility, pageId: id, hashtags: [] } },
      {
        onSuccess: () => {
          setPostText(""); setPostImageUrl(null);
          qc.invalidateQueries({ queryKey: ["page-posts", id] });
          qc.invalidateQueries({ queryKey: ["feed"] });
          toast({ title: "Publicación creada ✓" });
        },
        onError: () => toast({ title: "Error al publicar", variant: "destructive" }),
      }
    );
  };

  const handleFollow = () => {
    if (isFollowing) {
      unfollowPage.mutate({ pageId: id });
    } else {
      followPage.mutate({ pageId: id, pageName: p?.name });
    }
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="max-w-3xl mx-auto p-4 space-y-4 animate-pulse">
          <div className="h-48 glass-panel rounded-3xl" />
          <div className="h-8 w-48 bg-white/10 rounded-xl" />
        </div>
      </Shell>
    );
  }

  if (!page) {
    return (
      <Shell>
        <div className="max-w-3xl mx-auto p-4 py-20 text-center text-muted-foreground">
          <Building2 className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-semibold">Página no encontrada</p>
          <Link href="/business">
            <Button variant="ghost" size="sm" className="mt-4 rounded-xl"><ArrowLeft className="w-4 h-4 mr-1" /> Volver</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-3xl mx-auto p-4 pb-24 space-y-4">
        <Link href="/business">
          <Button variant="ghost" size="sm" className="rounded-xl"><ArrowLeft className="w-4 h-4 mr-1" /> Páginas</Button>
        </Link>

        {/* Hero card — cover ONLY (no avatar) */}
        <div className="glass-panel neon-border rounded-3xl overflow-hidden">
          {/* Cover */}
          <div className="relative h-44 sm:h-56 bg-gradient-to-br from-primary/30 via-accent/20 to-emerald-500/20 group">
            {p.coverUrl && <img src={p.coverUrl} className="w-full h-full object-cover absolute inset-0" alt="" />}
            {isOwner && (
              <>
                <button
                  type="button"
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
                  onClick={() => coverRef.current?.click()}
                  title="Cambiar portada"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
                <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCover(f); }} />
              </>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            {/* Title inside cover */}
            <div className="absolute bottom-4 left-5">
              <h1 className="text-2xl font-bold text-white drop-shadow-lg">{p.name}</h1>
              <p className="text-white/70 text-sm">@{p.slug} · {p.category}{p.pageType ? ` · ${getPageTypeLabel(p.pageType)}` : ""}</p>
            </div>
          </div>

          {/* Stats + Actions */}
          <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 font-medium">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-foreground">{followersCount.toLocaleString()}</span> seguidores
              </span>
              {isFollowing && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <Bell className="w-3.5 h-3.5" /> Siguiendo
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Jobs button */}
              <Link href="/jobs">
                <Button size="sm" variant="outline" className="rounded-xl gap-1.5 border-amber-500/30 text-amber-400 hover:border-amber-500 text-xs">
                  <Briefcase className="w-3.5 h-3.5" /> Empleos
                </Button>
              </Link>

              {/* Invite (owner only) */}
              {isOwner && (
                <Button size="sm" variant="outline" className="rounded-xl gap-1.5 border-violet-500/30 text-violet-400 hover:border-violet-500 text-xs" onClick={() => setShowInvite(true)}>
                  <UserPlus className="w-3.5 h-3.5" /> Invitar
                </Button>
              )}

              {/* Settings (owner only) */}
              {isOwner && (
                <Button size="sm" variant="outline" className="rounded-xl gap-1.5 border-primary/30 hover:border-primary text-xs" onClick={openSettings}>
                  <Settings className="w-3.5 h-3.5" /> Configurar
                </Button>
              )}

              {/* Follow (non-owner) */}
              {!isOwner && (
                <Button
                  size="sm"
                  variant={isFollowing ? "outline" : "default"}
                  className={cn("rounded-xl gap-1.5", !isFollowing && "neon-btn")}
                  onClick={handleFollow}
                  disabled={followPage.isPending || unfollowPage.isPending}
                >
                  {isFollowing ? "✓ Siguiendo" : <><Plus className="w-3.5 h-3.5" /> Seguir</>}
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-border/40 px-2">
            {(["feed", "about", ...(isOwner ? ["settings"] : [])] as PageTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { if (tab === "settings") openSettings(); else setActiveTab(tab); }}
                className={cn(
                  "px-4 py-3 text-sm font-medium transition-all border-b-2",
                  activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === "feed" ? "Publicaciones" : tab === "about" ? "Acerca de" : "⚙ Configurar"}
              </button>
            ))}
          </div>
        </div>

        {/* ── FEED TAB ─────────────────────────────────────────────────── */}
        {activeTab === "feed" && (
          <div className="space-y-4">
            {/* Post composer — owner only */}
            {isOwner && (
              <div className="glass-panel neon-border rounded-2xl p-4 space-y-3">
                <Textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder={`Escribe algo en ${p.name}...`}
                  className="bg-white/5 border-border/40 rounded-xl resize-none min-h-[80px] text-sm"
                />
                {postImageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-border/40">
                    <img src={postImageUrl} className="w-full max-h-64 object-cover" alt="" />
                    <button type="button" onClick={() => setPostImageUrl(null)} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors">
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => postMediaRef.current?.click()} disabled={uploadingMedia}
                      className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                      {uploadingMedia ? <div className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                    </button>
                    <input ref={postMediaRef} type="file" accept="image/*,video/*" className="hidden" onChange={handlePostMedia} />
                    <button type="button"
                      onClick={() => setPostVisibility(v => v === "publico" ? "privado" : "publico")}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                      {postVisibility === "publico" ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {postVisibility === "publico" ? "Público" : "Privado"}
                    </button>
                  </div>
                  <Button size="sm" onClick={handlePublishPost} disabled={createPost.isPending || (!postText.trim() && !postImageUrl)} className="neon-btn rounded-xl px-5">
                    {createPost.isPending ? "Publicando..." : "Publicar"}
                  </Button>
                </div>
              </div>
            )}

            {/* Posts list */}
            {((pagePosts ?? []) as any[]).length === 0 ? (
              <div className="glass-panel rounded-2xl p-10 text-center text-muted-foreground">
                <Edit3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No hay publicaciones aún</p>
                <p className="text-sm mt-1">{isOwner ? "Sé el primero en publicar en esta página." : "Esta página aún no ha publicado contenido."}</p>
              </div>
            ) : (
              ((pagePosts ?? []) as any[]).map((post: any) => (
                <div key={post.id} className="glass-panel rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <img
                      src={post.author?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.id}`}
                      className="w-9 h-9 rounded-full object-cover"
                      alt=""
                    />
                    <div>
                      <p className="text-sm font-medium">{post.author?.displayName ?? "Usuario"}</p>
                      <p className="text-xs text-muted-foreground">{p.name}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed">{post.content}</p>
                  {post.mediaUrls?.[0] && <img src={post.mediaUrls[0]} className="mt-3 rounded-xl max-h-80 w-full object-cover" alt="" />}
                  <div className="flex items-center gap-4 mt-3">
                    <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors">
                      <Heart className="w-4 h-4" /> {post.likesCount ?? 0}
                    </button>
                    <button
                      type="button"
                      className={cn("flex items-center gap-1 text-xs transition-colors", openCommentsId === post.id ? "text-primary" : "text-muted-foreground hover:text-primary")}
                      onClick={() => setOpenCommentsId(id => id === post.id ? null : post.id)}
                    >
                      <MessageCircle className="w-4 h-4" /> Comentar
                    </button>
                    <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-purple-400 transition-colors" onClick={() => setSharePost(post)}>
                      <Share2 className="w-4 h-4" /> Compartir
                    </button>
                  </div>
                  {openCommentsId === post.id && <CommentsPanel postId={post.id} testIdPrefix={`page-comment-${post.id}`} />}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── ABOUT TAB ────────────────────────────────────────────────── */}
        {activeTab === "about" && (
          <div className="glass-panel neon-border rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">Acerca de {p.name}</h2>
            {p.description && <p className="text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {p.category && <div className="glass-panel rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">Categoría</p><p className="font-medium">{p.category}</p></div>}
              {p.pageType && <div className="glass-panel rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">Tipo</p><p className="font-medium">{getPageTypeLabel(p.pageType)}</p></div>}
              {p.website && <div className="glass-panel rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">Sitio web</p><a href={p.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline truncate block">{p.website}</a></div>}
              {p.phone && <div className="glass-panel rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">Teléfono</p><p className="font-medium">{p.phone}</p></div>}
              {p.location && <div className="glass-panel rounded-xl p-3 sm:col-span-2"><p className="text-xs text-muted-foreground mb-1">Ubicación</p><p className="font-medium">{p.location}</p></div>}
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB (owner only) ─────────────────────────────── */}
        {activeTab === "settings" && isOwner && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["general", "roles"] as SettingsSection[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSettingsSection(s)}
                  className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all",
                    settingsSection === s ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.45)]" : "bg-white/5 text-muted-foreground hover:bg-white/10")}
                >
                  {s === "general" ? "Información general" : "Roles y miembros"}
                </button>
              ))}
            </div>

            {settingsSection === "general" && (
              <div className="glass-panel neon-border rounded-2xl p-6 space-y-5">
                <h2 className="font-semibold text-lg flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Información general</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Nombre *</label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-xl neon-input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Categoría</label>
                    <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="ej. Tecnología, Arte…" className="rounded-xl neon-input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Teléfono</label>
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+1 555 000 0000" className="rounded-xl neon-input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Sitio web</label>
                    <Input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} placeholder="https://tusitio.com" className="rounded-xl neon-input" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs text-muted-foreground font-medium">Ubicación</label>
                    <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Ciudad, País" className="rounded-xl neon-input" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs text-muted-foreground font-medium">Descripción</label>
                    <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} className="rounded-xl neon-input resize-none" />
                  </div>
                </div>
                <Button onClick={saveGeneralInfo} disabled={savingInfo} className="neon-btn rounded-xl w-full gap-2">
                  <Save className="w-4 h-4" />{savingInfo ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            )}

            {settingsSection === "roles" && (
              <div className="glass-panel neon-border rounded-2xl p-6 space-y-4">
                <h2 className="font-semibold text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Roles y miembros</h2>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Propietario</p>
                  <div className="flex items-center gap-3 glass-panel rounded-xl p-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold flex-none">
                      {(me as any)?.displayName?.[0] ?? "P"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{(me as any)?.displayName ?? "Tú"}</p>
                      <p className="text-xs text-muted-foreground">@{(me as any)?.username}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">Propietario</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Administradores</p>
                  {(p.admins ?? []).length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border/40 rounded-xl">
                      No hay administradores asignados
                    </div>
                  ) : (
                    (p.admins ?? []).map((admin: any) => (
                      <div key={admin.id} className="flex items-center gap-3 glass-panel rounded-xl p-3">
                        <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center font-bold flex-none">{admin.displayName?.[0]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{admin.displayName}</p>
                          <p className="text-xs text-muted-foreground">@{admin.username}</p>
                        </div>
                        <button type="button" className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="pt-2 border-t border-border/30">
                  <Button variant="outline" size="sm" className="w-full rounded-xl gap-2 border-violet-500/30 text-violet-400 hover:border-violet-500" onClick={() => setShowInvite(true)}>
                    <UserPlus className="w-4 h-4" /> Invitar administrador
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {showInvite && (
          <InviteToGroupModal open={showInvite} onOpenChange={setShowInvite} target={{ id, name: p.name, type: "page" }} />
        )}
        {sharePost && (
          <SharePostDialog open={!!sharePost} onOpenChange={(o) => { if (!o) setSharePost(null); }} post={sharePost} />
        )}
      </div>
    </Shell>
  );
}
