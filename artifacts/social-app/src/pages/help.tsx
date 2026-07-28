import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { useGetHelpTickets, useCreateHelpTicket } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, Send, Search, ChevronDown, MessageCircle, ShieldCheck, Zap, LifeBuoy, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WA_LINK = "https://wa.me/573000000000";

const FAQS = [
  {
    q: "¿Cómo cambio mi foto de perfil o portada?",
    a: "Ve a tu Perfil desde el menú o el avatar en la barra superior. Haz clic en el icono de cámara sobre tu foto o en 'Editar perfil' para subir la imagen deseada.",
  },
  {
    q: "¿Cómo creo o me uno a una comunidad?",
    a: "Ingresa a 'Comunidades' desde el panel lateral. Explora los grupos existentes y presiona 'Unirme' o utiliza el botón '+ Crear comunidad' para lanzar tu propio grupo.",
  },
  {
    q: "¿Cómo funcionan las transmisiones en vivo?",
    a: "Entra a la sección 'En Vivo' en el menú. Presiona 'Transmitir en vivo', autoriza el acceso a tu cámara y micrófono, introduce un título descriptivo y haz clic en 'Iniciar transmisión'.",
  },
  {
    q: "¿Cómo publico empleos o subo mi Hoja de Vida?",
    a: "Ve a 'Empleos' para publicar vacantes laborales de tu empresa, o ingresa a 'Mi hoja de vida' desde el panel lateral para estructurar tus datos profesionales y aplicables a empleos.",
  },
  {
    q: "¿Mis datos y conversaciones son seguros?",
    a: "Sí. MenpoeMax cumple con las normativas legales de protección de datos (Habeas Data). Tus publicaciones privadas y mensajes solo son accesibles por ti y tus contactos autorizados.",
  },
];

export default function Help() {
  const { data: tickets } = useGetHelpTickets();
  const create = useCreateHelpTicket();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const submit = () => {
    if (!subject.trim() || !message.trim()) {
      toast({ title: "Completa los campos", description: "El asunto y el mensaje son obligatorios.", variant: "destructive" });
      return;
    }
    create.mutate(
      { subject: subject.trim(), message: message.trim() },
      {
        onSuccess: () => {
          toast({ title: "Ticket registrado", description: "Un agente del equipo de soporte revisará tu mensaje." });
          setSubject("");
          setMessage("");
        },
      }
    );
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto w-full p-4 pb-24">
        {/* Hero */}
        <div className="glass-panel glass-panel-glow rounded-3xl p-6 mb-8 border border-primary/30 relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold mb-2">
              <LifeBuoy className="w-3.5 h-3.5" /> Centro de Ayuda 24/7
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold neon-title">¿En qué podemos ayudarte?</h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Encuentra soluciones inmediatas o contacta directamente con nuestro equipo de soporte técnico.
            </p>
          </div>
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#25D366] text-white font-bold text-xs shadow-[0_0_20px_rgba(37,211,102,0.3)] hover:scale-105 transition-all shrink-0"
          >
            <MessageCircle className="w-4 h-4" />
            Soporte WhatsApp
          </a>
        </div>

        {/* Buscador de FAQ */}
        <div className="relative mb-6">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar solución (ej: cambiar foto, crear grupo, transmisiones)..."
            className="pl-12 h-12 rounded-2xl bg-white/5 border-border/50 text-sm focus:border-primary"
          />
        </div>

        {/* Acordeón de FAQ */}
        <div className="glass-panel neon-border rounded-3xl p-6 mb-8 space-y-3">
          <h2 className="text-base font-bold neon-text mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" /> Preguntas Frecuentes
          </h2>

          {filteredFaqs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No se encontraron resultados para tu búsqueda.</p>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="rounded-2xl border border-border/50 overflow-hidden transition-all bg-white/5">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
                  >
                    <span className="font-semibold text-sm text-foreground">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180 text-primary" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-white/5 bg-black/20">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Formulario de Ticket */}
        <div className="glass-panel neon-border rounded-3xl p-6 mb-8 space-y-4">
          <h2 className="text-base font-bold neon-text flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" /> Enviar Mensaje a Soporte
          </h2>
          <p className="text-xs text-muted-foreground">Si no encontraste tu respuesta arriba, escríbenos y te responderemos a la brevedad.</p>

          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Asunto (ej: Error al subir foto)"
            className="h-11 rounded-2xl bg-white/5 border-border/50 text-sm"
          />
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe en detalle tu consulta o inconveniente..."
            rows={4}
            className="rounded-2xl bg-white/5 border-border/50 text-sm resize-none"
          />
          <Button
            onClick={submit}
            disabled={create.isPending}
            className="w-full h-11 rounded-2xl neon-btn bg-primary text-black font-bold text-sm gap-2"
          >
            <Send className="w-4 h-4" /> Enviar Ticket
          </Button>
        </div>

        {/* Mis Tickets */}
        {(tickets ?? []).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Historial de Tickets</h3>
            {(tickets ?? []).map((t: any) => (
              <div key={t.id} className="glass-panel neon-border rounded-2xl p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-white">{t.subject}</span>
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                    {t.status || "Pendiente"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
