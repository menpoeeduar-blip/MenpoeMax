import { useState, useRef, useCallback, useMemo, memo, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import {
  useGetFeed,
  useGetStories,
  useCreatePost,
  useLikePost,
  useSavePost,
  useGetMe,
  useGeneratePost,
  useRequestUploadUrl,
  useCreateStory,
  getGetStoriesQueryKey,
} from "@workspace/api-client-react";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Image, Smile, Sparkles, CheckCircle, Sticker,
  FileText, X, Plus, Gift as GiftIcon,
} from "lucide-react";
import { StickerPicker } from "@/components/stickers/StickerPicker";
import { uploadFile, LOCAL_STORAGE_BUDGET_HINT } from "@/lib/upload";
import { SharePostDialog } from "@/components/SharePostDialog";
import { BirthdayFeedBanner } from "@/components/BirthdayFeedBanner";
import { GiftPickerSheet, type GiftPickerTarget } from "@/components/gifts/GiftPickerSheet";
import { PostGiftsStrip } from "@/components/gifts/PostGiftsStrip";
import { PostReactionPicker } from "@/components/feed/PostReactionPicker";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { FormSelect } from "@/components/ui/form-select";
import { Link } from "wouter";
import { createContentReport } from "@/lib/moderation";

type PostCardProps = {
  post: any;
  showComments: boolean;
  onToggleComments: () => void;
  onOpenGift: () => void;
};

const PostCard = memo(function PostCard({ post, showComments, onToggleComments, onOpenGift }: PostCardProps) {
  const likePost = useLikePost();
  const savePost = useSavePost();
  const qc = useQueryClient();
  const [showShare, setShowShare] = useState(false);
  const [localReaction, setLocalReaction] = useState<null | "like" | "love" | "haha" | "wow" | "sad">(
    (post.userReaction as any) ?? null
  );
  const [localLikesCount, setLocalLikesCount] = useState(post.likesCount ?? 0);
  const [localSaved, setLocalSaved] = useState(post.isSaved ?? false);
  const { toast } = useToast();
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
      if (!blocked.includes(post.author.id)) blocked.push(post.author.id);
      localStorage.setItem("social_blocked_users_v1", JSON.stringify(blocked));
      qc.invalidateQueries({ queryKey: ["feed"] });
    } catch {}
  };

  const handleReact = (reaction: "like" | "love" | "haha" | "wow" | "sad") => {
    const prev = localReaction;
    const next = prev === reaction ? null : reaction;

    // Optimistic UI:
    if (!prev && next) setLocalLikesCount((c: number) => c + 1);
    if (prev && !next) setLocalLikesCount((c: number) => Math.max(0, c - 1));
    setLocalReaction(next);

    likePost.mutate({ postId: post.id, data: { reaction: next ?? "remove" } });
  };

  const handleSave = () => {
    setLocalSaved(!localSaved);
    savePost.mutate({ postId: post.id });
  };

  const timeAgo = useMemo(
    () => formatDistanceToNow(new Date(post.createdAt), { addSuffix: false }),
    [post.createdAt],
  );
  const authorProfileId = post.author?.id ?? post.authorId;

  return (
    <div id={`post-${post.id}`} className="glass-panel neon-border neon-run-soft feed-post-card rounded-2xl p-4 scroll-mt-24" data-testid={`post-card-${post.id}`}>
      <div className="flex items-center gap-3 mb-3">
        <Link href={`/profile/${authorProfileId}`}>
          <img
            src={post.author.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorProfileId}`}
            className="w-10 h-10 rounded-full object-cover bg-muted cursor-pointer"
            alt=""
          />
        </Link>
        <div className="flex-1">
          <Link href={`/profile/${authorProfileId}`} className="font-semibold text-sm flex items-center gap-1 hover:text-primary w-fit">
            {post.author.displayName}
            {post.author.isVerified && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
          </Link>
          <div className="text-xs text-muted-foreground">hace {timeAgo}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleReport}>Reportar publicación</DropdownMenuItem>
            <DropdownMenuItem onClick={handleBlock}>Bloquear autor</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-sm whitespace-pre-wrap mb-3 leading-relaxed">{post.content}</p>

      <PostGiftsStrip postId={post.id} giftsCount={post.giftsCount} />

      {post.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {post.hashtags.map((tag: string) => (
            <span key={tag} className="text-primary text-xs hover:underline cursor-pointer">#{tag}</span>
          ))}
        </div>
      )}

      {post.mediaUrls && post.mediaUrls.length > 0 && (
        post.mediaUrls.length === 1 ? (
          <div className="rounded-xl overflow-hidden mb-3 border border-border/30">
            <img
              src={post.mediaUrls[0]}
              className="w-full h-auto object-cover max-h-96"
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden mb-3 border border-border/30 bg-black/10">
            <div className="grid grid-cols-2 gap-[1px] bg-border/30">
              {post.mediaUrls.slice(0, 4).map((url: string, i: number) => (
                <div key={`${url}_${i}`} className="relative aspect-square bg-black/20 overflow-hidden">
                  <img src={url} className="w-full h-full object-cover" alt="" loading="lazy" decoding="async" />
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

      <div className="flex items-center gap-1 pt-3 border-t border-border/20 flex-wrap">
        <PostReactionPicker
          localReaction={localReaction}
          localLikesCount={localLikesCount}
          onReact={handleReact}
          testId={`button-like-${post.id}`}
        />

        <button
          type="button"
          onClick={onToggleComments}
          className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-sm transition-colors touch-manipulation ${showComments ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-white/5 active:bg-white/10"}`}
          data-testid={`button-comment-${post.id}`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.commentsCount}</span>
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
        <button
          type="button"
          onClick={onOpenGift}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-sm text-muted-foreground hover:bg-accent/20 hover:text-accent active:bg-accent/30 transition-colors touch-manipulation"
          data-testid={`button-gift-${post.id}`}
        >
          <GiftIcon className="w-4 h-4" />
          <span>{post.giftsCount ?? 0}</span>
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

      {showComments && <CommentsPanel postId={post.id} testIdPrefix={`comment-${post.id}`} />}
    </div>
  );
});

function CreatePostBox() {
  const { data: me } = useGetMe();
  const { user: clerkUser } = useUser();
  const createPost = useCreatePost();
  const generatePost = useGeneratePost();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [visibility, setVisibility] = useState<"publico" | "amigos" | "solo_yo">("publico");
  const [location, setLocation] = useState("");

  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadFile(file, { purpose: "post" });
        setMediaFiles((prev) => [...prev, url]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo subir el archivo.";
      toast({ title: "Error al subir", description: `${msg} ${LOCAL_STORAGE_BUDGET_HINT}` });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePost = () => {
    if (!content.trim() && mediaFiles.length === 0) return;
    createPost.mutate(
      { data: { content, mediaUrls: mediaFiles.length > 0 ? mediaFiles : undefined, postType: mediaFiles.length > 0 ? "image" : "text", visibility, location: location || undefined } },
      {
        onSuccess: () => { setContent(""); setMediaFiles([]); setExpanded(false); qc.invalidateQueries({ queryKey: ["feed"] }); },
        onError: () => toast({ title: "No se pudo publicar", description: "Revisa tu conexión e inténtalo de nuevo." }),
      }
    );
  };

  const handleGenerate = () => {
    if (!aiPrompt.trim()) return;
    generatePost.mutate(
      { data: { topic: aiPrompt } },
      { onSuccess: (result) => { setContent(result.content); setShowAI(false); setAiPrompt(""); setExpanded(true); } }
    );
  };

  const avatar = me?.avatarUrl ?? clerkUser?.imageUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${me?.id}`;

  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="flex gap-3 items-start">
        <img src={avatar} className="w-10 h-10 rounded-full object-cover bg-muted flex-none" alt="" />
        <div className="flex-1">
          {expanded ? (
            <>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="¿Qué estás pensando?"
                className="min-h-[100px] bg-white/5 border-border/30 rounded-xl resize-none text-sm"
                data-testid="textarea-post"
                autoFocus
              />
              {showAI && (
                <div className="mt-2 flex gap-2">
                  <Input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    placeholder="Describe el tema para IA..."
                    className="text-sm bg-white/5 border-border/30 rounded-xl"
                    data-testid="input-ai-prompt"
                  />
                  <Button size="sm" onClick={handleGenerate} disabled={generatePost.isPending} className="rounded-xl">
                    {generatePost.isPending ? "Generando..." : "Generar"}
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <FormSelect
                  value={visibility}
                  onValueChange={(v) => setVisibility(v as "publico" | "amigos" | "solo_yo")}
                  options={[
                    { value: "publico", label: "Público" },
                    { value: "amigos", label: "Amigos" },
                    { value: "solo_yo", label: "Solo yo" },
                  ]}
                />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ubicación (opcional)"
                  className="h-9 rounded-xl bg-white/5 border-border/30 text-sm"
                />
              </div>
              {mediaFiles.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {mediaFiles.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                      <img src={url} className="w-full h-full object-cover" alt="" loading="lazy" decoding="async" />
                      <button onClick={() => setMediaFiles((prev) => prev.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-3">
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5"><Image className="w-5 h-5" /></button>
                <button type="button" onClick={() => setShowStickerPicker(true)} className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5" data-testid="button-post-sticker"><Sticker className="w-5 h-5" /></button>
                <button className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5"><Smile className="w-5 h-5" /></button>
                <button onClick={() => setShowAI(!showAI)} className={`transition-colors p-1.5 rounded-lg hover:bg-white/5 ${showAI ? "text-primary" : "text-muted-foreground hover:text-primary"}`} data-testid="button-ai-generate">
                  <Sparkles className="w-5 h-5" />
                </button>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setExpanded(false); setContent(""); }} className="rounded-xl">Cancelar</Button>
                  <Button size="sm" onClick={handlePost} disabled={(!content.trim() && mediaFiles.length === 0) || createPost.isPending} className="rounded-xl" data-testid="button-post">
                    {createPost.isPending ? "Publicando..." : "Publicar"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <button onClick={() => setExpanded(true)} className="w-full text-left bg-white/5 rounded-xl px-4 py-3 text-muted-foreground text-sm hover:bg-white/8 transition-colors" data-testid="button-create-post">
              ¿Qué estás pensando?
            </button>
          )}
        </div>
      </div>
      <StickerPicker
        open={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelect={(s) => {
          setMediaFiles((prev) => [...prev, s.imageUrl]);
          if (!content.trim()) setContent(s.label);
          setExpanded(true);
        }}
      />
    </div>
  );
}

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

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo subir la historia.";
      toast({ title: "Error al subir", description: `${msg} ${LOCAL_STORAGE_BUDGET_HINT}` });
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
                  <div key={group.user.id} className="flex-none flex flex-col items-center gap-1.5 cursor-pointer group" data-testid={`story-${group.user.id}`}>
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
