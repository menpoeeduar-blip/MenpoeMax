import { useMemo, useState } from "react";
import {
  useGetJobs,
  useGetRecommendedJobs,
  useGetSavedJobs,
  useSaveJob,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Briefcase,
  Bookmark,
  BookmarkCheck,
  Clock,
  Share2,
  FileText,
  Sparkles,
} from "lucide-react";
import { shareEntity } from "@/lib/share";
import { MENPOE_RESUME_INVITATION } from "@/lib/resume-form";
import { getJobTypeLabel, getWorkModeLabel, WORK_MODE_FILTERS, type WorkModeFilter } from "@/lib/job-labels";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const JOB_TYPE_COLORS: Record<string, string> = {
  full_time: "bg-green-500/10 text-green-400 border-green-500/20",
  part_time: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contract: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  freelance: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  internship: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

const TAB_LABELS: Record<string, string> = {
  browse: "Todas las vacantes",
  recommended: "Para ti",
  saved: "Guardadas",
};

type Props = {
  onSelectJob: (jobId: string) => void;
};

export function JobSeekerSection({ onSelectJob }: Props) {
  const [search, setSearch] = useState("");
  const [workModeFilter, setWorkModeFilter] = useState<WorkModeFilter>("all");
  const [activeTab, setActiveTab] = useState<"browse" | "saved" | "recommended">("browse");

  const jobParams = useMemo(
    () => ({ q: search || undefined, workMode: workModeFilter !== "all" ? workModeFilter : undefined }),
    [search, workModeFilter],
  );

  const { data: jobs, isLoading } = useGetJobs(jobParams);
  const { data: savedJobs } = useGetSavedJobs();
  const { data: recommended } = useGetRecommendedJobs();
  const saveJob = useSaveJob();
  const qc = useQueryClient();

  const filterByMode = (list: typeof jobs) => {
    if (!list || workModeFilter === "all") return list;
    return list.filter((j) => {
      const wm = (j as { workMode?: string }).workMode || (j.isRemote ? "remote" : "on_site");
      return wm === workModeFilter;
    });
  };

  const displayJobs = filterByMode(
    activeTab === "saved" ? savedJobs : activeTab === "recommended" ? recommended : jobs,
  );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-background to-accent/10 p-6 md:p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
            <Sparkles className="w-4 h-4" />
            Portal del candidato
          </div>
          <h2 className="text-2xl md:text-3xl font-bold neon-title mb-2">Encuentra tu próximo empleo</h2>
          <p className="text-muted-foreground max-w-xl text-sm md:text-base">
            Explora vacantes verificadas, guarda las que te interesen y postula con tu hoja de vida en un solo clic.
          </p>
          <Link
            href="/resume"
            className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-primary hover:underline"
          >
            <FileText className="w-4 h-4" />
            Completar o actualizar mi hoja de vida
          </Link>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4 text-sm text-muted-foreground leading-relaxed border border-border/50">
        <p className="whitespace-pre-line">{MENPOE_RESUME_INVITATION}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cargo, empresa o palabra clave..."
          className="pl-12 h-12 rounded-2xl bg-white/5 border-primary/20"
          data-testid="input-job-search"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {WORK_MODE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setWorkModeFilter(f.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              workModeFilter === f.id
                ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.35)]"
                : "bg-white/5 text-muted-foreground hover:bg-white/10",
            )}
            data-testid={`filter-workmode-${f.id}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap border-b border-border/40 pb-1">
        {(["browse", "recommended", "saved"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            data-testid={`tab-jobs-${tab}`}
          >
            {TAB_LABELS[tab]}
            {tab === "saved" && savedJobs && savedJobs.length > 0 && (
              <span className="ml-1.5 text-xs opacity-80">({savedJobs.length})</span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading
          ? [...Array(5)].map((_, i) => <div key={i} className="h-32 glass-panel rounded-2xl animate-pulse" />)
          : displayJobs?.length === 0
            ? (
              <div className="text-center py-16 text-muted-foreground rounded-2xl border border-dashed border-border/60">
                <Briefcase className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-medium neon-text">No se encontraron vacantes</p>
                <p className="text-sm mt-1">Prueba otro filtro o vuelve más tarde</p>
              </div>
            )
            : displayJobs?.map((job) => {
              const workMode = getWorkModeLabel(job as { workMode?: string; isRemote?: boolean });
              return (
                <div
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  className="glass-panel rounded-2xl p-5 hover:border-primary/30 border border-transparent transition-all cursor-pointer group"
                  onClick={() => onSelectJob(job.id)}
                  onKeyDown={(e) => e.key === "Enter" && onSelectJob(job.id)}
                  data-testid={`card-job-${job.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-none group-hover:scale-105 transition-transform">
                      {job.companyLogoUrl
                        ? <img src={job.companyLogoUrl} className="w-full h-full rounded-xl object-cover" alt="" />
                        : <Briefcase className="w-6 h-6 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-base neon-text">{job.title}</h3>
                          <div className="text-sm text-muted-foreground">{job.company}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              shareEntity({ title: job.title, text: `Vacante en ${job.company}`, path: `/jobs?job=${job.id}` });
                            }}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveJob.mutate({ jobId: job.id }, { onSuccess: () => qc.invalidateQueries() });
                            }}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            data-testid={`button-save-${job.id}`}
                          >
                            {job.isSaved ? <BookmarkCheck className="w-5 h-5 text-primary" /> : <Bookmark className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/20">{workMode}</Badge>
                        {job.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />{job.location}
                          </span>
                        )}
                        {job.salary && <span className="text-xs text-green-400 font-medium">{job.salary}</span>}
                        {job.jobType && (
                          <Badge variant="outline" className={`text-xs ${JOB_TYPE_COLORS[job.jobType] ?? ""}`}>
                            {getJobTypeLabel(job.jobType)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    {(job as { poster?: { id: string; displayName: string; avatarUrl?: string } }).poster && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <img
                          src={(job as { poster: { avatarUrl?: string; id: string } }).poster.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${(job as { poster: { id: string } }).poster.id}`}
                          className="w-4 h-4 rounded-full object-cover bg-muted"
                          alt=""
                        />
                        <span>
                          Publicado por{" "}
                          <span className="text-foreground/80">{(job as { poster: { displayName: string } }).poster.displayName}</span>
                        </span>
                      </div>
                    )}
                    {job.hasApplied && (
                      <div className="text-xs text-green-400 font-medium flex items-center gap-1 ml-auto">
                        <Clock className="w-3.5 h-3.5" />
                        Postulado
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
