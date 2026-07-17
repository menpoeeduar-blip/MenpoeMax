import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  emptyResumeForm,
  emptyExperience,
  calculateResumeProgress,
  validateResumeForm,
  saveResumeDraft,
  loadResumeDraft,
  RESUME_DATA_CLAUSE,
  SUMMARY_MAX,
  ID_TYPE_OPTIONS,
  EDUCATION_LEVELS,
  WORK_MODE_PREFS,
  AVAILABILITY_OPTIONS,
  type ResumeForm,
  type WorkModePref,
  type Availability,
  type EducationLevel,
} from "@/lib/resume-form";
import { useApplyToJobWithResume, useGetResumeDraft, useSaveResumeDraft } from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";
import { AppModal } from "@/components/ui/app-modal";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/upload";
import { X, ChevronLeft, ChevronRight, FileText, Save, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TOTAL_STEPS = 7;

type Props = {
  open: boolean;
  onClose: () => void;
  /** Si se omite, solo guarda borrador (p. ej. página Mi hoja de vida). */
  jobId?: string;
  jobTitle?: string;
  companyName?: string;
  onSuccess?: () => void;
  mode?: "apply" | "draft";
};

export function ResumeApplicationModal({ open, onClose, jobId, jobTitle, companyName, onSuccess, mode = "apply" }: Props) {
  const isDraft = mode === "draft" || !jobId;
  const { data: me } = useGetMe();
  const { data: draft } = useGetResumeDraft();
  const apply = useApplyToJobWithResume();
  const saveDraft = useSaveResumeDraft();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ResumeForm>(emptyResumeForm());
  const [error, setError] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const userId = me?.id || "";

  useEffect(() => {
    if (!open) return;
    const base = emptyResumeForm();
    const loaded = draft || (userId ? loadResumeDraft(userId) : null);
    if (loaded) {
      setForm({
        ...base,
        ...loaded,
        experiences: loaded.experiences?.length ? loaded.experiences : [emptyExperience()],
      });
    } else if (me) {
      setForm((f) => ({
        ...f,
        fullName: me.displayName || f.fullName,
        email: me.email || f.email,
        birthDate: (me as { birthDate?: string }).birthDate || f.birthDate,
      }));
    }
    setStep(1);
    setError("");
  }, [open, draft, me, userId]);

  const progress = calculateResumeProgress(form);

  const patch = useCallback(
    <K extends keyof ResumeForm>(key: K, value: ResumeForm[K]) => {
      setForm((f) => {
        const next = { ...f, [key]: value };
        if (userId) {
          if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
          autosaveTimer.current = setTimeout(() => {
            saveResumeDraft(userId, next);
            setLastSaved(new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }));
          }, 800);
        }
        return next;
      });
      setError("");
    },
    [userId],
  );

  const handleSaveDraft = () => {
    if (!userId) return;
    saveResumeDraft(userId, form);
    setLastSaved(new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }));
    toast({ title: "Borrador guardado", description: "Puedes continuar después." });
  };

  const handlePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfUploading(true);
    try {
      const url = await uploadFile(file, { purpose: "post" });
      patch("resumePdfUrl", url);
      toast({ title: "PDF adjunto" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "No se pudo subir", variant: "destructive" });
    } finally {
      setPdfUploading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateResumeForm(form);
    if (err) {
      setError(err);
      return;
    }
    if (isDraft) {
      saveDraft.mutate(form, {
        onSuccess: () => {
          toast({ title: "Hoja de vida guardada", description: "Tu perfil está listo para postular a vacantes." });
          onSuccess?.();
        },
        onError: (ex: Error) => toast({ title: "Error", description: ex.message, variant: "destructive" }),
      });
      return;
    }
    apply.mutate(
      { jobId: jobId!, resume: form, jobTitle, companyName },
      {
        onSuccess: () => {
          toast({ title: "¡Postulación enviada!", description: `Tu hoja de vida fue enviada a ${companyName}.` });
          onSuccess?.();
          onClose();
        },
        onError: (ex: Error) => toast({ title: "Error", description: ex.message, variant: "destructive" }),
      },
    );
  };

  return (
    <AppModal open={open} onClose={onClose} align="bottom" className="w-full sm:max-w-2xl">
      <div className="w-full max-h-[94vh] flex flex-col glass-panel neon-border rounded-t-3xl sm:rounded-3xl">
        <div className="p-4 border-b border-primary/20 shrink-0">
          <div className="flex justify-between items-start gap-2 mb-3">
            <div>
              <h2 className="text-lg font-bold neon-title flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Hoja de vida — Menpoe
              </h2>
              {!isDraft && jobTitle && (
                <p className="text-xs text-muted-foreground mt-1">
                  Postulando a: <strong className="text-foreground">{jobTitle}</strong>
                  {companyName ? ` · ${companyName}` : ""}
                </p>
              )}
              {isDraft && (
                <p className="text-xs text-muted-foreground mt-1">Completa tu perfil profesional. Se guarda automáticamente.</p>
              )}
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-white/10"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress}% completado</span>
              {lastSaved && <span>Guardado {lastSaved}</span>}
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 overflow-y-auto flex-1 space-y-4 text-sm">
            {step === 1 && (
              <>
                <H3>1. Datos personales</H3>
                <Field label="Nombre completo *"><Input className="neon-input rounded-xl" value={form.fullName} onChange={(e) => patch("fullName", e.target.value)} /></Field>
                <Field label="Tipo de identificación *">
                  <FormSelect
                    value={form.idType}
                    onValueChange={(v) => patch("idType", v as ResumeForm["idType"])}
                    options={ID_TYPE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                    placeholder="Seleccionar tipo..."
                  />
                </Field>
                <Field label="Número de identificación *"><Input className="neon-input rounded-xl" value={form.idNumber} onChange={(e) => patch("idNumber", e.target.value)} /></Field>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Fecha de nacimiento *"><Input type="date" className="neon-input rounded-xl" value={form.birthDate} onChange={(e) => patch("birthDate", e.target.value)} /></Field>
                  <Field label="Ciudad de residencia *"><Input className="neon-input rounded-xl" value={form.city} onChange={(e) => patch("city", e.target.value)} /></Field>
                </div>
                <Field label="Teléfono / WhatsApp *"><Input type="tel" className="neon-input rounded-xl" value={form.phone} onChange={(e) => patch("phone", e.target.value)} /></Field>
                <Field label="Correo electrónico *"><Input type="email" className="neon-input rounded-xl" value={form.email} onChange={(e) => patch("email", e.target.value)} /></Field>
                <Field label="Portafolio / LinkedIn (opcional)"><Input className="neon-input rounded-xl" value={form.portfolioUrl} onChange={(e) => patch("portfolioUrl", e.target.value)} placeholder="https://linkedin.com/in/..." /></Field>
              </>
            )}

            {step === 2 && (
              <>
                <H3>2. Perfil profesional</H3>
                <Field label="Título profesional o cargo deseado *"><Input className="neon-input rounded-xl" value={form.professionalTitle} onChange={(e) => patch("professionalTitle", e.target.value)} /></Field>
                <Field label={`Resumen profesional * (${form.professionalSummary.length}/${SUMMARY_MAX})`}>
                  <textarea rows={5} maxLength={SUMMARY_MAX} className="w-full rounded-xl neon-input border border-input bg-white/5 px-3 py-2 resize-none" value={form.professionalSummary} onChange={(e) => patch("professionalSummary", e.target.value)} placeholder="Logros, habilidades y años de experiencia..." />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <H3>3. Experiencia laboral</H3>
                {form.experiences.map((exp, idx) => (
                  <div key={exp.id} className="glass-panel rounded-xl p-3 space-y-2 border border-border/40">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">Empleo {idx + 1}</span>
                      {form.experiences.length > 1 && (
                        <button type="button" className="text-xs text-destructive" onClick={() => patch("experiences", form.experiences.filter((e) => e.id !== exp.id))}>Quitar</button>
                      )}
                    </div>
                    <Input placeholder="Empresa *" className="neon-input rounded-xl" value={exp.companyName} onChange={(e) => { const ex = [...form.experiences]; ex[idx] = { ...exp, companyName: e.target.value }; patch("experiences", ex); }} />
                    <Input placeholder="Cargo *" className="neon-input rounded-xl" value={exp.role} onChange={(e) => { const ex = [...form.experiences]; ex[idx] = { ...exp, role: e.target.value }; patch("experiences", ex); }} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="month" className="neon-input rounded-xl" value={exp.startDate} onChange={(e) => { const ex = [...form.experiences]; ex[idx] = { ...exp, startDate: e.target.value }; patch("experiences", ex); }} />
                      <Input type="month" className="neon-input rounded-xl" disabled={exp.current} value={exp.endDate} onChange={(e) => { const ex = [...form.experiences]; ex[idx] = { ...exp, endDate: e.target.value }; patch("experiences", ex); }} />
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={exp.current} onChange={(e) => { const ex = [...form.experiences]; ex[idx] = { ...exp, current: e.target.checked, endDate: e.target.checked ? "" : exp.endDate }; patch("experiences", ex); }} />
                      Actualmente trabajo aquí
                    </label>
                    <textarea placeholder="Funciones principales" rows={2} className="w-full rounded-xl bg-white/5 border border-input px-3 py-2 text-sm" value={exp.duties} onChange={(e) => { const ex = [...form.experiences]; ex[idx] = { ...exp, duties: e.target.value }; patch("experiences", ex); }} />
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => patch("experiences", [...form.experiences, emptyExperience()])}>+ Agregar otro empleo</Button>
              </>
            )}

            {step === 4 && (
              <>
                <H3>4. Educación y formación</H3>
                <Field label="Nivel de estudios *">
                  <FormSelect
                    value={form.education.level}
                    onValueChange={(v) => patch("education", { ...form.education, level: v as EducationLevel })}
                    options={EDUCATION_LEVELS.map((l) => ({ value: l.id, label: l.label }))}
                    placeholder="Seleccionar nivel..."
                  />
                </Field>
                <Field label="Título obtenido *"><Input className="neon-input rounded-xl" value={form.education.degree} onChange={(e) => patch("education", { ...form.education, degree: e.target.value })} /></Field>
                <Field label="Institución *"><Input className="neon-input rounded-xl" value={form.education.institution} onChange={(e) => patch("education", { ...form.education, institution: e.target.value })} /></Field>
                <Field label="Año de graduación"><Input className="neon-input rounded-xl" value={form.education.graduationYear} onChange={(e) => patch("education", { ...form.education, graduationYear: e.target.value })} placeholder="2024" /></Field>
              </>
            )}

            {step === 5 && (
              <>
                <H3>5. Habilidades</H3>
                <Field label="Habilidades técnicas (hard skills) *"><textarea rows={3} className="w-full rounded-xl bg-white/5 border border-input px-3 py-2" value={form.hardSkills} onChange={(e) => patch("hardSkills", e.target.value)} placeholder="Python, Excel, inglés B2..." /></Field>
                <Field label="Habilidades blandas (soft skills) *"><textarea rows={3} className="w-full rounded-xl bg-white/5 border border-input px-3 py-2" value={form.softSkills} onChange={(e) => patch("softSkills", e.target.value)} placeholder="Trabajo en equipo, liderazgo..." /></Field>
              </>
            )}

            {step === 6 && (
              <>
                <H3>6. Preferencias laborales</H3>
                <p className="text-xs text-muted-foreground mb-2">Tipo de trabajo deseado *</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {WORK_MODE_PREFS.map((w) => (
                    <button key={w.id} type="button" onClick={() => { const set = new Set(form.workModePrefs); if (set.has(w.id)) set.delete(w.id); else set.add(w.id); patch("workModePrefs", [...set] as WorkModePref[]); }} className={cn("px-3 py-2 rounded-xl text-xs border", form.workModePrefs.includes(w.id) ? "border-primary bg-primary/15 text-primary" : "border-border/50")}>{w.label}</button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mb-2">Disponibilidad *</p>
                <div className="space-y-2 mb-4">
                  {AVAILABILITY_OPTIONS.map((a) => (
                    <label key={a.id} className={cn("flex items-center gap-2 p-3 rounded-xl border cursor-pointer", form.availability === a.id ? "border-primary bg-primary/10" : "border-border/50")}>
                      <input type="radio" name="avail" checked={form.availability === a.id} onChange={() => patch("availability", a.id)} />
                      {a.label}
                    </label>
                  ))}
                </div>
                <Field label="Pretensión salarial (opcional)"><Input className="neon-input rounded-xl" value={form.salaryExpectation} onChange={(e) => patch("salaryExpectation", e.target.value)} /></Field>
              </>
            )}

            {step === 7 && (
              <>
                <H3>7. Autorización y CV en PDF</H3>
                <div className="glass-panel rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">{RESUME_DATA_CLAUSE}</div>
                <label className="flex items-start gap-2 p-3 rounded-xl border border-border/50 cursor-pointer">
                  <input type="checkbox" checked={form.dataAccepted} onChange={(e) => patch("dataAccepted", e.target.checked)} className="mt-1" />
                  <span>Acepto el tratamiento de datos para selección y reclutamiento.</span>
                </label>
                <Field label="Adjuntar hoja de vida en PDF (opcional, máx. 2 MB)">
                  <div className="flex gap-2 items-center">
                    <Button type="button" variant="outline" className="rounded-xl" disabled={pdfUploading} onClick={() => pdfRef.current?.click()}>
                      {pdfUploading ? "Subiendo..." : form.resumePdfUrl ? "Cambiar PDF" : "Subir PDF"}
                    </Button>
                    {form.resumePdfUrl && <span className="text-xs text-emerald-400">✓ PDF listo</span>}
                    <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdf} />
                  </div>
                </Field>
                <p className="text-xs text-muted-foreground">
                  También puedes completar tu perfil en <Link href="/resume" className="text-primary hover:underline">Mi hoja de vida</Link> para reutilizarla.
                </p>
              </>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          <div className="p-4 border-t border-primary/20 flex flex-wrap gap-2 shrink-0">
            <Button type="button" variant="outline" className="rounded-xl" onClick={handleSaveDraft}><Save className="w-4 h-4 mr-1" /> Guardar</Button>
            {step > 1 ? <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={() => setStep((s) => s - 1)}><ChevronLeft className="w-4 h-4" /> Anterior</Button> : <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={onClose}>Cancelar</Button>}
            {step < TOTAL_STEPS ? (
              <Button type="button" className="neon-btn rounded-xl flex-1" onClick={() => setStep((s) => s + 1)}>Siguiente <ChevronRight className="w-4 h-4" /></Button>
            ) : (
              <Button type="submit" className="neon-btn rounded-xl flex-1" disabled={isDraft ? saveDraft.isPending : apply.isPending}><Briefcase className="w-4 h-4 mr-1" />{isDraft ? (saveDraft.isPending ? "Guardando..." : "Guardar hoja de vida") : apply.isPending ? "Enviando..." : "Enviar postulación"}</Button>
            )}
          </div>
        </form>
      </div>
    </AppModal>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold neon-text uppercase tracking-wider">{children}</h3>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium mb-1">{label}</label>{children}</div>;
}
