/** Validación y tipos para publicación legal de vacantes (Colombia). */

export type CompanySize = "small" | "medium" | "large";

export type WorkMode = "remote" | "on_site" | "hybrid";

export type ContractType = "fixed_term" | "indefinite" | "services";

export const COMPANY_SIZE_OPTIONS: { id: CompanySize; label: string; hint: string }[] = [
  { id: "small", label: "Pequeña empresa", hint: "De 1 a 50 empleados" },
  { id: "medium", label: "Mediana empresa", hint: "De 51 a 200 empleados" },
  { id: "large", label: "Multifuncional / gran empresa", hint: "Más de 200 empleados o estructuras complejas" },
];

export const CONTRACT_TYPE_OPTIONS: { id: ContractType; label: string }[] = [
  { id: "fixed_term", label: "Término fijo" },
  { id: "indefinite", label: "Indefinido" },
  { id: "services", label: "Prestación de servicios" },
];

export const WORK_MODE_OPTIONS: { id: WorkMode; label: string }[] = [
  { id: "remote", label: "Remoto" },
  { id: "on_site", label: "Presencial" },
  { id: "hybrid", label: "Híbrido" },
];

export const EMPLOYER_LEGAL_CLAUSE =
  "Al hacer clic en «Publicar vacante legalmente», el representante legal certifica que la información suministrada es veraz y se hace responsable del cumplimiento de las leyes laborales vigentes en el territorio colombiano (o el país de aplicación). Usted autoriza a Menpoe a tratar sus datos conforme a nuestra Política de Tratamiento de Datos Personales (Ley 1581 de 2012).";

/** NIT colombiano: 9–10 dígitos, opcional dígito de verificación tras guión. */
export function validateColombianNit(nit: string): { valid: boolean; message?: string } {
  const raw = nit.trim().replace(/\s/g, "");
  if (!raw) return { valid: false, message: "El NIT es obligatorio" };
  if (!/^\d{9,10}(-\d)?$/.test(raw)) {
    return {
      valid: false,
      message: "Formato inválido. Ejemplo: 900123456-7 o 9001234567 (9–10 dígitos)",
    };
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 11) {
    return { valid: false, message: "El NIT debe tener entre 9 y 10 dígitos numéricos" };
  }
  return { valid: true };
}

export function normalizeNit(nit: string) {
  return nit.trim().replace(/\s/g, "");
}

export function parseRequirements(text: string): string[] {
  return text
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type EmployerJobForm = {
  legalName: string;
  nit: string;
  legalRepresentative: string;
  notificationAddress: string;
  corporateEmail: string;
  contactPhone: string;
  companySize: CompanySize | "";
  logoUrl: string;
  title: string;
  description: string;
  requirementsText: string;
  contractType: ContractType | "";
  salaryRange: string;
  workMode: WorkMode | "";
  locationDetail: string;
  legalAccepted: boolean;
};

export const emptyEmployerJobForm = (): EmployerJobForm => ({
  legalName: "",
  nit: "",
  legalRepresentative: "",
  notificationAddress: "",
  corporateEmail: "",
  contactPhone: "",
  companySize: "",
  logoUrl: "",
  title: "",
  description: "",
  requirementsText: "",
  contractType: "",
  salaryRange: "",
  workMode: "",
  locationDetail: "",
  legalAccepted: false,
});

export function validateEmployerJobForm(form: EmployerJobForm): string | null {
  if (!form.legalName.trim()) return "Ingresa la razón social registrada ante la Cámara de Comercio.";
  const nitCheck = validateColombianNit(form.nit);
  if (!nitCheck.valid) return nitCheck.message ?? "NIT inválido";
  if (!form.legalRepresentative.trim()) return "Indica el representante legal.";
  if (!form.notificationAddress.trim()) return "Indica la dirección de notificaciones.";
  if (!form.corporateEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.corporateEmail.trim())) {
    return "Correo corporativo inválido.";
  }
  if (!form.contactPhone.trim()) return "Indica un teléfono de contacto.";
  if (!form.companySize) return "Selecciona el tamaño de la organización.";
  if (!form.title.trim()) return "Indica el título del cargo.";
  if (!form.description.trim()) return "Describe el puesto.";
  if (!form.requirementsText.trim()) return "Indica los requisitos mínimos.";
  if (!form.contractType) return "Selecciona el tipo de contrato.";
  if (!form.salaryRange.trim()) return "Indica el rango salarial.";
  if (!form.workMode) return "Selecciona la modalidad de trabajo.";
  if (!form.legalAccepted) return "Debes aceptar la cláusula legal para publicar.";
  return null;
}
