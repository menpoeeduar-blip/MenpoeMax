import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  useGetComments,
  useCreateComment,
  useGetMe,
  getGetCommentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CommentComposer, type CommentDraft } from "./CommentComposer";
import { CommentMediaBody } from "./CommentMediaBody";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CommentRow = {
  id: string;
  authorId?: string;
  content?: string;
  mediaType?: string | null;
  mediaUrl?: string | null;
  author?: { id?: string; displayName?: string; avatarUrl?: string };
};

type Props = {
  postId: string;
  postAuthorId?: string;
  variant?: "inline" | "sheet";
  maxTopLevel?: number;
  testIdPrefix?: string;
};

// ─── BURBUJA DE COMENTARIOS CON REACCIONES INDIVIDUALES (FEATURE 4) ─────────
function CommentBubble({ comment, small, postAuthorId, onReply }: { comment: CommentRow; small?: boolean; postAuthorId?: string; onReply?: () => void }) {
  const authorId = comment.author?.id ?? comment.authorId;
  const { data: me } = useGetMe();
  const meId = me?.id || "guest";

  const [reactions, setReactions] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(`comment_reactions_${comment.id}`);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const handleReact = (reaction: string) => {
    const next = { ...reactions };
    if (next[meId] === reaction) {
      delete next[meId];
    } else {
      next[meId] = reaction;
    }
    setReactions(next);
    localStorage.setItem(`comment_reactions_${comment.id}`, JSON.stringify(next));
  };

  const reactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(reactions).forEach((react) => {
      counts[react] = (counts[react] || 0) + 1;
    });
    return counts;
  }, [reactions]);

  const userReaction = reactions[meId] ?? null;

  return (
    <div className={`flex flex-col ${small ? "pl-8" : ""}`}>
      <div className="flex items-start gap-2">
        <Link href={`/profile/${authorId}`}>
          <img
            src={comment.author?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorId}`}
            className={`${small ? "w-6 h-6" : "w-7 h-7"} rounded-full object-cover bg-muted flex-none cursor-pointer`}
            alt=""
          />
        </Link>
        <div className="flex-1 bg-white/5 rounded-xl px-3 py-2 min-w-0 relative">
          <Link href={`/profile/${authorId}`} className={`${small ? "text-[11px]" : "text-xs"} font-semibold hover:text-primary flex items-center gap-1.5`}>
            <span>{comment.author?.displayName ?? "Usuario"}</span>
            {postAuthorId === authorId && (
              <span className="text-[9px] px-1 bg-primary/20 text-primary border border-primary/30 rounded scale-90" title="Autor de la publicación">
                Autor
              </span>
            )}
            {!small && Object.keys(reactions).length >= 2 && (
              <span className="text-[9px] px-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded scale-90 animate-pulse" title="Top Fan">
                ⭐ Top Fan
              </span>
            )}
          </Link>
          {comment.content ? (
            <div className={`${small ? "text-[11px]" : "text-xs"} text-muted-foreground whitespace-pre-wrap break-words mt-0.5`}>
              {comment.content}
            </div>
          ) : null}
          <CommentMediaBody mediaType={comment.mediaType} mediaUrl={comment.mediaUrl} />
          
          {/* Reaction badges on the right bottom of bubble */}
          {Object.keys(reactions).length > 0 && (
            <div className="absolute -bottom-2 right-2 bg-background/95 border border-border/40 rounded-full px-1.5 py-0.5 flex items-center gap-1 shadow-md scale-90 origin-right select-none">
              <span className="flex gap-0.5">
                {Object.keys(reactionCounts).slice(0, 3).map((r) => (
                  <span key={r} className="text-[10px]">
                    {r === "like" ? "👍" : r === "love" ? "❤️" : r === "haha" ? "😂" : r === "wow" ? "😮" : r === "sad" ? "😢" : "😡"}
                  </span>
                ))}
              </span>
              <span className="text-[9px] font-bold text-foreground/80">{Object.keys(reactions).length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons (Like, Reply) */}
      <div className="flex items-center gap-3 mt-1 ml-9 mb-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`text-[10px] font-medium transition-colors ${userReaction ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"}`}
            >
              {userReaction ? (userReaction === "like" ? "👍 Me gusta" : userReaction === "love" ? "❤️ Me encanta" : userReaction === "haha" ? "😂 Me divierte" : userReaction === "wow" ? "😮 Me asombra" : userReaction === "sad" ? "😢 Me entristece" : "😡 Me enoja") : "Reaccionar"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="flex items-center gap-1 p-1 bg-background/95 backdrop-blur-md border border-border rounded-full shadow-lg scale-90">
            {["like", "love", "haha", "wow", "sad", "angry"].map((type) => (
              <DropdownMenuItem
                key={type}
                onClick={() => handleReact(type)}
                className="w-7 h-7 p-0 flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer text-sm focus:bg-white/10"
              >
                {type === "like" ? "👍" : type === "love" ? "❤️" : type === "haha" ? "😂" : type === "wow" ? "😮" : type === "sad" ? "😢" : "😡"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {onReply && (
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-primary font-medium transition-colors"
            onClick={onReply}
          >
            Responder
          </button>
        )}
      </div>
    </div>
  );
}

export function CommentsPanel({ postId, postAuthorId, variant = "inline", maxTopLevel = 5, testIdPrefix }: Props) {
  const prefix = testIdPrefix ?? `comment-${postId}`;
  const { data: commentsData, isPending, isFetching } = useGetComments(postId, {
    query: { queryKey: getGetCommentsQueryKey(postId), enabled: !!postId },
  });
  const { data: me } = useGetMe();
  const createComment = useCreateComment();
  const qc = useQueryClient();
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const handleSubmit = async (draft: CommentDraft) => {
    await createComment.mutateAsync({
      postId,
      data: {
        content: draft.content,
        mediaType: draft.mediaType,
        mediaUrl: draft.mediaUrl,
        parentId: replyToId ?? undefined,
      },
    });
    setReplyToId(null);
    qc.invalidateQueries({ queryKey: getGetCommentsQueryKey(postId) });
    qc.invalidateQueries({ queryKey: ["feed"] });
    qc.invalidateQueries({ queryKey: ["reels"] });
  };

  const top = (commentsData?.topLevel ?? []) as CommentRow[];
  const repliesByParent = (commentsData?.repliesByParent ?? {}) as Record<string, CommentRow[]>;
  const showSkeleton = isPending && !commentsData;

  return (
    <div className={variant === "inline" ? "border-t border-border/30 pt-3 mt-3 space-y-3" : "flex flex-col h-full min-h-0"}>
      <div className={variant === "sheet" ? "flex-1 overflow-y-auto space-y-3 px-1 pb-2" : "space-y-3"}>
        {showSkeleton ? (
          <div className="h-8 bg-muted/30 rounded animate-pulse w-3/4" />
        ) : top.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">Sé el primero en comentar</p>
        ) : (
          top.slice(0, maxTopLevel).map((c) => {
            const replies = repliesByParent[c.id] ?? [];
            const isExpanded = !!expandedReplies[c.id];
            const shownReplies = isExpanded ? replies : replies.slice(0, 1);
            return (
              <div key={c.id} className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <CommentBubble comment={c} postAuthorId={postAuthorId} onReply={() => setReplyToId(c.id)} />
                  </div>
                </div>
                {shownReplies.map((r) => (
                  <CommentBubble key={r.id} comment={r} postAuthorId={postAuthorId} small />
                ))}
                {replies.length > 1 && !isExpanded && (
                  <button
                    type="button"
                    className="pl-8 text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                    onClick={() => setExpandedReplies((p) => ({ ...p, [c.id]: true }))}
                  >
                    Ver más respuestas ({replies.length - 1})
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {replyToId && (
        <p className="text-[11px] text-primary px-1">Respondiendo... <button type="button" className="underline" onClick={() => setReplyToId(null)}>Cancelar</button></p>
      )}

      <CommentComposer
        placeholder={replyToId ? "Escribe una respuesta..." : "Escribe un comentario..."}
        avatarUrl={me?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${me?.id}`}
        disabled={createComment.isPending || isFetching}
        onSubmit={handleSubmit}
        testIdPrefix={prefix}
        compact={variant === "sheet"}
      />
    </div>
  );
}
