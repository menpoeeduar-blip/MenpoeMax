import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export function BackButton({ fallbackHref = "/", label = "Regresar" }: { fallbackHref?: string; label?: string }) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-primary/20 border border-primary/30 text-xs font-medium text-foreground transition-all shadow-[0_0_12px_rgba(34,211,238,0.2)] mb-3"
      title="Regresar a la página o menú anterior"
      data-testid="button-global-back"
    >
      <ArrowLeft className="w-4 h-4 text-primary flex-none" />
      <span>{label}</span>
    </button>
  );
}
