import { useState, useRef, useMemo, useEffect, memo } from "react";
import { Link } from "wouter";
import {
  useLikePost,
  useSavePost,
  useGetMe,
  useDeletePost,
  useUpdatePost,
  usePinPost,
} from "@workspace/api-client-react";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  CheckCircle, MapPin, Radio, Flame, Pause, Play, X, Globe, Lock, Users as UsersIcon, Building2,
  Trash2, Edit3, Pin, PinOff, MessageSquareOff, MessageSquare as MessageSquareIcon, Star,
  ShoppingBag,
} from "lucide-react";
import { SharePostDialog } from "@/components/SharePostDialog";
import { PostGiftsStrip } from "@/components/gifts/PostGiftsStrip";
import { PostReactionPicker } from "@/components/feed/PostReactionPicker";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { createContentReport } from "@/lib/moderation";
import { auth } from "@/lib/firebase";
import { AdPostCard } from "@/components/ads/AdPostCard";
import { formatCOP } from "@/lib/format-currency";

export type PostCardProps = {
  post: any;
  showComments?: boolean;
  onToggleComments?: () => void;
  onOpenGift?: () => void;
};

// ─── ROUTER: Delegate ad posts to AdPostCard ──────────────────────────────────
export function PostCard(props: PostCardProps) {
  if (props.post?.postType === "ad") return <AdPostCard post={props.post} />;
  return <PostCardInner {...props} />;
}

// ─── VISUALIZADOR DE ENCUESTAS ───────────────────────────────────────────────
export function PollViewer({ post, meId }: { post: any; meId: string }) {
  const [poll, setPoll] = useState(post.poll);
  
  const totalVotes = useMemo(() => {
    if (!poll || !poll.options) return 0;
    return poll.options.reduce((acc: number, opt: any) => acc + (opt.votes?.length || 0), 0);
  }, [poll]);

  const handleVote = async (optionIndex: number) => {
    if (!poll || !poll.options) return;
    const nextOptions = poll.options.map((opt: any, idx: number) => {
      let votes = opt.votes || [];
      if (idx === optionIndex) {
        if (votes.includes(meId)) {
          votes = votes.filter((v: string) => v !== meId);
        } else {
          votes = [...votes, meId];
        }
      } else {
        votes = votes.filter((v: string) => v !== meId);
      }
      return { ...opt, votes };
    });
    const nextPoll = { ...poll, options: nextOptions };
    setPoll(nextPoll);

    if (auth.currentUser) {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const postRef = doc(db, "posts", post.id);
      await updateDoc(postRef, { poll: nextPoll });
    } else {
      const raw = localStorage.getItem("socialhub_data_v1");
      if (raw) {
        const d = JSON.parse(raw);
        const p = d.posts.find((x: any) => x.id === post.id);
        if (p) {
          p.poll = nextPoll;
          localStorage.setItem("socialhub_data_v1", JSON.stringify(d));
        }
      }
    }
  };

  return (
    <div className="border border-border/40 rounded-xl p-4 bg-white/5 mb-3 space-y-3">
      <p className="text-[10px] font-semibold text-primary uppercase tracking-widest flex items-center gap-1">
        📊 Encuesta interactiva
      </p>
      {poll.options.map((opt: any, idx: number) => {
        const votes = opt.votes || [];
        const isVoted = votes.includes(meId);
        const percent = totalVotes > 0 ? Math.round((votes.length / totalVotes) * 100) : 0;
        
        return (
          <div
            key={idx}
            onClick={() => handleVote(idx)}
            className={`relative h-11 rounded-xl border flex items-center justify-between px-4 overflow-hidden cursor-pointer transition-all hover:bg-white/10 ${
              isVoted ? "border-primary bg-primary/10" : "border-border/30"
            }`}
          >
            <div
              className="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
            <span className="relative text-xs font-medium text-foreground truncate z-10 flex items-center gap-2">
              {isVoted && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
              {opt.text}
            </span>
            <span className="relative text-xs text-muted-foreground z-10 flex items-center gap-2">
              <span>{votes.length} {votes.length === 1 ? "voto" : "votos"}</span>
              <span className="font-bold text-foreground">{percent}%</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── REPRODUCTOR DE NOTAS DE VOZ ─────────────────────────────────────────────
export function VoicePlayer({ src }: { src: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-border/30 rounded-2xl p-4 w-full max-w-sm mb-3">
      <Button
        onClick={togglePlay}
        variant="ghost"
        size="icon"
        className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex-none"
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </Button>
      <div className="flex-1 min-w-0">
        <div className="flex gap-0.5 items-end h-6 mb-1.5 px-1">
          {[...Array(24)].map((_, i) => {
            const h = isPlaying ? 4 + Math.random() * 18 : 6;
            return (
              <div
                key={i}
                className="flex-1 bg-primary/40 rounded-full transition-all duration-150"
                style={{
                  height: `${h}px`,
                  backgroundColor: progress >= (i / 24) * 100 ? "hsl(var(--primary))" : undefined
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || 0)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── ROAST HUMORÍSTICO CON IA ──────────────────────────────────────────────
export function getRoastText(content: string, authorName: string, isPoll: boolean, hasMedia: boolean) {
  const roasts = [
    `Vaya, ${authorName}. Vengo de ver agujeros negros supermasivos y aun así este post tiene menos gravedad de la esperada.`,
    `¿Estás intentando filosofar en internet, ${authorName}? Mi red neuronal prefiere mirar pintura secarse.`,
    `Qué post tan espectacular. Seguro que tus seguidores están aplaudiendo en el vacío existencial.`,
    `Interesante contenido, ${authorName}. La IA generativa se siente amenazada... de morir de aburrimiento.`,
    `Otro día, otro post irrelevante. Si los bytes costaran dinero, este post nos habría llevado a la bancarrota.`
  ];
  if (isPoll) {
    return `Una encuesta. Porque claramente la democracia en internet sirve para decidir cosas sumamente trascendentales. ¿Qué sigue, votar por el color de tus calcetines?`;
  }
  if (hasMedia) {
    return `Subiendo fotos para llamar la atención. Clásico de humanos necesitados de likes para rellenar su vacío existencial. 10/10 en esfuerzo de pose, 2/10 en originalidad.`;
  }
  if (content.length < 10) {
    return `Escribir menos de 10 caracteres requiere un nivel de pereza digno de admirar. ¿Se te cansaron los dedos o te quedaste sin ideas antes de empezar?`;
  }
  return roasts[Math.floor(Math.random() * roasts.length)];
}

const PostCardInner = memo(function PostCardInner({ post, showComments: initialShowComments = false, onToggleComments, onOpenGift }: PostCardProps) {
  const likePost = useLikePost();
  const savePost = useSavePost();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const pinPost = usePinPost();
  const qc = useQueryClient();
  const [internalShowComments, setInternalShowComments] = useState(initialShowComments);
  const showComments = onToggleComments ? initialShowComments : internalShowComments;
  const toggleComments = onToggleComments || (() => setInternalShowComments((v) => !v));

  const [showShare, setShowShare] = useState(false);
  const [localReaction, setLocalReaction] = useState<null | "like" | "love" | "haha" | "wow" | "sad">(
    (post.userReaction as any) ?? null
  );
  const [localLikesCount, setLocalLikesCount] = useState(post.likesCount ?? 0);
  const [localSaved, setLocalSaved] = useState(post.isSaved ?? false);
  const [localPinned, setLocalPinned] = useState(post.isPinned ?? false);
  const [localCommentsDisabled, setLocalCommentsDisabled] = useState(post.commentsDisabled ?? false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [deleted, setDeleted] = useState(false);

  const { toast } = useToast();
  const { data: me } = useGetMe();
  const { user: clerkUser } = useUser();
  const meId = me?.id || clerkUser?.id || "guest";
  const isMyPost = post.author?.id === meId || post.authorId === meId;

  const [roastText, setRoastText] = useState<string | null>(null);
  const [loadingRoast, setLoadingRoast] = useState(false);

  const handleRoast = () => {
    setLoadingRoast(true);
    setTimeout(() => {
      setRoastText(getRoastText(post.content || "", post.author?.displayName || "Usuario", !!post.poll, !!post.mediaUrls?.length));
      setLoadingRoast(false);
    }, 800);
  };

  const handleReport = () => {
    void createContentReport({
      targetType: "post",
      targetId: post.id,
      reason: "contenido_inapropiado",
    }).then(() => {
      toast({ title: "Reporte enviado", description: "Gracias. El equipo de moderación lo revisará." });
    });
  };

  const handleBlock = () => {
    try {
      const raw = localStorage.getItem("social_blocked_users_v1");
      const blocked = raw ? JSON.parse(raw) : [];
      if (!blocked.includes(post.author?.id)) blocked.push(post.author?.id);
      localStorage.setItem("social_blocked_users_v1", JSON.stringify(blocked));
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["user-posts"] });
    } catch {}
  };

  const handleDeletePost = () => {
    if (!window.confirm("¿Eliminar esta publicación permanentemente?")) return;
    setDeleted(true);
    deletePost.mutate(
      { postId: post.id },
      {
        onSuccess: () => toast({ title: "✓ Publicación eliminada" }),
        onError: () => {
          setDeleted(false);
          toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
        },
      }
    );
  };

  const handleEditSave = () => {
    updatePost.mutate(
      { postId: post.id, data: { content: editContent } },
      {
        onSuccess: () => {
          setShowEditModal(false);
          toast({ title: "✓ Publicación actualizada" });
        },
        onError: () => toast({ title: "Error", description: "No se pudo editar.", variant: "destructive" }),
      }
    );
  };

  const handlePin = () => {
    const next = !localPinned;
    setLocalPinned(next);
    pinPost.mutate(
      { postId: post.id, pinned: next },
      {
        onSuccess: () => toast({ title: next ? "📌 Publicación fijada" : "Publicación desfijada" }),
        onError: () => setLocalPinned(!next),
      }
    );
  };

  const handleToggleComments = () => {
    const next = !localCommentsDisabled;
    setLocalCommentsDisabled(next);
    updatePost.mutate(
      { postId: post.id, data: { commentsDisabled: next } },
      {
        onSuccess: () => toast({ title: next ? "💬 Comentarios desactivados" : "💬 Comentarios activados" }),
        onError: () => setLocalCommentsDisabled(!next),
      }
    );
  };

  const handleReact = (reaction: "like" | "love" | "haha" | "wow" | "sad") => {
    const prev = localReaction;
    const next = prev === reaction ? null : reaction;

    if (!prev && next) setLocalLikesCount((c: number) => c + 1);
    if (prev && !next) setLocalLikesCount((c: number) => Math.max(0, c - 1));

    setLocalReaction(next);

    likePost.mutate({ postId: post.id, data: { reaction: next ?? "remove" } });
  };

  const handleSave = () => {
    setLocalSaved(!localSaved);
    savePost.mutate({ postId: post.id });
  };

  const timeAgo = useMemo(() => {
    if (!post.createdAt) return "recientemente";
    try {
      return formatDistanceToNow(new Date(post.createdAt), { addSuffix: false });
    } catch {
      return "recientemente";
    }
  }, [post.createdAt]);

  const authorProfileId = post.author?.id ?? post.authorId;

  const isAudioMedia = (url: string) =>
    url.startsWith("data:audio") || url.includes("/audios/") || url.includes(".webm") || url.includes(".mp3");

  const isVideoMedia = (url: string) =>
    url.startsWith("data:video") || url.includes("/videos/") || url.endsWith(".mp4") || url.endsWith(".webm");

  if (deleted) return null;

  return (
    <div id={`post-${post.id}`} className="glass-panel neon-border neon-run-soft feed-post-card rounded-2xl p-4 scroll-mt-24" data-testid={`post-card-${post.id}`}>
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="w-full max-w-md glass-panel neon-border rounded-2xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base neon-text">✏️ Editar publicación</h3>
              <button type="button" onClick={() => setShowEditModal(false)} className="p-1 rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
            </div>
            <textarea
              className="w-full min-h-[120px] bg-white/5 border border-border/40 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="¿Qué quieres compartir?"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowEditModal(false)}>Cancelar</Button>
              <Button size="sm" className="rounded-xl neon-btn" onClick={handleEditSave} disabled={updatePost.isPending}>Guardar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Header autor */}
      <div className="flex items-center gap-3 mb-3">
        {post.authorType ? (
          // Entity post — link to the page/group/community, not the author's personal profile
          <div className="w-10 h-10 rounded-2xl overflow-hidden ring-2 ring-primary/30 flex-none bg-muted">
            <img
              src={post.entityAvatar ?? post.author?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.entityName}`}
              className="w-10 h-10 object-cover"
              alt=""
            />
          </div>
        ) : (
          <Link href={`/profile/${authorProfileId}`}>
            <img
              src={post.author?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorProfileId}`}
              className="w-10 h-10 rounded-full object-cover bg-muted cursor-pointer ring-2 ring-primary/20"
              alt=""
            />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {post.authorType ? (
              <span className="font-bold text-sm text-primary neon-text">
                {post.entityName || post.author?.displayName || "Publicación"}
              </span>
            ) : (
              <Link href={`/profile/${authorProfileId}`} className="font-semibold text-sm hover:text-primary truncate">
                {post.author?.displayName || "Usuario"}
              </Link>
            )}
            {post.author?.isVerified && <CheckCircle className="w-3.5 h-3.5 text-primary flex-none" />}
            {post.authorType === "page" && <span title="Página"><Building2 className="w-3 h-3 text-emerald-400 flex-none" /></span>}
            {post.authorType === "group" && <span title="Grupo"><UsersIcon className="w-3 h-3 text-violet-400 flex-none" /></span>}
            {post.authorType === "community" && <span title="Comunidad"><Globe className="w-3 h-3 text-sky-400 flex-none" /></span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>hace {timeAgo}</span>
            {post.visibility && (
              <span className="flex items-center gap-0.5 text-[10px] bg-white/5 px-1.5 py-0.5 rounded-md border border-border/30">
                {post.visibility === "publico" ? <Globe className="w-3 h-3 text-cyan-400" /> : post.visibility === "amigos" ? <UsersIcon className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-amber-400" />}
                <span className="capitalize">{post.visibility}</span>
              </span>
            )}
            {post.location && (
              <span className="flex items-center gap-0.5 text-primary font-medium text-[10px]">
                <MapPin className="w-3 h-3" /> {post.location}
              </span>
            )}
            {localPinned && (
              <span className="flex items-center gap-0.5 text-amber-400 font-medium text-[10px]">
                <Pin className="w-3 h-3" /> Fijado
              </span>
            )}
            {localCommentsDisabled && (
              <span className="flex items-center gap-0.5 text-orange-400/80 font-medium text-[10px]">
                <MessageSquareOff className="w-3 h-3" /> Comentarios off
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/10"><MoreHorizontal className="w-5 h-5" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-panel neon-border min-w-[210px] rounded-2xl p-1.5">
            {isMyPost ? (
              <>
                <DropdownMenuItem
                  className="flex gap-2 items-center cursor-pointer rounded-xl py-2"
                  onClick={() => { setEditContent(post.content || ""); setShowEditModal(true); }}
                >
                  <Edit3 className="w-4 h-4 text-primary" /> Editar publicación
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex gap-2 items-center cursor-pointer rounded-xl py-2"
                  onClick={handlePin}
                >
                  {localPinned ? <PinOff className="w-4 h-4 text-amber-400" /> : <Pin className="w-4 h-4 text-amber-400" />}
                  {localPinned ? "Desfijar publicación" : "📌 Fijar en mi perfil"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex gap-2 items-center cursor-pointer rounded-xl py-2"
                  onClick={handleToggleComments}
                >
                  {localCommentsDisabled
                    ? <MessageSquareIcon className="w-4 h-4 text-emerald-400" />
                    : <MessageSquareOff className="w-4 h-4 text-orange-400" />}
                  {localCommentsDisabled ? "Activar comentarios" : "Desactivar comentarios"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex gap-2 items-center cursor-pointer rounded-xl py-2 text-red-400 focus:text-red-300"
                  onClick={handleDeletePost}
                >
                  <Trash2 className="w-4 h-4" /> Eliminar publicación
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem className="flex gap-2 items-center cursor-pointer rounded-xl py-2" onClick={handleReport}>
                  Reportar publicación
                </DropdownMenuItem>
                <DropdownMenuItem className="flex gap-2 items-center cursor-pointer rounded-xl py-2" onClick={handleBlock}>
                  Bloquear autor
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>


      {/* Banner si es Live Stream */}
      {(post.postType === "live" || post.streamUrl) && (
        <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-red-600/30 to-pink-600/30 border border-red-500/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wide">Transmisión en Vivo</span>
          </div>
          <Link href="/streams">
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs h-7 gap-1">
              Ver Live
            </Button>
          </Link>
        </div>
      )}

      {/* Texto del post */}
      {post.content && <p className="text-sm whitespace-pre-wrap mb-3 leading-relaxed">{post.content}</p>}

      {/* RENDER DE PRODUCTO DE MARKETPLACE */}
      {(post.postType === "marketplace" || post.marketplaceListing) && (
        <div className="mb-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-primary/10 to-purple-500/10 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-none border border-cyan-400/40">
              <ShoppingBag className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block font-mono">
                🛍️ Menpoe Marketplace
              </span>
              <h4 className="font-bold text-sm text-foreground truncate">
                {post.marketplaceListing?.title || "Producto en venta"}
              </h4>
              {post.marketplaceListing?.price ? (
                <div className="text-sm font-extrabold text-cyan-300">
                  {formatCOP(post.marketplaceListing.price)}
                </div>
              ) : null}
            </div>
          </div>
          <Link href={post.marketplaceListing?.id ? `/marketplace/${post.marketplaceListing.id}` : "/marketplace"}>
            <Button size="sm" className="neon-btn rounded-xl text-xs font-bold gap-1.5 flex-none w-full sm:w-auto">
              <ShoppingBag className="w-3.5 h-3.5" /> Ver en Marketplace
            </Button>
          </Link>
        </div>
      )}

      {/* RENDER DE ENCUESTAS */}
      {post.poll && (
        <PollViewer post={post} meId={meId} />
      )}

      <PostGiftsStrip postId={post.id} giftsCount={post.giftsCount} />

      {post.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {post.hashtags.map((tag: string) => (
            <span key={tag} className="text-primary text-xs hover:underline cursor-pointer">#{tag}</span>
          ))}
        </div>
      )}

      {/* RENDER DE AUDIO / NOTA DE VOZ */}
      {post.mediaUrls && post.mediaUrls.length > 0 && isAudioMedia(post.mediaUrls[0]) && (
        <VoicePlayer src={post.mediaUrls[0]} />
      )}

      {/* RENDER DE MEDIOS IMAGEN Y VIDEO */}
      {post.mediaUrls && post.mediaUrls.length > 0 && !isAudioMedia(post.mediaUrls[0]) && (
        post.mediaUrls.length === 1 ? (
          <div className="rounded-xl overflow-hidden mb-3 border border-border/30 bg-black/30">
            {isVideoMedia(post.mediaUrls[0]) ? (
              <video src={post.mediaUrls[0]} controls className="w-full h-auto max-h-96 object-contain" />
            ) : (
              <img
                src={post.mediaUrls[0]}
                className="w-full h-auto object-cover max-h-96"
                alt=""
                loading="lazy"
                decoding="async"
              />
            )}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden mb-3 border border-border/30 bg-black/10">
            <div className="grid grid-cols-2 gap-[1px] bg-border/30">
              {post.mediaUrls.slice(0, 4).map((url: string, i: number) => (
                <div key={`${url}_${i}`} className="relative aspect-square bg-black/20 overflow-hidden">
                  {isVideoMedia(url) ? (
                    <video src={url} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={url} className="w-full h-full object-cover" alt="" loading="lazy" decoding="async" />
                  )}
                  {i === 3 && post.mediaUrls.length > 4 && (
                    <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">+{post.mediaUrls.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Roast Speech Bubble */}
      {roastText && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 mb-3 text-xs text-amber-300 relative animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-start mb-1 font-semibold text-amber-400">
            <span className="flex items-center gap-1">🔥 Roast de la IA:</span>
            <button onClick={() => setRoastText(null)} className="text-amber-400/60 hover:text-amber-300"><X className="w-3 h-3" /></button>
          </div>
          <p className="italic">"{roastText}"</p>
        </div>
      )}

      {/* Barra de reacciones e interacciones */}
      <div className="flex items-center gap-1 pt-3 border-t border-border/20 flex-wrap">
        <PostReactionPicker
          localReaction={localReaction}
          localLikesCount={localLikesCount}
          onReact={handleReact}
          testId={`button-like-${post.id}`}
        />

        <button
          type="button"
          onClick={!localCommentsDisabled ? toggleComments : undefined}
          disabled={localCommentsDisabled}
          className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-sm transition-colors touch-manipulation ${
            localCommentsDisabled
              ? "text-muted-foreground/40 cursor-not-allowed"
              : showComments ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-white/5 active:bg-white/10"
          }`}
          data-testid={`button-comment-${post.id}`}
          title={localCommentsDisabled ? "Comentarios desactivados" : "Comentarios"}
        >
          {localCommentsDisabled ? <MessageSquareOff className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
          <span>{post.commentsCount ?? 0}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowShare(true)}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-sm text-muted-foreground hover:bg-white/5 active:bg-white/10 touch-manipulation"
          data-testid={`button-share-${post.id}`}
        >
          <Share2 className="w-4 h-4" />
          <span>{post.sharesCount ?? 0}</span>
        </button>

        {onOpenGift && (
          <button
            type="button"
            onClick={onOpenGift}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-sm text-muted-foreground hover:bg-accent/20 hover:text-accent active:bg-accent/30 transition-colors touch-manipulation"
            data-testid={`button-gift-${post.id}`}
          >
            <span>🎁</span>
            <span>{post.giftsCount ?? 0}</span>
          </button>
        )}

        {/* AI Roast button */}
        <button
          type="button"
          onClick={handleRoast}
          disabled={loadingRoast}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-sm text-muted-foreground hover:bg-amber-500/10 hover:text-amber-400 active:bg-amber-500/20 transition-colors touch-manipulation"
          title="Roast con IA 🔥"
          data-testid={`button-roast-${post.id}`}
        >
          <Flame className={`w-4 h-4 ${loadingRoast ? "animate-pulse text-amber-400" : ""}`} />
        </button>

        <SharePostDialog open={showShare} onOpenChange={setShowShare} post={post} />

        <button
          type="button"
          onClick={handleSave}
          className={`ml-auto flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-sm transition-colors touch-manipulation ${localSaved ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-white/5 active:bg-white/10"}`}
          data-testid={`button-save-${post.id}`}
        >
          <Bookmark className="w-4 h-4" fill={localSaved ? "currentColor" : "none"} />
        </button>
      </div>

      {showComments && !localCommentsDisabled && <CommentsPanel postId={post.id} postAuthorId={post.author?.id ?? post.authorId} testIdPrefix={`comment-${post.id}`} />}
    </div>
  );
});
