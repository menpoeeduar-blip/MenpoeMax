import { useRef, useState } from "react";
import { Image, Film, Mic, Smile, Send, X, Loader2, Square, Sticker } from "lucide-react";
import { StickerPicker } from "@/components/stickers/StickerPicker";
import { Input } from "@/components/ui/input";
import { uploadFile } from "@/lib/upload";
import { COMMENT_MEDIA_SOFT_LIMIT, estimateDataUrlBytes } from "@/lib/image-compress";
import { useToast } from "@/hooks/use-toast";
import { GifPicker } from "./GifPicker";
import type { CommentMediaType } from "./CommentMediaBody";
import { CommentMediaBody } from "./CommentMediaBody";

export type CommentDraft = {
  content: string;
  mediaType?: CommentMediaType | null;
  mediaUrl?: string | null;
};

type Props = {
  placeholder?: string;
  avatarUrl?: string;
  disabled?: boolean;
  onSubmit: (draft: CommentDraft) => void | Promise<void>;
  testIdPrefix?: string;
  compact?: boolean;
};

export function CommentComposer({
  placeholder = "Escribe un comentario...",
  avatarUrl,
  disabled,
  onSubmit,
  testIdPrefix = "comment",
  compact = false,
}: Props) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [mediaType, setMediaType] = useState<CommentMediaType | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const clearMedia = () => {
    setMediaType(null);
    setMediaUrl(null);
  };

  const handleUpload = async (file: File, type: CommentMediaType) => {
    // Preferir sticker/GIF/texto si el archivo es pesado (modo sin Storage)
    if ((type === "video" || type === "audio") && file.size > COMMENT_MEDIA_SOFT_LIMIT * 4) {
      toast({
        title: "Archivo grande para comentarios",
        description: "Sin Storage usa stickers, GIF externos o un clip más corto.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      const purpose = type === "image" || type === "gif" ? "post" : "post";
      const url = await uploadFile(file, { purpose });
      if (url.startsWith("data:") && estimateDataUrlBytes(url) > COMMENT_MEDIA_SOFT_LIMIT) {
        toast({
          title: "Mejor usa sticker o GIF",
          description: "La imagen comprimida sigue siendo grande para comentarios en modo gratis.",
          variant: "destructive",
        });
        return;
      }
      setMediaType(type);
      setMediaUrl(url);
    } catch (err) {
      toast({
        title: "No se pudo subir",
        description: err instanceof Error ? err.message : "Intenta de nuevo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        await handleUpload(file, "audio");
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast({ title: "Micrófono no disponible", description: "Permite acceso al micrófono.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const submit = async () => {
    const content = text.trim();
    if (!content && !mediaUrl) return;
    await onSubmit({ content, mediaType, mediaUrl });
    setText("");
    clearMedia();
  };

  const canSubmit = !disabled && !uploading && !recording && (!!text.trim() || !!mediaUrl);

  return (
    <div className={compact ? "space-y-2" : "space-y-2 pt-1"}>
      {mediaUrl && mediaType && (
        <div className="relative inline-block max-w-full pl-9">
          <CommentMediaBody mediaType={mediaType} mediaUrl={mediaUrl} />
          <button
            type="button"
            onClick={clearMedia}
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow"
            aria-label="Quitar adjunto"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {avatarUrl && (
          <img src={avatarUrl} className="w-7 h-7 rounded-full object-cover bg-muted flex-none mb-1" alt="" />
        )}
        <div className="flex-1 min-w-0 space-y-1.5">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && canSubmit && void submit()}
            placeholder={placeholder}
            disabled={disabled || uploading || recording}
            className="h-9 text-xs rounded-full bg-white/5 border-border/30"
            data-testid={`input-${testIdPrefix}`}
          />
          <div className="flex items-center gap-0.5 flex-wrap px-1">
            <button
              type="button"
              title="Imagen"
              disabled={disabled || uploading || recording}
              onClick={() => imageRef.current?.click()}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-white/8 disabled:opacity-40"
              data-testid={`button-comment-image-${testIdPrefix}`}
            >
              <Image className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="GIF"
              disabled={disabled || uploading || recording}
              onClick={() => setShowGifPicker(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-white/8 disabled:opacity-40"
              data-testid={`button-comment-gif-${testIdPrefix}`}
            >
              <Smile className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Mis stickers de avatar"
              disabled={disabled || uploading || recording}
              onClick={() => setShowStickerPicker(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-white/8 disabled:opacity-40"
              data-testid={`button-comment-sticker-${testIdPrefix}`}
            >
              <Sticker className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Video"
              disabled={disabled || uploading || recording}
              onClick={() => videoRef.current?.click()}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-white/8 disabled:opacity-40"
              data-testid={`button-comment-video-${testIdPrefix}`}
            >
              <Film className="w-4 h-4" />
            </button>
            {!recording ? (
              <button
                type="button"
                title="Grabar audio (Shift+clic para subir archivo)"
                disabled={disabled || uploading}
                onClick={(e) => {
                  if (e.shiftKey) {
                    audioFileRef.current?.click();
                    return;
                  }
                  void startRecording();
                }}
                className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-white/8 disabled:opacity-40"
                data-testid={`button-comment-audio-${testIdPrefix}`}
              >
                <Mic className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                title="Detener grabación"
                onClick={stopRecording}
                className="p-2 rounded-lg text-red-400 bg-red-500/15 animate-pulse"
                data-testid={`button-comment-audio-stop-${testIdPrefix}`}
              >
                <Square className="w-4 h-4" fill="currentColor" />
              </button>
            )}
            {uploading && <Loader2 className="w-4 h-4 animate-spin text-primary ml-1" />}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSubmit}
          className="text-primary hover:text-primary/80 disabled:opacity-40 transition-colors mb-1 p-1"
          data-testid={`button-submit-${testIdPrefix}`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleUpload(f, "image");
          e.target.value = "";
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleUpload(f, "video");
          e.target.value = "";
        }}
      />
      <input
        ref={audioFileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleUpload(f, "audio");
          e.target.value = "";
        }}
      />

      <GifPicker
        open={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelect={(url) => {
          setMediaType("gif");
          setMediaUrl(url);
        }}
      />
      <StickerPicker
        open={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelect={(sticker) => {
          setMediaType("sticker");
          setMediaUrl(sticker.imageUrl);
          if (!text.trim()) setText(sticker.label);
        }}
      />
    </div>
  );
}
