import logoUrl from "@/assets/menpoemax-logo.png";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

type Props = {
  className?: string;
  imgClassName?: string;
  showWordmark?: boolean;
  href?: string | false;
  size?: "sm" | "md" | "lg";
};

const SIZE = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

/** Logo MenpoeMax con fondo transparente. */
export function BrandLogo({
  className,
  imgClassName,
  showWordmark = true,
  href = "/",
  size = "md",
}: Props) {
  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={logoUrl}
        alt="MenpoeMax"
        className={cn(SIZE[size], "object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.45)]", imgClassName)}
        draggable={false}
      />
      {showWordmark && (
        <span className="font-bold neon-title tracking-tight">
          Menpoe<span className="bg-gradient-to-r from-fuchsia-400 to-pink-500 bg-clip-text text-transparent">Max</span>
        </span>
      )}
    </span>
  );

  if (href === false) return content;
  return (
    <Link href={href} className="inline-flex items-center hover:opacity-90 transition-opacity">
      {content}
    </Link>
  );
}

export { logoUrl as menpoeMaxLogoUrl };
