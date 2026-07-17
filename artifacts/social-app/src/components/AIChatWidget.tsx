import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, X, Send, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your SocialHub AI assistant. Ask me anything about the app, content ideas, or career advice." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const response = `Idea rapida sobre "${userMsg}": publica un ejemplo real, agrega 3 pasos accionables y termina con una pregunta para generar comentarios.`;
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-8 md:right-8">
      {open ? (
        <div className="w-80 h-[28rem] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/20 to-accent/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold">AI Assistant</div>
                <div className="text-[10px] text-muted-foreground">Powered by AI</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-none ${m.role === "assistant" ? "bg-primary/20" : "bg-white/10"}`}>
                  {m.role === "assistant" ? <Bot className="w-3.5 h-3.5 text-primary" /> : <User className="w-3.5 h-3.5" />}
                </div>
                <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${m.role === "assistant" ? "bg-white/5 border border-border" : "bg-primary/20 text-primary-foreground"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-primary" /></div>
                <div className="bg-white/5 border border-border px-3 py-2 rounded-xl text-sm text-muted-foreground">Thinking...</div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask me anything..."
              className="bg-white/5 border-border/50 rounded-xl text-sm h-9"
            />
            <Button size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={handleSend} disabled={loading}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-accent text-white shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
