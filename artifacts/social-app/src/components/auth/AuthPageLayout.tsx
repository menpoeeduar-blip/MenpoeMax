import type { ReactNode } from "react";
import { AstralBackground } from "@/components/AstralBackground";
import { BrandLogo } from "@/components/BrandLogo";
import { Sparkles, Shield, Users, Zap } from "lucide-react";

const FEATURES = [
  { icon: Users, text: "Comunidades y amigos en un solo lugar" },
  { icon: Sparkles, text: "Feed, reels y eventos con estilo astral" },
  { icon: Shield, text: "Privacidad y control de tu perfil" },
  { icon: Zap, text: "Empleos, marketplace y más secciones" },
];

export function AuthPageLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] relative flex items-center justify-center p-4 md:p-8">
      <AstralBackground />
      <div className="relative z-10 w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className="hidden lg:flex flex-col gap-8 px-4">
          <BrandLogo size="lg" className="text-2xl" />
          <div>
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight neon-title mb-3">{title}</h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md">{subtitle}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-cyan-300/80">Conecta · Comparte · Vive</p>
          </div>
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex-none w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full max-w-[440px] mx-auto lg:mx-0 lg:ml-auto flex flex-col gap-4">
          <div className="lg:hidden text-center mb-2 flex justify-center">
            <BrandLogo size="md" className="text-xl" />
          </div>
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}
