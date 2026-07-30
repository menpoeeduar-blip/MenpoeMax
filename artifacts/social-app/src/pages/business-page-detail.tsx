import { useState, useRef } from "react";
import { Link, useParams } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useGetBusinessPage,
  useGetMe,
  useUpdateBusinessPage,
  useCreatePost,
} from "@workspace/api-client-react";
import { getPageTypeLabel } from "@/lib/page-types";
import {
  ArrowLeft, Building2, Users, Camera, Settings, X, Plus,
  Image as ImageIcon, Type, Save, Shield, UserCog, Trash2,
  ChevronRight, Heart, MessageCircle, Share2, Edit3, Globe, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadFile } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// ─── Tabs inside the page ──────────────────────────────────────────────────
type PageTab = "feed" | "about" | "settings";

// ─── Settings sections ─────────────────────────────────────────────────────
type SettingsSection = "general" | "roles";

export default function BusinessPageDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const { data: page, isLoading } = useGetBusinessPage(id);
  const { data: me } = useGetMe();
  const updatePage = useUpdateBusinessPage();
  const createPost = useCreatePost();
  const qc = useQueryClient();
  const { toast } = useToast();

  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const postMediaRef = useRef<HTMLInputElement>(null);

  const isOwner = page?.ownerId === (me as any)?.id;

  // ── Local UI state ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<PageTab>("feed");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");

  // ── General settings form ──────────────────────────────────────────────
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // ── Post creation ─────────────────────────────────────────────────────
  const [postText, setPostText] = useState("");
  const [postImageUrl, setPostImageUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [postVisibility, setPostVisibility] = useState<"publico" | "privado">("publico");

  const openSettings = () => {
    setEditName((page as any)?.name ?? "");
    setEditDesc((page as any)?.description ?? "");
    setEditCategory((page as any)?.category ?? "");
    setEditPhone((page as any)?.phone ?? "");
    setEditWebsite((page as any)?.website ?? "");
    setEditLocation((page as any)?.location ?? "");
    setActiveTab("settings");
  };

  const upload = async (file: File, field: "avatarUrl" | "coverUrl") => {
    try {
      const url = await uploadFile(file, { purpose: field === "avatarUrl" ? "avatar" : "cover" });
      updatePage.mutate(
        { pageId: id, data: { [field]: url } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["business-page", id] });
            toast({ title: "Imagen actualizada ✓" });
          },
        },
      );
    } catch {
      toast({ title: "Error al subir imagen", variant: "destructive" });
    }
  };

  const saveGeneralInfo = async () => {
    setSavingInfo(true);
    updatePage.mutate(
      {
        pageId: id,
        data: {
          name: editName.trim() || undefined,
          description: editDesc.trim() || undefined,
          category: editCategory.trim() || undefined,
          phone: editPhone.trim() || undefined,
          website: editWebsite.trim() || undefined,
          location: editLocation.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["business-page", id] });
          qc.invalidateQueries({ queryKey: ["business-pages"] });
          toast({ title: "Información guardada ✓" });
          setSavingInfo(false);
        },
        onError: () => {
          toast({ title: "Error al guardar", variant: "destructive" });
          setSavingInfo(false);
        },
      },
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
      {
        data: {
          content: postText.trim(),
          mediaUrls: postImageUrl ? [postImageUrl] : [],
          visibility: postVisibility,
          pageId: id,
          hashtags: [],
        },
      },
      {
        onSuccess: () => {
          setPostText("");
          setPostImageUrl(null);
          qc.invalidateQueries({ queryKey: ["page-posts", id] });
          qc.invalidateQueries({ queryKey: ["feed"] });
          toast({ title: "Publicación creada ✓" });
        },
        onError: () => {
          toast({ title: "Error al publicar", variant: "destructive" });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="max-w-3xl mx-auto p-4 space-y-4 animate-pulse">
          <div className="h-40 glass-panel rounded-3xl" />
          <div className="h-8 w-48 bg-white/10 rounded-xl" />
          <div className="h-32 glass-panel rounded-2xl" />
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
            <Button variant="ghost" size="sm" className="mt-4 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver a páginas
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  const p = page as any;

  return (
    <Shell>
      <div className="max-w-3xl mx-auto p-4 pb-24 space-y-4">
        {/* Back button */}
        <Link href="/business">
          <Button variant="ghost" size="sm" className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-1" /> Páginas
          </Button>
        </Link>

        {/* Hero card */}
        <div className="glass-panel neon-border rounded-3xl overflow-hidden">
          {/* Cover */}
          <div className="h-36 sm:h-48 bg-gradient-to-br from-primary/30 via-accent/20 to-emerald-500/20 relative group">
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
                <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "coverUrl"); }} />
              </>
            )}
            {/* Avatar */}
            <div className="absolute -bottom-10 left-6 w-20 h-20 rounded-2xl border-4 border-background bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-[0_0_24px_hsl(var(--primary)/0.5)] group/av">
              {p.avatarUrl
                ? <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" />
                : <span>{p.name?.[0] ?? "P"}</span>}
              {isOwner && (
                <>
                  <button
                    type="button"
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover/av:opacity-100 transition-opacity flex items-center justify-center"
                    onClick={() => avatarRef.current?.click()}
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "avatarUrl"); }} />
                </>
              )}
            </div>
          </div>

          {/* Info bar */}
          <div className="pt-12 px-6 pb-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold neon-title">{p.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  @{p.slug} · {p.category}
                  {p.pageType ? ` · ${getPageTypeLabel(p.pageType)}` : ""}
                </p>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4 text-primary" />
                  <span>{p.followersCount ?? 0} seguidores</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {isOwner && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-1.5 border-primary/40 hover:border-primary"
                    onClick={openSettings}
                  >
                    <Settings className="w-4 h-4" /> Configurar
                  </Button>
                )}
                {!isOwner && (
                  <Button size="sm" className="rounded-xl neon-btn gap-1.5">
                    <Plus className="w-4 h-4" /> Seguir
                  </Button>
                )}
              </div>
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
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === "feed" ? "Publicaciones" : tab === "about" ? "Acerca de" : "⚙ Config."}
              </button>
            ))}
          </div>
        </div>

        {/* ── FEED TAB ──────────────────────────────────────────────────────── */}
        {activeTab === "feed" && (
          <div className="space-y-4">
            {/* Post creation box (owner only) */}
            {isOwner && (
              <div className="glass-panel neon-border rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm flex-none overflow-hidden">
                    {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" /> : p.name?.[0]}
                  </div>
                  <Textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder={`Escribe algo en ${p.name}...`}
                    className="flex-1 bg-white/5 border-border/40 rounded-xl resize-none min-h-[80px] text-sm"
                  />
                </div>

                {postImageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-border/40">
                    <img src={postImageUrl} className="w-full max-h-64 object-cover" alt="" />
                    <button
                      type="button"
                      onClick={() => setPostImageUrl(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => postMediaRef.current?.click()}
                      disabled={uploadingMedia}
                      className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Agregar imagen"
                    >
                      {uploadingMedia ? (
                        <div className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                    </button>
                    <input ref={postMediaRef} type="file" accept="image/*,video/*" className="hidden" onChange={handlePostMedia} />

                    <button
                      type="button"
                      onClick={() => setPostVisibility(v => v === "publico" ? "privado" : "publico")}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    >
                      {postVisibility === "publico" ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {postVisibility === "publico" ? "Público" : "Privado"}
                    </button>
                  </div>

                  <Button
                    size="sm"
                    onClick={handlePublishPost}
                    disabled={createPost.isPending || (!postText.trim() && !postImageUrl)}
                    className="neon-btn rounded-xl px-5"
                  >
                    {createPost.isPending ? "Publicando..." : "Publicar"}
                  </Button>
                </div>
              </div>
            )}

            {/* Posts empty state */}
            <div className="glass-panel rounded-2xl p-10 text-center text-muted-foreground">
              <Edit3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No hay publicaciones aún</p>
              <p className="text-sm mt-1">
                {isOwner ? "Sé el primero en publicar en esta página." : "Esta página aún no ha publicado contenido."}
              </p>
            </div>
          </div>
        )}

        {/* ── ABOUT TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "about" && (
          <div className="glass-panel neon-border rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">Acerca de {p.name}</h2>
            {p.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{p.description}</p>
            )}
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {p.category && (
                <div className="glass-panel rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Categoría</p>
                  <p className="font-medium">{p.category}</p>
                </div>
              )}
              {p.pageType && (
                <div className="glass-panel rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                  <p className="font-medium">{getPageTypeLabel(p.pageType)}</p>
                </div>
              )}
              {p.website && (
                <div className="glass-panel rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Sitio web</p>
                  <a href={p.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline truncate block">
                    {p.website}
                  </a>
                </div>
              )}
              {p.phone && (
                <div className="glass-panel rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
                  <p className="font-medium">{p.phone}</p>
                </div>
              )}
              {p.location && (
                <div className="glass-panel rounded-xl p-3 sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Ubicación</p>
                  <p className="font-medium">{p.location}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ──────────────────────────────────────────────────── */}
        {activeTab === "settings" && isOwner && (
          <div className="space-y-4">
            {/* Settings sub-nav */}
            <div className="flex gap-2">
              {(["general", "roles"] as SettingsSection[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSettingsSection(s)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    settingsSection === s
                      ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.45)]"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10",
                  )}
                >
                  {s === "general" ? "Información general" : "Roles y miembros"}
                </button>
              ))}
            </div>

            {/* General settings */}
            {settingsSection === "general" && (
              <div className="glass-panel neon-border rounded-2xl p-6 space-y-5">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" /> Información general
                </h2>

                {/* Photos row */}
                <div className="flex items-center gap-6 p-4 bg-white/5 rounded-2xl">
                  <div className="text-center space-y-2">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/40 to-accent/40 overflow-hidden flex items-center justify-center cursor-pointer border-2 border-primary/30 hover:border-primary transition-colors" onClick={() => avatarRef.current?.click()}>
                      {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" /> : <Camera className="w-7 h-7 text-muted-foreground" />}
                    </div>
                    <p className="text-xs text-muted-foreground">Logo / Avatar</p>
                  </div>
                  <div className="flex-1 text-center space-y-2">
                    <div className="h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 overflow-hidden flex items-center justify-center cursor-pointer border-2 border-primary/30 hover:border-primary transition-colors" onClick={() => coverRef.current?.click()}>
                      {p.coverUrl ? <img src={p.coverUrl} className="w-full h-full object-cover" alt="" /> : <Camera className="w-7 h-7 text-muted-foreground" />}
                    </div>
                    <p className="text-xs text-muted-foreground">Foto de portada</p>
                  </div>
                </div>

                {/* Fields */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Nombre de la página *</label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre" className="rounded-xl neon-input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Categoría</label>
                    <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="ej. Tecnología, Arte, Salud…" className="rounded-xl neon-input" />
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
                    <Textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Descripción de la página..."
                      rows={4}
                      className="rounded-xl neon-input resize-none"
                    />
                  </div>
                </div>

                <Button onClick={saveGeneralInfo} disabled={savingInfo} className="neon-btn rounded-xl w-full gap-2">
                  <Save className="w-4 h-4" />
                  {savingInfo ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            )}

            {/* Roles & Members */}
            {settingsSection === "roles" && (
              <div className="glass-panel neon-border rounded-2xl p-6 space-y-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> Roles y miembros
                </h2>

                {/* Owner row */}
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
                      No hay administradores asignados aún
                    </div>
                  ) : (
                    (p.admins ?? []).map((admin: any) => (
                      <div key={admin.id} className="flex items-center gap-3 glass-panel rounded-xl p-3">
                        <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center font-bold flex-none">
                          {admin.displayName?.[0]}
                        </div>
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
                  <p className="text-xs text-muted-foreground text-center">
                    Para agregar administradores invítalos desde su perfil y asígnales el rol una vez que sean seguidores de la página.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
