import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Gift } from "lucide-react";
import { readLiveChat, sendLiveChat, subscribeLiveChat, type LiveChatMessage } from "@/lib/live-chat";
import { GiftPickerSheet, type GiftPickerTarget } from "@/components/gifts/GiftPickerSheet";

type Props = {
  streamId: string;
  userId: string;
  displayName: string;
  hostId?: string;
  hostName?: string;
};

export function LiveChatPanel({ streamId, userId, displayName, hostId, hostName }: Props) {
  const [messages, setMessages] = useState<LiveChatMessage[]>(() => readLiveChat(streamId));
  const [text, setText] = useState("");
  const [giftTarget, setGiftTarget] = useState<GiftPickerTarget | null>(null);
  const [showGiftSheet, setShowGiftSheet] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeLiveChat(streamId, setMessages), [streamId]);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    void sendLiveChat({ streamId, userId, displayName, text: t }).then(() => {
      setMessages(readLiveChat(streamId));
    });
    setText("");
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
          text: `🎁 ¡Ha enviado un regalo! ${giftEmoji} ${giftName} (${tokens} tokens)`,
        }).then(() => setMessages(readLiveChat(streamId)));
      },
    });
    setShowGiftSheet(true);
  };

  return (
    <div className="glass-panel neon-border neon-run rounded-2xl flex flex-col h-[300px] md:h-[340px]">
      <GiftPickerSheet open={showGiftSheet} onOpenChange={setShowGiftSheet} target={giftTarget} />
      
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
          <p className="text-muted-foreground text-center py-6 text-xs">Sé el primero en escribir en el chat</p>
        ) : (
          messages.map((m) => {
            const isGift = m.text.includes("🎁");
            return (
              <div
                key={m.id}
                className={`p-1.5 rounded-xl transition-all ${
                  isGift
                    ? "bg-accent/20 border border-accent/40 text-amber-300 font-medium shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                    : m.userId === userId
                      ? "text-right"
                      : ""
                }`}
              >
                <span className="text-xs text-primary neon-subtle block font-semibold">{m.displayName}</span>
                <p className="neon-text">{m.text}</p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 flex gap-2 border-t border-border/30">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Escribe un mensaje..."
          className="neon-input rounded-xl text-sm"
        />
        {hostId && hostId !== userId && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="border-accent/50 text-accent hover:bg-accent/20 rounded-xl shrink-0"
            onClick={handleOpenGift}
            title="Enviar regalo en vivo"
            data-testid="button-live-gift-input"
          >
            <Gift className="w-4 h-4" />
          </Button>
        )}
        <Button size="icon" className="neon-btn rounded-xl shrink-0" onClick={send}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
