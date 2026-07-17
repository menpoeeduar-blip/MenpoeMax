import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { readLiveChat, sendLiveChat, subscribeLiveChat, type LiveChatMessage } from "@/lib/live-chat";

type Props = {
  streamId: string;
  userId: string;
  displayName: string;
};

export function LiveChatPanel({ streamId, userId, displayName }: Props) {
  const [messages, setMessages] = useState<LiveChatMessage[]>(() => readLiveChat(streamId));
  const [text, setText] = useState("");
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

  return (
    <div className="glass-panel neon-border neon-run rounded-2xl flex flex-col h-[280px] md:h-[320px]">
      <p className="text-sm font-semibold neon-text px-4 py-3 border-b border-border/30">Chat en vivo</p>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 text-sm">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 text-xs">Sé el primero en escribir en el chat</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={m.userId === userId ? "text-right" : ""}>
              <span className="text-xs text-primary neon-subtle">{m.displayName}</span>
              <p className="neon-text">{m.text}</p>
            </div>
          ))
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
        <Button size="icon" className="neon-btn rounded-xl shrink-0" onClick={send}><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}
