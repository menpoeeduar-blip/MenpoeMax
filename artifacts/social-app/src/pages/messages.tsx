import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useGetConversations,
  useListConversationMessages,
  useSendMessage,
  useGetMe,
  useMarkConversationRead,
  useDeleteMessageForEveryone,
  useReactToMessage,
  useSetTyping,
  getListConversationMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Send, Search, MessageSquare, CheckCircle, CheckCheck, Sticker,
  Phone, Video, Trash2, Reply, SmilePlus, MoreHorizontal, ArrowLeft, MessageSquarePlus,
} from "lucide-react";
import { StickerPicker } from "@/components/stickers/StickerPicker";
import { CallOverlay } from "@/components/messages/CallOverlay";
import { NewChatDialog } from "@/components/messages/NewChatDialog";
import { formatDistanceToNow } from "date-fns";
import {
  clearIncomingCall,
  publishIncomingCall,
  subscribeIncomingCall,
  type CallMode,
} from "@/lib/call-signaling";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

type ActiveCall = {
  callId: string;
  conversationId: string;
  mode: CallMode;
  role: "caller" | "callee";
  peerId: string;
  peerName: string;
  peerAvatar?: string | null;
};

function ChatWindow({
  conversationId,
  currentUserId,
  other,
}: {
  conversationId: string;
  currentUserId: string;
  other: { id: string; displayName?: string; avatarUrl?: string; username?: string; online?: boolean };
}) {
  const { data: messages, isLoading } = useListConversationMessages(conversationId, {
    query: { enabled: !!conversationId, queryKey: getListConversationMessagesQueryKey(conversationId) },
  });
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();
  const deleteMsg = useDeleteMessageForEveryone();
  const reactMsg = useReactToMessage();
  const setTyping = useSetTyping();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [pendingSticker, setPendingSticker] = useState<{ imageUrl: string; label: string } | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [call, setCall] = useState<ActiveCall | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);

  useEffect(() => {
    if (conversationId) markRead.mutate({ conversationId });
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, peerTyping]);

  // Typing indicator from peer (Firestore conversation.typing map)
  useEffect(() => {
    if (!auth.currentUser || !conversationId) return;
    return onSnapshot(doc(db, "conversations", conversationId), (snap) => {
      if (!snap.exists()) return;
      const typing = (snap.data() as any).typing || {};
      const stamp = typing[other.id];
      if (!stamp) {
        setPeerTyping(false);
        return;
      }
      const age = Date.now() - Date.parse(String(stamp));
      setPeerTyping(Number.isFinite(age) && age < 4000);
    });
  }, [conversationId, other.id]);

  const notifyTyping = (on: boolean) => {
    setTyping.mutate({ conversationId, typing: on });
  };

  const onTextChange = (v: string) => {
    setText(v);
    notifyTyping(!!v.trim());
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => notifyTyping(false), 1800);
  };

  const handleSend = () => {
    if (!text.trim() && !pendingSticker) return;
    sendMessage.mutate(
      {
        conversationId,
        data: {
          content: text.trim() || pendingSticker?.label || "",
          mediaUrl: pendingSticker?.imageUrl ?? null,
          mediaType: pendingSticker ? "sticker" : null,
          replyToId: replyTo?.id || null,
          replySnippet: replyTo
            ? (replyTo.deletedForEveryone ? "Mensaje eliminado" : String(replyTo.content || "").slice(0, 80))
            : null,
        },
      },
      {
        onSuccess: () => {
          setText("");
          setPendingSticker(null);
          setReplyTo(null);
          notifyTyping(false);
          qc.invalidateQueries({ queryKey: getListConversationMessagesQueryKey(conversationId) });
          qc.invalidateQueries({ queryKey: ["conversations"] });
        },
      },
    );
  };

  const startCall = async (mode: CallMode) => {
    const callId = `call_${conversationId}_${Date.now()}`;
    const meName = auth.currentUser?.displayName || "Usuario";
    await publishIncomingCall({
      toUserId: other.id,
      fromUserId: currentUserId,
      fromName: meName,
      fromAvatar: auth.currentUser?.photoURL,
      callId,
      conversationId,
      mode,
    });
    setCall({
      callId,
      conversationId,
      mode,
      role: "caller",
      peerId: other.id,
      peerName: other.displayName || "Usuario",
      peerAvatar: other.avatarUrl,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">
            {peerTyping ? "Escribiendo…" : other.online ? "En línea" : "Mensajes estilo Messenger"}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="rounded-full"
          title="Llamada de voz"
          onClick={() => void startCall("audio")}
          data-testid="button-voice-call"
        >
          <Phone className="w-4 h-4 text-primary" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="rounded-full"
          title="Videollamada"
          onClick={() => void startCall("video")}
          data-testid="button-video-call"
        >
          <Video className="w-4 h-4 text-accent" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading
          ? [...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-2xl animate-pulse w-2/3" />)
          : messages?.length === 0
            ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <MessageSquare className="w-12 h-12" />
                <p>No hay mensajes aún. ¡Saluda primero!</p>
              </div>
            )
            : messages?.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const deleted = !!msg.deletedForEveryone;
              const reactions = msg.reactions || {};
              const reactionEntries = Object.entries(reactions) as [string, string][];
              const reactionSummary = reactionEntries.reduce<Record<string, number>>((acc, [, emoji]) => {
                acc[emoji] = (acc[emoji] || 0) + 1;
                return acc;
              }, {});

              return (
                <div key={msg.id} className={`flex gap-2 group ${isMe ? "flex-row-reverse" : "flex-row"}`} data-testid={`message-${msg.id}`}>
                  {!isMe && (
                    <img
                      src={msg.sender?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`}
                      className="w-8 h-8 rounded-full object-cover bg-muted flex-none"
                      alt=""
                    />
                  )}
                  <div className={`max-w-[78%] relative ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    {msg.replySnippet && (
                      <div className={`text-[10px] px-3 py-1 rounded-lg border border-border/40 bg-black/20 ${isMe ? "text-right" : ""}`}>
                        Respondiendo: {msg.replySnippet}
                      </div>
                    )}
                    <div
                      className={`px-4 py-2 rounded-2xl text-sm ${
                        deleted
                          ? "bg-white/5 italic text-muted-foreground border border-dashed border-border/50"
                          : isMe
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-white/10 rounded-bl-sm"
                      }`}
                    >
                      {deleted ? (
                        "Mensaje eliminado para todos"
                      ) : (
                        <>
                          {msg.mediaType === "sticker" && msg.mediaUrl && (
                            <img src={msg.mediaUrl} alt="" className="w-28 h-28 object-contain mb-1" />
                          )}
                          {msg.mediaType !== "sticker" && msg.content}
                        </>
                      )}
                      <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? "text-primary-foreground/60 justify-end" : "text-muted-foreground"}`}>
                        hace {formatDistanceToNow(new Date(msg.createdAt))}
                        {isMe && !deleted && (
                          msg.readAt
                            ? <CheckCheck className="w-3.5 h-3.5 text-cyan-300" aria-label="Visto" />
                            : <CheckCircle className="w-3 h-3 opacity-60" aria-label="Enviado" />
                        )}
                      </div>
                    </div>

                    {Object.keys(reactionSummary).length > 0 && (
                      <div className={`flex gap-1 flex-wrap ${isMe ? "justify-end" : ""}`}>
                        {Object.entries(reactionSummary).map(([emoji, count]) => (
                          <span key={emoji} className="text-xs px-1.5 py-0.5 rounded-full bg-black/40 border border-border/40">
                            {emoji} {count > 1 ? count : ""}
                          </span>
                        ))}
                      </div>
                    )}

                    {!deleted && (
                      <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 ${isMe ? "flex-row-reverse" : ""}`}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="p-1 rounded-md hover:bg-white/10" title="Reaccionar">
                              <SmilePlus className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="glass-panel neon-border flex gap-1 p-2">
                            {REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                className="text-lg hover:scale-125 transition"
                                onClick={() => reactMsg.mutate({ messageId: msg.id, emoji })}
                              >
                                {emoji}
                              </button>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <button type="button" className="p-1 rounded-md hover:bg-white/10" title="Responder" onClick={() => setReplyTo(msg)}>
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                        {isMe && (
                          <button
                            type="button"
                            className="p-1 rounded-md hover:bg-white/10 text-destructive"
                            title="Eliminar para todos"
                            onClick={() => {
                              deleteMsg.mutate(
                                { messageId: msg.id },
                                {
                                  onSuccess: () => toast({ title: "Mensaje eliminado para todos" }),
                                },
                              );
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="p-1 rounded-md hover:bg-white/10">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="glass-panel neon-border">
                            <DropdownMenuItem onClick={() => setReplyTo(msg)}>Responder</DropdownMenuItem>
                            {isMe && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteMsg.mutate({ messageId: msg.id })}
                              >
                                Eliminar para todos
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        {peerTyping && (
          <div className="text-xs text-primary px-2 animate-pulse">{other.displayName || "Usuario"} está escribiendo…</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border/50 space-y-2 bg-background/40 backdrop-blur">
        {replyTo && (
          <div className="flex items-center gap-2 text-xs glass-panel rounded-xl px-3 py-2">
            <Reply className="w-3.5 h-3.5 text-primary" />
            <span className="truncate flex-1">Respondiendo: {replyTo.deletedForEveryone ? "Mensaje eliminado" : replyTo.content}</span>
            <button type="button" className="text-muted-foreground" onClick={() => setReplyTo(null)}>✕</button>
          </div>
        )}
        {pendingSticker && (
          <div className="flex items-center gap-2">
            <img src={pendingSticker.imageUrl} alt="" className="w-12 h-12 object-contain" />
            <span className="text-xs text-muted-foreground">Sticker listo</span>
            <button type="button" className="text-xs text-destructive ml-auto" onClick={() => setPendingSticker(null)}>Quitar</button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Button type="button" variant="ghost" size="icon" className="rounded-2xl shrink-0" onClick={() => setShowStickerPicker(true)}>
            <Sticker className="w-4 h-4" />
          </Button>
          <Input
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Escribe un mensaje..."
            className="rounded-2xl bg-white/5"
            data-testid="input-message"
          />
          <Button
            onClick={handleSend}
            disabled={sendMessage.isPending || (!text.trim() && !pendingSticker)}
            size="icon"
            className="rounded-full flex-none neon-btn"
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <StickerPicker
        open={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelect={(s) => setPendingSticker({ imageUrl: s.imageUrl, label: s.label })}
      />

      {call && (
        <CallOverlay
          callId={call.callId}
          conversationId={call.conversationId}
          mode={call.mode}
          role={call.role}
          meId={currentUserId}
          peerId={call.peerId}
          peerName={call.peerName}
          peerAvatar={call.peerAvatar}
          onClose={() => {
            void clearIncomingCall(currentUserId);
            void clearIncomingCall(call.peerId);
            setCall(null);
          }}
        />
      )}
    </div>
  );
}

function GlobalIncomingCall({ meId }: { meId: string }) {
  const [ring, setRing] = useState<ActiveCall | null>(null);
  const { data: conversations } = useGetConversations();

  useEffect(() => {
    return subscribeIncomingCall(meId, (incoming) => {
      if (!incoming || incoming.fromUserId === meId) return;
      const conv = conversations?.find((c) => c.id === incoming.conversationId);
      const other = conv?.participants?.find((p: any) => p.id === incoming.fromUserId);
      setRing({
        callId: incoming.callId,
        conversationId: incoming.conversationId,
        mode: incoming.mode,
        role: "callee",
        peerId: incoming.fromUserId,
        peerName: incoming.fromName || other?.displayName || "Usuario",
        peerAvatar: incoming.fromAvatar || other?.avatarUrl,
      });
    });
  }, [meId, conversations]);

  if (!ring) return null;
  return (
    <CallOverlay
      callId={ring.callId}
      conversationId={ring.conversationId}
      mode={ring.mode}
      role="callee"
      meId={meId}
      peerId={ring.peerId}
      peerName={ring.peerName}
      peerAvatar={ring.peerAvatar}
      onClose={() => {
        void clearIncomingCall(meId);
        setRing(null);
      }}
    />
  );
}

export default function Messages() {
  const [location, setLocation] = useLocation();
  const { data: conversations, isLoading, isFetching, isError, refetch } = useGetConversations();
  const { data: me } = useGetMe();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  useEffect(() => {
    const convId = new URLSearchParams(window.location.search).get("conv");
    if (convId) setActiveConvId(convId);
  }, [location]);

  const filtered = useMemo(
    () =>
      conversations?.filter((c) => {
        const other = c.participants.find((p: any) => p.id !== me?.id);
        return !search || other?.displayName?.toLowerCase().includes(search.toLowerCase());
      }),
    [conversations, me?.id, search],
  );

  const activeConv = conversations?.find((c) => c.id === activeConvId);
  const otherParticipant = activeConv?.participants.find((p: any) => p.id !== me?.id);
  const lastSeenLabel = otherParticipant?.lastSeenAt
    ? `Activo hace ${formatDistanceToNow(new Date(otherParticipant.lastSeenAt))}`
    : "Sin actividad reciente";

  return (
    <Shell>
      {me?.id && <GlobalIncomingCall meId={me.id} />}
      <NewChatDialog
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        onStarted={(id) => {
          setActiveConvId(id);
          setLocation(`/messages?conv=${id}`);
        }}
      />
      <div className="flex h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)] overflow-hidden">
        <div className={`${activeConvId ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 border-r border-border/50`}>
          <div className="p-4 border-b border-border/50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-bold neon-title">Mensajes</h2>
              <Button
                type="button"
                size="sm"
                className="rounded-xl neon-btn gap-1.5 shrink-0"
                onClick={() => setShowNewChat(true)}
                data-testid="button-new-chat"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Nuevo
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar chat..." className="pl-9 h-9 rounded-xl bg-white/5 text-sm" data-testid="input-search-messages" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading
              ? [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))
              : isError
                ? (
                  <div className="p-6 text-center text-sm text-muted-foreground space-y-3">
                    <p>No se pudieron cargar los mensajes</p>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => void refetch()}>
                      Reintentar
                    </Button>
                  </div>
                )
              : filtered?.length === 0
                ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-3 text-sm px-4">
                    <MessageSquare className="w-8 h-8" />
                    <p>Aún no hay conversaciones</p>
                    <Button size="sm" className="rounded-xl neon-btn gap-1.5" onClick={() => setShowNewChat(true)}>
                      <MessageSquarePlus className="w-4 h-4" /> Nuevo chat
                    </Button>
                  </div>
                )
                : filtered?.map((conv) => {
                  const other = conv.participants.find((p: any) => p.id !== me?.id);
                  const preview = conv.lastMessage?.deletedForEveryone
                    ? "Mensaje eliminado"
                    : conv.lastMessage?.mediaType === "sticker"
                      ? "Sticker"
                      : conv.lastMessage?.content ?? "Sin mensajes todavía";
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setActiveConvId(conv.id)}
                      className={`w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left ${activeConvId === conv.id ? "bg-white/5 border-r-2 border-primary" : ""}`}
                      data-testid={`conv-${conv.id}`}
                    >
                      <div className="relative">
                        <img
                          src={other?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${other?.id}`}
                          className="w-12 h-12 rounded-full object-cover bg-muted"
                          alt=""
                        />
                        {other?.online && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-background" />}
                        {(conv.unreadCount ?? 0) > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-primary rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate flex items-center gap-1">
                          {other?.displayName ?? conv.groupName ?? "Chat"}
                          {other?.isVerified && <CheckCircle className="w-3.5 h-3.5 text-primary flex-none" />}
                        </div>
                        <div className={`text-xs truncate ${(conv.unreadCount ?? 0) > 0 ? "text-primary font-medium" : "text-muted-foreground"}`}>
                          {preview}
                        </div>
                      </div>
                    </button>
                  );
                })}
            {!isLoading && isFetching && (
              <p className="text-[10px] text-center text-muted-foreground py-2">Actualizando…</p>
            )}
          </div>
        </div>

        <div className={`${activeConvId ? "flex" : "hidden md:flex"} flex-1 flex-col glass-panel/0`}>
          {activeConvId && otherParticipant && me ? (
            <>
              <div className="p-3 md:p-4 border-b border-border/50 flex items-center gap-3">
                <button type="button" onClick={() => setActiveConvId(null)} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <img
                  src={otherParticipant.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant.id}`}
                  className="w-10 h-10 rounded-full object-cover bg-muted cursor-pointer ring-2 ring-primary/30"
                  alt=""
                  onClick={() => setLocation(`/profile/${otherParticipant.id}`)}
                />
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    className="font-semibold text-sm hover:text-primary truncate"
                    onClick={() => setLocation(`/profile/${otherParticipant.id}`)}
                  >
                    {otherParticipant.displayName}
                  </button>
                  <div className="text-xs text-muted-foreground truncate">
                    @{otherParticipant.username} · {otherParticipant.online ? "En línea" : lastSeenLabel}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatWindow conversationId={activeConvId} currentUserId={me.id} other={otherParticipant} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 px-4">
              <MessageSquare className="w-16 h-16 text-muted-foreground/30" />
              <div className="text-center">
                <p className="font-medium neon-text">Tus mensajes</p>
                <p className="text-sm mb-4">Selecciona una conversación o inicia un chat nuevo</p>
                <Button className="rounded-xl neon-btn gap-1.5" onClick={() => setShowNewChat(true)}>
                  <MessageSquarePlus className="w-4 h-4" /> Nuevo chat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
