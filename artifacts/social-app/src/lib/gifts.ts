/** Catálogo inspirado en regalos tipo live (10 ítems para prueba). Precios en tokens (1 token ≈ $0.01 USD). */
export type GiftDefinition = {
  id: string;
  name: string;
  emoji: string;
  tokens: number;
  tier: "basic" | "mid" | "premium" | "luxury";
  gradient: string;
};

export const GIFT_CATALOG: GiftDefinition[] = [
  { id: "rose", name: "Rosa", emoji: "🌹", tokens: 1, tier: "basic", gradient: "from-rose-500/40 to-red-600/30" },
  { id: "panda", name: "Panda", emoji: "🐼", tokens: 7, tier: "basic", gradient: "from-slate-400/40 to-zinc-600/30" },
  { id: "fire", name: "Fuego", emoji: "🔥", tokens: 7, tier: "basic", gradient: "from-orange-500/50 to-amber-600/40" },
  { id: "gamepad", name: "Control", emoji: "🎮", tokens: 13, tier: "basic", gradient: "from-violet-500/40 to-indigo-600/30" },
  { id: "crown", name: "Corona", emoji: "👑", tokens: 131, tier: "mid", gradient: "from-yellow-400/50 to-amber-600/40" },
  { id: "heart_stars", name: "Corazón estelar", emoji: "💖", tokens: 264, tier: "mid", gradient: "from-pink-500/50 to-fuchsia-600/40" },
  { id: "moon", name: "Luna astral", emoji: "🌙", tokens: 530, tier: "mid", gradient: "from-cyan-400/40 to-violet-600/40" },
  { id: "ring", name: "Anillo joya", emoji: "💍", tokens: 399, tier: "mid", gradient: "from-pink-400/50 to-rose-600/40" },
  { id: "computer", name: "PC retro", emoji: "💻", tokens: 1330, tier: "premium", gradient: "from-purple-500/50 to-pink-600/40" },
  { id: "yacht", name: "Velero", emoji: "⛵", tokens: 2509, tier: "luxury", gradient: "from-sky-400/40 to-blue-700/40" },
];

export const TOKEN_TOPUP_PACKAGES = [
  { id: "pack_100", label: "100 tokens", tokens: 100, priceLabel: "$1.00", note: "Prueba rápida" },
  { id: "pack_500", label: "500 tokens", tokens: 500, priceLabel: "$5.00", note: "Popular" },
  { id: "pack_1000", label: "1.000 tokens", tokens: 1000, priceLabel: "$10.00", note: "Creadores" },
  { id: "pack_5000", label: "5.000 tokens", tokens: 5000, priceLabel: "$50.00", note: "Pro" },
] as const;

export function getGiftById(id: string) {
  return GIFT_CATALOG.find((g) => g.id === id);
}

export function formatTokens(n: number) {
  return n.toLocaleString("es-ES");
}
