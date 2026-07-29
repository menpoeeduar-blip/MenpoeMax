import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, X, Send, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIChatWidget() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "¡Hola! Soy tu asistente IA de MenpoeMax. ¿En qué puedo ayudarte hoy con la app o tus publicaciones?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // En la pantalla de mensajes o reels, ocultar la burbuja flotante para no obstruir el chat ni la interfaz
  if (location.startsWith("/messages") || location === "/reels") {
    return null;
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const response = `Idea sobre "${userMsg}": Comparte una sugerencia práctica en tu muro, agrega 2 o 3 hashtags relevantes y realiza una pregunta para activar la interacción de tu comunidad.`;
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 md:bottom-8 md:right-8">
      {open ? (
        <div className="w-80 sm:w-88 h-[28rem] glass-panel border border-primary/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl bg-background/90 text-foreground animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20 bg-gradient-to-r from-primary/20 via-accent/15 to-transparent">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-[0_0_12px_hsl(var(--primary)/0.5)]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Asistente IA MenpoeMax</div>
                <div className="text-[10px] text-muted-foreground">Inteligencia Artificial</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-none ${
                    m.role === "assistant"
                      ? "bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40 text-primary"
                      : "bg-white/10 text-foreground"
                  }`}
                >
                  {m.role === "assistant" ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    m.role === "assistant"
                      ? "bg-white/5 border border-border/50 text-foreground"
                      : "bg-primary text-primary-foreground font-medium"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-white/5 border border-border/50 px-3.5 py-2.5 rounded-2xl text-xs text-muted-foreground animate-pulse">
                  Generando respuesta...
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border/40 bg-background/50 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Escribe tu consulta..."
              className="bg-white/5 border-border/50 rounded-xl text-xs h-9"
            />
            <Button size="icon" className="h-9 w-9 rounded-xl shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSend} disabled={loading}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative w-12 h-12 rounded-full bg-gradient-to-tr from-primary via-purple-600 to-cyan-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:scale-105 transition-all flex items-center justify-center"
          title="Asistente de IA"
        >
          <Sparkles className="w-5 h-5 transition-transform group-hover:rotate-12" />
        </button>
      )}
    </div>
  );
}
