import { useState, useRef } from "react";
import { useGetMe, useCreatePost, useGeneratePost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Image, Sparkles, Sticker, X, BarChart3, Save, Mic, MapPin, Radio, Video, Play, Volume2, Globe, Lock, Users as UsersIcon
} from "lucide-react";
import { StickerPicker } from "@/components/stickers/StickerPicker";
import { uploadFile, LOCAL_STORAGE_BUDGET_HINT } from "@/lib/upload";
import { useUser } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { FormSelect } from "@/components/ui/form-select";
import { Link } from "wouter";

export type CreatePostBoxProps = {
  placeholder?: string;
  onPostCreated?: () => void;
  className?: string;
  defaultVisibility?: "publico" | "amigos" | "solo_yo";
  pageId?: string;
  communityId?: string;
};

export function CreatePostBox({
  placeholder = "¿Qué estás pensando?",
  onPostCreated,
  className = "",
  defaultVisibility = "publico",
  pageId,
  communityId,
}: CreatePostBoxProps) {
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
  const [visibility, setVisibility] = useState<"publico" | "amigos" | "solo_yo">(defaultVisibility);
  const [location, setLocation] = useState("");
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll state variables
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  // Live Stream Link state
  const [isCreatingLive, setIsCreatingLive] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");

  // Voice Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<any>(null);

  // Sticker Gen states
  const [showStickerGen, setShowStickerGen] = useState(false);
  const [stickerText, setStickerText] = useState("");
  const [stickerStyle, setStickerStyle] = useState("neon");

  // GPS Location detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Sin GPS", description: "Tu navegador no soporta geolocalización.", variant: "destructive" });
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(2);
        const lng = pos.coords.longitude.toFixed(2);
        setLocation(`Lat ${lat}, Lng ${lng}`);
        setDetectingLocation(false);
        toast({ title: "Ubicación detectada", description: `📍 Ubicación aproximada: Lat ${lat}, Lng ${lng}` });
      },
      () => {
        setDetectingLocation(false);
        toast({ title: "Ubicación manual", description: "Escribe tu ciudad o ubicación manualmente en el campo." });
      },
      { timeout: 8000 }
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setMediaFiles((prev) => [...prev, base64data]);
          setContent((c) => c ? c : "🎤 Nota de voz grabada");
          toast({ title: "Grabación guardada", description: "Nota de voz adjuntada a la publicación." });
        };
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      toast({ title: "Error de micrófono", description: "No se pudo acceder al micrófono de tu dispositivo.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setMediaRecorder(null);
  };

  const handleGenerateSticker = () => {
    if (!stickerText.trim()) return;
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(12, 5, 25, 0.9)";
    ctx.strokeStyle = stickerStyle === "neon" ? "#f43f5e" : stickerStyle === "gold" ? "#eab308" : "#22d3ee";
    ctx.lineWidth = 5;
    
    const r = 24;
    const x = 10, y = 10, w = 380, h = 130;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (stickerStyle === "neon") {
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#ffffff";
    } else if (stickerStyle === "gold") {
      ctx.shadowColor = "#eab308";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#facc15";
    } else {
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#22d3ee";
    }

    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(stickerText.trim().toUpperCase(), 200, 75);

    const dataUrl = canvas.toDataURL("image/png");
    setMediaFiles((prev) => [...prev, dataUrl]);
    setExpanded(true);
    setShowStickerGen(false);
    setStickerText("");
    toast({ title: "Sticker generado", description: "Tu sticker personalizado ha sido adjuntado." });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const purpose = file.type.startsWith("video/") ? "video" : "post";
        const url = await uploadFile(file, { purpose: purpose as any });
        setMediaFiles((prev) => [...prev, url]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo subir el archivo.";
      toast({ title: "Error al subir", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePost = () => {
    const validPollOptions = pollOptions.filter((o) => o.trim());
    if (
      !content.trim() &&
      mediaFiles.length === 0 &&
      (!isCreatingPoll || validPollOptions.length < 2) &&
      (!isCreatingLive || !streamUrl.trim())
    ) {
      return;
    }

    const poll = isCreatingPoll && validPollOptions.length >= 2 ? {
      question: content.trim() || "¿Cuál prefieres?",
      options: validPollOptions.map((o) => ({ text: o.trim(), votes: [] }))
    } : undefined;

    const isVideo = mediaFiles.some((f) => f.startsWith("data:video") || f.includes("/videos/"));
    const postType = isCreatingLive ? "live" : isVideo ? "video" : mediaFiles.length > 0 ? "image" : "text";

    createPost.mutate(
      {
        data: {
          content,
          mediaUrls: mediaFiles.length > 0 ? mediaFiles : undefined,
          postType,
          visibility,
          location: location.trim() || undefined,
          streamUrl: isCreatingLive ? streamUrl.trim() : undefined,
          poll,
          pageId,
          communityId,
        },
      },
      {
        onSuccess: () => {
          setContent("");
          setMediaFiles([]);
          setPollOptions(["", ""]);
          setIsCreatingPoll(false);
          setIsCreatingLive(false);
          setStreamUrl("");
          setLocation("");
          setExpanded(false);
          if (pageId) qc.invalidateQueries({ queryKey: ["page-posts", pageId] });
          if (communityId) qc.invalidateQueries({ queryKey: ["community-posts", communityId] });
          qc.invalidateQueries({ queryKey: ["feed"] });
          toast({ title: "Publicación creada", description: "Tu contenido ya está visible." });
          if (onPostCreated) onPostCreated();
        },
        onError: () => toast({ title: "No se pudo publicar", description: "Revisa tu conexión e inténtalo de nuevo.", variant: "destructive" }),
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

  const avatar = me?.avatarUrl ?? clerkUser?.imageUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${me?.id ?? "user"}`;

  return (
    <div className={`glass-panel rounded-2xl p-4 border border-border/40 ${className}`} data-testid="create-post-box">
      <div className="flex gap-3 items-start">
        <img src={avatar} className="w-10 h-10 rounded-full object-cover bg-muted flex-none ring-2 ring-primary/30" alt="" />
        <div className="flex-1">
          {expanded ? (
            <>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={isCreatingPoll ? "Escribe la pregunta de tu encuesta..." : placeholder}
                className="min-h-[100px] bg-white/5 border-border/30 rounded-xl resize-none text-sm focus-visible:ring-primary"
                data-testid="textarea-post"
                autoFocus
              />

              {showAI && (
                <div className="mt-2 flex gap-2">
                  <Input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    placeholder="Describe el tema para la IA..."
                    className="text-sm bg-white/5 border-border/30 rounded-xl"
                    data-testid="input-ai-prompt"
                  />
                  <Button size="sm" onClick={handleGenerate} disabled={generatePost.isPending} className="rounded-xl neon-btn">
                    {generatePost.isPending ? "Generando..." : "Generar"}
                  </Button>
                </div>
              )}

              {/* OPCIONES DE ENCUESTA */}
              {isCreatingPoll && (
                <div className="mt-3 p-3 bg-white/5 border border-border/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-primary uppercase tracking-widest flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5" /> Encuesta interactiva
                    </p>
                    <button type="button" onClick={() => setIsCreatingPoll(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollOptions];
                          next[idx] = e.target.value;
                          setPollOptions(next);
                        }}
                        placeholder={`Opción ${idx + 1}`}
                        className="text-xs bg-white/5 border-border/30 rounded-xl"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                          className="text-muted-foreground hover:text-red-400 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 5 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPollOptions([...pollOptions, ""])}
                      className="text-xs rounded-xl h-7 mt-1 text-primary"
                    >
                      + Añadir opción
                    </Button>
                  )}
                </div>
              )}

              {/* OPCIONES DE TRANSMISIÓN EN VIVO (LIVE) */}
              {isCreatingLive && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-widest flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5 animate-pulse" /> Enlace a Transmisión en Vivo
                    </p>
                    <button type="button" onClick={() => setIsCreatingLive(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Input
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    placeholder="URL de tu stream o evento en vivo (opcional)"
                    className="text-xs bg-white/5 border-red-500/20 rounded-xl"
                  />
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <span>Esta publicación se destacará con insignia LIVE</span>
                    <Link href="/streams" className="text-red-400 hover:underline">Ir a sala de transmisión →</Link>
                  </div>
                </div>
              )}

              {/* VISIBILIDAD Y UBICACIÓN GPS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                <FormSelect
                  value={visibility}
                  onValueChange={(v) => setVisibility(v as "publico" | "amigos" | "solo_yo")}
                  options={[
                    { value: "publico", label: "🌐 Público" },
                    { value: "amigos", label: "👥 Solo amigos" },
                    { value: "solo_yo", label: "🔒 Solo yo" },
                  ]}
                />
                <div className="relative flex items-center">
                  <MapPin className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ubicación (ej: Barcelona, España)"
                    className="pl-9 pr-12 h-9 rounded-xl bg-white/5 border-border/30 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="absolute right-2 text-[10px] font-semibold text-primary hover:underline"
                    title="Detectar GPS"
                  >
                    {detectingLocation ? "..." : "GPS"}
                  </button>
                </div>
              </div>

              {/* PREVIEW DE MEDIA (IMÁGENES, VIDEOS, AUDIO) */}
              {mediaFiles.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {mediaFiles.map((url, i) => {
                    const isAudio = url.startsWith("data:audio") || url.includes("/audios/") || url.includes(".webm") || url.includes(".mp3");
                    const isVideo = url.startsWith("data:video") || url.includes("/videos/") || url.endsWith(".mp4");
                    return (
                      <div key={i} className="relative rounded-xl overflow-hidden border border-border bg-black/40">
                        {isAudio ? (
                          <div className="p-2 flex items-center gap-2 text-xs text-primary min-w-[140px]">
                            <Volume2 className="w-4 h-4 flex-none" />
                            <span className="truncate">Audio #{i + 1}</span>
                          </div>
                        ) : isVideo ? (
                          <video src={url} className="w-24 h-20 object-cover" muted />
                        ) : (
                          <img src={url} className="w-20 h-20 object-cover" alt="" loading="lazy" decoding="async" />
                        )}
                        <button
                          type="button"
                          onClick={() => setMediaFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs hover:bg-black"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TOOLBAR DE ACCIONES RICH */}
              <div className="flex items-center gap-1 mt-3 flex-wrap border-t border-border/30 pt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* Subir foto/video */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-xl hover:bg-white/5"
                  title="Adjuntar foto o video"
                >
                  <Image className="w-5 h-5" />
                </button>

                {/* Grabar nota de voz */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`transition-colors p-2 rounded-xl hover:bg-white/5 ${
                    isRecording ? "text-red-500 animate-pulse bg-red-500/10" : "text-muted-foreground hover:text-primary"
                  }`}
                  title={isRecording ? `Grabando... (${recordingTime}s) - Clic para guardar` : "Grabar nota de voz"}
                >
                  <Mic className="w-5 h-5" />
                </button>

                {/* Encuesta */}
                <button
                  type="button"
                  onClick={() => setIsCreatingPoll(!isCreatingPoll)}
                  className={`transition-colors p-2 rounded-xl hover:bg-white/5 ${
                    isCreatingPoll ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
                  }`}
                  title="Crear encuesta"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>

                {/* Transmisión Live */}
                <button
                  type="button"
                  onClick={() => setIsCreatingLive(!isCreatingLive)}
                  className={`transition-colors p-2 rounded-xl hover:bg-white/5 ${
                    isCreatingLive ? "text-red-400 bg-red-500/10" : "text-muted-foreground hover:text-red-400"
                  }`}
                  title="Vincular en vivo (Live Stream)"
                >
                  <Radio className="w-5 h-5" />
                </button>

                {/* Sticker picker */}
                <button
                  type="button"
                  onClick={() => setShowStickerPicker(true)}
                  className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-xl hover:bg-white/5"
                  title="Stickers"
                  data-testid="button-post-sticker"
                >
                  <Sticker className="w-5 h-5" />
                </button>

                {/* Generator Text Sticker */}
                <button
                  type="button"
                  onClick={() => setShowStickerGen(true)}
                  className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-xl hover:bg-white/5"
                  title="Generar Sticker de Texto Neón"
                >
                  <Save className="w-5 h-5" />
                </button>

                {/* Generador IA */}
                <button
                  type="button"
                  onClick={() => setShowAI(!showAI)}
                  className={`transition-colors p-2 rounded-xl hover:bg-white/5 ${
                    showAI ? "text-primary" : "text-muted-foreground hover:text-primary"
                  }`}
                  title="Generar con IA"
                  data-testid="button-ai-generate"
                >
                  <Sparkles className="w-5 h-5" />
                </button>

                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setExpanded(false);
                      setContent("");
                      setIsCreatingPoll(false);
                      setIsCreatingLive(false);
                    }}
                    className="rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePost}
                    disabled={
                      (!content.trim() &&
                        mediaFiles.length === 0 &&
                        (!isCreatingPoll || pollOptions.filter((o) => o.trim()).length < 2) &&
                        (!isCreatingLive || !streamUrl.trim())) ||
                      createPost.isPending
                    }
                    className="rounded-xl neon-btn font-semibold px-4"
                    data-testid="button-post"
                  >
                    {createPost.isPending ? "Publicando..." : "Publicar"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full text-left bg-white/5 rounded-xl px-4 py-3 text-muted-foreground text-sm hover:bg-white/8 transition-colors flex items-center justify-between"
              data-testid="button-create-post"
            >
              <span>{placeholder}</span>
              <div className="flex gap-2 text-muted-foreground/60">
                <Image className="w-4 h-4" />
                <Mic className="w-4 h-4" />
                <BarChart3 className="w-4 h-4" />
                <Radio className="w-4 h-4" />
              </div>
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

      {/* Dialog para Generador de Sticker Neón */}
      <Dialog open={showStickerGen} onOpenChange={setShowStickerGen}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle>Generador de Sticker de Texto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Texto (ej: ¡NUEVA IDEA!, URGENTE)"
              value={stickerText}
              onChange={(e) => setStickerText(e.target.value)}
              maxLength={20}
              className="bg-white/5 border-border/30 rounded-xl"
            />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-semibold">Estilo</p>
              <div className="flex gap-2">
                {[
                  { value: "neon", label: "Neón Rosa" },
                  { value: "gold", label: "Dorado" },
                  { value: "cyan", label: "Cyan Glow" },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStickerStyle(s.value)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      stickerStyle === s.value
                        ? "bg-primary text-white border-primary shadow"
                        : "bg-white/5 border-border/40 text-muted-foreground hover:bg-white/8"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleGenerateSticker} disabled={!stickerText.trim()} className="w-full rounded-xl neon-btn">
              Generar y Adjuntar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
