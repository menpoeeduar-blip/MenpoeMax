import { useState, useRef, useCallback, useMemo, memo, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import {
  useGetFeed,
  useGetStories,
  useGetMe,
  useCreateStory,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Plus,
} from "lucide-react";
import { uploadFile, LOCAL_STORAGE_BUDGET_HINT } from "@/lib/upload";
import { BirthdayFeedBanner } from "@/components/BirthdayFeedBanner";
import { GiftPickerSheet, type GiftPickerTarget } from "@/components/gifts/GiftPickerSheet";
import { CreatePostBox } from "@/components/feed/CreatePostBox";
import { PostCard } from "@/components/feed/PostCard";
import { useUser } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// ─── PRESSETS DE HISTORIAS CON DEGRADADOS ────────────────────────────────────
function getGradientClass(preset: string) {
  switch (preset) {
    case "sunset": return "bg-gradient-to-tr from-amber-500 via-red-500 to-fuchsia-600";
    case "cyberpunk": return "bg-gradient-to-tr from-purple-800 via-fuchsia-700 to-cyan-500";
    case "ocean": return "bg-gradient-to-tr from-cyan-600 to-blue-800";
    case "twilight": return "bg-gradient-to-tr from-slate-900 to-indigo-900";
    default: return "bg-gradient-to-tr from-slate-900 to-indigo-900";
  }
}

// ─── CREADOR DE HISTORIAS CON DEGRADADOS (FEATURE 2) ─────────────────────────
function StoryCreator({ onClose }: { onClose: () => void }) {
  const { data: me } = useGetMe();
  const createStory = useCreateStory();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gradient stories logic
  const [storyType, setStoryType] = useState<"media" | "text">("media");
  const [textStory, setTextStory] = useState("");
  const [selectedGradient, setSelectedGradient] = useState("sunset");

  const GRADIENTS = [
    { name: "sunset", label: "Atardecer", css: "bg-gradient-to-tr from-amber-500 via-red-500 to-fuchsia-600" },
    { name: "cyberpunk", label: "Ciberpunk", css: "bg-gradient-to-tr from-purple-800 via-fuchsia-700 to-cyan-500" },
    { name: "ocean", label: "Océano", css: "bg-gradient-to-tr from-cyan-600 to-blue-800" },
    { name: "twilight", label: "Crepúsculo", css: "bg-gradient-to-tr from-slate-900 to-indigo-900" },
  ];

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      if (storyType === "text") {
        if (!textStory.trim()) return;
        createStory.mutate(
          { data: { mediaUrl: selectedGradient, mediaType: "text", text: textStory.trim() } },
          {
            onSuccess: () => {
              qc.invalidateQueries({ queryKey: getGetStoriesQueryKey() });
              onClose();
            },
            onError: () => {
              toast({ title: "No se pudo publicar la historia", description: "Intenta de nuevo en unos segundos." });
            },
          }
        );
      } else {
        if (!file) return;
        const url = await uploadFile(file, { purpose: "story" });
        const mediaType = file.type.startsWith("video") ? "video" : "image";
        createStory.mutate(
          { data: { mediaUrl: url, mediaType: mediaType as "image" | "video", text: text || undefined } },
          {
            onSuccess: () => {
              qc.invalidateQueries({ queryKey: getGetStoriesQueryKey() });
              onClose();
            },
            onError: () => {
              toast({ title: "No se pudo publicar la historia", description: "Intenta de nuevo en unos segundos." });
            },
          }
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo subir la historia.";
      toast({ title: "Error al subir", description: msg });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Agregar historia</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-3">
          <button
            onClick={() => setStoryType("media")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${storyType === "media" ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5"}`}
          >
            Foto / Video
          </button>
          <button
            onClick={() => setStoryType("text")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${storyType === "text" ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5"}`}
          >
            Texto
          </button>
        </div>

        {storyType === "media" ? (
          <div className="space-y-4">
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleSelect} />
            {!preview ? (
              <button onClick={() => fileInputRef.current?.click()} className="w-full h-48 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors bg-white/5">
                <Image className="w-10 h-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Haz clic para subir foto o video</span>
              </button>
            ) : (
              <div className="relative rounded-xl overflow-hidden">
                {file?.type.startsWith("video") ? (
                  <video src={preview} className="w-full max-h-64 object-cover" controls preload="metadata" />
                ) : (
                  <img src={preview} className="w-full max-h-64 object-cover" alt="" loading="lazy" decoding="async" />
                )}
                <button onClick={() => { setFile(null); setPreview(""); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
            )}
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Agrega una descripción (opcional)" />
            <Button onClick={handleUpload} disabled={!file || uploading} className="w-full rounded-xl">
              {uploading ? "Subiendo..." : "Compartir historia"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Text Story Preview */}
            <div className={`w-full h-48 rounded-xl flex items-center justify-center p-6 text-white text-sm sm:text-base font-bold text-center leading-relaxed ${GRADIENTS.find(g => g.name === selectedGradient)?.css}`}>
              {textStory || "Escribe tu historia aquí..."}
            </div>

            {/* Gradient Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Fondo degradado</Label>
              <div className="flex gap-3">
                {GRADIENTS.map(g => (
                  <button
                    key={g.name}
                    onClick={() => setSelectedGradient(g.name)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${selectedGradient === g.name ? "border-primary scale-110 shadow-lg" : "border-transparent"}`}
                  >
                    <div className={`w-full h-full rounded-full ${g.css}`} />
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              value={textStory}
              onChange={(e) => setTextStory(e.target.value.slice(0, 160))}
              placeholder="¿Qué quieres compartir hoy?"
              className="min-h-[80px] bg-white/5 border-border/30 rounded-xl resize-none text-sm"
            />
            <p className="text-[10px] text-right text-muted-foreground">{textStory.length}/160 caracteres</p>

            <Button onClick={handleUpload} disabled={!textStory.trim() || uploading} className="w-full rounded-xl">
              {uploading ? "Subiendo..." : "Compartir historia de texto"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── VISUALIZADOR DE HISTORIAS COMPLETO (FEATURE 2) ──────────────────────────
function StoryViewer({ group, onClose }: { group: any; onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const story = group.stories[currentIndex];
  const duration = 5000; // 5s por historia
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const interval = 100;
    const steps = duration / interval;
    let stepCount = 0;
    const timer = setInterval(() => {
      stepCount++;
      setProgress((stepCount / steps) * 100);
      if (stepCount >= steps) {
        clearInterval(timer);
        if (currentIndex < group.stories.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          onClose();
        }
      }
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, group.stories.length]);

  if (!story) return null;

  const prev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const next = () => {
    if (currentIndex < group.stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-black/95 border-none p-0 overflow-hidden select-none">
        <div className="relative aspect-[9/16] w-full flex flex-col justify-between p-4">
          {/* Progress Indicators */}
          <div className="absolute top-3 inset-x-4 flex gap-1 z-20">
            {group.stories.map((_: any, idx: number) => (
              <div key={idx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-100 ease-linear"
                  style={{
                    width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? "100%" : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="flex items-center gap-2 mt-4 z-20">
            <img
              src={group.user.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${group.user.id}`}
              className="w-8 h-8 rounded-full border border-white/20"
              alt=""
            />
            <div>
              <span className="text-white text-xs font-semibold block">{group.user.displayName || group.user.username}</span>
              <span className="text-white/50 text-[10px]">@{group.user.username}</span>
            </div>
            <button onClick={onClose} className="ml-auto text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          {/* Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            {story.mediaType === "text" ? (
              <div className={`w-full h-full flex items-center justify-center p-8 text-white text-lg sm:text-xl font-bold text-center leading-relaxed ${getGradientClass(story.mediaUrl)}`}>
                {story.text}
              </div>
            ) : story.mediaType === "video" ? (
              <video src={story.mediaUrl} className="w-full h-full object-cover" autoPlay playsInline muted />
            ) : (
              <img src={story.mediaUrl} className="w-full h-full object-cover" alt="" />
            )}
          </div>

          {/* Story Text overlay for media type */}
          {story.mediaType !== "text" && story.text && (
            <div className="absolute bottom-16 inset-x-4 text-center bg-black/40 backdrop-blur-sm rounded-xl p-3 z-20 border border-white/5">
              <p className="text-white text-sm font-medium">{story.text}</p>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="absolute inset-y-0 left-0 w-1/4 cursor-pointer z-10 flex items-center justify-start pl-2" onClick={prev}>
            {currentIndex > 0 && <button className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"><ArrowLeft className="w-4 h-4" /></button>}
          </div>
          <div className="absolute inset-y-0 right-0 w-1/4 cursor-pointer z-10 flex items-center justify-end pr-2" onClick={next}>
            <button className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"><ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Feed() {
  const [feedMode, setFeedMode] = useState<"para_ti" | "siguiendo">("para_ti");
  const feedParams = feedMode === "siguiendo" ? { following: true } : undefined;
  const { data: postsData, isPending: feedPending } = useGetFeed(feedParams);
  const { data: stories, isLoading: storiesLoading } = useGetStories();
  const { data: me } = useGetMe();
  const { user: clerkUser } = useUser();
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [openCommentsIds, setOpenCommentsIds] = useState<Set<string>>(() => new Set());
  const [giftTarget, setGiftTarget] = useState<GiftPickerTarget | null>(null);

  // Viewer state
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<any>(null);

  const toggleComments = useCallback((postId: string) => {
    setOpenCommentsIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }, []);

  const blockedUsers = useMemo(() => {
    try {
      const raw = localStorage.getItem("social_blocked_users_v1");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }, []);

  const visiblePosts = useMemo(
    () => (postsData?.posts ?? []).filter((p) => !blockedUsers.includes(p.authorId)),
    [postsData?.posts, blockedUsers],
  );

  const showFeedSkeleton = feedPending && !postsData?.posts?.length;

  useEffect(() => {
    const postId = new URLSearchParams(window.location.search).get("post");
    if (!postId || showFeedSkeleton) return;
    const el = document.getElementById(`post-${postId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary");
      setOpenCommentsIds((prev) => new Set(prev).add(postId));
      const t = window.setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 3000);
      return () => window.clearTimeout(t);
    }
  }, [showFeedSkeleton, visiblePosts.length]);

  return (
    <Shell>
      <div className="max-w-3xl mx-auto w-full">
        <div className="p-4 space-y-4 pb-24 min-w-0">
          {showStoryCreator && <StoryCreator onClose={() => setShowStoryCreator(false)} />}
          {selectedStoryGroup && <StoryViewer group={selectedStoryGroup} onClose={() => setSelectedStoryGroup(null)} />}
          
          {/* Stories Bar */}
          <section>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none" style={{ scrollbarWidth: "none" }}>
              <div onClick={() => setShowStoryCreator(true)} className="flex-none flex flex-col items-center gap-1.5 cursor-pointer">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-border/50 flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="text-[10px] text-muted-foreground">Historia</span>
              </div>
              {storiesLoading
                ? [...Array(6)].map((_, i) => <div key={i} className="flex-none w-14 h-14 rounded-full bg-muted animate-pulse" />)
                : stories?.map((group) => (
                  <div key={group.user.id} onClick={() => setSelectedStoryGroup(group)} className="flex-none flex flex-col items-center gap-1.5 cursor-pointer group" data-testid={`story-${group.user.id}`}>
                    <div className={`w-14 h-14 rounded-full p-[2px] ${group.hasUnviewed ? "bg-gradient-to-tr from-primary to-accent" : "bg-border"}`}>
                      <img src={group.user.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${group.user.id}`} alt="" className="w-full h-full rounded-full border-2 border-background object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <span className="text-[10px] text-muted-foreground max-w-[56px] truncate">{group.user.username}</span>
                  </div>
                ))
              }
            </div>
          </section>

          <Tabs value={feedMode} onValueChange={(v) => setFeedMode(v as "para_ti" | "siguiendo")}>
            <TabsList className="bg-card/70 border border-border rounded-xl">
              <TabsTrigger value="para_ti">Para ti</TabsTrigger>
              <TabsTrigger value="siguiendo">Siguiendo</TabsTrigger>
            </TabsList>
          </Tabs>

          <CreatePostBox />

          <BirthdayFeedBanner />

          <section className="space-y-4">
            {showFeedSkeleton
              ? [...Array(3)].map((_, i) => <div key={i} className="h-48 glass-panel rounded-2xl animate-pulse" />)
              : visiblePosts.length === 0
                ? (
                  <div className="glass-panel rounded-2xl p-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="font-medium mb-1">Tu inicio está vacío</p>
                    <p className="text-sm text-muted-foreground">Sigue personas y comunidades para ver sus publicaciones aquí</p>
                  </div>
                )
                : visiblePosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    showComments={openCommentsIds.has(post.id)}
                    onToggleComments={() => toggleComments(post.id)}
                    onOpenGift={() =>
                      setGiftTarget({
                        postId: post.id,
                        receiverId: post.authorId,
                        receiverName: post.author?.displayName,
                      })
                    }
                  />
                ))
            }
          </section>
        </div>
      </div>

      <GiftPickerSheet
        open={!!giftTarget}
        onOpenChange={(open) => {
          if (!open) setGiftTarget(null);
        }}
        target={giftTarget}
      />
    </Shell>
  );
}
