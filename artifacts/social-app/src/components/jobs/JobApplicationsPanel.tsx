import { useState } from "react";
import { useGetJobApplications, useUpdateJobApplicationStatus } from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronDown, ChevronUp, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Recibida",
  reviewing: "En revisión",
  interview: "Entrevista",
  accepted: "Aceptada",
  rejected: "No seleccionado",
};

type Props = {
  jobId: string;
  postedById?: string;
};

export function JobApplicationsPanel({ jobId, postedById }: Props) {
  const { data: me } = useGetMe();
  const { data: applications, isLoading } = useGetJobApplications(jobId, !!(postedById && me?.id === postedById));
  const updateStatus = useUpdateJobApplicationStatus();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!postedById || me?.id !== postedById) return null;

  return (
    <div className="glass-panel rounded-2xl p-6 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">Postulaciones recibidas ({applications?.length ?? 0})</h2>
      </div>
      {isLoading ? (
        <div className="h-20 animate-pulse bg-white/5 rounded-xl" />
      ) : !applications?.length ? (
        <p className="text-sm text-muted-foreground">Aún no hay postulaciones para esta vacante.</p>
      ) : (
        <div className="space-y-3">
          {applications.map((app: Record<string, unknown>) => {
            const resume = app.resume as Record<string, unknown> | undefined;
            const open = expanded === app.id;
            return (
              <div key={String(app.id)} className="rounded-xl border border-border/40 p-3">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 text-left"
                  onClick={() => setExpanded(open ? null : String(app.id))}
                >
                  <div>
                    <p className="font-medium text-sm">{String(resume?.fullName || "Candidato")}</p>
                    <p className="text-xs text-muted-foreground">{String(resume?.professionalTitle || resume?.email || "")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{STATUS_LABELS[String(app.status)] || String(app.status)}</Badge>
                    {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                {open && (
                  <div className="mt-3 pt-3 border-t border-border/30 space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Teléfono:</span> {String(resume?.phone || "—")}</p>
                    <p><span className="text-muted-foreground">Email:</span> {String(resume?.email || "—")}</p>
                    <p className="line-clamp-3">{String(resume?.professionalSummary || "")}</p>
                    {!!resume?.resumePdfUrl && (
                      <a href={String(resume.resumePdfUrl)} target="_blank" rel="noreferrer" className="text-primary text-xs inline-flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> Ver PDF adjunto
                      </a>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {(["reviewing", "interview", "accepted", "rejected"] as const).map((st) => (
                        <Button
                          key={st}
                          size="sm"
                          variant={app.status === st ? "default" : "outline"}
                          className="rounded-lg text-xs"
                          onClick={() =>
                            updateStatus.mutate(
                              { applicationId: String(app.id), status: st },
                              { onSuccess: () => toast({ title: "Estado actualizado", description: STATUS_LABELS[st] }) },
                            )
                          }
                        >
                          {STATUS_LABELS[st]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
