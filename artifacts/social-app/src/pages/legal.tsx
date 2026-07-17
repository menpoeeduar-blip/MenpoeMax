import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { ArrowLeft, FileText, Shield, Cookie, BookOpen, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

const DOCS: Record<string, { title: string; icon: typeof FileText; body: string[] }> = {
  terms: {
    title: "Condiciones del servicio",
    icon: FileText,
    body: [
      "Al usar MenpoeSocial aceptas estas condiciones. Debes tener al menos 13 años.",
      "Eres responsable del contenido que publicas y de mantener segura tu cuenta.",
      "No está permitido acoso, spam, contenido ilegal ni suplantación de identidad.",
      "Podemos suspender cuentas que violen las normas comunitarias.",
      "El servicio se ofrece «tal cual»; trabajamos continuamente para mejorar la plataforma.",
    ],
  },
  privacy: {
    title: "Política de privacidad",
    icon: Shield,
    body: [
      "Recopilamos datos que nos proporcionas: perfil, publicaciones, mensajes y preferencias.",
      "Usamos Firebase para autenticación y almacenamiento. No vendemos tu información personal.",
      "Puedes controlar visibilidad, bloqueos y notificaciones en Configuración.",
      "Tu fecha de nacimiento se usa para cumpleaños y verificación de edad según tu configuración de privacidad.",
      "Para ejercer derechos de acceso o eliminación, contacta soporte desde Ayuda.",
    ],
  },
  cookies: {
    title: "Política de cookies",
    icon: Cookie,
    body: [
      "Usamos almacenamiento local para sesión, preferencias y configuración de la app.",
      "Las cookies técnicas son necesarias para iniciar sesión y recordar tus ajustes.",
      "No usamos cookies de publicidad de terceros en esta versión.",
      "Puedes borrar datos locales desde la configuración de tu navegador.",
    ],
  },
  community: {
    title: "Normas comunitarias",
    icon: BookOpen,
    body: [
      "Trata a los demás con respeto. No toleramos odio, violencia ni acoso.",
      "No compartas información privada de otras personas sin consentimiento.",
      "Contenido sexual explícito o peligroso puede ser eliminado.",
      "Reporta publicaciones desde el menú de cada post.",
      "Los administradores de comunidades deben moderar según estas normas.",
    ],
  },
  "data-privacy": {
    title: "Política de tratamiento de datos personales",
    icon: Shield,
    body: [
      "MenpoeSocial, en cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013 (Colombia), informa que los datos personales y datos de contacto empresarial que usted suministre serán tratados para: publicación de vacantes, verificación de identidad del representante legal, comunicaciones sobre empleo y cumplimiento legal.",
      "Responsable del tratamiento: MenpoeSocial. Finalidades: gestión de ofertas laborales, seguridad de la plataforma, atención de solicitudes y notificaciones legales al correo corporativo registrado.",
      "Derechos del titular: conocer, actualizar, rectificar y suprimir sus datos, y revocar la autorización mediante solicitud al correo de soporte indicado en Ayuda.",
      "Los datos de empresas (razón social, NIT, representante legal, dirección y teléfono) se almacenan de forma cifrada en tránsito (HTTPS) y en bases de datos con acceso restringido.",
      "Al publicar una vacante, el representante legal declara que la información es veraz y autoriza el tratamiento descrito en esta política.",
      "Conservamos los registros de aceptación legal (fecha y versión de cláusula) asociados a cada publicación de empleo.",
    ],
  },
  "employer-terms": {
    title: "Términos para empresas empleadoras",
    icon: Briefcase,
    body: [
      "Al registrarse como empleador en MenpoeSocial, la empresa declara contar con capacidad legal para contratar y cumplir la normativa laboral del país donde ofrece la vacante.",
      "La empresa es responsable de la veracidad de la razón social, NIT, representante legal y datos de contacto suministrados.",
      "MenpoeSocial actúa como intermediario tecnológico; no es empleador directo de los candidatos que postulen a las vacantes.",
      "Está prohibido publicar ofertas discriminatorias, fraudulentas o que soliciten pagos a candidatos.",
      "Menpoe puede retirar vacantes que incumplan la ley o estas condiciones sin previo aviso en casos graves.",
      "El representante legal que pulsa «Publicar vacante legalmente» certifica la autorización para tratar datos conforme a la Política de Tratamiento de Datos Personales.",
    ],
  },
};

export default function Legal() {
  const [location] = useLocation();
  const docId = useMemo(() => {
    const q = location.includes("?") ? new URLSearchParams(location.split("?")[1]) : null;
    return q?.get("doc") || "terms";
  }, [location]);

  const doc = DOCS[docId] ?? DOCS.terms;
  const Icon = doc.icon;

  return (
    <Shell>
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <Link href="/settings?section=legal">
          <Button variant="ghost" size="sm" className="mb-4 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />Volver a configuración
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <Icon className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold neon-title">{doc.title}</h1>
        </div>
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <p className="text-xs text-muted-foreground">Última actualización: mayo 2026</p>
          {doc.body.map((p, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-6">
          {Object.entries(DOCS).map(([id, d]) => (
            <Link key={id} href={`/legal?doc=${id}`}>
              <Button variant={id === docId ? "default" : "outline"} size="sm" className="rounded-xl">{d.title}</Button>
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  );
}
