import { useMemo } from "react";
import { useGetMyPostedJobs } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Building2,
  Briefcase,
  Users,
  ShieldCheck,
  MapPin,
  ChevronRight,
  Scale,
  FileCheck,
} from "lucide-react";
import { getJobTypeLabel, getWorkModeLabel } from "@/lib/job-labels";
import { EMPLOYER_LEGAL_CLAUSE } from "@/lib/job-employer";
import { cn } from "@/lib/utils";

type Props = {
  onCreateJob: () => void;
  onSelectJob: (jobId: string) => void;
};

export function EmployerHubSection({ onCreateJob, onSelectJob }: Props) {
  const { data: myJobs, isLoading } = useGetMyPostedJobs();

  const stats = useMemo(() => {
    const list = myJobs ?? [];
    const applicants = list.reduce((sum, j) => sum + (j.applicantsCount ?? 0), 0);
    const verified = list.filter((j) => (j as { isVerifiedEmployer?: boolean }).isVerifiedEmployer).length;
    return { vacancies: list.length, applicants, verified };
  }, [myJobs]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-background to-primary/10 p-6 md:p-8">
        <div className="absolute -left-6 -bottom-6 h-36 w-36 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
              <Building2 className="w-4 h-4" />
              Portal del empleador
            </div>
            <h2 className="text-2xl md:text-3xl font-bold neon-title mb-2">Publica vacantes con respaldo legal</h2>
            <p className="text-muted-foreground max-w-lg text-sm md:text-base">
              Registra tu empresa con NIT, publica ofertas formales y revisa postulaciones con hoja de vida desde un solo lugar.
            </p>
          </div>
          <Button
            size="lg"
            className="rounded-2xl h-12 px-6 shadow-[0_0_24px_hsl(var(--primary)/0.35)] flex-none"
            onClick={onCreateJob}
            data-testid="button-create-job"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nueva vacante
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Vacantes activas", value: stats.vacancies, icon: Briefcase, accent: "text-primary" },
          { label: "Postulaciones", value: stats.applicants, icon: Users, accent: "text-cyan-400" },
          { label: "Con registro legal", value: stats.verified, icon: ShieldCheck, accent: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="glass-panel rounded-2xl p-4 flex items-center gap-4">
            <div className={cn("w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center", s.accent)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl p-5 border border-border/50">
          <div className="flex items-center gap-2 mb-3 text-primary">
            <Scale className="w-5 h-5" />
            <h3 className="font-semibold">Cumplimiento legal</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{EMPLOYER_LEGAL_CLAUSE}</p>
        </div>
        <div className="glass-panel rounded-2xl p-5 border border-border/50">
          <div className="flex items-center gap-2 mb-3 text-emerald-400">
            <FileCheck className="w-5 h-5" />
            <h3 className="font-semibold">Flujo de publicación</h3>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Datos legales de la empresa (NIT, representante)</li>
            <li>Descripción de la vacante y requisitos</li>
            <li>Aceptación de cláusula y publicación</li>
            <li>Gestión de postulantes en cada vacante</li>
          </ol>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold neon-text">Mis vacantes publicadas</h3>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={onCreateJob}>
            <Plus className="w-4 h-4 mr-1" />
            Publicar otra
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 glass-panel rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !myJobs?.length ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/5">
            <Building2 className="w-14 h-14 mx-auto mb-4 text-emerald-400/50" />
            <p className="font-medium mb-1">Aún no has publicado vacantes</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Crea tu primera oferta laboral con los datos legales de tu empresa y empieza a recibir candidatos.
            </p>
            <Button className="rounded-xl" onClick={onCreateJob}>
              <Plus className="w-4 h-4 mr-2" />
              Publicar mi primera vacante
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {myJobs.map((job) => {
              const workMode = getWorkModeLabel(job as { workMode?: string; isRemote?: boolean });
              return (
                <div
                  key={job.id}
                  className="glass-panel rounded-2xl p-5 border border-border/40 hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-primary/20 flex items-center justify-center flex-none">
                        {job.companyLogoUrl
                          ? <img src={job.companyLogoUrl} className="w-full h-full rounded-xl object-cover" alt="" />
                          : <Briefcase className="w-6 h-6 text-emerald-400" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold truncate">{job.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">{job.company}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">{workMode}</Badge>
                          {job.jobType && (
                            <Badge variant="outline" className="text-xs bg-white/5">
                              {getJobTypeLabel(job.jobType)}
                            </Badge>
                          )}
                          {(job as { isVerifiedEmployer?: boolean }).isVerifiedEmployer && (
                            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Verificada
                            </Badge>
                          )}
                        </div>
                        {job.location && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 flex-none">
                      <div className="text-center sm:text-right">
                        <div className="text-2xl font-bold text-primary">{job.applicantsCount ?? 0}</div>
                        <div className="text-xs text-muted-foreground">postulantes</div>
                      </div>
                      <Button
                        variant="secondary"
                        className="rounded-xl w-full sm:w-auto"
                        onClick={() => onSelectJob(job.id)}
                      >
                        Gestionar
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
