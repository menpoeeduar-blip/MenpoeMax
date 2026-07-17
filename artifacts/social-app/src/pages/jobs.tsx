import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import {
  useGetJob,
  useSaveJob,
  getGetJobQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Briefcase,
  Bookmark,
  BookmarkCheck,
  Users,
  ArrowLeft,
  Star,
  Share2,
  ShieldCheck,
  Search,
  Building2,
} from "lucide-react";
import { shareEntity } from "@/lib/share";
import { CreateEmployerJobModal } from "@/components/jobs/CreateEmployerJobModal";
import { ResumeApplicationModal } from "@/components/jobs/ResumeApplicationModal";
import { JobApplicationsPanel } from "@/components/jobs/JobApplicationsPanel";
import { JobSeekerSection } from "@/components/jobs/JobSeekerSection";
import { EmployerHubSection } from "@/components/jobs/EmployerHubSection";
import { CONTRACT_TYPE_OPTIONS } from "@/lib/job-employer";
import { getJobTypeLabel, getWorkModeLabel } from "@/lib/job-labels";
import { cn } from "@/lib/utils";

type JobsMode = "seeker" | "employer";

const JOB_TYPE_COLORS: Record<string, string> = {
  full_time: "bg-green-500/10 text-green-400 border-green-500/20",
  part_time: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contract: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  freelance: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  internship: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

function readJobsMode(): JobsMode {
  if (typeof window === "undefined") return "seeker";
  const m = new URLSearchParams(window.location.search).get("mode");
  return m === "employer" ? "employer" : "seeker";
}

function JobDetail({
  jobId,
  onBack,
  backLabel,
}: {
  jobId: string;
  onBack: () => void;
  backLabel: string;
}) {
  const { data: job, isLoading } = useGetJob(jobId, {
    query: { enabled: !!jobId, queryKey: getGetJobQueryKey(jobId) },
  });
  const saveJob = useSaveJob();
  const qc = useQueryClient();
  const [showApply, setShowApply] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!job) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Vacante no encontrada</p>
        <Button variant="outline" onClick={onBack}>Volver</Button>
      </div>
    );
  }

  const workMode = getWorkModeLabel(job as { workMode?: string; isRemote?: boolean });

  return (
    <div className="max-w-3xl mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors"
        data-testid="button-back-jobs"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </button>

      <div className="glass-panel rounded-2xl p-6 mb-4">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-none">
            {job.companyLogoUrl
              ? <img src={job.companyLogoUrl} className="w-full h-full rounded-2xl object-cover" alt="" />
              : <Briefcase className="w-8 h-8 text-primary" />}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold neon-title mb-1">{job.title}</h1>
            <div className="font-medium text-muted-foreground flex items-center gap-2 flex-wrap neon-subtle">
              {job.company}
              {(job as { isVerifiedEmployer?: boolean }).isVerifiedEmployer && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Registro legal
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {job.location || workMode}
              </span>
              {job.salary && <span className="text-sm text-green-400 font-medium">{job.salary}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">{workMode}</Badge>
          {job.jobType && (
            <Badge variant="outline" className={JOB_TYPE_COLORS[job.jobType] ?? ""}>
              {getJobTypeLabel(job.jobType)}
            </Badge>
          )}
          {(job as { contractType?: string }).contractType && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              {CONTRACT_TYPE_OPTIONS.find((c) => c.id === (job as { contractType: string }).contractType)?.label
                ?? (job as { contractType: string }).contractType}
            </Badge>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            {job.applicantsCount} postulantes
          </span>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            className="flex-1 min-w-[200px] neon-btn rounded-xl"
            disabled={job.hasApplied}
            onClick={() => setShowApply(true)}
            data-testid="button-apply"
          >
            {job.hasApplied ? "Postulado" : "Postular con hoja de vida"}
          </Button>
          <ResumeApplicationModal
            open={showApply}
            onClose={() => setShowApply(false)}
            jobId={jobId}
            jobTitle={job.title}
            companyName={job.company}
            onSuccess={() => qc.invalidateQueries()}
          />
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={() => saveJob.mutate({ jobId }, { onSuccess: () => qc.invalidateQueries() })}
            data-testid="button-save-job"
          >
            {job.isSaved ? <BookmarkCheck className="w-5 h-5 text-primary" /> : <Bookmark className="w-5 h-5" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={() => shareEntity({ title: job.title, text: `Vacante en ${job.company}`, path: `/jobs?job=${jobId}` })}
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6 mb-4">
        <h2 className="font-semibold mb-3 neon-text">Sobre el puesto</h2>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.description}</p>
      </div>

      {(job as { employer?: Record<string, string> }).employer && (
        <div className="glass-panel rounded-2xl p-6 mb-4 text-sm text-muted-foreground space-y-2">
          <h2 className="font-semibold neon-text mb-2">Empresa verificada (datos legales)</h2>
          <p><span className="neon-subtle">Razón social:</span> {(job as { employer: { legalName: string } }).employer.legalName}</p>
          <p><span className="neon-subtle">NIT:</span> {(job as { employer: { nit: string } }).employer.nit}</p>
          <p><span className="neon-subtle">Representante:</span> {(job as { employer: { legalRepresentative: string } }).employer.legalRepresentative}</p>
          <p><span className="neon-subtle">Contacto:</span> {(job as { employer: { corporateEmail: string } }).employer.corporateEmail}</p>
        </div>
      )}

      {(job.requirements?.length ?? 0) > 0 && (
        <div className="glass-panel rounded-2xl p-6 mb-4">
          <h2 className="font-semibold mb-3 neon-text">Requisitos mínimos</h2>
          <ul className="space-y-2">
            {job.requirements?.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Star className="w-4 h-4 text-primary flex-none mt-0.5" />
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      <JobApplicationsPanel jobId={jobId} postedById={(job as { postedById?: string }).postedById} />
    </div>
  );
}

function JobsModeSwitcher({
  mode,
  onModeChange,
}: {
  mode: JobsMode;
  onModeChange: (m: JobsMode) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
      <button
        type="button"
        onClick={() => onModeChange("seeker")}
        className={cn(
          "relative text-left rounded-2xl p-5 border-2 transition-all overflow-hidden group",
          mode === "seeker"
            ? "border-primary bg-primary/10 shadow-[0_0_28px_hsl(var(--primary)/0.25)]"
            : "border-border/50 bg-white/5 hover:border-primary/40 hover:bg-white/[0.07]",
        )}
        data-testid="jobs-mode-seeker"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-none",
            mode === "seeker" ? "bg-primary text-primary-foreground" : "bg-white/10 text-primary",
          )}>
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Buscar empleo</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Explora vacantes, guarda ofertas y postula con tu CV
            </p>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onModeChange("employer")}
        className={cn(
          "relative text-left rounded-2xl p-5 border-2 transition-all overflow-hidden group",
          mode === "employer"
            ? "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_28px_hsl(160_70%_45%/0.2)]"
            : "border-border/50 bg-white/5 hover:border-emerald-500/40 hover:bg-white/[0.07]",
        )}
        data-testid="jobs-mode-employer"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-none",
            mode === "employer" ? "bg-emerald-500 text-white" : "bg-white/10 text-emerald-400",
          )}>
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Publicar empleos</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Registra tu empresa y gestiona vacantes y postulantes
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}

export default function Jobs() {
  const [, params] = useRoute("/jobs/:id");
  const [location, setLocation] = useLocation();
  const [mode, setMode] = useState<JobsMode>(readJobsMode);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("job");
  });
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const jobId = q.get("job");
    if (jobId) setSelectedJobId(jobId);
    const m = q.get("mode");
    if (m === "employer" || m === "seeker") setMode(m);
  }, [location]);

  const setJobsMode = (next: JobsMode) => {
    setMode(next);
    setSelectedJobId(null);
    const q = new URLSearchParams(window.location.search);
    q.set("mode", next);
    q.delete("job");
    const qs = q.toString();
    setLocation(`/jobs${qs ? `?${qs}` : ""}`);
  };

  const openJob = (jobId: string) => {
    setSelectedJobId(jobId);
    const q = new URLSearchParams(window.location.search);
    q.set("job", jobId);
    if (!q.get("mode")) q.set("mode", mode);
    setLocation(`/jobs?${q.toString()}`);
  };

  const closeJob = () => {
    setSelectedJobId(null);
    const q = new URLSearchParams(window.location.search);
    q.delete("job");
    const qs = q.toString();
    setLocation(`/jobs${qs ? `?${qs}` : ""}`);
  };

  if (params?.id) {
    return (
      <Shell>
        <div className="max-w-5xl mx-auto w-full p-4 pb-24">
          <JobDetail jobId={params.id} onBack={() => setLocation("/jobs")} backLabel="Volver a empleos" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-5xl mx-auto w-full p-4 pb-24">
        {showCreate && (
          <CreateEmployerJobModal
            onClose={() => {
              setShowCreate(false);
              setJobsMode("employer");
            }}
          />
        )}

        {selectedJobId ? (
          <JobDetail
            jobId={selectedJobId}
            onBack={closeJob}
            backLabel={mode === "employer" ? "Volver a mis vacantes" : "Volver a buscar empleo"}
          />
        ) : (
          <>
            <header className="mb-6">
              <h1 className="text-3xl font-bold neon-title">Centro de empleo</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Dos espacios independientes: candidatos y empresas. Menpoe conecta talento con oportunidades verificadas.
              </p>
            </header>

            <JobsModeSwitcher mode={mode} onModeChange={setJobsMode} />

            {mode === "seeker" ? (
              <JobSeekerSection onSelectJob={openJob} />
            ) : (
              <EmployerHubSection
                onCreateJob={() => setShowCreate(true)}
                onSelectJob={openJob}
              />
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
