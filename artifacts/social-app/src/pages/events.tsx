import { useState, useRef } from "react";
import { Shell } from "@/components/layout/Shell";
import {
  useGetEvents,
  useGetEvent,
  useCreateEvent,
  useRespondEventRsvp,
  useGetEventUpdates,
  useCreateEventUpdate,
  useGetMe,
  getGetEventQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Globe,
  Users,
  Plus,
  ArrowLeft,
  Video,
  Building,
  X,
  Share2,
  Image as ImageIcon,
  Film,
  Ticket,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Sparkles,
  Megaphone,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { shareEntity } from "@/lib/share";
import { FormSelect } from "@/components/ui/form-select";
import { AppModal } from "@/components/ui/app-modal";
import { useLocation } from "wouter";
import { uploadFile } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";

const EVENT_TYPES = [
  { id: "in_person", name: "Presencial 📍" },
  { id: "online", name: "En línea 💻" },
  { id: "hybrid", name: "Híbrido 🌐" },
];

function CreateEventModal({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const defaultStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState({
    title: "",
    description: "",
    startsAt: toLocalInput(defaultStart),
    endsAt: "",
    eventType: "in_person",
    location: "",
    price: "",
    isFree: true,
  });

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createEvent = useCreateEvent();
  const qc = useQueryClient();
  const { toast } = useToast();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    setMediaType(isVideo ? "video" : "image");
    setMediaFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setMediaPreview(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("El título del evento es obligatorio");
      return;
    }
    if (!form.startsAt) {
      setError("La fecha y hora de inicio son obligatorias");
      return;
    }

    setUploading(true);
    let coverUrl: string | undefined = undefined;

    try {
      if (mediaFile) {
        coverUrl = await uploadFile(mediaFile, { purpose: mediaType === "video" ? "video" : "post" });
      }

      const startsAt = new Date(form.startsAt).toISOString();
      const endsAt = form.endsAt ? new Date(form.endsAt).toISOString() : undefined;
      const numPrice = form.isFree ? 0 : Number(form.price.replace(/[^0-9]/g, "")) || 0;

      await createEvent.mutateAsync({
        data: {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          startsAt,
          endsAt,
          eventType: form.eventType as "in_person" | "online" | "hybrid",
          location: form.location.trim() || undefined,
          coverUrl,
          mediaType,
          price: numPrice,
          priceLabel: numPrice > 0 ? `$ ${numPrice.toLocaleString("es-CO")} COP` : "Gratis",
        },
      });

      qc.invalidateQueries();
      toast({
        title: "¡Evento creado con éxito!",
        description: "Tu evento ya está disponible para toda la comunidad.",
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Error al crear el evento. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppModal open onClose={onClose} className="w-full max-w-lg">
      <div className="glass-panel rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-primary/20">
        <div className="flex items-center justify-between mb-5 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Crear Nuevo Evento</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Subida de Foto o Video */}
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center justify-between">
              <span>Portada del Evento (Foto o Video)</span>
              {mediaPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview(null);
                  }}
                  className="text-xs text-destructive hover:underline"
                >
                  Quitar archivo
                </button>
              )}
            </label>

            {mediaPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-primary/30 max-h-48 bg-black/40 flex items-center justify-center">
                {mediaType === "video" ? (
                  <video src={mediaPreview} controls className="max-h-48 w-full object-cover" />
                ) : (
                  <img src={mediaPreview} alt="Preview" className="max-h-48 w-full object-cover" />
                )}
                <div className="absolute top-2 right-2">
                  <Badge className="bg-black/70 backdrop-blur-md text-xs">
                    {mediaType === "video" ? "📹 Video" : "🖼️ Imagen"}
                  </Badge>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/70 hover:border-primary/60 rounded-xl p-5 text-center cursor-pointer transition-all bg-white/5 hover:bg-white/10"
              >
                <div className="flex justify-center gap-2 mb-2 text-primary">
                  <ImageIcon className="w-6 h-6" />
                  <Film className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium">Sube una foto o video para el evento</p>
                <p className="text-xs text-muted-foreground mt-1">Formatos: JPG, PNG, MP4, WebM (hasta 100MB)</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Título del Evento *</label>
            <Input
              value={form.title}
              onChange={set("title")}
              placeholder="Ej. Concierto de Lanzamiento, Taller de IA, Q&A en Vivo..."
              className="rounded-xl bg-white/5 border-border/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={set("description")}
              placeholder="Explica de qué trata el evento, cronograma, invitados especiales..."
              rows={3}
              className="w-full rounded-xl bg-white/5 border border-border/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Precio de Entrada */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-primary" /> Precio de la Entrada
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.isFree}
                  onChange={(e) => setForm((f) => ({ ...f, isFree: e.target.checked }))}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className={form.isFree ? "font-semibold text-green-400" : "text-muted-foreground"}>
                  Entrada Gratuita
                </span>
              </label>
            </div>

            {!form.isFree && (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={set("price")}
                    placeholder="Valor en COP (ej. 25000)"
                    className="pl-7 rounded-xl bg-black/20"
                  />
                </div>
                <span className="text-xs text-muted-foreground font-semibold">COP</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Inicio *</label>
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={set("startsAt")}
                className="rounded-xl bg-white/5 border-border/50 text-xs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fin (opcional)</label>
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={set("endsAt")}
                className="rounded-xl bg-white/5 border-border/50 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Modalidad *</label>
              <FormSelect
                value={form.eventType}
                onValueChange={(v) => setForm((f) => ({ ...f, eventType: v }))}
                options={EVENT_TYPES.map((t) => ({ value: t.id, label: t.name }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lugar o Enlace Virtual</label>
              <Input
                value={form.location}
                onChange={set("location")}
                placeholder="Dirección o link Meet/Zoom"
                className="rounded-xl bg-white/5 border-border/50"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose} disabled={uploading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 rounded-xl neon-btn" disabled={uploading}>
              {uploading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Publicando...
                </span>
              ) : (
                "Publicar Evento"
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppModal>
  );
}

function EventDetail({ eventId, onBack }: { eventId: string; onBack: () => void }) {
  const { data: event, isLoading } = useGetEvent(eventId, {
    query: { enabled: !!eventId, queryKey: getGetEventQueryKey(eventId) },
  });
  const { data: me } = useGetMe();
  const { data: updates = [] } = useGetEventUpdates(eventId);

  const respondRsvp = useRespondEventRsvp();
  const createUpdate = useCreateEventUpdate();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<"info" | "novedades" | "asistentes">("info");
  const [updateText, setUpdateText] = useState("");
  const [updateTitle, setUpdateTitle] = useState("");
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return <div className="text-center py-16 text-muted-foreground">Evento no encontrado</div>;
  }

  const isOrganizer = (me as any)?.id === event.organizerId || (me as any)?.id === event.organizer?.id;
  const currentStatus = event.rsvpStatus; // "going" | "not_going" | "maybe" | null

  const handleRsvp = async (status: "going" | "not_going" | "maybe") => {
    try {
      await respondRsvp.mutateAsync({ eventId, status });
      const labels = {
        going: "¡Asistencia confirmada! Nos vemos en el evento.",
        maybe: "Guardado en tus recordatorios.",
        not_going: "Se ha cancelado tu participación.",
      };
      toast({
        title: "Respuesta registrada",
        description: labels[status],
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo actualizar tu estado",
        variant: "destructive",
      });
    }
  };

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim()) return;

    setIsPostingUpdate(true);
    try {
      await createUpdate.mutateAsync({
        eventId,
        title: updateTitle.trim() || "Comunicado Oficial",
        content: updateText.trim(),
      });
      setUpdateText("");
      setUpdateTitle("");
      toast({
        title: "Novedad publicada",
        description: "Todos los participantes verán tu comunicado.",
      });
    } catch (err: any) {
      toast({
        title: "Error al publicar novedad",
        description: err?.message || "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setIsPostingUpdate(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al directorio de eventos
      </button>

      {/* Portada Multimedia: Video o Imagen */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-black to-accent/20 border border-primary/20 shadow-2xl">
        {event.coverUrl ? (
          event.mediaType === "video" || event.coverUrl.includes(".mp4") || event.coverUrl.includes("video") ? (
            <video
              src={event.coverUrl}
              controls
              autoPlay
              muted
              loop
              className="w-full h-72 md:h-96 object-cover bg-black"
            />
          ) : (
            <img src={event.coverUrl} className="w-full h-72 md:h-96 object-cover" alt={event.title} />
          )
        ) : (
          <div className="w-full h-56 flex flex-col items-center justify-center gap-2">
            <Calendar className="w-16 h-16 text-primary/40" />
            <span className="text-xs text-muted-foreground font-mono">MENPOE SOCIAL EVENTS</span>
          </div>
        )}

        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          <Badge
            className={`backdrop-blur-md px-3 py-1 text-xs font-semibold ${
              event.eventType === "online"
                ? "bg-green-500/80 text-white"
                : event.eventType === "hybrid"
                ? "bg-amber-500/80 text-white"
                : "bg-blue-600/80 text-white"
            }`}
          >
            {event.eventType === "online" ? (
              <Globe className="w-3.5 h-3.5 mr-1" />
            ) : event.eventType === "hybrid" ? (
              <Video className="w-3.5 h-3.5 mr-1" />
            ) : (
              <Building className="w-3.5 h-3.5 mr-1" />
            )}
            {event.eventType === "in_person"
              ? "Presencial"
              : event.eventType === "online"
              ? "En línea"
              : "Híbrido"}
          </Badge>

          <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-md px-3 py-1 text-xs font-bold">
            <Ticket className="w-3.5 h-3.5 mr-1" />
            {event.priceLabel || (event.price > 0 ? `$ ${event.price.toLocaleString("es-CO")} COP` : "Gratis")}
          </Badge>
        </div>
      </div>

      {/* Panel Principal con Pestañas */}
      <div className="glass-panel rounded-2xl p-6 border border-border/50 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6 mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">{event.title}</h1>
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(event.startsAt), "EEEE d 'de' MMMM, yyyy · h:mm a", { locale: es })}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="rounded-xl border-primary/30 hover:bg-primary/10 self-start md:self-auto"
            onClick={() =>
              shareEntity({
                title: event.title,
                text: `Te invito a este evento: ${event.title}`,
                path: `/events/${event.id}`,
              })
            }
          >
            <Share2 className="w-4 h-4 mr-2 text-primary" /> Compartir
          </Button>
        </div>

        {/* Acciones de Participación RSVP (3 Botones) */}
        <div className="p-4 rounded-2xl bg-white/5 border border-primary/20 mb-6">
          <div className="text-xs uppercase font-semibold tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
            <span>¿Participarás en este evento?</span>
            <span className="text-primary font-mono">
              👥 {event.attendeesCount || 0} Confirmados · ⭐ {event.interestedCount || 0} Interesados
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Button
              size="lg"
              variant={currentStatus === "going" ? "default" : "outline"}
              className={`rounded-xl transition-all ${
                currentStatus === "going"
                  ? "bg-green-600 hover:bg-green-700 text-white font-bold shadow-[0_0_15px_rgba(22,163,74,0.4)]"
                  : "hover:border-green-500/50 hover:bg-green-500/10 text-green-400"
              }`}
              onClick={() => handleRsvp("going")}
              disabled={respondRsvp.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {currentStatus === "going" ? "✓ Asistiré" : "Participar"}
            </Button>

            <Button
              size="lg"
              variant={currentStatus === "maybe" ? "default" : "outline"}
              className={`rounded-xl transition-all ${
                currentStatus === "maybe"
                  ? "bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-[0_0_15px_rgba(217,119,6,0.4)]"
                  : "hover:border-amber-500/50 hover:bg-amber-500/10 text-amber-400"
              }`}
              onClick={() => handleRsvp("maybe")}
              disabled={respondRsvp.isPending}
            >
              <Clock className="w-4 h-4 mr-2" />
              {currentStatus === "maybe" ? "✓ Recordatorio fijado" : "Recordarme más tarde"}
            </Button>

            <Button
              size="lg"
              variant={currentStatus === "not_going" ? "default" : "outline"}
              className={`rounded-xl transition-all ${
                currentStatus === "not_going"
                  ? "bg-red-600 hover:bg-red-700 text-white font-bold"
                  : "hover:border-red-500/50 hover:bg-red-500/10 text-muted-foreground"
              }`}
              onClick={() => handleRsvp("not_going")}
              disabled={respondRsvp.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" />
              No participar
            </Button>
          </div>
        </div>

        {/* Pestañas de Navegación del Evento */}
        <div className="flex border-b border-border/40 mb-6 gap-2">
          <button
            onClick={() => setActiveTab("info")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "info"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            📋 Información
          </button>
          <button
            onClick={() => setActiveTab("novedades")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "novedades"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Megaphone className="w-4 h-4" /> Novedades del Evento
            {updates.length > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.2 rounded-full">{updates.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("asistentes")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "asistentes"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" /> Asistentes ({event.attendeesCount || 0})
          </button>
        </div>

        {/* Tab 1: Info General */}
        {activeTab === "info" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-border/40 space-y-2">
                <span className="text-xs text-muted-foreground font-semibold uppercase">Ubicación / Modalidad</span>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary flex-none" />
                  <span>{event.location || "Por definir por el organizador"}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-border/40 space-y-2">
                <span className="text-xs text-muted-foreground font-semibold uppercase">Entrada y Acceso</span>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Ticket className="w-4 h-4 text-primary flex-none" />
                  <span className="text-green-400">
                    {event.priceLabel || (event.price > 0 ? `$ ${event.price.toLocaleString("es-CO")} COP` : "Gratis")}
                  </span>
                </div>
              </div>
            </div>

            {/* Organizador */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-border/30">
              <div className="flex items-center gap-3">
                <img
                  src={
                    event.organizer?.avatarUrl ??
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${event.organizer?.id || "org"}`
                  }
                  className="w-12 h-12 rounded-full bg-muted object-cover cursor-pointer border border-primary/40"
                  alt=""
                  onClick={() => setLocation(`/profile/${event.organizer?.id}`)}
                />
                <div>
                  <button
                    type="button"
                    className="text-base font-bold hover:text-primary transition-colors text-left"
                    onClick={() => setLocation(`/profile/${event.organizer?.id}`)}
                  >
                    {event.organizer?.displayName || "Organizador"}
                  </button>
                  <div className="text-xs text-primary font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Creador del Evento
                  </div>
                </div>
              </div>

              {isOrganizer && (
                <Badge className="bg-primary/20 text-primary border border-primary/30">Eres el Creador</Badge>
              )}
            </div>

            {/* Descripción */}
            <div>
              <h3 className="text-base font-bold mb-2">Acerca de este evento</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line bg-white/5 p-4 rounded-xl border border-border/30">
                {event.description || "El organizador no ha proporcionado una descripción detallada todavía."}
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Novedades / Noticias del Evento */}
        {activeTab === "novedades" && (
          <div className="space-y-6">
            {/* Formulario exclusivo para el creador */}
            {isOrganizer ? (
              <form
                onSubmit={handlePostUpdate}
                className="p-5 rounded-2xl bg-primary/10 border border-primary/30 space-y-3"
              >
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Megaphone className="w-4 h-4" /> Publicar Novedad o Comunicado (Solo Organizador)
                </div>
                <Input
                  value={updateTitle}
                  onChange={(e) => setUpdateTitle(e.target.value)}
                  placeholder="Título del comunicado (ej. Cambio de sala, Invitado confirmado, Recordatorio...)"
                  className="bg-black/30 rounded-xl text-sm"
                />
                <textarea
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  placeholder="Escribe el mensaje o aviso importante para todos los participantes..."
                  rows={3}
                  className="w-full rounded-xl bg-black/30 border border-border/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" className="rounded-xl neon-btn" disabled={isPostingUpdate}>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {isPostingUpdate ? "Publicando..." : "Publicar Novedad"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-white/5 rounded-xl border border-border/30 text-xs text-muted-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary flex-none" />
                Solo el creador del evento ({event.organizer?.displayName || "el organizador"}) puede publicar novedades oficiales.
              </div>
            )}

            {/* Listado de Novedades */}
            <div className="space-y-3">
              {updates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Megaphone className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="font-medium text-sm">No hay novedades publicadas aún</p>
                  <p className="text-xs">Los comunicados del organizador aparecerán aquí.</p>
                </div>
              ) : (
                updates.map((update: any) => (
                  <div
                    key={update.id}
                    className="glass-panel p-4 rounded-xl border border-primary/20 space-y-2 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs">
                          📢 Oficial
                        </Badge>
                        <h4 className="font-bold text-sm text-foreground">{update.title}</h4>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {format(new Date(update.createdAt), "d MMM, h:mm a", { locale: es })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {update.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Lista de Asistentes */}
        {activeTab === "asistentes" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Personas que confirmaron su asistencia
            </h3>
            {event.attendeesList && event.attendeesList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {event.attendeesList.map((att: any, idx: number) => {
                  const u = att.user || { id: att.userId, displayName: "Asistente" };
                  return (
                    <div
                      key={att.id || idx}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-border/30 hover:bg-white/10 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/profile/${u.id}`)}
                    >
                      <img
                        src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                        className="w-9 h-9 rounded-full object-cover bg-muted"
                        alt=""
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate hover:text-primary">{u.displayName}</div>
                        <div className="text-[10px] text-green-400 font-medium">✓ Asistencia confirmada</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm">Aún no hay asistentes confirmados. ¡Sé el primero en confirmar!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Events() {
  const [upcoming, setUpcoming] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { data: events, isLoading } = useGetEvents({ upcoming: upcoming || undefined });

  return (
    <Shell>
      <div className="max-w-5xl mx-auto w-full p-4 pb-24">
        {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} />}

        {selectedId ? (
          <EventDetail eventId={selectedId} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                  <Calendar className="w-8 h-8 text-primary" /> Eventos
                </h1>
                <p className="text-muted-foreground text-sm">
                  Descubre conciertos, talleres, conferencias y experiencias en vivo
                </p>
              </div>
              <Button className="rounded-2xl neon-btn" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Crear Evento
              </Button>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setUpcoming(false)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  !upcoming
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,180,216,0.4)]"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                Todos los Eventos
              </button>
              <button
                onClick={() => setUpcoming(true)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  upcoming
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,180,216,0.4)]"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                Próximos
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {isLoading
                ? [...Array(6)].map((_, i) => (
                    <div key={i} className="h-56 glass-panel rounded-2xl animate-pulse" />
                  ))
                : events?.length === 0
                ? (
                  <div className="col-span-full text-center py-16 text-muted-foreground glass-panel rounded-2xl p-8">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-base font-semibold">No se encontraron eventos activos</p>
                    <p className="text-sm text-muted-foreground mt-1">¡Sé el primero en crear uno para la comunidad!</p>
                  </div>
                )
                : events?.map((event: any) => (
                    <div
                      key={event.id}
                      className="glass-panel rounded-2xl overflow-hidden hover:bg-white/5 transition-all cursor-pointer border border-border/40 hover:border-primary/40 group shadow-lg"
                      onClick={() => setSelectedId(event.id)}
                    >
                      <div className="h-40 bg-gradient-to-br from-primary/10 to-accent/10 relative overflow-hidden">
                        {event.coverUrl ? (
                          event.mediaType === "video" || event.coverUrl.includes(".mp4") ? (
                            <video src={event.coverUrl} className="w-full h-full object-cover" muted />
                          ) : (
                            <img
                              src={event.coverUrl}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              alt=""
                            />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-10 h-10 text-muted-foreground/30" />
                          </div>
                        )}

                        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                          <Badge
                            className={`text-xs font-semibold backdrop-blur-md ${
                              event.eventType === "online"
                                ? "bg-green-600/90 text-white"
                                : event.eventType === "hybrid"
                                ? "bg-amber-600/90 text-white"
                                : "bg-blue-600/90 text-white"
                            }`}
                          >
                            {event.eventType === "in_person"
                              ? "Presencial"
                              : event.eventType === "online"
                              ? "En línea"
                              : "Híbrido"}
                          </Badge>

                          <Badge className="bg-black/70 text-white font-bold backdrop-blur-md text-xs">
                            {event.priceLabel || (event.price > 0 ? `$ ${event.price.toLocaleString("es-CO")} COP` : "Gratis")}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <h3 className="font-bold text-base line-clamp-1 group-hover:text-primary transition-colors">
                          {event.title}
                        </h3>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            {format(new Date(event.startsAt), "MMM d, yyyy · h:mm a", { locale: es })}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1.5 truncate">
                              <MapPin className="w-3.5 h-3.5 text-primary flex-none" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-primary/90 font-medium">
                            <Users className="w-3.5 h-3.5" />
                            {event.attendeesCount || 0} personas asistirán
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                          <span className="text-xs font-bold text-green-400">
                            {event.priceLabel || (event.price > 0 ? `$ ${event.price.toLocaleString("es-CO")} COP` : "Gratis")}
                          </span>
                          <span className="text-xs font-semibold text-primary group-hover:underline">
                            Ver detalles & RSVP →
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
