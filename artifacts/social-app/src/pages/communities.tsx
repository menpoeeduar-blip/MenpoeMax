import { useState, useRef, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import {
  useGetCommunities,
  useGetSuggestedCommunities,
  useJoinCommunity,
  useGetCommunity,
  useCreateCommunity,
  getGetCommunityQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { AppModal } from "@/components/ui/app-modal";
import {
  useGetCommunityPosts,
  useCreateCommunityPost,
  useUpdateCommunity,
  useGetMe,
  useLikePost,
} from "@workspace/api-client-react";
import { uploadFile } from "@/lib/upload";
import { Camera, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Globe, Lock, ArrowLeft, Plus, X, MessageCircle } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { CommentsPanel } from "@/components/comments/CommentsPanel";

function CreateCommunityModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", description: "", visibility: "public" });
  const [error, setError] = useState("");
  const createCommunity = useCreateCommunity();
  const qc = useQueryClient();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("El nombre es obligatorio"); return; }

    createCommunity.mutate(
      { data: { name: form.name, description: form.description || undefined, visibility: form.visibility as "public" | "private" } },
      {
        onSuccess: () => { qc.invalidateQueries(); onClose(); },
        onError: () => setError("Error al crear la comunidad. Intenta de nuevo."),
      }
    );
  };

  return (
    <AppModal open onClose={onClose} className="w-full max-w-md">
      <div className="glass-panel rounded-2xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Crear comunidad</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre *</label>
            <Input value={form.name} onChange={set("name")} placeholder="Nombre de la comunidad" className="rounded-xl bg-white/5" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea value={form.description} onChange={set("description")} placeholder="¿De qué trata tu comunidad?" rows={3}
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

function CommunityDetail({ communityId, onBack }: { communityId: string; onBack: () => void }) {
  const { data: community, isLoading } = useGetCommunity(communityId, { query: { enabled: !!communityId, queryKey: getGetCommunityQueryKey(communityId) } });
  const { data: me } = useGetMe();
  const { data: posts } = useGetCommunityPosts(communityId);
  const joinCommunity = useJoinCommunity();
  const createPost = useCreateCommunityPost();
  const updateCommunity = useUpdateCommunity();
  const likePost = useLikePost();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const isAdmin = community?.creatorId === me?.id;

  const uploadCommunityImage = async (file: File, field: "avatarUrl" | "coverUrl") => {
    try {
      const url = await uploadFile(file, { purpose: field === "avatarUrl" ? "avatar" : "cover" });
      updateCommunity.mutate({ communityId, data: { [field]: url } }, {
        onSuccess: () => { qc.invalidateQueries(); toast({ title: "Imagen actualizada" }); },
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

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"><ArrowLeft className="w-4 h-4" /> Volver</button>
      <div className="relative h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 mb-6 group">
        {community.coverUrl && <img src={community.coverUrl} className="w-full h-full object-cover" alt="" />}
        {isAdmin && (
          <>
            <button type="button" className="absolute top-3 right-3 p-2 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => coverRef.current?.click()}><Camera className="w-4 h-4 text-white" /></button>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCommunityImage(f, "coverUrl"); }} />
          </>
        )}
        <div className="absolute -bottom-8 left-6 group/avatar">
          <div className="w-16 h-16 rounded-2xl border-4 border-background bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-2xl overflow-hidden relative">
            {community.avatarUrl ? <img src={community.avatarUrl} className="w-full h-full object-cover" alt="" /> : community.name[0]}
            {isAdmin && (
              <>
                <button type="button" className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center" onClick={() => avatarRef.current?.click()}><Camera className="w-5 h-5" /></button>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCommunityImage(f, "avatarUrl"); }} />
              </>
            )}
          </div>
        </div>
      </div>
      <div className="pt-10 glass-panel rounded-2xl p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{community.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="w-4 h-4" />{community.membersCount.toLocaleString()} miembros</span>
              <span className="flex items-center gap-1">{community.visibility === "public" ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}{community.visibility === "public" ? "Pública" : "Privada"}</span>
            </div>
            {community.description && <p className="text-sm text-muted-foreground mt-3">{community.description}</p>}
          </div>
          <Button variant={community.isJoined ? "outline" : "default"} onClick={() => joinCommunity.mutate({ communityId }, { onSuccess: () => qc.invalidateQueries() })} data-testid="button-join-detail">
            {community.isJoined ? "Unido" : "Unirse"}
          </Button>
        </div>
      </div>
      {community.isJoined && (
        <div className="glass-panel rounded-2xl p-4 mb-4 space-y-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Publica en la comunidad..." rows={2} className="w-full rounded-xl bg-white/5 border border-input px-3 py-2 text-sm resize-none" />
          <Button className="neon-btn rounded-xl w-full" onClick={publish} disabled={createPost.isPending}>Publicar</Button>
        </div>
      )}
      <div className="space-y-3">
        {(posts ?? []).map((post: { id: string; content?: string; author?: { displayName?: string; avatarUrl?: string; id?: string }; likesCount?: number; mediaUrls?: string[] }) => (
          <div key={post.id} className="glass-panel rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <img
                src={post.author?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.id}`}
                className="w-8 h-8 rounded-full object-cover cursor-pointer"
                alt=""
                onClick={() => post.author?.id && setLocation(`/profile/${post.author.id}`)}
              />
              <button
                type="button"
                className="text-sm font-medium hover:text-primary"
                onClick={() => post.author?.id && setLocation(`/profile/${post.author.id}`)}
              >
                {post.author?.displayName}
              </button>
            </div>
            <p className="text-sm">{post.content}</p>
            {post.mediaUrls?.[0] && <img src={post.mediaUrls[0]} className="mt-2 rounded-xl max-h-64 w-full object-cover" alt="" />}
            <div className="flex items-center gap-3 mt-2">
              <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground" onClick={() => likePost.mutate({ postId: post.id, data: { reaction: "like" } }, { onSuccess: () => qc.invalidateQueries() })}>
                <Heart className="w-4 h-4" /> {post.likesCount ?? 0}
              </button>
              <button
                type="button"
                className={`flex items-center gap-1 text-xs ${openCommentsPostId === post.id ? "text-primary" : "text-muted-foreground"}`}
                onClick={() => setOpenCommentsPostId((id) => (id === post.id ? null : post.id))}
              >
                <MessageCircle className="w-4 h-4" /> Comentar
              </button>
            </div>
            {openCommentsPostId === post.id && (
              <CommentsPanel postId={post.id} testIdPrefix={`community-comment-${post.id}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Communities() {
  const params = useParams<{ id?: string }>();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"discover" | "joined">("discover");
  const [selectedId, setSelectedId] = useState<string | null>(params.id ?? null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (params.id) setSelectedId(params.id);
  }, [params.id]);

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
                <h1 className="text-3xl font-bold">Communities</h1>
                <p className="text-muted-foreground text-sm">Find your people</p>
              </div>
              <Button className="rounded-2xl" data-testid="button-create-community" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" />Crear
              </Button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar comunidades..." className="pl-12 h-12 rounded-2xl bg-white/5" data-testid="input-community-search" />
            </div>

            <div className="flex gap-2 mb-6">
              {(["discover", "joined"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === tab ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`} data-testid={`tab-communities-${tab}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {!search && activeTab === "discover" && suggested && suggested.length > 0 && (
              <div className="mb-8">
                <h2 className="font-semibold mb-3 text-muted-foreground text-sm uppercase tracking-wider">Suggested for you</h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {suggested.map((c) => (
                    <div key={c.id} className="flex-none w-44 glass-panel rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setSelectedId(c.id)}>
                      <div className="h-16 bg-gradient-to-br from-primary/20 to-accent/20 relative">
                        <div className="absolute -bottom-5 left-3">
                          <div className="w-10 h-10 rounded-xl border-2 border-background bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">{c.name[0]}</div>
                        </div>
                      </div>
                      <div className="pt-7 p-3">
                        <div className="font-medium text-sm truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.membersCount.toLocaleString()} members</div>
                        <Button size="sm" className="w-full mt-2 h-7 text-xs" onClick={(e) => { e.stopPropagation(); joinCommunity.mutate({ communityId: c.id }, { onSuccess: () => qc.invalidateQueries() }); }}>Join</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading
                ? [...Array(6)].map((_, i) => <div key={i} className="h-32 glass-panel rounded-2xl animate-pulse" />)
                : communities?.length === 0
                  ? <div className="col-span-full text-center py-16 text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" /><p>No se encontraron comunidades</p></div>
                  : communities?.map((community) => (
                    <div key={community.id} className="glass-panel rounded-2xl overflow-hidden hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedId(community.id)} data-testid={`card-community-${community.id}`}>
                      <div className="h-20 bg-gradient-to-br from-primary/10 to-accent/10 relative">
                        {community.coverUrl && <img src={community.coverUrl} className="w-full h-full object-cover" alt="" />}
                        <div className="absolute -bottom-5 left-4">
                          <div className="w-10 h-10 rounded-xl border-2 border-background bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                            {community.name[0]}
                          </div>
                        </div>
                      </div>
                      <div className="pt-7 p-4 flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{community.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{community.membersCount.toLocaleString()}</span>
                            <span className="flex items-center gap-1">{community.visibility === "public" ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}{community.visibility}</span>
                          </div>
                        </div>
                        <Button size="sm" variant={community.isJoined ? "outline" : "default"} onClick={(e) => { e.stopPropagation(); joinCommunity.mutate({ communityId: community.id }, { onSuccess: () => qc.invalidateQueries() }); }} data-testid={`button-join-${community.id}`}>
                          {community.isJoined ? "Joined" : "Join"}
                        </Button>
                      </div>
                    </div>
                  ))
              }
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
