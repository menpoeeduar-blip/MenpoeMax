import { useState, useRef, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import {
  useGetCommunities,
  useGetSuggestedCommunities,
  useJoinCommunity,
  useGetCommunity,
  useCreateCommunity,
  getGetCommunityQueryKey,
  useGetCommunityPosts,
  useCreateCommunityPost,
  useUpdateCommunity,
  useGetMe,
  useLikePost,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { AppModal } from "@/components/ui/app-modal";
import { uploadFile } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";
import { SharePostDialog } from "@/components/SharePostDialog";
import { InviteToGroupModal } from "@/components/InviteToGroupModal";
import { CreatePostBox } from "@/components/feed/CreatePostBox";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import {
  Search, Users, Globe, Lock, ArrowLeft, Plus, X, MessageCircle, Heart,
  Camera, Settings, Share2, UserPlus,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { cn } from "@/lib/utils";

// ─── Create Community Modal ────────────────────────────────────────────────
function CreateCommunityModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", description: "", visibility: "public" });
  const [error, setError] = useState("");
  const createCommunity = useCreateCommunity();
  const qc = useQueryClient();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("El nombre es obligatorio"); return; }
    createCommunity.mutate(
      { data: { name: form.name, description: form.description || undefined, visibility: form.visibility as "public" | "private" } },
      { onSuccess: () => { qc.invalidateQueries(); onClose(); }, onError: () => setError("Error al crear la comunidad.") }
    );
  };

  return (
    <AppModal open onClose={onClose} className="w-full max-w-md">
      <div className="glass-panel rounded-2xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Crear comunidad</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre *</label>
            <Input value={form.name} onChange={set("name")} placeholder="Nombre de la comunidad" className="rounded-xl bg-white/5" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea value={form.description} onChange={set("description")} placeholder="¿De qué trata?" rows={3}
              className="w-full rounded-xl bg-white/5 border border-input px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Visibilidad</label>
            <FormSelect
              value={form.visibility}
              onValueChange={(v) => setForm((f) => ({ ...f, visibility: v }))}
              options={[
                { value: "public", label: "Pública — cualquiera puede unirse" },
                { value: "private", label: "Privada — solo por invitación" },
              ]}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 rounded-xl" disabled={createCommunity.isPending}>
              {createCommunity.isPending ? "Creando..." : "Crear"}
            </Button>
          </div>
        </form>
      </div>
    </AppModal>
  );
}

// ─── Community Detail ──────────────────────────────────────────────────────
function CommunityDetail({ communityId, onBack }: { communityId: string; onBack: () => void }) {
  const { data: community, isLoading } = useGetCommunity(communityId, {
    query: { enabled: !!communityId, queryKey: getGetCommunityQueryKey(communityId), refetchInterval: 15_000 },
  });
  const { data: me } = useGetMe();
  const { data: posts } = useGetCommunityPosts(communityId, { query: { refetchInterval: 20_000 } });
  const joinCommunity = useJoinCommunity();
  const createPost = useCreateCommunityPost();
  const updateCommunity = useUpdateCommunity();
  const likePost = useLikePost();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const coverRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<any>(null);
  const [showInvite, setShowInvite] = useState(false);

  const meId = (me as any)?.id;
  const isCreator = community?.creatorId === meId;
  const isCommunityAdmin = Array.isArray((community as any)?.admins) && (community as any).admins.includes(meId);
  const canManageCommunity = isCreator || isCommunityAdmin;
  const isJoined = community?.isJoined;

  const uploadCover = async (file: File) => {
    try {
      const url = await uploadFile(file, { purpose: "cover" });
      updateCommunity.mutate({ communityId, data: { coverUrl: url } }, {
        onSuccess: () => { qc.invalidateQueries(); toast({ title: "Portada actualizada ✓" }); },
      });
    } catch {
      toast({ title: "Error al subir imagen", variant: "destructive" });
    }
  };

  const publish = () => {
    if (!text.trim()) return;
    createPost.mutate({ communityId, data: { content: text } }, {
      onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["community-posts", communityId] }); },
    });
  };

  if (isLoading) return <div className="flex items-center justify-center p-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!community) return null;
  const c = community as any;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* Cover — NO avatar */}
      <div className="glass-panel neon-border rounded-3xl overflow-hidden">
        <div className="relative h-44 sm:h-56 bg-gradient-to-br from-primary/30 via-accent/20 to-sky-500/20 group">
          {c.coverUrl && <img src={c.coverUrl} className="w-full h-full object-cover absolute inset-0" alt="" />}
          {canManageCommunity && (
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
          {/* Gradient overlay for text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-5">
            <h1 className="text-2xl font-bold text-white drop-shadow-lg">{c.name}</h1>
            <div className="flex items-center gap-3 text-white/80 text-sm mt-1">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.membersCount?.toLocaleString() ?? 0} miembros</span>
              <span className="flex items-center gap-1">
                {c.visibility === "public" ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {c.visibility === "public" ? "Pública" : "Privada"}
              </span>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between px-5 py-3 flex-wrap gap-2">
          {c.description && <p className="text-sm text-muted-foreground flex-1">{c.description}</p>}
          <div className="flex items-center gap-2 ml-auto">
            {canManageCommunity && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl gap-1.5 border-primary/30 hover:border-primary text-xs"
                onClick={() => setShowInvite(true)}
              >
                <UserPlus className="w-3.5 h-3.5" /> Invitar
              </Button>
            )}
            {canManageCommunity && (
              <Button size="sm" variant="outline" className="rounded-xl gap-1.5 border-primary/30 hover:border-primary text-xs">
                <Settings className="w-3.5 h-3.5" /> Configurar
              </Button>
            )}
            <Button
              size="sm"
              variant={isJoined ? "outline" : "default"}
              onClick={() => joinCommunity.mutate({ communityId }, { onSuccess: () => qc.invalidateQueries() })}
              data-testid="button-join-detail"
              className="rounded-xl"
            >
              {isJoined ? "✓ Unido" : "Unirse"}
            </Button>
          </div>
        </div>
      </div>

      {/* Post composer with all tools (IA, Audio, Poll, Live, GPS, Stickers, Files) */}
      <CreatePostBox
        communityId={communityId}
        placeholder={`Publica en la comunidad ${c.name}...`}
      />

      {/* Posts */}
      <div className="space-y-3">
        {((posts ?? []) as any[]).map((post: any) => (
          <div key={post.id} className="glass-panel rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <img
                src={post.author?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.id}`}
                className="w-8 h-8 rounded-full object-cover cursor-pointer"
                alt=""
                onClick={() => post.author?.id && setLocation(`/profile/${post.author.id}`)}
              />
              <button type="button" className="text-sm font-medium hover:text-primary" onClick={() => post.author?.id && setLocation(`/profile/${post.author.id}`)}>
                {post.author?.displayName}
              </button>
            </div>
            <p className="text-sm">{post.content}</p>
            {post.mediaUrls?.[0] && <img src={post.mediaUrls[0]} className="mt-2 rounded-xl max-h-64 w-full object-cover" alt="" />}
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors"
                onClick={() => likePost.mutate({ postId: post.id, data: { reaction: "like" } }, { onSuccess: () => qc.invalidateQueries() })}
              >
                <Heart className="w-4 h-4" /> {post.likesCount ?? 0}
              </button>
              <button
                type="button"
                className={cn("flex items-center gap-1 text-xs transition-colors", openCommentsId === post.id ? "text-primary" : "text-muted-foreground hover:text-primary")}
                onClick={() => setOpenCommentsId((id) => (id === post.id ? null : post.id))}
              >
                <MessageCircle className="w-4 h-4" /> Comentar
              </button>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-purple-400 transition-colors"
                onClick={() => setSharePost(post)}
              >
                <Share2 className="w-4 h-4" /> Compartir
              </button>
            </div>
            {openCommentsId === post.id && <CommentsPanel postId={post.id} testIdPrefix={`community-comment-${post.id}`} />}
          </div>
        ))}
      </div>

      {/* Share dialog */}
      {sharePost && (
        <SharePostDialog open={!!sharePost} onOpenChange={(o) => { if (!o) setSharePost(null); }} post={sharePost} />
      )}

      {/* Invite modal */}
      {showInvite && (
        <InviteToGroupModal
          open={showInvite}
          onOpenChange={setShowInvite}
          target={{ id: communityId, name: c.name, type: "community" }}
        />
      )}
    </div>
  );
}

// ─── Main Communities Page ─────────────────────────────────────────────────
export default function Communities() {
  const params = useParams<{ id?: string }>();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"discover" | "joined">("discover");
  const [selectedId, setSelectedId] = useState<string | null>(params.id ?? null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { if (params.id) setSelectedId(params.id); }, [params.id]);

  const { data: communities, isLoading } = useGetCommunities({ q: search || undefined, joined: activeTab === "joined" || undefined });
  const { data: suggested } = useGetSuggestedCommunities();
  const joinCommunity = useJoinCommunity();
  const qc = useQueryClient();

  return (
    <Shell>
      <div className="max-w-5xl mx-auto w-full p-4 pb-24">
        {showCreate && <CreateCommunityModal onClose={() => setShowCreate(false)} />}

        {selectedId ? (
          <CommunityDetail communityId={selectedId} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Comunidades</h1>
                <p className="text-muted-foreground text-sm">Encuentra tu tribu</p>
              </div>
              <Button className="rounded-2xl neon-btn" data-testid="button-create-community" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Crear
              </Button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar comunidades..." className="pl-12 h-12 rounded-2xl bg-white/5" data-testid="input-community-search" />
            </div>

            <div className="flex gap-2 mb-6">
              {(["discover", "joined"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all", activeTab === tab ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.4)]" : "bg-white/5 text-muted-foreground hover:bg-white/10")}
                  data-testid={`tab-communities-${tab}`}
                >
                  {tab === "discover" ? "Descubrir" : "Unido"}
                </button>
              ))}
            </div>

            {/* Suggested */}
            {!search && activeTab === "discover" && suggested && suggested.length > 0 && (
              <div className="mb-8">
                <h2 className="font-semibold mb-3 text-muted-foreground text-sm uppercase tracking-wider">Sugeridas para ti</h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {suggested.map((c) => (
                    <div key={c.id} className="flex-none w-44 glass-panel rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setSelectedId(c.id)}>
                      <div className="h-20 bg-gradient-to-br from-primary/20 to-accent/20 relative">
                        {(c as any).coverUrl && <img src={(c as any).coverUrl} className="w-full h-full object-cover" alt="" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <p className="absolute bottom-2 left-2 text-white text-xs font-semibold">{c.name}</p>
                      </div>
                      <div className="p-3">
                        <div className="text-xs text-muted-foreground">{c.membersCount.toLocaleString()} miembros</div>
                        <Button size="sm" className="w-full mt-2 h-7 text-xs rounded-xl" onClick={(e) => { e.stopPropagation(); joinCommunity.mutate({ communityId: c.id }, { onSuccess: () => qc.invalidateQueries() }); }}>
                          Unirse
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading
                ? [...Array(6)].map((_, i) => <div key={i} className="h-36 glass-panel rounded-2xl animate-pulse" />)
                : communities?.length === 0
                  ? <div className="col-span-full text-center py-16 text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No se encontraron comunidades</p></div>
                  : communities?.map((community: any) => (
                    <div key={community.id} className="glass-panel neon-border rounded-2xl overflow-hidden hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedId(community.id)} data-testid={`card-community-${community.id}`}>
                      <div className="h-24 bg-gradient-to-br from-primary/15 to-accent/15 relative">
                        {community.coverUrl && <img src={community.coverUrl} className="w-full h-full object-cover" alt="" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <p className="absolute bottom-2 left-3 text-white text-sm font-semibold">{community.name}</p>
                      </div>
                      <div className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{community.membersCount?.toLocaleString()}</span>
                          <span className="flex items-center gap-1">{community.visibility === "public" ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}{community.visibility === "public" ? "Pública" : "Privada"}</span>
                        </div>
                        <Button
                          size="sm"
                          variant={community.isJoined ? "outline" : "default"}
                          onClick={(e) => { e.stopPropagation(); joinCommunity.mutate({ communityId: community.id }, { onSuccess: () => qc.invalidateQueries() }); }}
                          data-testid={`button-join-${community.id}`}
                          className="rounded-xl"
                        >
                          {community.isJoined ? "✓ Unido" : "Unirse"}
                        </Button>
                      </div>
                    </div>
                  ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
