import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateJob } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  COMPANY_SIZE_OPTIONS,
  CONTRACT_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
  EMPLOYER_LEGAL_CLAUSE,
  emptyEmployerJobForm,
  validateEmployerJobForm,
  validateColombianNit,
  normalizeNit,
  parseRequirements,
  type EmployerJobForm,
  type CompanySize,
  type ContractType,
  type WorkMode,
} from "@/lib/job-employer";
import { uploadFile } from "@/lib/upload";
import { FormSelect } from "@/components/ui/form-select";
import {
  X,
  Building2,
  Briefcase,
  Scale,
  Shield,
  MapPin,
  ImageIcon,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Empresa", icon: Building2 },
  { id: 2, label: "Vacante", icon: Briefcase },
  { id: 3, label: "Legal", icon: Scale },
] as const;

type Props = { onClose: () => void };

export function CreateEmployerJobModal({ onClose }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<EmployerJobForm>(emptyEmployerJobForm);
  const [error, setError] = useState("");
  const [nitHint, setNitHint] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const createJob = useCreateJob();
  const qc = useQueryClient();

  const patch = <K extends keyof EmployerJobForm>(key: K, value: EmployerJobForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
    if (key === "nit") {
      const v = String(value);
      if (!v.trim()) setNitHint(null);
      else {
        const r = validateColombianNit(v);
        setNitHint(r.valid ? "✓ Formato de NIT válido" : r.message ?? null);
      }
    }
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const url = await uploadFile(file, { purpose: "avatar" });
      patch("logoUrl", url);
    } catch {
      setError("No se pudo subir el logo. Intenta con una imagen más pequeña.");
    } finally {
      setLogoUploading(false);
    }
  };

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!form.legalName.trim()) return "Razón social obligatoria.";
      const nit = validateColombianNit(form.nit);
      if (!nit.valid) return nit.message ?? "NIT inválido";
      if (!form.legalRepresentative.trim()) return "Representante legal obligatorio.";
      if (!form.notificationAddress.trim()) return "Dirección de notificaciones obligatoria.";
      if (!form.corporateEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.corporateEmail)) {
        return "Correo corporativo inválido.";
      }
      if (!form.contactPhone.trim()) return "Teléfono de contacto obligatorio.";
      if (!form.companySize) return "Selecciona el tamaño de la empresa.";
      return null;
    }
    if (s === 2) {
      if (!form.title.trim()) return "Título del cargo obligatorio.";
      if (!form.description.trim()) return "Descripción del puesto obligatoria.";
      if (!form.requirementsText.trim()) return "Requisitos mínimos obligatorios.";
      if (!form.contractType) return "Tipo de contrato obligatorio.";
      if (!form.salaryRange.trim()) return "Rango salarial obligatorio.";
      if (!form.workMode) return "Ubicación/modalidad obligatoria.";
      return null;
    }
    if (s === 3 && !form.legalAccepted) return "Debes aceptar la cláusula legal.";
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmployerJobForm(form);
    if (err) {
      setError(err);
      return;
    }

    const workMode = form.workMode as WorkMode;
    const locationParts = [
      WORK_MODE_OPTIONS.find((w) => w.id === workMode)?.label,
      form.locationDetail.trim(),
    ].filter(Boolean);

    createJob.mutate(
      {
        data: {
          title: form.title.trim(),
          company: form.legalName.trim(),
          description: form.description.trim(),
          location: locationParts.join(" · ") || "Colombia",
          isRemote: workMode === "remote",
          workMode,
          jobType: "full_time",
          salary: form.salaryRange.trim(),
          requirements: parseRequirements(form.requirementsText),
          companyLogoUrl: form.logoUrl || undefined,
          employer: {
            legalName: form.legalName.trim(),
            nit: normalizeNit(form.nit),
            legalRepresentative: form.legalRepresentative.trim(),
            notificationAddress: form.notificationAddress.trim(),
            corporateEmail: form.corporateEmail.trim().toLowerCase(),
            contactPhone: form.contactPhone.trim(),
            companySize: form.companySize as CompanySize,
            contractType: form.contractType as ContractType,
            salaryRange: form.salaryRange.trim(),
            workMode,
            legalAcceptedAt: new Date().toISOString(),
            legalClauseVersion: "2026-05-employer-v1",
          },
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries();
          onClose();
        },
        onError: () => setError("No se pudo publicar la vacante. Revisa tu conexión e intenta de nuevo."),
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-2xl max-h-[94vh] overflow-hidden flex flex-col glass-panel neon-border rounded-t-3xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-primary/20 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold neon-title">Registro legal de vacante</h2>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Cada empresa debe registrar sus propios datos legales · HTTPS · Ley 1581
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-white/10" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 flex gap-2 border-b border-border/30 shrink-0">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all",
                step === s.id ? "bg-primary/20 text-primary border border-primary/40" : step > s.id ? "text-emerald-400" : "text-muted-foreground bg-white/5",
              )}
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
              {step > s.id && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {step === 1 && (
              <>
                <SectionTitle>1. Información legal de la empresa</SectionTitle>
                <Field label="Razón social *" hint="Nombre legal ante Cámara de Comercio">
                  <Input value={form.legalName} onChange={(e) => patch("legalName", e.target.value)} className="neon-input rounded-xl" placeholder="Ej. Menpoe Social S.A.S." />
                </Field>
                <Field label="NIT *" hint="Número de Identificación Tributaria">
                  <Input
                    value={form.nit}
                    onChange={(e) => patch("nit", e.target.value)}
                    className={cn("neon-input rounded-xl", nitHint?.startsWith("✓") && "border-emerald-500/50")}
                    placeholder="900123456-7"
                    inputMode="numeric"
                  />
                  {nitHint && (
                    <p className={cn("text-xs mt-1", nitHint.startsWith("✓") ? "text-emerald-400" : "text-amber-400")}>{nitHint}</p>
                  )}
                </Field>
                <Field label="Representante legal *">
                  <Input value={form.legalRepresentative} onChange={(e) => patch("legalRepresentative", e.target.value)} className="neon-input rounded-xl" placeholder="Nombre completo" />
                </Field>
                <Field label="Dirección de notificaciones *" hint="Dirección física principal">
                  <Input value={form.notificationAddress} onChange={(e) => patch("notificationAddress", e.target.value)} className="neon-input rounded-xl" placeholder="Calle, ciudad, país" />
                </Field>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Correo corporativo *">
                    <Input type="email" value={form.corporateEmail} onChange={(e) => patch("corporateEmail", e.target.value)} className="neon-input rounded-xl" placeholder="legal@empresa.com" />
                  </Field>
                  <Field label="Teléfono de contacto *">
                    <Input type="tel" value={form.contactPhone} onChange={(e) => patch("contactPhone", e.target.value)} className="neon-input rounded-xl" placeholder="+57 300 000 0000" />
                  </Field>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">2. Clasificación de la empresa *</p>
                  <div className="space-y-2">
                    {COMPANY_SIZE_OPTIONS.map((opt) => (
                      <label
                        key={opt.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                          form.companySize === opt.id ? "border-primary bg-primary/10" : "border-border/50 bg-white/5 hover:border-primary/30",
                        )}
                      >
                        <input
                          type="radio"
                          name="companySize"
                          checked={form.companySize === opt.id}
                          onChange={() => patch("companySize", opt.id)}
                          className="mt-1"
                        />
                        <div>
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.hint}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <Field label="Logo de la empresa (opcional)">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-white/5 border border-border flex items-center justify-center overflow-hidden">
                      {form.logoUrl ? (
                        <img src={form.logoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <Button type="button" variant="outline" className="rounded-xl" disabled={logoUploading} onClick={() => logoRef.current?.click()}>
                      {logoUploading ? "Subiendo..." : "Subir logo"}
                    </Button>
                    <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                  </div>
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <SectionTitle>3. Detalles de la vacante</SectionTitle>
                <Field label="Título del cargo *">
                  <Input value={form.title} onChange={(e) => patch("title", e.target.value)} className="neon-input rounded-xl" placeholder="Ej. Analista de marketing digital" />
                </Field>
                <Field label="Descripción del puesto *">
                  <textarea
                    value={form.description}
                    onChange={(e) => patch("description", e.target.value)}
                    rows={4}
                    className="w-full rounded-xl neon-input border border-input bg-white/5 px-3 py-2 text-sm resize-none"
                    placeholder="Funciones, horario, beneficios..."
                  />
                </Field>
                <Field label="Requisitos mínimos *" hint="Un requisito por línea">
                  <textarea
                    value={form.requirementsText}
                    onChange={(e) => patch("requirementsText", e.target.value)}
                    rows={3}
                    className="w-full rounded-xl neon-input border border-input bg-white/5 px-3 py-2 text-sm resize-none"
                    placeholder="Título universitario&#10;2 años de experiencia&#10;Inglés intermedio"
                  />
                </Field>
                <Field label="Tipo de contrato *">
                  <FormSelect
                    value={form.contractType}
                    onValueChange={(v) => patch("contractType", v as ContractType)}
                    placeholder="Seleccionar..."
                    options={CONTRACT_TYPE_OPTIONS.map((c) => ({ value: c.id, label: c.label }))}
                  />
                </Field>
                <Field label="Rango salarial *">
                  <Input value={form.salaryRange} onChange={(e) => patch("salaryRange", e.target.value)} className="neon-input rounded-xl" placeholder="Ej. $3.000.000 – $4.500.000 COP / mes" />
                </Field>
                <Field label="Ubicación *">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {WORK_MODE_OPTIONS.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => patch("workMode", w.id)}
                        className={cn(
                          "py-2.5 rounded-xl text-xs font-medium border transition-all",
                          form.workMode === w.id ? "border-primary bg-primary/15 text-primary" : "border-border/50 bg-white/5 text-muted-foreground",
                        )}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={form.locationDetail}
                    onChange={(e) => patch("locationDetail", e.target.value)}
                    className="neon-input rounded-xl"
                    placeholder="Ciudad, sede u observaciones (opcional)"
                  />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <SectionTitle>4. Cláusula de aceptación (legal)</SectionTitle>
                <div className="glass-panel rounded-2xl p-4 border border-primary/25 text-sm text-muted-foreground leading-relaxed">
                  {EMPLOYER_LEGAL_CLAUSE}
                </div>
                <label className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.legalAccepted}
                    onChange={(e) => patch("legalAccepted", e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    Acepto la cláusula y certifico que actúo como representante autorizado de la empresa. He leído la{" "}
                    <Link href="/legal?doc=data-privacy" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                      Política de Tratamiento de Datos Personales
                    </Link>
                    .
                  </span>
                </label>
                <div className="rounded-xl p-3 bg-primary/10 border border-primary/20 text-xs text-muted-foreground flex gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    Resumen: <strong className="text-foreground">{form.legalName || "—"}</strong> · NIT {form.nit || "—"} · Cargo: {form.title || "—"}
                  </span>
                </div>
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="p-4 border-t border-primary/20 flex gap-2 shrink-0">
            {step > 1 ? (
              <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
            ) : (
              <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={onClose}>
                Cancelar
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" className="neon-btn rounded-xl flex-1" onClick={next}>
                Siguiente <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button type="submit" className="neon-btn rounded-xl flex-1" disabled={createJob.isPending} data-testid="button-submit-job">
                {createJob.isPending ? "Publicando..." : "Publicar vacante legalmente"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold neon-text uppercase tracking-wider">{children}</h3>;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {hint && <p className="text-[11px] text-muted-foreground mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}
