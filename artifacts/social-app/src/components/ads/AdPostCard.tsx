import { memo } from "react";
import {
  Megaphone, MessageCircle, Phone, Mail, Globe,
  ShoppingCart, Info, ChevronRight,
  Tag,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";

type AdData = {
  productName?: string;
  category?: string;
  price?: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  website?: string;
  callToAction?: string;
  duration?: string;
  durationLabel?: string;
  cost?: number;
  formattedCost?: string;
  expiresAt?: string;
};

type AdPost = {
  id: string;
  content?: string;
  mediaUrls?: string[];
  adData?: string;
  createdAt?: string | Date;
  author?: {
    id?: string;
    displayName?: string;
    avatarUrl?: string;
  };
};

type Props = {
  post: AdPost;
};

const CTA_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  whatsapp:  { label: "WhatsApp",       icon: <MessageCircle className="w-4 h-4" />, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/25" },
  call:      { label: "Llamar ahora",   icon: <Phone className="w-4 h-4" />,         color: "text-sky-400",     bg: "bg-sky-500/15 border-sky-500/40 hover:bg-sky-500/25" },
  email:     { label: "Enviar correo",  icon: <Mail className="w-4 h-4" />,           color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/25" },
  website:   { label: "Visitar web",    icon: <Globe className="w-4 h-4" />,          color: "text-violet-400",  bg: "bg-violet-500/15 border-violet-500/40 hover:bg-violet-500/25" },
  more_info: { label: "Más información",icon: <Info className="w-4 h-4" />,           color: "text-blue-400",    bg: "bg-blue-500/15 border-blue-500/40 hover:bg-blue-500/25" },
  buy_now:   { label: "Comprar ahora",  icon: <ShoppingCart className="w-4 h-4" />,   color: "text-rose-400",    bg: "bg-rose-500/15 border-rose-500/40 hover:bg-rose-500/25" },
};

const CATEGORY_EMOJI: Record<string, string> = {
  productos: "🛍️", servicios: "🔧", inmuebles: "🏠", vehiculos: "🚗",
  empleo: "💼", eventos: "🎉", restaurantes: "🍽️", tecnologia: "💻",
  salud: "🏥", otro: "📦",
};

function handleCtaClick(adData: AdData) {
  const cta = adData.callToAction ?? "whatsapp";
  if (cta === "whatsapp" && adData.whatsapp) {
    const num = adData.whatsapp.replace(/\D/g, "");
    const msg = encodeURIComponent(`Hola! Vi tu anuncio de "${adData.productName}" en MenpoeMax y me interesa. ¿Puedes darme más información?`);
    window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
  } else if (cta === "call" && adData.phone) {
    window.open(`tel:${adData.phone.replace(/\D/g, "")}`, "_blank");
  } else if (cta === "email" && adData.email) {
    window.open(`mailto:${adData.email}?subject=Consulta sobre ${adData.productName}`, "_blank");
  } else if (cta === "website" && adData.website) {
    window.open(adData.website, "_blank");
  } else {
    if (adData.whatsapp) {
      const num = adData.whatsapp.replace(/\D/g, "");
      window.open(`https://wa.me/${num}`, "_blank");
    } else if (adData.phone) {
      window.open(`tel:${adData.phone}`, "_blank");
    } else if (adData.email) {
      window.open(`mailto:${adData.email}`, "_blank");
    } else if (adData.website) {
      window.open(adData.website, "_blank");
    }
  }
}

export const AdPostCard = memo(function AdPostCard({ post }: Props) {
  let adData: AdData = {};
  try { adData = post.adData ? JSON.parse(post.adData) : {}; } catch { /* noop */ }

  const cta = adData.callToAction ?? "whatsapp";
  const ctaConfig = CTA_CONFIG[cta] ?? CTA_CONFIG.whatsapp;
  const categoryEmoji = CATEGORY_EMOJI[adData.category ?? "otro"] ?? "📦";
  const timeAgo = post.createdAt
    ? formatDistanceToNow(post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt), { locale: es, addSuffix: true })
    : "";
  const image = post.mediaUrls?.[0];

  return (
    <article
      id={`ad-post-${post.id}`}
      className="rounded-2xl overflow-hidden border border-amber-500/25 bg-gradient-to-br from-amber-950/30 via-card to-rose-950/20 shadow-lg shadow-amber-900/10"
      data-testid={`ad-post-card-${post.id}`}
    >
      {/* Sponsored badge */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-amber-500/15">
        <div className="flex items-center gap-1.5 min-w-0">
          <Megaphone className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-none" />
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex-none">Patrocinado</span>
          {adData.durationLabel && (
            <span className="text-[10px] text-amber-300/80 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium truncate">
              {adData.durationLabel}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground/50 flex-none">{timeAgo}</span>
      </div>

      {/* Image */}
      {image && (
        <div className="relative w-full aspect-[16/9] bg-muted overflow-hidden">
          <img
            src={image}
            alt={adData.productName ?? "Anuncio"}
            className="w-full h-full object-cover"
          />
          {/* Category chip over image */}
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1">
              {categoryEmoji} <span className="capitalize">{adData.category ?? "Anuncio"}</span>
            </span>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Author row */}
        <div className="flex items-center gap-2.5">
          {post.author?.avatarUrl ? (
            <Link href={`/profile/${post.author.id}`}>
              <img
                src={post.author.avatarUrl}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-amber-400/30 cursor-pointer"
                alt=""
              />
            </Link>
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <Megaphone className="w-3.5 h-3.5 text-amber-400" />
            </div>
          )}
          <div>
            <Link href={`/profile/${post.author?.id}`} className="text-xs font-semibold hover:text-primary">
              {post.author?.displayName ?? "Anunciante"}
            </Link>
            <p className="text-[10px] text-amber-400/70">Anunciante verificado</p>
          </div>
        </div>

        {/* Product name + price row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {!image && (
              <div className="mb-1">
                <span className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider flex items-center gap-1">
                  {categoryEmoji} {adData.category ?? "Producto"}
                </span>
              </div>
            )}
            <h3 className="font-bold text-base text-white leading-tight truncate">
              {adData.productName ?? "Producto / Servicio"}
            </h3>
          </div>
          {adData.price && (
            <div className="flex-none">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {adData.price}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {post.content}
        </p>

        {/* Contact info pills */}
        <div className="flex flex-wrap gap-2">
          {adData.whatsapp && (
            <a
              href={`https://wa.me/${adData.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-1 hover:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle className="w-3 h-3" />
              WhatsApp
            </a>
          )}
          {adData.phone && (
            <a
              href={`tel:${adData.phone}`}
              className="flex items-center gap-1.5 text-[11px] font-medium text-sky-400 bg-sky-500/10 border border-sky-500/30 rounded-full px-2.5 py-1 hover:bg-sky-500/20 transition-colors"
            >
              <Phone className="w-3 h-3" />
              {adData.phone}
            </a>
          )}
          {adData.email && (
            <a
              href={`mailto:${adData.email}`}
              className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2.5 py-1 hover:bg-amber-500/20 transition-colors"
            >
              <Mail className="w-3 h-3" />
              Email
            </a>
          )}
          {adData.website && (
            <a
              href={adData.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/30 rounded-full px-2.5 py-1 hover:bg-violet-500/20 transition-colors"
            >
              <Globe className="w-3 h-3" />
              Web
            </a>
          )}
        </div>

        {/* Main CTA button */}
        <button
          type="button"
          onClick={() => handleCtaClick(adData)}
          className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border font-bold text-sm transition-all active:scale-[0.98] ${ctaConfig.bg} ${ctaConfig.color}`}
          data-testid={`ad-cta-${post.id}`}
        >
          {ctaConfig.icon}
          {ctaConfig.label}
          <ChevronRight className="w-4 h-4 ml-auto" />
        </button>
      </div>
    </article>
  );
});
