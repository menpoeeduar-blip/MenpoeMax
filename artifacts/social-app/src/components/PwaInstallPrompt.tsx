import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Banner para instalar MenpoeMax como PWA. */
export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => localStorage.getItem("menpoemax_pwa_hide") === "1");

  useEffect(() => {
    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBefore);
    return () => window.removeEventListener("beforeinstallprompt", onBefore);
  }, []);

  if (hidden || !deferred) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 z-[90] max-w-md mx-auto glass-panel neon-border rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
      <Download className="w-5 h-5 text-primary flex-none" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Instalar MenpoeMax</p>
        <p className="text-[11px] text-muted-foreground">Acceso rápido desde tu pantalla de inicio</p>
      </div>
      <Button
        size="sm"
        className="rounded-xl neon-btn flex-none"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
      >
        Instalar
      </Button>
      <button
        type="button"
        className="p-1 rounded-lg hover:bg-white/10"
        aria-label="Cerrar"
        onClick={() => {
          localStorage.setItem("menpoemax_pwa_hide", "1");
          setHidden(true);
        }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
