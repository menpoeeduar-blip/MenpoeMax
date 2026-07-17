import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

const REACTIONS = [
  { emoji: "👍", reaction: "like" as const },
  { emoji: "❤️", reaction: "love" as const },
  { emoji: "😂", reaction: "haha" as const },
  { emoji: "😮", reaction: "wow" as const },
  { emoji: "😢", reaction: "sad" as const },
];

type Reaction = (typeof REACTIONS)[number]["reaction"];

type Props = {
  localReaction: Reaction | null;
  localLikesCount: number;
  onReact: (reaction: Reaction) => void;
  testId?: string;
};

export function PostReactionPicker({ localReaction, localLikesCount, onReact, testId }: Props) {
  const [showReactions, setShowReactions] = useState(false);
  const longPressTriggeredRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeReactionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);

  const openReactions = useCallback(() => {
    if (closeReactionsTimerRef.current) {
      clearTimeout(closeReactionsTimerRef.current);
      closeReactionsTimerRef.current = null;
    }
    setShowReactions(true);
  }, []);

  const scheduleCloseReactions = useCallback(() => {
    if (closeReactionsTimerRef.current) clearTimeout(closeReactionsTimerRef.current);
    closeReactionsTimerRef.current = setTimeout(() => setShowReactions(false), 350);
  }, []);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleQuickToggle = () => {
    onReact(localReaction ?? "like");
  };

  const reactionEmoji =
    localReaction === "love"
      ? "❤️"
      : localReaction === "haha"
        ? "😂"
        : localReaction === "wow"
          ? "😮"
          : localReaction === "sad"
            ? "😢"
            : "👍";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          if (longPressTriggeredRef.current) {
            longPressTriggeredRef.current = false;
            return;
          }
          if (showReactions) {
            setShowReactions(false);
            return;
          }
          handleQuickToggle();
        }}
        onMouseEnter={openReactions}
        onMouseLeave={scheduleCloseReactions}
        onTouchStart={(e) => {
          longPressTriggeredRef.current = false;
          suppressClickRef.current = false;
          clearLongPressTimer();
          longPressTimerRef.current = setTimeout(() => {
            longPressTriggeredRef.current = true;
            suppressClickRef.current = true;
            openReactions();
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(12);
            }
          }, 450);
          e.stopPropagation();
        }}
        onTouchEnd={() => {
          clearLongPressTimer();
        }}
        onTouchCancel={clearLongPressTimer}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-sm transition-colors touch-manipulation select-none",
          localReaction ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-white/5 active:bg-white/10",
        )}
        data-testid={testId}
        aria-label="Mantén pulsado para más reacciones"
      >
        <span className="text-base leading-none">{reactionEmoji}</span>
        <span>{localLikesCount}</span>
      </button>

      {showReactions && (
        <div
          role="toolbar"
          aria-label="Elegir reacción"
          className="absolute bottom-full left-0 mb-2 flex gap-1.5 bg-card border border-primary/30 rounded-2xl px-2 py-2 shadow-xl z-[80] touch-manipulation"
          onMouseEnter={openReactions}
          onMouseLeave={scheduleCloseReactions}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {REACTIONS.map((r) => (
            <button
              key={r.reaction}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReact(r.reaction);
                setShowReactions(false);
              }}
              onClick={() => {
                onReact(r.reaction);
                setShowReactions(false);
              }}
              className="text-2xl min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/10 active:scale-110 transition-transform"
              aria-label={r.reaction}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
