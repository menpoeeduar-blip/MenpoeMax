import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Megaphone, Share2, Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Props = {
  title: string;
  description?: string;
  url?: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
};

export function CTAButton({ title, description, url, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareUrl = url || window.location.href;
  const shareText = `¡Únete a ${title} en MenpoeMax! ${description || ""}\n${shareUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: "Enlace copiado", description: "El enlace ha sido copiado al portapapeles." });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: shareUrl });
      } catch {
        /* ignore cancel */
      }
    } else {
      handleCopy();
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <>
      <Button
        type="button"
        size="sm"
        className={`rounded-xl gap-1.5 font-bold text-xs bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-lg shadow-amber-500/20 neon-subtle ${className}`}
        onClick={() => setOpen(true)}
        data-testid="button-cta-share"
      >
        <Megaphone className="w-3.5 h-3.5 animate-pulse" />
        Llamado a la acción
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-panel neon-border max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold neon-text flex items-center justify-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-400" />
              Llamado a la Acción
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-center text-muted-foreground">
              Comparte <strong>{title}</strong> para invitar a más miembros desde cualquier red social o mensajería.
            </p>

            <div className="space-y-2">
              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all font-semibold text-xs"
              >
                <span className="flex items-center gap-2">
                  📱 Compartir por WhatsApp
                </span>
                <ExternalLink className="w-4 h-4 opacity-70" />
              </a>

              {/* Telegram */}
              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 transition-all font-semibold text-xs"
              >
                <span className="flex items-center gap-2">
                  ✈️ Compartir por Telegram
                </span>
                <ExternalLink className="w-4 h-4 opacity-70" />
              </a>

              {/* Facebook */}
              <a
                href={facebookUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all font-semibold text-xs"
              >
                <span className="flex items-center gap-2">
                  📘 Compartir en Facebook
                </span>
                <ExternalLink className="w-4 h-4 opacity-70" />
              </a>

              {/* Web Native Share */}
              <Button
                variant="outline"
                className="w-full justify-between p-3 h-auto rounded-2xl text-xs font-semibold"
                onClick={handleWebShare}
              >
                <span className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-primary" /> Compartir en redes
                </span>
              </Button>

              {/* Copy link */}
              <Button
                variant="secondary"
                className="w-full justify-between p-3 h-auto rounded-2xl text-xs font-semibold"
                onClick={handleCopy}
              >
                <span className="flex items-center gap-2">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "¡Enlace copiado!" : "Copiar enlace al portapapeles"}
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
