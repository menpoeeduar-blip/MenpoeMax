import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useGetAccountSettings,
  useUpdateAccountSettings,
  useGetActivityLog,
  useGetMe,
} from "@workspace/api-client-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Settings, User, Shield, Bell, Heart, Globe, Eye, Lock, Users, FileText,
  MapPin, Smartphone, CreditCard, Scale, ChevronRight, CheckCircle2, Baby,
  Sparkles, Tag, Radio, Briefcase, Cookie, BookOpen, Activity, Download, Upload,
} from "lucide-react";
import { FormSelect } from "@/components/ui/form-select";
import type { AccountSettings } from "@/lib/account-settings";
import { downloadBackupJson, exportProfileBackup, importProfileBackupFile } from "@/lib/profile-backup";

type SectionId =
  | "hub"
  | "account"
  | "privacy-check"
  | "family"
  | "default-audience"
  | "reactions"
  | "notifications"
  | "accessibility"
  | "locale"
  | "audience"
  | "profile-info"
  | "professional"
  | "findability"
  | "posts"
  | "stories"
  | "followers"
  | "tagging"
  | "blocks"
  | "active-status"
  | "payments"
  | "activity"
  | "location"
  | "apps"
  | "legal"
  | "backup";

const MENU: { id: SectionId; label: string; icon: typeof Settings; group: string }[] = [
  { id: "account", label: "Centro de cuentas", icon: User, group: "Tu cuenta" },
  { id: "backup", label: "Copia de seguridad", icon: Download, group: "Tu cuenta" },
  { id: "privacy-check", label: "Comprobación de privacidad", icon: CheckCircle2, group: "Tu cuenta" },
  { id: "family", label: "Centro para familias", icon: Baby, group: "Tu cuenta" },
  { id: "default-audience", label: "Audiencia predeterminada", icon: Eye, group: "Tu cuenta" },
  { id: "reactions", label: "Preferencias de reacciones", icon: Heart, group: "Preferencias" },
  { id: "notifications", label: "Notificaciones", icon: Bell, group: "Preferencias" },
  { id: "accessibility", label: "Accesibilidad", icon: Sparkles, group: "Preferencias" },
  { id: "locale", label: "Idioma y región", icon: Globe, group: "Preferencias" },
  { id: "audience", label: "Resumen audiencia y visibilidad", icon: Shield, group: "Audiencia" },
  { id: "profile-info", label: "Información del perfil", icon: User, group: "Audiencia" },
  { id: "professional", label: "Modo profesional", icon: Briefcase, group: "Audiencia" },
  { id: "findability", label: "Cómo encontrarte y contactarte", icon: Users, group: "Audiencia" },
  { id: "posts", label: "Publicaciones", icon: FileText, group: "Audiencia" },
  { id: "stories", label: "Historias", icon: Radio, group: "Audiencia" },
  { id: "followers", label: "Seguidores y contenido público", icon: Users, group: "Audiencia" },
  { id: "tagging", label: "Perfil y etiquetado", icon: Tag, group: "Audiencia" },
  { id: "blocks", label: "Bloqueos", icon: Lock, group: "Audiencia" },
  { id: "active-status", label: "Estado activo", icon: Activity, group: "Audiencia" },
  { id: "payments", label: "Pagos de anuncios", icon: CreditCard, group: "Pagos" },
  { id: "activity", label: "Registro de actividad", icon: Activity, group: "Tu actividad" },
  { id: "location", label: "Ubicación", icon: MapPin, group: "Tu actividad" },
  { id: "apps", label: "Apps y sitios conectados", icon: Smartphone, group: "Tu actividad" },
  { id: "legal", label: "Normas y políticas legales", icon: Scale, group: "Legal" },
];

function SelectRow({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="py-3 border-b border-border/30 last:border-0">
      <p className="text-sm font-medium">{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      <FormSelect
        value={value}
        onValueChange={onChange}
        options={options.map((o) => ({ value: o.value, label: o.label }))}
        className="mt-2"
      />
    </div>
  );
}

function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/30 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

const VIS_OPTIONS = [
  { value: "publico", label: "Público" },
  { value: "amigos", label: "Solo amigos" },
  { value: "solo_yo", label: "Solo yo" },
];

export default function SettingsPage() {
  const [location] = useLocation();
  const sectionFromUrl = useMemo(() => {
    const q = location.includes("?") ? new URLSearchParams(location.split("?")[1]) : null;
    return (q?.get("section") as SectionId) || "hub";
  }, [location]);
  const [section, setSection] = useState<SectionId>(sectionFromUrl);
  const { data: settings, isLoading } = useGetAccountSettings();
  const update = useUpdateAccountSettings();
  const { data: activity } = useGetActivityLog();
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const backupFileRef = useRef<HTMLInputElement>(null);
  const [newBlockId, setNewBlockId] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => setSection(sectionFromUrl), [sectionFromUrl]);

  const patch = (p: Partial<AccountSettings>) => {
    update.mutate(p, {
      onSuccess: () => toast({ title: "Guardado", description: "Preferencia actualizada." }),
    });
  };

  const groups = useMemo(() => {
    const g = new Map<string, typeof MENU>();
    MENU.forEach((m) => {
      if (!g.has(m.group)) g.set(m.group, []);
      g.get(m.group)!.push(m);
    });
    return [...g.entries()];
  }, []);

  const scorePrivacy = () => {
    if (!settings) return 0;
    let score = 0;
    if (settings.limitedProfile) score += 15;
    if (settings.defaultVisibility !== "publico") score += 20;
    if (settings.whoCanFindByEmail !== "todos") score += 15;
    if (settings.allowMessages !== "todos") score += 15;
    if (!settings.locationSharing) score += 15;
    if (settings.blockedIds.length >= 0) score += 10;
    if (!settings.showOnline) score += 10;
    return Math.min(100, score);
  };

  const renderSection = () => {
    if (!settings) return null;
    const s = settings;

    switch (section) {
      case "account":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Contraseña, correo y datos personales.</p>
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <p className="text-xs text-muted-foreground">Correo vinculado</p>
              <p className="font-medium">{auth.currentUser?.email ?? "—"}</p>
              <Button
                variant="outline"
                className="rounded-xl w-full"
                onClick={async () => {
                  const email = auth.currentUser?.email;
                  if (!email) return;
                  await sendPasswordResetEmail(auth, email);
                  toast({ title: "Correo enviado", description: "Revisa tu bandeja para restablecer la contraseña." });
                }}
              >
                Enviar enlace para restablecer contraseña
              </Button>
            </div>
            {auth.currentUser?.providerData.some((p) => p.providerId === "password") && (
              <div className="glass-panel rounded-2xl p-5 space-y-3">
                <p className="font-medium text-sm">Cambiar contraseña</p>
                <Input type="password" placeholder="Contraseña actual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="rounded-xl bg-white/5" />
                <Input type="password" placeholder="Nueva contraseña (mín. 8)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl bg-white/5" />
                <Button
                  className="rounded-xl w-full"
                  onClick={async () => {
                    const user = auth.currentUser;
                    if (!user?.email || !currentPassword || newPassword.length < 8) {
                      toast({ title: "Error", description: "Completa ambos campos (mín. 8 caracteres)." });
                      return;
                    }
                    try {
                      const cred = EmailAuthProvider.credential(user.email, currentPassword);
                      await reauthenticateWithCredential(user, cred);
                      await updatePassword(user, newPassword);
                      setCurrentPassword("");
                      setNewPassword("");
                      toast({ title: "Contraseña actualizada" });
                    } catch {
                      toast({ title: "Error", description: "No se pudo cambiar. Usa el enlace por correo." });
                    }
                  }}
                >
                  Actualizar contraseña
                </Button>
              </div>
            )}
            <Link href={`/profile/${me?.id}`}>
              <Button variant="outline" className="w-full rounded-xl">Editar datos personales en el perfil</Button>
            </Link>
            <Link href="/help">
              <Button variant="ghost" className="w-full rounded-xl text-muted-foreground">Herramientas y recursos → Ayuda</Button>
            </Link>
          </div>
        );

      case "backup":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Exporta un JSON con tu perfil y ajustes. Útil sin Storage: puedes guardar el archivo en tu dispositivo.
            </p>
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <Button
                className="w-full rounded-xl neon-btn gap-2"
                onClick={async () => {
                  try {
                    const backup = await exportProfileBackup();
                    downloadBackupJson(backup);
                    toast({ title: "Backup descargado", description: "menpoemax-backup.json" });
                  } catch {
                    toast({ title: "Error al exportar", variant: "destructive" });
                  }
                }}
              >
                <Download className="w-4 h-4" /> Exportar copia
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl gap-2"
                onClick={() => backupFileRef.current?.click()}
              >
                <Upload className="w-4 h-4" /> Restaurar ajustes desde JSON
              </Button>
              <input
                ref={backupFileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  const result = await importProfileBackupFile(file);
                  toast({
                    title: result.ok ? "Importado" : "Error",
                    description: result.message,
                    variant: result.ok ? "default" : "destructive",
                  });
                }}
              />
            </div>
          </div>
        );

      case "privacy-check":
        return (
          <div className="space-y-4">
            <div className="glass-panel glass-panel-glow rounded-2xl p-6 text-center border border-primary/30">
              <p className="text-4xl font-bold neon-text">{scorePrivacy()}%</p>
              <p className="text-sm text-muted-foreground mt-1">Nivel de privacidad configurado</p>
            </div>
            <div className="glass-panel rounded-2xl p-5 space-y-2 text-sm">
              <p className="font-medium mb-2">Recomendaciones rápidas</p>
              {s.defaultVisibility === "publico" && (
                <button type="button" className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10" onClick={() => patch({ defaultVisibility: "amigos" })}>
                  → Cambiar publicaciones predeterminadas a «Solo amigos»
                </button>
              )}
              {s.showOnline && (
                <button type="button" className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10" onClick={() => patch({ showOnline: false })}>
                  → Ocultar estado activo / en línea
                </button>
              )}
              {s.locationSharing && (
                <button type="button" className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10" onClick={() => patch({ locationSharing: false })}>
                  → Desactivar compartir ubicación
                </button>
              )}
              {scorePrivacy() >= 70 && (
                <p className="text-muted-foreground p-3">Tu configuración está bien equilibrada. Revisa bloqueos y etiquetado si lo necesitas.</p>
              )}
            </div>
          </div>
        );

      case "family":
        return (
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <Baby className="w-10 h-10 text-primary" />
            <h2 className="font-semibold neon-text">Centro para familias</h2>
            <p className="text-sm text-muted-foreground">
              Herramientas para supervisar cuentas de menores y experiencias más seguras. En MenpoeMax el registro exige tener al menos 13 años.
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>Control parental avanzado — próximamente</li>
              <li>Restricción de perfil para cuentas nuevas</li>
              <li>Reportar contenido desde cualquier publicación</li>
            </ul>
            <Link href="/help"><Button variant="outline" className="rounded-xl">Contactar soporte familiar</Button></Link>
          </div>
        );

      case "default-audience":
        return (
          <div className="glass-panel rounded-2xl p-5">
            <SelectRow label="Audiencia predeterminada de publicaciones" description="Quién puede ver tus nuevas publicaciones" value={s.defaultVisibility} options={VIS_OPTIONS} onChange={(v) => patch({ defaultVisibility: v as AccountSettings["defaultVisibility"] })} />
          </div>
        );

      case "reactions":
        return (
          <div className="glass-panel rounded-2xl p-5">
            <SelectRow label="Reacción predeterminada" value={s.defaultReaction} options={[
              { value: "like", label: "👍 Me gusta" },
              { value: "love", label: "❤️ Me encanta" },
              { value: "haha", label: "😂 Me divierte" },
              { value: "wow", label: "😮 Me asombra" },
              { value: "sad", label: "😢 Me entristece" },
            ]} onChange={(v) => patch({ defaultReaction: v as AccountSettings["defaultReaction"] })} />
            <SwitchRow label="Mostrar recuentos de reacciones" checked={s.showReactionCounts} onCheckedChange={(v) => patch({ showReactionCounts: v })} />
          </div>
        );

      case "notifications":
        return (
          <div className="glass-panel rounded-2xl p-5">
            {Object.entries(s.notifications).map(([key, val]) => (
              <SwitchRow
                key={key}
                label={key === "likes" ? "Me gusta" : key === "comments" ? "Comentarios" : key === "follows" ? "Nuevos seguidores" : key === "messages" ? "Mensajes" : key === "birthdays" ? "Cumpleaños" : key === "memories" ? "Recuerdos" : key === "emailDigest" ? "Resumen por correo" : key === "pushEnabled" ? "Notificaciones push" : "Sistema"}
                checked={!!val}
                onCheckedChange={(v) => patch({ notifications: { ...s.notifications, [key]: v } })}
              />
            ))}
            <Link href="/notifications" className="block mt-4"><Button variant="outline" className="w-full rounded-xl">Ver bandeja de notificaciones</Button></Link>
          </div>
        );

      case "accessibility":
        return (
          <div className="glass-panel rounded-2xl p-5">
            <SwitchRow label="Reducir animaciones" description="Menos movimiento en la interfaz" checked={s.accessibility.reduceMotion} onCheckedChange={(v) => patch({ accessibility: { ...s.accessibility, reduceMotion: v } })} />
            <SwitchRow label="Texto más grande" checked={s.accessibility.largeText} onCheckedChange={(v) => patch({ accessibility: { ...s.accessibility, largeText: v } })} />
            <SwitchRow label="Alto contraste" checked={s.accessibility.highContrast} onCheckedChange={(v) => patch({ accessibility: { ...s.accessibility, highContrast: v } })} />
          </div>
        );

      case "locale":
        return (
          <div className="glass-panel rounded-2xl p-5">
            <SelectRow label="Idioma" value={s.locale} options={[{ value: "es", label: "Español" }, { value: "en", label: "English" }]} onChange={(v) => patch({ locale: v })} />
            <SelectRow label="Región" value={s.region} options={[{ value: "ES", label: "España" }, { value: "MX", label: "México" }, { value: "AR", label: "Argentina" }, { value: "US", label: "Estados Unidos" }]} onChange={(v) => patch({ region: v })} />
          </div>
        );

      case "profile-info":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Nombre, bio, cumpleaños, foto y más.</p>
            <Link href={`/profile/${me?.id}`}><Button className="w-full rounded-xl neon-btn">Ir a editar perfil</Button></Link>
            <SwitchRow label="Perfil restringido" description="Solo amigos ven tu contenido completo" checked={s.limitedProfile} onCheckedChange={(v) => patch({ limitedProfile: v })} />
            <SelectRow label="Quién ve tu perfil" value={s.profileVisibility} options={VIS_OPTIONS} onChange={(v) => patch({ profileVisibility: v as AccountSettings["profileVisibility"] })} />
          </div>
        );

      case "professional":
        return (
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <SwitchRow label="Modo profesional" description="Destaca empleo, habilidades y páginas de negocio" checked={s.professionalMode} onCheckedChange={(v) => patch({ professionalMode: v })} />
            <Link href="/business"><Button variant="outline" className="w-full rounded-xl">Gestionar página de negocio</Button></Link>
            <Link href="/jobs"><Button variant="outline" className="w-full rounded-xl">Empleos y vacantes</Button></Link>
          </div>
        );

      case "findability":
        return (
          <div className="glass-panel rounded-2xl p-5">
            <SelectRow label="Quién puede encontrarte por correo" value={s.whoCanFindByEmail} options={[{ value: "todos", label: "Todos" }, { value: "amigos", label: "Solo amigos" }, { value: "nadie", label: "Nadie" }]} onChange={(v) => patch({ whoCanFindByEmail: v as AccountSettings["whoCanFindByEmail"] })} />
            <SelectRow label="Quién puede enviarte solicitud de amistad" value={s.whoCanSendFriendRequest} options={[{ value: "todos", label: "Todos" }, { value: "amigos", label: "Amigos de amigos" }]} onChange={(v) => patch({ whoCanSendFriendRequest: v as AccountSettings["whoCanSendFriendRequest"] })} />
            <SelectRow label="Quién puede enviarte mensajes" value={s.allowMessages} options={[{ value: "todos", label: "Todos" }, { value: "amigos", label: "Solo amigos" }, { value: "nadie", label: "Nadie" }]} onChange={(v) => patch({ allowMessages: v as AccountSettings["allowMessages"] })} />
          </div>
        );

      case "posts":
        return (
          <div className="glass-panel rounded-2xl p-5">
            <SelectRow label="Visibilidad de publicaciones nuevas" value={s.defaultVisibility} options={VIS_OPTIONS} onChange={(v) => patch({ defaultVisibility: v as AccountSettings["defaultVisibility"] })} />
          </div>
        );

      case "stories":
        return (
          <div className="glass-panel rounded-2xl p-5">
            <SelectRow label="Quién ve tus historias" value={s.storiesVisibility} options={VIS_OPTIONS} onChange={(v) => patch({ storiesVisibility: v as AccountSettings["storiesVisibility"] })} />
          </div>
        );

      case "followers":
        return (
          <div className="glass-panel rounded-2xl p-5">
            <SelectRow label="Lista de seguidores" value={s.followersVisibility} options={VIS_OPTIONS} onChange={(v) => patch({ followersVisibility: v as AccountSettings["followersVisibility"] })} />
          </div>
        );

      case "tagging":
        return (
          <div className="glass-panel rounded-2xl p-5">
            <SwitchRow label="Permitir que te etiqueten" checked={s.allowTagging} onCheckedChange={(v) => patch({ allowTagging: v })} />
            <SwitchRow label="Revisar etiquetas antes de mostrarlas" checked={s.reviewTagsBeforeShow} onCheckedChange={(v) => patch({ reviewTagsBeforeShow: v })} />
          </div>
        );

      case "blocks":
        return (
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-sm font-medium mb-2">Usuarios bloqueados ({s.blockedIds.length})</p>
              <div className="flex gap-2 mb-3">
                <Input value={newBlockId} onChange={(e) => setNewBlockId(e.target.value)} placeholder="ID de usuario a bloquear" className="rounded-xl bg-white/5 text-sm" />
                <Button
                  variant="outline"
                  className="rounded-xl flex-none"
                  onClick={() => {
                    if (!newBlockId.trim()) return;
                    patch({ blockedIds: [...new Set([...s.blockedIds, newBlockId.trim()])] });
                    setNewBlockId("");
                  }}
                >
                  Bloquear
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {s.blockedIds.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No hay usuarios bloqueados.</p>
                ) : (
                  s.blockedIds.map((id) => (
                    <div key={id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/5">
                      <span className="truncate font-mono text-xs">{id}</span>
                      <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => patch({ blockedIds: s.blockedIds.filter((x) => x !== id) })}>Quitar</Button>
                    </div>
                  ))
                )}
              </div>
              {s.blockedIds.length > 0 && (
                <Button variant="outline" className="w-full mt-3 rounded-xl" onClick={() => patch({ blockedIds: [] })}>Limpiar todos</Button>
              )}
            </div>
          </div>
        );

      case "active-status":
        return (
          <div className="glass-panel rounded-2xl p-5">
            <SwitchRow label="Mostrar estado activo" description="Otros ven cuando estás en línea" checked={s.showOnline} onCheckedChange={(v) => patch({ showOnline: v })} />
            <SwitchRow label="Confirmaciones de lectura" checked={s.showReadReceipts} onCheckedChange={(v) => patch({ showReadReceipts: v })} />
          </div>
        );

      case "payments":
        return (
          <div className="glass-panel rounded-2xl p-6">
            <CreditCard className="w-10 h-10 text-primary mb-3" />
            <h2 className="font-semibold">Pagos y anuncios</h2>
            <p className="text-sm text-muted-foreground mt-2">Recarga tokens para regalos y promociona publicaciones.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Link href="/wallet"><Button className="rounded-xl">Billetera y regalos</Button></Link>
              <Link href="/promote"><Button variant="outline" className="rounded-xl">Promocionar</Button></Link>
            </div>
            <div className="mt-6 pt-4 border-t border-border/30">
              <SwitchRow label="Anuncios personalizados" description="Basados en tu actividad en la plataforma" checked={s.ads.personalizedAds} onCheckedChange={(v) => patch({ ads: { ...s.ads, personalizedAds: v } })} />
              <SwitchRow label="Anuncios por intereses" checked={s.ads.activityBasedAds} onCheckedChange={(v) => patch({ ads: { ...s.ads, activityBasedAds: v } })} />
            </div>
          </div>
        );

      case "activity":
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Tu actividad reciente en MenpoeSocial.</p>
            {(activity ?? []).length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center text-muted-foreground text-sm">Aún no hay actividad registrada.</div>
            ) : (
              (activity ?? []).map((a) => (
                <div key={a.id} className="glass-panel rounded-xl p-3 flex justify-between gap-2">
                  <span className="text-sm">{a.label}</span>
                  <span className="text-xs text-muted-foreground flex-none">hace {formatDistanceToNow(new Date(a.createdAt))}</span>
                </div>
              ))
            )}
          </div>
        );

      case "location":
        return (
          <div className="glass-panel rounded-2xl p-5">
            <SwitchRow label="Compartir ubicación en publicaciones" description="Al crear posts con ubicación" checked={s.locationSharing} onCheckedChange={(v) => patch({ locationSharing: v })} />
          </div>
        );

      case "apps":
        return (
          <div className="glass-panel rounded-2xl p-6">
            <Smartphone className="w-10 h-10 text-primary mb-3" />
            <h2 className="font-semibold">Apps y sitios conectados</h2>
            <p className="text-sm text-muted-foreground mt-2">No hay aplicaciones de terceros conectadas a tu cuenta.</p>
            <p className="text-xs text-muted-foreground mt-4">Integraciones empresariales y API para partners — contacta soporte.</p>
            <Link href="/help"><Button variant="outline" className="mt-4 rounded-xl">Más información</Button></Link>
          </div>
        );

      case "legal":
        return (
          <div className="space-y-2">
            {[
              { id: "terms", label: "Condiciones del servicio", icon: FileText },
              { id: "privacy", label: "Política de privacidad", icon: Shield },
              { id: "data-privacy", label: "Tratamiento de datos (Ley 1581)", icon: Shield },
              { id: "employer-terms", label: "Términos para empresas empleadoras", icon: Briefcase },
              { id: "cookies", label: "Política de cookies", icon: Cookie },
              { id: "community", label: "Normas comunitarias", icon: BookOpen },
            ].map((doc) => (
              <Link key={doc.id} href={`/legal?doc=${doc.id}`}>
                <div className="glass-panel rounded-xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors">
                  <doc.icon className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-sm font-medium">{doc.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
            <Link href="/privacy"><Button variant="outline" className="w-full mt-2 rounded-xl">Configuración rápida de privacidad</Button></Link>
          </div>
        );

      case "audience":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">Accesos rápidos a controles de audiencia.</p>
            {MENU.filter((m) => m.group === "Audiencia" && m.id !== "audience").map((m) => (
              <button key={m.id} type="button" onClick={() => setSection(m.id)} className="w-full glass-panel rounded-xl p-4 flex items-center gap-3 hover:bg-white/5 text-left">
                <m.icon className="w-5 h-5 text-primary" />
                <span className="flex-1 text-sm">{m.label}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const currentItem = MENU.find((m) => m.id === section);

  return (
    <Shell>
      <div className="max-w-5xl mx-auto w-full p-4 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold neon-title">Configuración y privacidad</h1>
            <p className="text-sm text-muted-foreground">Centro de control de tu cuenta MenpoeMax</p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 glass-panel rounded-2xl animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            <aside className="glass-panel rounded-2xl p-3 h-fit lg:sticky lg:top-20 max-h-[70vh] overflow-y-auto">
              {section !== "hub" && (
                <button type="button" onClick={() => setSection("hub")} className="w-full text-left text-xs text-primary mb-3 px-2 hover:underline">
                  ← Todas las opciones
                </button>
              )}
              {section === "hub" ? (
                groups.map(([group, items]) => (
                  <div key={group} className="mb-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1">{group}</p>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSection(item.id)}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-white/8 text-left"
                      >
                        <item.icon className="w-4 h-4 text-primary flex-none" />
                        <span className="truncate">{item.label}</span>
                        <ChevronRight className="w-3 h-3 ml-auto flex-none opacity-50" />
                      </button>
                    ))}
                  </div>
                ))
              ) : (
                <p className="text-sm font-medium px-2 neon-text">{currentItem?.label}</p>
              )}
            </aside>

            <main>
              {section !== "hub" && currentItem && (
                <h2 className="text-lg font-semibold mb-4 neon-text lg:hidden">{currentItem.label}</h2>
              )}
              {section === "hub" ? (
                <div className="glass-panel rounded-2xl p-8 text-center text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto text-primary/50 mb-4" />
                  <p className="text-sm">Selecciona una opción del menú para configurar tu cuenta, privacidad, notificaciones y más.</p>
                </div>
              ) : (
                renderSection()
              )}
            </main>
          </div>
        )}
      </div>
    </Shell>
  );
}
