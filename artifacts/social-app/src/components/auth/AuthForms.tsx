import { useState } from "react";
import { useLocation } from "wouter";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDocs, query, where, limit, collection } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail, Lock, User, AtSign, Calendar, Eye, EyeOff, ArrowRight, Loader2,
} from "lucide-react";
import { AuthPageLayout } from "./AuthPageLayout";
import { isOldEnough, minBirthDateForAge } from "@/lib/birthday";

const now = () => new Date().toISOString();

async function uniqueUsername(base: string, uid: string): Promise<string> {
  const usersCol = collection(db, "users");
  let candidate = (base || `usuario_${uid.slice(0, 6)}`)
    .toLowerCase()
    .replace(/[^\w]/g, "_")
    .slice(0, 24);
  let index = 1;
  while (true) {
    const taken = await getDocs(query(usersCol, where("username", "==", candidate), limit(1)));
    if (taken.empty || taken.docs[0]?.id === uid) return candidate;
    candidate = `${base.slice(0, 18)}_${index++}`;
  }
}

async function saveUserProfile(
  uid: string,
  data: {
    displayName: string;
    username: string;
    email: string;
    birthDate: string;
    birthDateVisibility: string;
  },
) {
  const username = await uniqueUsername(data.username, uid);
  await setDoc(doc(db, "users", uid), {
    id: uid,
    clerkId: uid,
    username,
    displayName: data.displayName.trim(),
    email: data.email,
    birthDate: data.birthDate,
    birthDateVisibility: data.birthDateVisibility,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
    role: "user",
    isVerified: false,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    createdAt: now(),
    updatedAt: now(),
  });
  return username;
}

function AuthField({
  id,
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  min,
  max,
}: {
  id: string;
  label: string;
  icon: typeof Mail;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70 pointer-events-none" />
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          min={min}
          max={max}
          className="pl-10 h-11 rounded-xl bg-white/5 border-border/60 focus-visible:ring-primary/40"
        />
      </div>
    </div>
  );
}

function AuthCard({ children, title, description }: { children: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="glass-panel glass-panel-glow neon-border rounded-2xl p-6 md:p-8 shadow-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold neon-text">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function SignInForm({ signUpUrl = "/sign-up" }: { signUpUrl?: string }) {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      setError("Escribe tu correo para recuperar la contraseña");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el correo");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userRef = doc(db, "users", result.user.uid);
      const { getDoc } = await import("firebase/firestore");
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await saveUserProfile(result.user.uid, {
          displayName: result.user.displayName || "Usuario de Google",
          username: result.user.email?.split("@")[0] || `google_${result.user.uid.slice(0, 6)}`,
          email: result.user.email || "",
          birthDate: "2000-01-01",
          birthDateVisibility: "solo_yo",
        });
      }
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión con Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      title="Tu red social, reimaginada"
      subtitle="Conecta con amigos, comunidades y oportunidades en un espacio minimalista y profesional."
      footer={
        <p className="text-center text-xs text-muted-foreground">
          ¿Nuevo aquí?{" "}
          <button type="button" onClick={() => setLocation(signUpUrl)} className="text-primary hover:underline font-medium">
            Crear cuenta gratis
          </button>
        </p>
      }
    >
      <AuthCard title="Iniciar sesión" description="Accede con tu correo electrónico">
        <form onSubmit={submit} className="space-y-4">
          <AuthField id="email" label="Correo electrónico" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="tu@email.com" required autoComplete="email" />
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="pl-10 pr-10 h-11 rounded-xl bg-white/5 border-border/60"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {resetSent && (
            <p className="text-xs text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2">
              Revisa tu bandeja de entrada para restablecer la contraseña.
            </p>
          )}
          {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={forgot} className="text-primary hover:underline" disabled={loading}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl neon-btn gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Entrar <ArrowRight className="w-4 h-4" /></>}
          </Button>

          <div className="relative my-4 flex py-1.5 items-center">
            <div className="flex-grow border-t border-border/40"></div>
            <span className="flex-shrink mx-4 text-[10px] text-muted-foreground uppercase tracking-widest">O continuar con</span>
            <div className="flex-grow border-t border-border/40"></div>
          </div>

          <Button type="button" variant="outline" onClick={handleGoogleSignIn} disabled={loading} className="w-full h-11 rounded-xl gap-2.5 bg-white/5 border-border/60 hover:bg-white/10">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.67-.35-1.37-.35-2.09z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Google
          </Button>
        </form>
      </AuthCard>
    </AuthPageLayout>
  );
}

export function SignUpForm({ signInUrl = "/sign-in" }: { signInUrl?: string }) {
  const [, setLocation] = useLocation();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthVisibility, setBirthVisibility] = useState("amigos");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validate = (): string | null => {
    if (!displayName.trim()) return "El nombre es obligatorio";
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return "Usuario: 3-24 caracteres (letras, números, _)";
    if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
    if (password !== confirmPassword) return "Las contraseñas no coinciden";
    if (!birthDate) return "La fecha de nacimiento es obligatoria";
    if (!isOldEnough(birthDate)) return "Debes tener al menos 13 años para registrarte";
    if (!acceptTerms) return "Debes aceptar los términos y la política de privacidad";
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const finalUsername = await saveUserProfile(result.user.uid, {
        displayName: displayName.trim(),
        username: username.trim(),
        email: email.trim(),
        birthDate,
        birthDateVisibility: birthVisibility,
      });
      await updateProfile(result.user, {
        displayName: displayName.trim(),
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.user.uid}`,
      });
      void finalUsername;
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      title="Únete a la comunidad"
      subtitle="Crea tu perfil en minutos. Añade tu cumpleaños para que tus amigos puedan celebrarte."
      footer={
        <p className="text-center text-xs text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <button type="button" onClick={() => setLocation(signInUrl)} className="text-primary hover:underline font-medium">
            Iniciar sesión
          </button>
        </p>
      }
    >
      <AuthCard title="Crear cuenta" description="Completa tus datos para empezar">
        <form onSubmit={submit} className="space-y-3 max-h-[58vh] overflow-y-auto pr-1 scrollbar-thin">
          <AuthField id="name" label="Nombre completo" icon={User} value={displayName} onChange={setDisplayName} placeholder="María García" required autoComplete="name" />
          <AuthField id="username" label="Nombre de usuario" icon={AtSign} value={username} onChange={setUsername} placeholder="maria_g" required autoComplete="username" />

          <AuthField id="email" label="Correo electrónico" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="tu@email.com" required autoComplete="email" />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
                <Input id="password" type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mín. 8 caracteres" required autoComplete="new-password" className="pl-10 h-11 rounded-xl bg-white/5 border-border/60" />
              </div>
            </div>
            <AuthField id="confirm" label="Confirmar" icon={Lock} type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repetir" required autoComplete="new-password" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="birth" className="text-xs font-medium text-muted-foreground">Fecha de nacimiento *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
              <Input
                id="birth"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                max={minBirthDateForAge(13)}
                className="pl-10 h-11 rounded-xl bg-white/5 border-border/60"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Usamos tu cumpleaños para recordatorios y la sección Cumpleaños.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bvis" className="text-xs font-medium text-muted-foreground">Quién ve tu cumpleaños</Label>
            <select
              id="bvis"
              value={birthVisibility}
              onChange={(e) => setBirthVisibility(e.target.value)}
              className="w-full h-11 rounded-xl bg-white/5 border border-border/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="amigos">Solo amigos</option>
              <option value="publico">Público</option>
              <option value="solo_yo">Solo yo</option>
            </select>
          </div>

          <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-border/40 bg-white/5 p-3">
            <Checkbox checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(!!v)} className="mt-0.5" />
            <span className="text-xs text-muted-foreground leading-relaxed">
              Acepto los términos de uso y la política de privacidad de MenpoeMax. Confirmo que tengo al menos 13 años.
            </span>
          </label>

          {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl neon-btn gap-2 sticky bottom-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Crear cuenta <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </form>
      </AuthCard>
    </AuthPageLayout>
  );
}
