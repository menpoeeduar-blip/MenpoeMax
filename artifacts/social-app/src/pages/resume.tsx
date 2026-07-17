import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResumeApplicationModal } from "@/components/jobs/ResumeApplicationModal";
import { MENPOE_RESUME_INVITATION } from "@/lib/resume-form";
import { useGetMyJobApplications } from "@workspace/api-client-react";
import { FileText, Briefcase, Sparkles, Clock, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Enviada",
  reviewing: "En revisión",
  interview: "Entrevista",
  accepted: "Aceptada",
  rejected: "No seleccionada",
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  reviewing: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  interview: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  accepted: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function ResumePage() {
  const [editing, setEditing] = useState(false);
  const { data: applications, isLoading } = useGetMyJobApplications();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Shell>
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="glass-panel neon-border rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-8 h-8 text-primary flex-none" />
            <div>
              <h1 className="text-xl font-bold neon-title mb-2">Mi hoja de vida</h1>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{MENPOE_RESUME_INVITATION}</p>
            </div>
          </div>
        </div>

        <Button className="neon-btn rounded-xl w-full mb-3" onClick={() => setEditing(true)}>
          <FileText className="w-4 h-4 mr-2" /> Completar o editar mi hoja de vida
        </Button>
        <Link href="/jobs">
          <Button variant="outline" className="rounded-xl w-full mb-6">
            <Briefcase className="w-4 h-4 mr-2" /> Ver vacantes y postular
          </Button>
        </Link>

        <div className="glass-panel neon-border rounded-2xl p-5">
          <h2 className="font-semibold neon-text mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Mis postulaciones
          </h2>
          {isLoading ? (
            <div className="h-24 animate-pulse bg-white/5 rounded-xl" />
          ) : !applications?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aún no has postulado a ninguna vacante. Completa tu hoja de vida y explora empleos.
            </p>
          ) : (
            <div className="space-y-3">
              {applications.map((app: Record<string, unknown>) => {
                const open = expanded === app.id;
                const status = String(app.status || "submitted");
                return (
                  <div key={String(app.id)} className="rounded-xl border border-border/40 p-3">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-2 text-left"
                      onClick={() => setExpanded(open ? null : String(app.id))}
                    >
                      <div>
                        <p className="font-medium text-sm">{String(app.jobTitle || "Vacante")}</p>
                        <p className="text-xs text-muted-foreground">{String(app.companyName || "")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={STATUS_COLORS[status] || ""}>
                          {STATUS_LABELS[status] || status}
                        </Badge>
                        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>
                    {open && (
                      <div className="mt-3 pt-3 border-t border-border/30 space-y-2 text-sm">
                        <p className="text-xs text-muted-foreground">
                          Enviada: {app.createdAt ? new Date(String(app.createdAt)).toLocaleDateString("es-CO") : "—"}
                        </p>
                        {!!app.employerNote && (
                          <div className="rounded-lg bg-primary/10 p-3 text-sm">
                            <p className="text-xs font-medium text-primary mb-1">Respuesta del empleador</p>
                            <p>{String(app.employerNote)}</p>
                          </div>
                        )}
                        {status === "rejected" && !app.employerNote && (
                          <p className="text-xs text-muted-foreground">El empleador no seleccionó tu perfil para esta vacante.</p>
                        )}
                        {status === "accepted" && (
                          <p className="text-xs text-green-400 font-medium">¡Felicitaciones! Fuiste seleccionado/a. Revisa tu correo o mensajes.</p>
                        )}
                        {!!app.jobId && (
                          <Link href={`/jobs?job=${app.jobId}`}>
                            <Button variant="outline" size="sm" className="rounded-lg mt-2">Ver vacante</Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <ResumeApplicationModal
          open={editing}
          onClose={() => setEditing(false)}
          mode="draft"
          onSuccess={() => setEditing(false)}
        />
      </div>
    </Shell>
  );
}
