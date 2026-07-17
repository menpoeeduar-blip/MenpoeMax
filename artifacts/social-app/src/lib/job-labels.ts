import { WORK_MODE_OPTIONS, type WorkMode } from "./job-employer";

export const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Tiempo completo",
  part_time: "Medio tiempo",
  contract: "Por contrato",
  freelance: "Freelance",
  internship: "Prácticas",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: "Remoto",
  on_site: "Presencial",
  hybrid: "Híbrido",
};

export function getWorkModeLabel(job: { workMode?: string; isRemote?: boolean }): string {
  if (job.workMode && WORK_MODE_LABELS[job.workMode as WorkMode]) {
    return WORK_MODE_LABELS[job.workMode as WorkMode];
  }
  if (job.isRemote) return "Remoto";
  return "Presencial";
}

export function getJobTypeLabel(jobType?: string): string {
  if (!jobType) return "";
  return JOB_TYPE_LABELS[jobType] ?? jobType.replace(/_/g, " ");
}

export const WORK_MODE_FILTERS = [
  { id: "all" as const, label: "Todos" },
  ...WORK_MODE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
];

export type WorkModeFilter = "all" | WorkMode;
