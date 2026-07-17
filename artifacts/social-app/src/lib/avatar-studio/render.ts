import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";
import type { AvatarStudioConfig, AvatarSticker } from "./types";
import { STICKER_EXPRESSIONS } from "./options";

function toDicebearOptions(config: AvatarStudioConfig, overrides?: Partial<AvatarStudioConfig>) {
  const merged = { ...config, ...overrides };
  return {
    seed: "menpoe-avatar",
    skinColor: [merged.skinColor],
    top: [merged.top],
    hairColor: [merged.hairColor],
    hatColor: [merged.hatColor],
    eyes: [merged.eyes],
    eyebrows: [merged.eyebrows],
    mouth: [merged.mouth],
    nose: [merged.nose],
    clothing: [merged.clothing],
    clothesColor: [merged.clothesColor],
    clothesGraphic: [merged.clothesGraphic],
    accessories: [merged.accessories],
    accessoriesColor: [merged.accessoriesColor],
    facialHair: [merged.facialHair],
    facialHairColor: [merged.facialHairColor],
    backgroundColor: ["transparent"],
    backgroundType: ["solid"] as const,
  };
}

export function renderAvatarSvg(config: AvatarStudioConfig, overrides?: Partial<AvatarStudioConfig>): string {
  const avatar = createAvatar(avataaars, toDicebearOptions(config, overrides));
  return avatar.toString();
}

export function renderAvatarDataUrl(config: AvatarStudioConfig, overrides?: Partial<AvatarStudioConfig>): string {
  const svg = renderAvatarSvg(config, overrides);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function rid() {
  return `stk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getStickerExpressionOverrides(expressionKey: string): Partial<AvatarStudioConfig> | null {
  const expr = STICKER_EXPRESSIONS.find((e) => e.key === expressionKey);
  if (!expr) return null;
  return {
    mouth: expr.mouth,
    eyes: expr.eyes,
    eyebrows: expr.eyebrows,
    accessories: expr.accessories,
  };
}

/** Resuelve la imagen de un sticker sin Firebase Storage (SVG en cliente). */
export function resolveStickerImageUrl(
  config: AvatarStudioConfig,
  expressionKey?: string,
  cachedUrl?: string | null,
): string {
  if (cachedUrl && (cachedUrl.startsWith("http") || cachedUrl.startsWith("data:"))) {
    return cachedUrl;
  }
  const overrides = expressionKey ? getStickerExpressionOverrides(expressionKey) : null;
  return renderAvatarDataUrl(config, overrides ?? undefined);
}

/** Vista previa del avatar — solo Firestore + render local, sin Storage. */
export function generateAvatarPreviewUrl(config: AvatarStudioConfig): string {
  return renderAvatarDataUrl(config);
}

/** Stickers: guardamos expresión + config en Firestore; la imagen se genera en el navegador. */
export function generateAvatarStickers(config: AvatarStudioConfig): AvatarSticker[] {
  return STICKER_EXPRESSIONS.map((expr) => ({
    id: rid(),
    label: expr.label,
    expressionKey: expr.key,
    imageUrl: renderAvatarDataUrl(config, {
      mouth: expr.mouth,
      eyes: expr.eyes,
      eyebrows: expr.eyebrows,
      accessories: expr.accessories,
    }),
  }));
}
