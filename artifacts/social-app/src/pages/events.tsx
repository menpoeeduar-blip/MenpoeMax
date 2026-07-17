import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { useGetEvents, useAttendEvent, useGetEvent, useCreateEvent, getGetEventQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Globe, Users, Plus, ArrowLeft, Video, Building, X, Share2 } from "lucide-react";
import { format } from "date-fns";
import { shareEntity } from "@/lib/share";
import { FormSelect } from "@/components/ui/form-select";
import { AppModal } from "@/components/ui/app-modal";
import { useLocation } from "wouter";

const EVENT_TYPES = [
  { id: "in_person", name: "Presencial" },
  { id: "online", name: "En línea" },
  { id: "hybrid", name: "Híbrido" },
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
  });
  const [error, setError] = useState("");
  const createEvent = useCreateEvent();
  const qc = useQueryClient();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) { setError("El título es obligatorio"); return; }
    if (!form.startsAt) { setError("La fecha de inicio es obligatoria"); return; }

    const startsAt = new Date(form.startsAt).toISOString();
    const endsAt = form.endsAt ? new Date(form.endsAt).toISOString() : undefined;

    createEvent.mutate(
      { data: { title: form.title, description: form.description || undefined, startsAt, endsAt, eventType: form.eventType as "in_person" | "online" | "hybrid", location: form.location || undefined } },
      {
        onSuccess: () => { qc.invalidateQueries(); onClose(); },
        onError: () => setError("Error al crear el evento. Intenta de nuevo."),
      }
    );
  };

  return (
    <AppModal open onClose={onClose} className="w-full max-w-md">
      <div className="glass-panel rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Crear evento</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Título *</label>
            <Input value={form.title} onChange={set("title")} placeholder="Nombre del evento" className="rounded-xl bg-white/5" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea value={form.description} onChange={set("description")} placeholder="Describe el evento..." rows={3}
              className="w-full rounded-xl bg-white/5 border border-input px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Inicio *</label>
              <Input type="datetime-local" value={form.startsAt} onChange={set("startsAt")} className="rounded-xl bg-white/5" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fin (opcional)</label>
              <Input type="datetime-local" value={form.endsAt} onChange={set("endsAt")} className="rounded-xl bg-white/5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo *</label>
              <FormSelect value={form.eventType} onValueChange={(v) => setForm((f) => ({ ...f, eventType: v }))} options={EVENT_TYPES.map((t) => ({ value: t.id, label: t.name }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lugar / URL</label>
              <Input value={form.location} onChange={set("location")} placeholder="Ciudad o enlace" className="rounded-xl bg-white/5" />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 rounded-xl" disabled={createEvent.isPending}>
              {createEvent.isPending ? "Creando..." : "Crear"}
            </Button>
          </div>
        </form>
      </div>
    </AppModal>
  );
}

function EventDetail({ eventId, onBack }: { eventId: string; onBack: () => void }) {
  const { data: event, isLoading } = useGetEvent(eventId, { query: { enabled: !!eventId, queryKey: getGetEventQueryKey(eventId) } });
  const attendEvent = useAttendEvent();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  if (isLoading) return <div className="flex items-center justify-center p-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!event) return <div className="text-center py-16 text-muted-foreground">Evento no encontrado</div>;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors"><ArrowLeft className="w-4 h-4" />Volver a eventos</button>
      <div className="relative h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 mb-6 flex items-center justify-center">
        {event.coverUrl ? <img src={event.coverUrl} className="w-full h-full object-cover" alt="" /> : <Calendar className="w-16 h-16 text-muted-foreground/30" />}
        <div className="absolute top-4 left-4">
          <Badge className={event.eventType === "online" ? "bg-green-500/20 text-green-400" : event.eventType === "hybrid" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}>
            {event.eventType === "online" ? <Globe className="w-3.5 h-3.5 mr-1" /> : event.eventType === "hybrid" ? <Video className="w-3.5 h-3.5 mr-1" /> : <Building className="w-3.5 h-3.5 mr-1" />}
            {event.eventType.replace("_", " ")}
          </Badge>
        </div>
      </div>
      <div className="glass-panel rounded-2xl p-6 mb-4">
        <h1 className="text-2xl font-bold mb-3">{event.title}</h1>
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{format(new Date(event.startsAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}</span>
          </div>
          {event.location && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4 text-primary" />{event.location}</div>}
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="w-4 h-4 text-primary" />{event.attendeesCount} attending</div>
        </div>
        <div className="flex items-center gap-3 mb-6 p-3 bg-white/5 rounded-xl">
          <img
            src={event.organizer.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${event.organizer.id}`}
            className="w-10 h-10 rounded-full bg-muted object-cover cursor-pointer"
            alt=""
            onClick={() => setLocation(`/profile/${event.organizer.id}`)}
          />
          <div>
            <button
              type="button"
              className="text-sm font-medium hover:text-primary"
              onClick={() => setLocation(`/profile/${event.organizer.id}`)}
            >
              {event.organizer.displayName}
            </button>
            <div className="text-xs text-muted-foreground">Organizer</div>
          </div>
        </div>
        {event.description && <p className="text-sm text-muted-foreground leading-relaxed mb-6">{event.description}</p>}
        <Button className="w-full" size="lg" disabled={event.isAttending} onClick={() => attendEvent.mutate({ eventId }, { onSuccess: () => qc.invalidateQueries() })} data-testid="button-attend">
          {event.isAttending ? "Attending" : "Attend Event"}
        </Button>
        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={() => shareEntity({ title: event.title, text: "Mira este evento", path: `/events` })}
        >
          <Share2 className="w-4 h-4 mr-2" />Compartir evento
        </Button>
      </div>
    </div>
  );
}

export default function Events() {
  const [upcoming, setUpcoming] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { data: events, isLoading } = useGetEvents({ upcoming: upcoming || undefined });
  const attendEvent = useAttendEvent();
  const qc = useQueryClient();

  return (
    <Shell>
      <div className="max-w-5xl mx-auto w-full p-4 pb-24">
        {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} />}

        {selectedId ? (
          <EventDetail eventId={selectedId} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Events</h1>
                <p className="text-muted-foreground text-sm">Discover what&apos;s happening</p>
              </div>
              <Button className="rounded-2xl neon-btn" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />Crear evento</Button>
            </div>

            <div className="flex gap-2 mb-6">
              <button onClick={() => setUpcoming(false)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!upcoming ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`} data-testid="tab-all-events">All Events</button>
              <button onClick={() => setUpcoming(true)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${upcoming ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`} data-testid="tab-upcoming-events">Upcoming</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading
                ? [...Array(6)].map((_, i) => <div key={i} className="h-48 glass-panel rounded-2xl animate-pulse" />)
                : events?.length === 0
                  ? <div className="col-span-full text-center py-16 text-muted-foreground"><Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" /><p>No se encontraron eventos</p></div>
                  : events?.map((event) => (
                    <div key={event.id} className="glass-panel rounded-2xl overflow-hidden hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedId(event.id)} data-testid={`card-event-${event.id}`}>
                      <div className="h-32 bg-gradient-to-br from-primary/10 to-accent/10 relative">
                        {event.coverUrl ? <img src={event.coverUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><Calendar className="w-10 h-10 text-muted-foreground/30" /></div>}
                        <div className="absolute top-2 left-2">
                          <Badge className={`text-xs ${event.eventType === "online" ? "bg-green-500/80" : event.eventType === "hybrid" ? "bg-amber-500/80" : "bg-blue-500/80"}`}>
                            {event.eventType.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-base mb-2 line-clamp-1">{event.title}</h3>
                        <div className="space-y-1 text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{format(new Date(event.startsAt), "MMM d, yyyy · h:mm a")}</div>
                          {event.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{event.location}</div>}
                          <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{event.attendeesCount} attending</div>
                        </div>
                        <Button size="sm" className="w-full" variant={event.isAttending ? "outline" : "default"} disabled={event.isAttending} onClick={(e) => { e.stopPropagation(); attendEvent.mutate({ eventId: event.id }, { onSuccess: () => qc.invalidateQueries() }); }} data-testid={`button-attend-${event.id}`}>
                          {event.isAttending ? "Attending" : "Attend"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full mt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            shareEntity({ title: event.title, text: "Mira este evento", path: `/events` });
                          }}
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1" />Compartir
                        </Button>
                      </div>
                    </div>
                  ))
              }
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
