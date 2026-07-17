import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { useGetHelpTickets, useCreateHelpTicket } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, Send } from "lucide-react";

export default function Help() {
  const { data: tickets } = useGetHelpTickets();
  const create = useCreateHelpTicket();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const submit = () => {
    if (!subject.trim() || !message.trim()) return;
    create.mutate({ subject, message }, { onSuccess: () => { setSubject(""); setMessage(""); } });
  };

  return (
    <Shell>
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <h1 className="text-3xl font-bold neon-title mb-2">Centro de ayuda</h1>
        <p className="text-sm text-muted-foreground neon-subtle mb-6">FAQ, soporte y sugerencias para mejorar MenpoeSocial.</p>

        <div className="glass-panel neon-border rounded-2xl p-4 mb-6 space-y-2 text-sm">
          <p className="neon-text font-medium">Preguntas frecuentes</p>
          <p className="text-muted-foreground">· ¿Cómo cambio mi foto? → Perfil → Editar</p>
          <p className="text-muted-foreground">· ¿Cómo creo un grupo? → Comunidades → Crear</p>
          <p className="text-muted-foreground">· ¿Cómo transmitir en vivo? → Ve a En vivo, pulsa «Ir en vivo» y permite cámara/micrófono.</p>
        </div>

        <div className="glass-panel neon-border rounded-2xl p-5 mb-6 space-y-3">
          <p className="font-semibold neon-text flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary" />Enviar ticket</p>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto" className="neon-input rounded-xl" />
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe tu problema o sugerencia..." rows={4} className="neon-input rounded-xl" />
          <Button onClick={submit} disabled={create.isPending} className="neon-btn w-full rounded-xl"><Send className="w-4 h-4 mr-2" />Enviar</Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Mis tickets</p>
          {(tickets ?? []).map((t: any) => (
            <div key={t.id} className="glass-panel neon-border rounded-xl p-3">
              <div className="flex justify-between"><span className="font-medium text-sm neon-text">{t.subject}</span><span className="text-xs text-primary">{t.status}</span></div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.message}</p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
