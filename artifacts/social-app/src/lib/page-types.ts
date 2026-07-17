import type { LucideIcon } from "lucide-react";
import {
  Store,
  Mic2,
  BadgeCheck,
  UsersRound,
  Guitar,
  Rocket,
  HeartHandshake,
  Star,
} from "lucide-react";

export type PageEntityKind = "page" | "community";

export type PageTypeOption = {
  id: string;
  label: string;
  kind: PageEntityKind;
  icon: LucideIcon;
  accent: string;
  glow: string;
};

export const PAGE_TYPE_OPTIONS: PageTypeOption[] = [
  { id: "local_business", label: "Negocio local", kind: "page", icon: Store, accent: "text-pink-400", glow: "shadow-[0_0_16px_rgba(244,114,182,0.55)]" },
  { id: "creator", label: "Creador", kind: "page", icon: Mic2, accent: "text-fuchsia-400", glow: "shadow-[0_0_16px_rgba(232,121,249,0.55)]" },
  { id: "brand", label: "Marca", kind: "page", icon: BadgeCheck, accent: "text-cyan-400", glow: "shadow-[0_0_16px_rgba(34,211,238,0.55)]" },
  { id: "community", label: "Comunidad", kind: "community", icon: UsersRound, accent: "text-violet-400", glow: "shadow-[0_0_16px_rgba(167,139,250,0.55)]" },
  { id: "artist", label: "Artista / Banda", kind: "page", icon: Guitar, accent: "text-rose-400", glow: "shadow-[0_0_16px_rgba(251,113,133,0.55)]" },
  { id: "startup", label: "Emprendimiento", kind: "page", icon: Rocket, accent: "text-amber-400", glow: "shadow-[0_0_16px_rgba(251,191,36,0.55)]" },
  { id: "nonprofit", label: "Organización sin fines de lucro", kind: "page", icon: HeartHandshake, accent: "text-emerald-400", glow: "shadow-[0_0_16px_rgba(52,211,153,0.55)]" },
  { id: "public_figure", label: "Personaje público", kind: "page", icon: Star, accent: "text-yellow-300", glow: "shadow-[0_0_16px_rgba(253,224,71,0.55)]" },
];

export function getPageTypeLabel(id: string) {
  return PAGE_TYPE_OPTIONS.find((t) => t.id === id)?.label ?? id;
}
