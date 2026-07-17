import { useState } from "react";
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
  variant?: "inline" | "sheet";
  maxTopLevel?: number;
  testIdPrefix?: string;
};

function CommentBubble({ comment, small }: { comment: CommentRow; small?: boolean }) {
  const authorId = comment.author?.id ?? comment.authorId;
  return (
    <div className={`flex items-start gap-2 ${small ? "pl-8" : ""}`}>
      <Link href={`/profile/${authorId}`}>
        <img
          src={comment.author?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorId}`}
          className={`${small ? "w-6 h-6" : "w-7 h-7"} rounded-full object-cover bg-muted flex-none cursor-pointer`}
          alt=""
        />
      </Link>
      <div className="flex-1 bg-white/5 rounded-xl px-3 py-2 min-w-0">
        <Link href={`/profile/${authorId}`} className={`${small ? "text-[11px]" : "text-xs"} font-semibold hover:text-primary`}>
          {comment.author?.displayName ?? "Usuario"}
        </Link>
        {comment.content ? (
          <div className={`${small ? "text-[11px]" : "text-xs"} text-muted-foreground whitespace-pre-wrap break-words`}>
            {comment.content}
          </div>
        ) : null}
        <CommentMediaBody mediaType={comment.mediaType} mediaUrl={comment.mediaUrl} />
      </div>
    </div>
  );
}

export function CommentsPanel({ postId, variant = "inline", maxTopLevel = 5, testIdPrefix }: Props) {
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
                    <CommentBubble comment={c} />
                    <button
                      type="button"
                      className="text-[11px] text-primary/90 hover:underline ml-9"
                      onClick={() => setReplyToId(c.id)}
                    >
                      Responder
                    </button>
                  </div>
                </div>
                {shownReplies.map((r) => (
                  <CommentBubble key={r.id} comment={r} small />
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
