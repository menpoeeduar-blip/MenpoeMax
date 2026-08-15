import { useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  Copy,
  Check,
  Globe,
  MessageCircle,
  ExternalLink,
  ShoppingBag,
  Sparkles,
  MapPin,
  Tag,
  Send,
  Radio,
} from "lucide-react";
import { formatCOP } from "@/lib/format-currency";
import { useToast } from "@/hooks/use-toast";
import { useCreatePost } from "@workspace/api-client-react";

export type MarketplaceListingShareData = {
  id: string;
  title: string;
  price: number;
  description?: string;
  category?: string;
  condition?: string;
  location?: string;
  imageUrls?: string[];
  seller?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
  contactPhone?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  listing: MarketplaceListingShareData;
};

export function MarketplaceShareModal({ open, onClose, listing }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [sharingToFeed, setSharingToFeed] = useState(false);
  const createPost = useCreatePost();

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://menpoemax.web.app";
  const productUrl = `${baseUrl}/marketplace/${listing.id}`;
  const formattedPrice = formatCOP(listing.price);
  const firstImage = listing.imageUrls?.[0] || "";

  const shareText = `🛍️ ¡Mira este producto en Menpoe Marketplace!\n\n🏷️ ${listing.title}\n💰 Precio: ${formattedPrice}\n📍 Ubicación: ${listing.location || "Disponible para envíos"}\n\n👉 Ver producto y contactar: ${productUrl}`;

  // Copiar al Portapapeles
  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(productUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = productUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast({
        title: "¡Enlace copiado!",
        description: "El enlace directo al producto ha sido copiado al portapapeles.",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Error al copiar enlace", variant: "destructive" });
    }
  };

  // Compartir Nativo (Móvil / Web Share API)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${listing.title} — Menpoe Marketplace`,
          text: `Mira "${listing.title}" por ${formattedPrice} en Menpoe Marketplace`,
          url: productUrl,
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // Redes Sociales
  const shareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}&quote=${encodeURIComponent(`🛍️ ${listing.title} por ${formattedPrice} en Menpoe Marketplace`)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const shareTwitter = () => {
    const text = `🛍️ ${listing.title} por ${formattedPrice} en Menpoe Marketplace`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(productUrl)}&hashtags=Marketplace,Menpoe,Ventas`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const shareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Publicar en el Inicio (Feed)
  const handleShareToFeed = () => {
    setSharingToFeed(true);
    const postContent = `🛍️ **PRODUCTO EN VENTA EN MARKETPLACE**\n\n📌 **${listing.title}**\n💰 **Precio:** ${formattedPrice}\n${listing.location ? `📍 **Ubicación:** ${listing.location}\n` : ""}${listing.description ? `\n📝 ${listing.description}\n` : ""}\n👉 [Ver producto en Marketplace](${productUrl})`;

    createPost.mutate(
      {
        data: {
          content: postContent,
          mediaUrls: listing.imageUrls || [],
          visibility: "publico",
          location: listing.location || undefined,
          hashtags: ["Marketplace", "Venta", "Menpoe"],
          postType: "marketplace",
          marketplaceListing: {
            id: listing.id,
            title: listing.title,
            price: listing.price,
            imageUrls: listing.imageUrls || [],
            location: listing.location,
            condition: listing.condition,
            category: listing.category,
          },
        },
      },
      {
        onSuccess: () => {
          setSharingToFeed(false);
          toast({
            title: "¡Publicado en el Inicio! 📣",
            description: "Tu producto ahora es visible para toda la comunidad en el Feed.",
          });
          onClose();
        },
        onError: () => {
          setSharingToFeed(false);
          toast({
            title: "Error al publicar",
            description: "No se pudo compartir en el inicio. Intenta de nuevo.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <AppModal open={open} onClose={onClose} className="w-full max-w-lg">
      <div className="glass-panel neon-border rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-foreground">Compartir Producto</h3>
          </div>
        </div>

        {/* Tarjeta de Previsualización Estética del Producto */}
        <div className="p-4 rounded-2xl bg-white/5 border border-cyan-500/30 relative overflow-hidden group">
          <div className="flex gap-4 items-center">
            {firstImage ? (
              <img
                src={firstImage}
                alt={listing.title}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover bg-black/40 flex-none border border-border/50"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-none">
                <ShoppingBag className="w-8 h-8 text-cyan-400" />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider block">
                Menpoe Marketplace
              </span>
              <h4 className="font-bold text-sm sm:text-base text-foreground truncate">
                {listing.title}
              </h4>
              <div className="text-base sm:text-lg font-extrabold text-cyan-300 neon-text">
                {formattedPrice}
              </div>
              {listing.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-primary flex-none" />
                  <span className="truncate">{listing.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTÓN ESTELAR: COMPARTIR EN EL INICIO */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-primary/20 to-purple-500/15 border border-primary/40 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Máxima Difusión en Menpoe
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Publica una tarjeta interactiva de este producto en el <strong>Muro de Inicio</strong> para que todos tus amigos y seguidores lo vean de inmediato.
          </p>
          <Button
            className="w-full neon-btn rounded-xl font-bold gap-2 py-2.5 text-xs sm:text-sm"
            onClick={handleShareToFeed}
            disabled={sharingToFeed}
          >
            <Radio className="w-4 h-4 text-cyan-300" />
            {sharingToFeed ? "Publicando en el inicio..." : "📣 Publicar en el Inicio (Feed)"}
          </Button>
        </div>

        {/* REDES SOCIALES EXTERNAS */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Compartir en Redes Sociales
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={shareWhatsApp}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-all hover:scale-105"
            >
              <MessageCircle className="w-6 h-6 mb-1 text-emerald-400" />
              <span className="text-xs font-semibold">WhatsApp</span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={shareFacebook}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 text-blue-400 transition-all hover:scale-105"
            >
              <Globe className="w-6 h-6 mb-1 text-blue-400" />
              <span className="text-xs font-semibold">Facebook</span>
            </button>

            {/* Twitter / X */}
            <button
              type="button"
              onClick={shareTwitter}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 transition-all hover:scale-105"
            >
              <Tag className="w-6 h-6 mb-1 text-sky-400" />
              <span className="text-xs font-semibold">Twitter / X</span>
            </button>

            {/* Telegram */}
            <button
              type="button"
              onClick={shareTelegram}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 transition-all hover:scale-105"
            >
              <Send className="w-6 h-6 mb-1 text-cyan-400" />
              <span className="text-xs font-semibold">Telegram</span>
            </button>
          </div>
        </div>

        {/* COPIAR ENLACE DIRECTO */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Enlace Directo del Producto
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={productUrl}
              className="w-full bg-black/40 border border-border/50 rounded-xl px-3 py-2 text-xs text-muted-foreground font-mono focus:outline-none"
            />
            <Button
              type="button"
              variant="outline"
              className={`rounded-xl px-4 text-xs font-bold gap-1.5 flex-none ${
                copied ? "bg-green-500/20 text-green-400 border-green-500/50" : ""
              }`}
              onClick={handleCopyLink}
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>

        {/* Compartir Nativo Móvil */}
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl text-xs font-bold gap-2 py-2.5"
          onClick={handleNativeShare}
        >
          <ExternalLink className="w-4 h-4 text-cyan-400" /> Más opciones para compartir (Móvil)
        </Button>
      </div>
    </AppModal>
  );
}
