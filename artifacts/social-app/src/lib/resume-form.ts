/** Hoja de vida Menpoe — tipos, validación y progreso. */

export type IdType = "cc" | "ce" | "passport";

export type WorkModePref = "remote" | "on_site" | "hybrid";

export type Availability = "immediate" | "15_days" | "30_days";

export type EducationLevel =
  | "bachiller"
  | "tecnico"
  | "tecnologo"
  | "profesional"
  | "posgrado";

export type WorkExperience = {
  id: string;
  companyName: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  duties: string;
};

export type EducationEntry = {
  level: EducationLevel | "";
  degree: string;
  institution: string;
  graduationYear: string;
};

export type ResumeForm = {
  fullName: string;
  idType: IdType | "";
  idNumber: string;
  birthDate: string;
  city: string;
  phone: string;
  email: string;
  portfolioUrl: string;
  professionalTitle: string;
  professionalSummary: string;
  experiences: WorkExperience[];
  education: EducationEntry;
  hardSkills: string;
  softSkills: string;
  workModePrefs: WorkModePref[];
  availability: Availability | "";
  salaryExpectation: string;
  resumePdfUrl: string;
  dataAccepted: boolean;
};

export const RESUME_AUTOSAVE_KEY = "menpoe_resume_draft_v1";

export const ID_TYPE_OPTIONS: { id: IdType; label: string }[] = [
  { id: "cc", label: "Cédula de ciudadanía" },
  { id: "ce", label: "Cédula de extranjería" },
  { id: "passport", label: "Pasaporte" },
];

export const EDUCATION_LEVELS: { id: EducationLevel; label: string }[] = [
  { id: "bachiller", label: "Bachiller" },
  { id: "tecnico", label: "Técnico" },
  { id: "tecnologo", label: "Tecnólogo" },
  { id: "profesional", label: "Profesional" },
  { id: "posgrado", label: "Posgrado" },
];

export const WORK_MODE_PREFS: { id: WorkModePref; label: string }[] = [
  { id: "remote", label: "Remoto" },
  { id: "on_site", label: "Presencial" },
  { id: "hybrid", label: "Híbrido" },
];

export const AVAILABILITY_OPTIONS: { id: Availability; label: string }[] = [
  { id: "immediate", label: "Inmediata" },
  { id: "15_days", label: "15 días" },
  { id: "30_days", label: "30 días" },
];

export const RESUME_DATA_CLAUSE =
  "Al completar este formulario, autorizo a Menpoe y a las empresas aliadas a tratar mis datos personales para fines de procesos de selección y reclutamiento, conforme a la Ley 1581 de 2012 de Protección de Datos Personales.";

/** Mensaje de invitación para completar la hoja de vida en Menpoe. */
export const MENPOE_RESUME_INVITATION =
  "Tu talento merece ser visible. En Menpoe conectamos profesionales con empresas que publican vacantes con datos legales verificados.\n\nCompleta tu hoja de vida en pocos minutos: guardamos tu avance automáticamente y podrás postular con un solo clic. Cuanto más completo esté tu perfil, mayores serán tus oportunidades de ser contactado por reclutadores y empresas aliadas.";

export const SUMMARY_MAX = 500;

export function emptyExperience(): WorkExperience {
  return {
    id: Math.random().toString(36).slice(2, 10),
    companyName: "",
    role: "",
    startDate: "",
    endDate: "",
    current: false,
    duties: "",
  };
}

export function emptyResumeForm(): ResumeForm {
  return {
    fullName: "",
    idType: "",
    idNumber: "",
    birthDate: "",
    city: "",
    phone: "",
    email: "",
    portfolioUrl: "",
    professionalTitle: "",
    professionalSummary: "",
    experiences: [emptyExperience()],
    education: { level: "", degree: "", institution: "", graduationYear: "" },
    hardSkills: "",
    softSkills: "",
    workModePrefs: [],
    availability: "",
    salaryExpectation: "",
    resumePdfUrl: "",
    dataAccepted: false,
  };
}

const STEPS_WEIGHT = [18, 12, 22, 14, 14, 12, 8]; // personal, profile, exp, edu, skills, prefs, legal

export function calculateResumeProgress(form: ResumeForm): number {
  const checks = [
    !!form.fullName.trim() && !!form.idType && !!form.idNumber.trim() && !!form.birthDate && !!form.city.trim() && !!form.phone.trim() && !!form.email.trim(),
    !!form.professionalTitle.trim() && !!form.professionalSummary.trim(),
    form.experiences.some((e) => e.companyName.trim() && e.role.trim() && e.startDate),
    !!form.education.level && !!form.education.degree.trim() && !!form.education.institution.trim(),
    !!form.hardSkills.trim() && !!form.softSkills.trim(),
    form.workModePrefs.length > 0 && !!form.availability,
    form.dataAccepted,
  ];
  let pct = 0;
  checks.forEach((ok, i) => {
    if (ok) pct += STEPS_WEIGHT[i] ?? 0;
  });
  if (form.resumePdfUrl) pct = Math.min(100, pct + 5);
  return Math.min(100, pct);
}

export function validateResumeForm(form: ResumeForm): string | null {
  if (!form.fullName.trim()) return "Nombre completo obligatorio.";
  if (!form.idType) return "Tipo de identificación obligatorio.";
  if (!form.idNumber.trim()) return "Número de identificación obligatorio.";
  if (!form.birthDate) return "Fecha de nacimiento obligatoria.";
  if (!form.city.trim()) return "Ciudad de residencia obligatoria.";
  if (!form.phone.trim()) return "Teléfono / WhatsApp obligatorio.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Correo electrónico inválido.";
  if (!form.professionalTitle.trim()) return "Título o cargo deseado obligatorio.";
  if (!form.professionalSummary.trim()) return "Resumen profesional obligatorio.";
  if (form.professionalSummary.length > SUMMARY_MAX) return `Resumen máximo ${SUMMARY_MAX} caracteres.`;
  const exp = form.experiences.find((e) => e.companyName.trim() && e.role.trim());
  if (!exp) return "Agrega al menos una experiencia laboral.";
  if (!form.education.level || !form.education.degree.trim()) return "Completa educación y formación.";
  if (!form.hardSkills.trim() || !form.softSkills.trim()) return "Indica habilidades técnicas y blandas.";
  if (form.workModePrefs.length === 0) return "Selecciona tipo de trabajo deseado.";
  if (!form.availability) return "Selecciona disponibilidad.";
  if (!form.dataAccepted) return "Debes autorizar el tratamiento de datos.";
  return null;
}

export function loadResumeDraft(userId: string): ResumeForm | null {
  try {
    const raw = localStorage.getItem(`${RESUME_AUTOSAVE_KEY}_${userId}`);
    if (!raw) return null;
    return { ...emptyResumeForm(), ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

export function saveResumeDraft(userId: string, form: ResumeForm) {
  try {
    localStorage.setItem(`${RESUME_AUTOSAVE_KEY}_${userId}`, JSON.stringify(form));
  } catch {
    /* quota */
  }
}
