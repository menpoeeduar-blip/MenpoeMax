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
  Send, Search, MessageSquare, Check, CheckCheck, Sticker,
  Phone, Video, Trash2, Reply, SmilePlus, MoreHorizontal, ArrowLeft, MessageSquarePlus,
  Paperclip, Mic, MicOff, X, Play, Pause, Image as ImageIcon, FileVideo,
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

// ── Voice Note Player ────────────────────────────────────────────────────────
function VoiceNotePlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      void audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (el) setProgress(el.currentTime / (el.duration || 1));
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button
        type="button"
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-none transition-colors"
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white/70 rounded-full transition-all duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-[10px] opacity-60">
          {duration ? `${Math.round(duration)}s` : "Nota de voz"}
        </span>
      </div>
    </div>
  );
}

// ── Media Preview before sending ─────────────────────────────────────────────
function MediaPreview({
  file,
  onRemove,
}: { file: File; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  const isVideo = file.type.startsWith("video/");
  return (
    <div className="relative inline-block rounded-xl overflow-hidden border border-border/50 bg-black/30">
      {isVideo ? (
        <video src={url} className="h-24 w-auto max-w-[160px] object-cover" muted />
      ) : (
        <img src={url} alt="" className="h-24 w-auto max-w-[160px] object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
      >
        <X className="w-3 h-3" />
      </button>
      <div className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded">
        {isVideo ? "Video" : "Imagen"}
      </div>
    </div>
  );
}

// ── Read Receipt icon (Dos chulitos rojos para el visto) ─────────────────────
function ReadReceipt({ msg }: { msg: any }) {
  if (msg.readAt) {
    return (
      <span title="Visto (Leído)" aria-label="Visto" className="flex-none inline-flex items-center">
        <CheckCheck className="w-4 h-4 text-red-500 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.95)]" />
      </span>
    );
  }
  return (
    <span title="Enviado" aria-label="Enviado" className="flex-none inline-flex items-center">
      <Check className="w-3.5 h-3.5 opacity-60 text-muted-foreground" />
    </span>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MsgBubble({ msg, isMe, currentUserId, onReply, onReact, onDelete, onDeleteForMe, toast }: {
  msg: any;
  isMe: boolean;
  currentUserId: string;
  onReply: (m: any) => void;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onDeleteForMe: (messageId: string) => void;
  toast: (opts: any) => void;
}) {
  const deleted = !!msg.deletedForEveryone;
  const reactions = msg.reactions || {};
  const reactionEntries = Object.entries(reactions) as [string, string][];
  const reactionSummary = reactionEntries.reduce<Record<string, number>>((acc, [, emoji]) => {
    acc[emoji] = (acc[emoji] || 0) + 1;
    return acc;
  }, {});

  const [showActions, setShowActions] = useState(false);
  const touchTimerRef = useRef<number | null>(null);

  const handleTouchStart = () => {
    touchTimerRef.current = window.setTimeout(() => {
      setShowActions(true);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowActions(true);
  };

  return (
    <div
      className={`flex gap-2 group select-none ${isMe ? "flex-row-reverse" : "flex-row"}`}
      data-testid={`message-${msg.id}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >
      {!isMe && (
        <img
          src={msg.sender?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`}
          className="w-8 h-8 rounded-full object-cover bg-muted flex-none self-end"
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
          className={`px-3 py-2 rounded-2xl text-sm transition-all cursor-pointer ${
            deleted
              ? "bg-white/5 italic text-muted-foreground border border-dashed border-border/50"
              : isMe
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-white/10 rounded-bl-sm hover:bg-white/15"
          }`}
        >
          {deleted ? (
            "Mensaje eliminado para todos"
          ) : (
            <>
              {/* Sticker */}
              {msg.mediaType === "sticker" && msg.mediaUrl && (
                <img src={msg.mediaUrl} alt="" className="w-28 h-28 object-contain mb-1" />
              )}

              {/* Image */}
              {msg.mediaType === "image" && msg.mediaUrl && (
                <a href={msg.mediaUrl} target="_blank" rel="noreferrer">
                  <img
                    src={msg.mediaUrl}
                    alt="imagen"
                    className="rounded-xl max-w-[240px] max-h-[280px] object-cover mb-1 cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </a>
              )}

              {/* Video */}
              {msg.mediaType === "video" && msg.mediaUrl && (
                <video
                  src={msg.mediaUrl}
                  controls
                  className="rounded-xl max-w-[240px] max-h-[280px] object-cover mb-1"
                  preload="metadata"
                />
              )}

              {/* Voice Note */}
              {msg.mediaType === "voice" && msg.mediaUrl && (
                <VoiceNotePlayer src={msg.mediaUrl} />
              )}

              {/* Text */}
              {msg.mediaType !== "sticker" && msg.content && (
                <p className={msg.mediaType ? "mt-1 text-xs opacity-80" : ""}>{msg.content}</p>
              )}
              {msg.mediaType === "sticker" && msg.content && (
                <p className="text-xs opacity-60 mt-0.5">{msg.content}</p>
              )}
            </>
          )}

          {/* Timestamp + receipt */}
          <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"}`}>
            <span>hace {formatDistanceToNow(new Date(msg.createdAt))}</span>
            {isMe && !deleted && <ReadReceipt msg={msg} />}
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
              <DropdownMenuContent className="glass-panel neon-border flex gap-1 p-2 z-[220]">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="text-lg hover:scale-125 transition"
                    onClick={() => onReact(msg.id, emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button type="button" className="p-1 rounded-md hover:bg-white/10" title="Responder" onClick={() => onReply(msg)}>
              <Reply className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1 rounded-md hover:bg-white/10" title="Más opciones" onClick={() => setShowActions(true)}>
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Action Dialog (Touch Long Press / Right Click / More menu) */}
      {showActions && (
        <div
          className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowActions(false)}
        >
          <div
            className="w-full max-w-xs glass-panel neon-border rounded-2xl p-4 space-y-3 shadow-2xl animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Opciones de mensaje</p>
            
            {/* Reacciones rápidas */}
            <div className="flex justify-around bg-black/30 p-2 rounded-xl border border-white/10">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="text-xl hover:scale-125 transition"
                  onClick={() => {
                    onReact(msg.id, emoji);
                    setShowActions(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              {!deleted && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-sm rounded-xl"
                  onClick={() => {
                    onReply(msg);
                    setShowActions(false);
                  }}
                >
                  <Reply className="w-4 h-4 text-primary" />
                  Responder
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl"
                onClick={() => {
                  onDeleteForMe(msg.id);
                  setShowActions(false);
                }}
              >
                <Trash2 className="w-4 h-4" />
                Eliminar para mí
              </Button>

              {isMe && !deleted && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
                  onClick={() => {
                    onDelete(msg.id);
                    setShowActions(false);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar para todos
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full text-xs rounded-xl mt-2"
                onClick={() => setShowActions(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ChatWindow ───────────────────────────────────────────────────────────────
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

  // Text
  const [text, setText] = useState("");

  // Sticker
  const [pendingSticker, setPendingSticker] = useState<{ imageUrl: string; label: string } | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  // Reply
  const [replyTo, setReplyTo] = useState<any | null>(null);

  // Peer typing
  const [peerTyping, setPeerTyping] = useState(false);

  // Call
  const [call, setCall] = useState<ActiveCall | null>(null);

  // Media file attachment (image/video)
  const [pendingMedia, setPendingMedia] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);

  useEffect(() => {
    if (conversationId) markRead.mutate({ conversationId });
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, peerTyping]);

  // Typing indicator from peer
  useEffect(() => {
    if (!auth.currentUser || !conversationId) return;
    return onSnapshot(doc(db, "conversations", conversationId), (snap) => {
      if (!snap.exists()) return;
      const typing = (snap.data() as any).typing || {};
      const stamp = typing[other.id];
      if (!stamp) { setPeerTyping(false); return; }
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

  // Convert File → base64 data URL
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Send handler (covers text, sticker, media, voice)
  const handleSend = async (opts?: { mediaUrl?: string; mediaType?: string; content?: string }) => {
    let mediaUrl: string | null = opts?.mediaUrl ?? null;
    let mediaType: string | null = opts?.mediaType ?? null;
    let content: string = opts?.content ?? text.trim() ?? "";

    // If we have a pending media file, convert to base64
    if (!mediaUrl && pendingMedia) {
      try {
        mediaUrl = await fileToDataUrl(pendingMedia);
        mediaType = pendingMedia.type.startsWith("video/") ? "video" : "image";
        if (!content) content = mediaType === "video" ? "📹 Video" : "📷 Imagen";
      } catch {
        toast({ title: "Error", description: "No se pudo adjuntar el archivo.", variant: "destructive" });
        return;
      }
    }

    // Fallback for sticker
    if (!mediaUrl && pendingSticker) {
      mediaUrl = pendingSticker.imageUrl;
      mediaType = "sticker";
      if (!content) content = pendingSticker.label;
    }

    if (!content && !mediaUrl) return;

    sendMessage.mutate(
      {
        conversationId,
        data: {
          content,
          mediaUrl,
          mediaType,
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
          setPendingMedia(null);
          setReplyTo(null);
          notifyTyping(false);
          qc.invalidateQueries({ queryKey: getListConversationMessagesQueryKey(conversationId) });
          qc.invalidateQueries({ queryKey: ["conversations"] });
        },
        onError: () => {
          toast({ title: "Error", description: "No se pudo enviar el mensaje.", variant: "destructive" });
        },
      },
    );
  };

  // Start voice recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      chunksRef.current = chunks;
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          void handleSend({ mediaUrl: base64, mediaType: "voice", content: "🎤 Nota de voz" });
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSecs(0);
      recordTimerRef.current = window.setInterval(() => setRecordingSecs((s) => s + 1), 1000);
    } catch {
      toast({ title: "Sin permiso de micrófono", description: "Habilita el micrófono en tu navegador.", variant: "destructive" });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
    setIsRecording(false);
    setRecordingSecs(0);
  };

  const cancelVoiceRecording = () => {
    chunksRef.current = []; // discard
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
    setIsRecording(false);
    setRecordingSecs(0);
  };

  // File input handler
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast({ title: "Formato no soportado", description: "Solo se permiten imágenes y videos.", variant: "destructive" });
      return;
    }
    // 50MB limit
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: "El tamaño máximo es 50MB.", variant: "destructive" });
      return;
    }
    setPendingMedia(file);
    // Clear sticker if any
    setPendingSticker(null);
    e.target.value = "";
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

  const [hiddenMsgIds, setHiddenMsgIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("hidden_msgs_v1") || "[]");
    } catch {
      return [];
    }
  });

  const handleDeleteForMe = (messageId: string) => {
    const next = [...hiddenMsgIds, messageId];
    setHiddenMsgIds(next);
    try {
      localStorage.setItem("hidden_msgs_v1", JSON.stringify(next));
    } catch {
      /* ignore */
    }
    toast({ title: "Mensaje eliminado para ti" });
  };

  const visibleMessages = messages?.filter((m: any) => !hiddenMsgIds.includes(m.id));

  const canSend = !sendMessage.isPending && (
    !!text.trim() || !!pendingSticker || !!pendingMedia
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">
            {peerTyping ? "Escribiendo…" : other.online ? "En línea" : "Mensajes estilo Messenger"}
          </p>
        </div>
        <Button type="button" size="icon" variant="ghost" className="rounded-full" title="Llamada de voz" onClick={() => void startCall("audio")} data-testid="button-voice-call">
          <Phone className="w-4 h-4 text-primary" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="rounded-full" title="Videollamada" onClick={() => void startCall("video")} data-testid="button-video-call">
          <Video className="w-4 h-4 text-accent" />
        </Button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading
          ? [...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-2xl animate-pulse w-2/3" />)
          : visibleMessages?.length === 0
            ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <MessageSquare className="w-12 h-12" />
                <p>No hay mensajes aún. ¡Saluda primero!</p>
              </div>
            )
            : visibleMessages?.map((msg) => {
              const m = msg as any;
              return (
                <MsgBubble
                  key={m.id}
                  msg={m}
                  isMe={m.senderId === currentUserId}
                  currentUserId={currentUserId}
                  onReply={setReplyTo}
                  onReact={(messageId, emoji) => reactMsg.mutate({ messageId, emoji })}
                  onDelete={(messageId) => {
                    deleteMsg.mutate(
                      { messageId },
                      { onSuccess: () => toast({ title: "Mensaje eliminado para todos" }) },
                    );
                  }}
                  onDeleteForMe={handleDeleteForMe}
                  toast={toast}
                />
              );
            })
        }
        {peerTyping && (
          <div className="text-xs text-primary px-2 animate-pulse">{other.displayName || "Usuario"} está escribiendo…</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-border/50 space-y-2 bg-background/40 backdrop-blur">
        {/* Reply preview */}
        {replyTo && (
          <div className="flex items-center gap-2 text-xs glass-panel rounded-xl px-3 py-2">
            <Reply className="w-3.5 h-3.5 text-primary" />
            <span className="truncate flex-1">Respondiendo: {replyTo.deletedForEveryone ? "Mensaje eliminado" : replyTo.content}</span>
            <button type="button" className="text-muted-foreground" onClick={() => setReplyTo(null)}>✕</button>
          </div>
        )}

        {/* Media preview */}
        {pendingMedia && (
          <MediaPreview file={pendingMedia} onRemove={() => setPendingMedia(null)} />
        )}

        {/* Sticker preview */}
        {pendingSticker && !pendingMedia && (
          <div className="flex items-center gap-2">
            <img src={pendingSticker.imageUrl} alt="" className="w-12 h-12 object-contain rounded-lg" />
            <span className="text-xs text-muted-foreground">Sticker listo</span>
            <button type="button" className="text-xs text-destructive ml-auto" onClick={() => setPendingSticker(null)}>Quitar</button>
          </div>
        )}

        {/* Voice recording UI */}
        {isRecording ? (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-400">
              Grabando {Math.floor(recordingSecs / 60).toString().padStart(2, "0")}:{(recordingSecs % 60).toString().padStart(2, "0")}
            </span>
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="p-1.5 rounded-xl bg-white/10 text-muted-foreground hover:text-foreground"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
                title="Enviar nota de voz"
                data-testid="button-send-voice"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={onFileSelect}
              data-testid="input-media-file"
            />

            {/* Attach media button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-2xl shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar imagen o video"
              data-testid="button-attach-media"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            {/* Sticker picker */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-2xl shrink-0"
              onClick={() => setShowStickerPicker(true)}
              title="Sticker"
            >
              <Sticker className="w-4 h-4" />
            </Button>

            {/* Text input */}
            <Input
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void handleSend()}
              placeholder="Escribe un mensaje..."
              className="rounded-2xl bg-white/5"
              data-testid="input-message"
            />

            {/* Send or Voice */}
            {canSend ? (
              <Button
                onClick={() => void handleSend()}
                disabled={sendMessage.isPending}
                size="icon"
                className="rounded-full flex-none neon-btn"
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full flex-none text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onMouseDown={(e) => { e.preventDefault(); void startVoiceRecording(); }}
                title="Mantén para grabar nota de voz"
                data-testid="button-voice-note"
              >
                <Mic className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      <StickerPicker
        open={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelect={(s) => { setPendingSticker({ imageUrl: s.imageUrl, label: s.label }); setPendingMedia(null); }}
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
      const conv = conversations?.find((c) => (c as any).id === incoming.conversationId);
      const other = (conv as any)?.participants?.find((p: any) => p.id === incoming.fromUserId);
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
    const params = new URLSearchParams(window.location.search);
    const convId = params.get("conv");
    const targetUserId = params.get("user");

    if (convId) {
      const directMatch = conversations?.find((c: any) => c.id === convId);
      if (directMatch) {
        setActiveConvId(convId);
        return;
      }
      const userMatch = conversations?.find((c: any) =>
        c.participantIds?.includes(convId) || c.participants?.some((p: any) => p.id === convId)
      );
      if (userMatch) {
        setActiveConvId(userMatch.id);
        return;
      }
      setActiveConvId(convId);
    } else if (targetUserId) {
      const userMatch = conversations?.find((c: any) =>
        c.participantIds?.includes(targetUserId) || c.participants?.some((p: any) => p.id === targetUserId)
      );
      if (userMatch) {
        setActiveConvId(userMatch.id);
      }
    }
  }, [location, conversations]);

  const filtered = useMemo(
    () =>
      conversations?.filter((c) => {
        const other = (c as any).participants?.find((p: any) => p.id !== me?.id);
        return !search || other?.displayName?.toLowerCase().includes(search.toLowerCase());
      }),
    [conversations, me?.id, search],
  );

  const activeConv = conversations?.find((c) => (c as any).id === activeConvId);
  const otherParticipant = (activeConv as any)?.participants?.find((p: any) => p.id !== me?.id);
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
                  const c = conv as any;
                  const other = c.participants?.find((p: any) => p.id !== me?.id);
                  const preview = c.lastMessage?.deletedForEveryone
                    ? "Mensaje eliminado"
                    : c.lastMessage?.mediaType === "sticker"
                      ? "Sticker"
                      : c.lastMessage?.mediaType === "image"
                        ? "📷 Imagen"
                        : c.lastMessage?.mediaType === "video"
                          ? "📹 Video"
                          : c.lastMessage?.mediaType === "voice"
                            ? "🎤 Nota de voz"
                            : c.lastMessage?.content ?? "Sin mensajes todavía";
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveConvId(c.id)}
                      className={`w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left ${activeConvId === c.id ? "bg-white/5 border-r-2 border-primary" : ""}`}
                      data-testid={`conv-${c.id}`}
                    >
                      <div className="relative">
                        <img
                          src={other?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${other?.id}`}
                          className="w-12 h-12 rounded-full object-cover bg-muted"
                          alt=""
                        />
                        {other?.online && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-background" />}
                        {(c.unreadCount ?? 0) > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-primary rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate flex items-center gap-1">
                          {other?.displayName ?? c.groupName ?? "Chat"}
                          {other?.isVerified && <Check className="w-3.5 h-3.5 text-primary flex-none" />}
                        </div>
                        <div className={`text-xs truncate ${(c.unreadCount ?? 0) > 0 ? "text-primary font-medium" : "text-muted-foreground"}`}>
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
