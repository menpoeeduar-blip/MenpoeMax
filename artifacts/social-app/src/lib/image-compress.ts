export type ImageUploadPurpose = "avatar" | "cover" | "post" | "story";

/** Presupuestos agresivos para Firestore sin Storage (~doc < 1 MB). */
const PRESETS: Record<ImageUploadPurpose, { maxW: number; maxH: number; quality: number }> = {
  avatar: { maxW: 256, maxH: 256, quality: 0.7 },
  cover: { maxW: 960, maxH: 540, quality: 0.65 },
  post: { maxW: 720, maxH: 720, quality: 0.62 },
  story: { maxW: 540, maxH: 960, quality: 0.6 },
};

let _webpSupported: boolean | null = null;
function webpSupported(): boolean {
  if (_webpSupported != null) return _webpSupported;
  try {
    const c = document.createElement("canvas");
    _webpSupported = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    _webpSupported = false;
  }
  return _webpSupported;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

function fitDimensions(
  srcW: number,
  srcH: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  let w = srcW;
  let h = srcH;
  const ratio = Math.min(maxW / w, maxH / h, 1);
  w = Math.max(1, Math.round(w * ratio));
  h = Math.max(1, Math.round(h * ratio));
  return { w, h };
}

function cropRectForPurpose(
  srcW: number,
  srcH: number,
  purpose: ImageUploadPurpose,
): { sx: number; sy: number; sw: number; sh: number } {
  // Avatar: cuadrado centrado. Cover: 16:9 centrado. Post/Story: sin recorte.
  if (purpose === "avatar") {
    const side = Math.min(srcW, srcH);
    return {
      sx: Math.floor((srcW - side) / 2),
      sy: Math.floor((srcH - side) / 2),
      sw: side,
      sh: side,
    };
  }
  if (purpose === "cover") {
    const target = 16 / 9;
    const srcRatio = srcW / srcH;
    if (srcRatio > target) {
      // muy ancho, recorta ancho
      const sh = srcH;
      const sw = Math.floor(sh * target);
      return { sx: Math.floor((srcW - sw) / 2), sy: 0, sw, sh };
    }
    // muy alto, recorta alto
    const sw = srcW;
    const sh = Math.floor(sw / target);
    return { sx: 0, sy: Math.floor((srcH - sh) / 2), sw, sh };
  }
  return { sx: 0, sy: 0, sw: srcW, sh: srcH };
}

/** Comprime imagen a JPEG/WebP vía canvas (sin Storage, 100% en cliente). */
export async function compressImageFile(
  file: File,
  purpose: ImageUploadPurpose = "post",
): Promise<{ dataUrl: string; bytes: number }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Solo se admiten imágenes en este modo");
  }

  const preset = PRESETS[purpose];
  const img = await loadImage(file);
  const crop = cropRectForPurpose(img.naturalWidth, img.naturalHeight, purpose);
  const { w, h } = fitDimensions(crop.sw, crop.sh, preset.maxW, preset.maxH);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");

  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);

  const preferredMime = webpSupported() ? "image/webp" : "image/jpeg";
  const tryMime = file.type === "image/png" ? "image/png" : preferredMime;
  let dataUrl = canvas.toDataURL(tryMime, preset.quality);

  // Si sigue muy pesado, bajar calidad en pasos
  let quality = preset.quality;
  const maxBytes = purpose === "avatar" ? 45_000 : purpose === "cover" ? 120_000 : 90_000;
  while (estimateDataUrlBytes(dataUrl) > maxBytes && quality > 0.35) {
    quality -= 0.07;
    dataUrl = canvas.toDataURL(preferredMime, quality);
  }

  // PNG muy grande → forzar WebP/JPEG
  if (tryMime === "image/png" && estimateDataUrlBytes(dataUrl) > maxBytes) {
    quality = 0.62;
    dataUrl = canvas.toDataURL(preferredMime, quality);
    while (estimateDataUrlBytes(dataUrl) > maxBytes && quality > 0.32) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL(preferredMime, quality);
    }
  }

  if (estimateDataUrlBytes(dataUrl) > maxBytes * 1.15) {
    throw new Error(
      "La imagen sigue siendo grande para el modo gratis. Usa un sticker, un GIF externo o una foto más liviana.",
    );
  }

  return { dataUrl, bytes: estimateDataUrlBytes(dataUrl) };
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}

/** Límite duro para no llenar localStorage (~5MB típico por origen). */
export const LOCAL_STORAGE_BUDGET_HINT =
  "Sin Firebase Storage las fotos se comprimen al máximo y viajan como data URL en Firestore (límite práctico bajo).";

/** Límite comentarios: preferir sticker/GIF/texto si el archivo es pesado. */
export const COMMENT_MEDIA_SOFT_LIMIT = 80_000;

export const MAX_VIDEO_BYTES = 2 * 1024 * 1024; // 2 MB en modo gratis sin Storage

export async function readVideoAsDataUrlIfSmall(file: File): Promise<string> {
  if (!file.type.startsWith("video/")) {
    throw new Error("Archivo de video no válido");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(
      `El video es muy grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo ${MAX_VIDEO_BYTES / 1024 / 1024} MB en modo gratis sin Storage.`,
    );
  }
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el video"));
    reader.readAsDataURL(file);
  });
}
