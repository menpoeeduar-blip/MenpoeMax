import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Gift, Sticker, Smile } from "lucide-react";
import { readLiveChat, sendLiveChat, subscribeLiveChat, type LiveChatMessage } from "@/lib/live-chat";
import { GiftPickerSheet, type GiftPickerTarget } from "@/components/gifts/GiftPickerSheet";
import { StickerPicker, type StickerSelection } from "@/components/stickers/StickerPicker";

// ── Emoji palette (common emojis for quick access) ──────────────────────────
const EMOJI_LIST = [
  "😀","😂","🥰","😍","🤩","😎","🥳","😮","😱","🙌",
  "👍","❤️","🔥","✨","🎉","👏","💯","🚀","😭","🤣",
  "💪","😊","🫶","🤗","😅","😏","🙏","👀","💀","🤯",
];

type Props = {
  streamId: string;
  userId: string;
  displayName: string;
  hostId?: string;
  hostName?: string;
};

export function LiveChatPanel({ streamId, userId, displayName, hostId, hostName }: Props) {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<LiveChatMessage[]>(() => readLiveChat(streamId));
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [giftTarget, setGiftTarget] = useState<GiftPickerTarget | null>(null);
  const [showGiftSheet, setShowGiftSheet] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeLiveChat(streamId, setMessages), [streamId]);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);

  const userAvatar =
    auth.currentUser?.photoURL ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

  const sendText = (msg: string) => {
    const t = msg.trim();
    if (!t) return;
    void sendLiveChat({ streamId, userId, displayName, userAvatar, text: t }).then(() => {
      setMessages(readLiveChat(streamId));
    });
  };

  const send = () => {
    sendText(text);
    setText("");
  };

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
  };

  const handleStickerSelect = (sticker: StickerSelection) => {
    setShowStickers(false);
    void sendLiveChat({
      streamId,
      userId,
      displayName,
      userAvatar,
      text: `🖼️ ${sticker.label || "Sticker"}`,
      stickerUrl: sticker.imageUrl,
    } as any).then(() => setMessages(readLiveChat(streamId)));
  };

  const handleOpenGift = () => {
    if (!hostId) return;
    setGiftTarget({
      streamId,
      receiverId: hostId,
      receiverName: hostName || "el anfitrión",
      onSuccessSent: (giftEmoji, giftName, tokens) => {
        void sendLiveChat({
          streamId,
          userId,
          displayName,
          userAvatar,
          text: `🎁 ¡Ha enviado un regalo! ${giftEmoji} ${giftName} (${tokens} tokens)`,
        }).then(() => setMessages(readLiveChat(streamId)));
      },
    });
    setShowGiftSheet(true);
  };

  return (
    <div className="glass-panel neon-border neon-run rounded-2xl flex flex-col h-[340px] sm:h-[380px] max-h-[50vh] sm:max-h-none relative w-full max-w-full overflow-hidden">
      <GiftPickerSheet open={showGiftSheet} onOpenChange={setShowGiftSheet} target={giftTarget} />
      <StickerPicker open={showStickers} onClose={() => setShowStickers(false)} onSelect={handleStickerSelect} />

      {/* Emoji Picker Overlay */}
      {showEmoji && (
        <div className="absolute bottom-14 left-1 sm:left-2 z-[200] glass-panel neon-border rounded-2xl p-2.5 shadow-2xl w-[calc(100vw-2rem)] max-w-72 animate-in fade-in zoom-in-95">
          <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Emojis rápidos</p>
          <div className="grid grid-cols-10 gap-1">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="text-lg hover:scale-125 transition p-0.5 rounded-lg hover:bg-white/10"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <p className="text-sm font-semibold neon-text">Chat en vivo</p>
        {hostId && hostId !== userId && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-accent/50 text-accent hover:bg-accent/20 rounded-xl neon-subtle"
            onClick={handleOpenGift}
            data-testid="button-live-gift-header"
          >
            <Gift className="w-3.5 h-3.5" />
            Regalar
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 text-sm">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 text-xs">
            Sé el primero en escribir en el chat
          </p>
        ) : (
          messages.map((m) => {
            const isGift = m.text.includes("🎁");
            const isSticker = (m as any).stickerUrl;
            const avatarSrc =
              m.userAvatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.userId}`;
            const isMe = m.userId === userId;

            return (
              <div
                key={m.id}
                className={`p-2 rounded-xl transition-all flex gap-2 items-start ${
                  isGift
                    ? "bg-accent/20 border border-accent/40 text-amber-300 font-medium shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                    : isMe
                      ? "bg-primary/10 border border-primary/20 flex-row-reverse"
                      : "bg-white/5 hover:bg-white/10"
                }`}
              >
                {/* Avatar clickable → perfil */}
                <button
                  type="button"
                  onClick={() => m.userId && setLocation(`/profile/${m.userId}`)}
                  className="flex-none rounded-full overflow-hidden ring-1 ring-primary/40 hover:ring-2 hover:ring-primary transition-all cursor-pointer mt-0.5 shrink-0"
                  title={`Ver perfil de ${m.displayName}`}
                >
                  <img src={avatarSrc} className="w-7 h-7 object-cover" alt="" />
                </button>

                <div className={`flex-1 min-w-0 ${isMe ? "text-right" : ""}`}>
                  <button
                    type="button"
                    onClick={() => m.userId && setLocation(`/profile/${m.userId}`)}
                    className="text-xs font-semibold text-primary hover:underline neon-subtle inline-block cursor-pointer"
                  >
                    {m.displayName}
                  </button>
                  {isSticker ? (
                    <img
                      src={(m as any).stickerUrl}
                      alt="sticker"
                      className="w-16 h-16 object-contain mt-1"
                    />
                  ) : (
                    <p className="neon-text text-xs leading-relaxed break-words">{m.text}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-2 sm:p-3 flex gap-1 sm:gap-1.5 items-center border-t border-border/30 w-full min-w-0 max-w-full overflow-x-hidden">
        {/* Emoji button */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0 h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground p-0 flex items-center justify-center"
          onClick={() => { setShowEmoji(!showEmoji); setShowStickers(false); }}
          title="Emojis"
          data-testid="button-live-emoji"
        >
          <Smile className="w-4 h-4" />
        </Button>

        {/* Sticker button */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0 h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground p-0 flex items-center justify-center"
          onClick={() => { setShowStickers(true); setShowEmoji(false); }}
          title="Stickers"
          data-testid="button-live-sticker"
        >
          <Sticker className="w-4 h-4" />
        </Button>

        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          onClick={() => { setShowEmoji(false); setShowStickers(false); }}
          placeholder="Escribe..."
          className="neon-input rounded-xl text-xs sm:text-sm flex-1 min-w-0 h-8 sm:h-9"
        />
        {hostId && hostId !== userId && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="border-accent/50 text-accent hover:bg-accent/20 rounded-xl shrink-0 h-8 w-8 p-0 flex items-center justify-center"
            onClick={handleOpenGift}
            title="Enviar regalo en vivo"
            data-testid="button-live-gift-input"
          >
            <Gift className="w-4 h-4" />
          </Button>
        )}
        <Button size="icon" className="neon-btn rounded-xl shrink-0 h-8 w-8 p-0 flex items-center justify-center" onClick={send}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
