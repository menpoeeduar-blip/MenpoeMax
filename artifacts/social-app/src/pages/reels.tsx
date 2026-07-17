import { useState, useRef, useEffect, useCallback } from "react";
import { Shell } from "@/components/layout/Shell";
import { useGetReels, useLikePost, useSavePost, useGetMe, useCreatePost } from "@workspace/api-client-react";
import { getLocalReelsPreview, resolveReelMediaUrl, REEL_FALLBACK_VIDEO } from "@/lib/reels-seed";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  CheckCircle,
  Play,
  Plus,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shareEntity } from "@/lib/share";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type ReelPost = {
  id: string;
  content?: string;
  mediaUrls?: string[];
  likesCount?: number;
  commentsCount?: number;
  hashtags?: string[];
  author: { id: string; displayName?: string; avatarUrl?: string; isVerified?: boolean };
};

function ReelSlide({
  post,
  isActive,
  muted,
  onToggleMute,
  liked,
  saved,
  onLike,
  onSave,
  onOpenComments,
}: {
  post: ReelPost;
  isActive: boolean;
  muted: boolean;
  onToggleMute: () => void;
  liked: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
  onOpenComments: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoState, setVideoState] = useState<"loading" | "ready" | "error">("loading");
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState(() => resolveReelMediaUrl(post));
  const [fallbackTried, setFallbackTried] = useState(false);

  useEffect(() => {
    setSrc(resolveReelMediaUrl(post));
    setFallbackTried(false);
    setVideoState("loading");
  }, [post.id, post.mediaUrls]);

  const tryPlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !src) return;
    v.muted = muted;
    try {
      await v.play();
      setPlaying(true);
      setVideoState("ready");
    } catch {
      setPlaying(false);
    }
  }, [muted, src]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) {
      setVideoState("error");
      return;
    }
    if (!isActive) {
      v.pause();
      setPlaying(false);
      return;
    }
    setVideoState("loading");
    v.muted = muted;
    const onCanPlay = () => void tryPlay();
    v.addEventListener("canplay", onCanPlay);
    if (v.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) void tryPlay();
    return () => v.removeEventListener("canplay", onCanPlay);
  }, [isActive, src, muted, tryPlay]);

  const handleVideoError = () => {
    if (!fallbackTried && src !== REEL_FALLBACK_VIDEO) {
      setFallbackTried(true);
      setSrc(REEL_FALLBACK_VIDEO);
      setVideoState("loading");
      return;
    }
    setVideoState("error");
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void tryPlay();
    else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <div
      data-reel-slide
      data-reel-id={post.id}
      className="h-full w-full shrink-0 snap-start snap-always relative bg-black overflow-hidden"
      data-testid={`reel-${post.id}`}
    >
      {src ? (
        <>
          <video
            key={`${post.id}-${src}`}
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-contain md:object-cover bg-black"
            src={src}
            muted={muted}
            loop
            playsInline
            autoPlay={isActive}
            preload={isActive ? "auto" : "none"}
            onLoadedData={() => isActive && void tryPlay()}
            onPlaying={() => { setPlaying(true); setVideoState("ready"); }}
            onPause={() => setPlaying(false)}
            onError={handleVideoError}
          />
          {videoState === "loading" && isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-[1]">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          )}
          {videoState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-[1] p-6 text-center">
              <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
              <p className="text-sm text-white/80">No se pudo cargar el video</p>
            </div>
          )}
          {!playing && isActive && videoState !== "loading" && videoState !== "error" && (
            <button
              type="button"
              className="absolute inset-0 z-[2] flex items-center justify-center"
              onClick={togglePlay}
              aria-label="Reproducir"
            >
              <span className="w-16 h-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              </span>
            </button>
          )}
          <button
            type="button"
            className="absolute inset-0 z-0 md:hidden"
            onClick={togglePlay}
            aria-hidden
          />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-violet-950 to-black">
          <p className="text-white/50 text-sm">Sin video</p>
        </div>
      )}

      <div className="absolute right-3 bottom-20 md:bottom-16 flex flex-col gap-4 items-center z-10 pointer-events-auto">
        <button type="button" onClick={onLike} className="flex flex-col items-center gap-1" data-testid={`button-like-reel-${post.id}`}>
          <div className={cn("w-11 h-11 rounded-full bg-black/50 backdrop-blur flex items-center justify-center", liked ? "text-red-500" : "text-white")}>
            <Heart className="w-5 h-5" fill={liked ? "currentColor" : "none"} />
          </div>
          <span className="text-white text-xs font-medium drop-shadow">{post.likesCount ?? 0}</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-1" onClick={onOpenComments} data-testid={`button-comment-reel-${post.id}`}>
          <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white">
            <MessageCircle className="w-5 h-5" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow">{post.commentsCount ?? 0}</span>
        </button>
        <button type="button" onClick={onSave} className="flex flex-col items-center gap-1" data-testid={`button-save-reel-${post.id}`}>
          <div className={cn("w-11 h-11 rounded-full bg-black/50 backdrop-blur flex items-center justify-center", saved ? "text-primary" : "text-white")}>
            <Bookmark className="w-5 h-5" fill={saved ? "currentColor" : "none"} />
          </div>
        </button>
        <button
          type="button"
          className="flex flex-col items-center gap-1"
          onClick={() => shareEntity({ title: "Reel Menpoe", text: post.content || "Mira este reel", path: "/reels" })}
        >
          <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white">
            <Share2 className="w-5 h-5" />
          </div>
        </button>
        <button type="button" onClick={onToggleMute} className="w-11 h-11 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white">
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-14 p-3 pb-3 md:pb-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none">
        <div className="flex items-center gap-2 mb-1.5">
          <img
            src={post.author.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.id}`}
            className="w-8 h-8 rounded-full border-2 border-primary object-cover"
            alt=""
          />
          <span className="text-white font-semibold text-sm">{post.author.displayName}</span>
          {post.author.isVerified && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
        </div>
        <p className="text-white text-xs sm:text-sm line-clamp-2 drop-shadow">{post.content}</p>
        {(post.hashtags?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {post.hashtags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-primary text-xs">#{tag.replace(/^#/, "")}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateReelModal({ onClose }: { onClose: () => void }) {
  const create = useCreatePost();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("https://download.samplelib.com/mp4/sample-5s.mp4");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      toast({ title: "Agrega un enlace de video MP4", variant: "destructive" });
      return;
    }
    create.mutate(
      {
        data: {
          content: caption.trim() || "Mi reel en Menpoe",
          postType: "reel",
          mediaUrls: [videoUrl.trim()],
          visibility: "publico",
          hashtags: ["reels", "menpoe"],
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Reel publicado", description: "Visible para toda la comunidad." });
          qc.invalidateQueries({ queryKey: ["reels"] });
          onClose();
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <form className="glass-panel neon-border rounded-2xl p-5 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold neon-title">Publicar reel</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Enlace del video (MP4)</label>
          <Input className="neon-input rounded-xl" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://...mp4" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Descripción</label>
          <Input className="neon-input rounded-xl" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="¿De qué trata tu reel?" />
        </div>
        <Button type="submit" className="neon-btn w-full rounded-xl" disabled={create.isPending}>
          {create.isPending ? "Publicando..." : "Publicar reel"}
        </Button>
      </form>
    </div>
  );
}

export default function Reels() {
  const { data: reelsData, isLoading, refetch } = useGetReels();
  const { data: me } = useGetMe();
  const likePost = useLikePost();
  const savePost = useSavePost();
  const qc = useQueryClient();
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const posts: ReelPost[] =
    reelsData?.posts?.length
      ? (reelsData.posts as ReelPost[])
      : !isLoading
        ? (getLocalReelsPreview() as ReelPost[])
        : [];

  useEffect(() => {
    if (posts.length && !activeId) setActiveId(posts[0].id);
  }, [posts, activeId]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !posts.length) return;

    const slides = root.querySelectorAll<HTMLElement>("[data-reel-slide]");
    const obs = new IntersectionObserver(
      (entries) => {
        let best: { id: string; ratio: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.getAttribute("data-reel-id");
          if (!id) continue;
          const ratio = entry.intersectionRatio;
          if (!best || ratio > best.ratio) best = { id, ratio };
        }
        if (best && best.ratio >= 0.4) setActiveId(best.id);
      },
      { root, threshold: [0.4, 0.55, 0.7, 0.9] },
    );

    slides.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [posts.length]);

  const handleLike = useCallback(
    (postId: string) => {
      setLiked((l) => ({ ...l, [postId]: !l[postId] }));
      likePost.mutate({ postId, data: { reaction: "like" } }, { onSuccess: () => qc.invalidateQueries({ queryKey: ["reels"] }) });
    },
    [likePost, qc],
  );

  const handleSave = useCallback(
    (postId: string) => {
      setSaved((s) => ({ ...s, [postId]: !s[postId] }));
      savePost.mutate({ postId }, { onSuccess: () => qc.invalidateQueries({ queryKey: ["reels"] }) });
    },
    [savePost, qc],
  );

  return (
    <Shell>
      <div className="h-full min-h-0 flex flex-col relative">
        <div className="absolute top-2 right-2 z-20">
          <Button size="sm" className="neon-btn rounded-full shadow-lg h-9" onClick={() => setShowCreate(true)} data-testid="button-create-reel">
            <Plus className="w-4 h-4 mr-1" /> Reel
          </Button>
        </div>
        {showCreate && <CreateReelModal onClose={() => setShowCreate(false)} />}

        <Sheet open={!!commentsPostId} onOpenChange={(open) => !open && setCommentsPostId(null)}>
          <SheetContent side="bottom" className="glass-panel neon-border border-t rounded-t-2xl h-[min(85dvh,560px)] p-4 flex flex-col">
            <h3 className="font-semibold text-sm mb-3 shrink-0">Comentarios</h3>
            {commentsPostId && (
              <CommentsPanel postId={commentsPostId} variant="sheet" testIdPrefix={`reel-comment-${commentsPostId}`} />
            )}
          </SheetContent>
        </Sheet>

        <div
          ref={scrollRef}
          className="h-full min-h-0 w-full max-w-[min(100%,420px)] mx-auto overflow-y-scroll overflow-x-hidden snap-y snap-mandatory overscroll-y-contain bg-black md:rounded-xl md:border md:border-primary/20"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {isLoading ? (
            [...Array(2)].map((_, i) => (
              <div key={i} className="h-full w-full shrink-0 snap-start flex items-center justify-center bg-muted/20 animate-pulse" />
            ))
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <ReelSlide
                key={post.id}
                post={post}
                isActive={activeId === post.id}
                muted={muted}
                onToggleMute={() => setMuted((m) => !m)}
                liked={!!liked[post.id] || !!(post as { isLiked?: boolean }).isLiked}
                saved={!!saved[post.id] || !!(post as { isSaved?: boolean }).isSaved}
                onLike={() => handleLike(post.id)}
                onSave={() => handleSave(post.id)}
                onOpenComments={() => setCommentsPostId(post.id)}
              />
            ))
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 text-white/70">
              <Play className="w-14 h-14 text-white/30 mb-4" />
              <p className="text-lg font-medium text-white">Aún no hay reels</p>
              <Button className="neon-btn rounded-xl mt-4" onClick={() => refetch()}>Recargar</Button>
              {me && (
                <Button variant="outline" className="rounded-xl mt-3" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Publicar reel
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
