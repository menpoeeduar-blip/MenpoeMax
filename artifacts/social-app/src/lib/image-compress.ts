export type ImageUploadPurpose = "avatar" | "cover" | "post" | "story";

/** Compresión agresiva para imágenes vía canvas (sin Storage). */
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
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen")); };
    img.src = url;
  });
}

function fitDimensions(srcW: number, srcH: number, maxW: number, maxH: number): { w: number; h: number } {
  let w = srcW; let h = srcH;
  const ratio = Math.min(maxW / w, maxH / h, 1);
  w = Math.max(1, Math.round(w * ratio));
  h = Math.max(1, Math.round(h * ratio));
  return { w, h };
}

function cropRectForPurpose(srcW: number, srcH: number, purpose: ImageUploadPurpose): { sx: number; sy: number; sw: number; sh: number } {
  if (purpose === "avatar") {
    const side = Math.min(srcW, srcH);
    return { sx: Math.floor((srcW - side) / 2), sy: Math.floor((srcH - side) / 2), sw: side, sh: side };
  }
  if (purpose === "cover") {
    const target = 16 / 9;
    const srcRatio = srcW / srcH;
    if (srcRatio > target) {
      const sh = srcH; const sw = Math.floor(sh * target);
      return { sx: Math.floor((srcW - sw) / 2), sy: 0, sw, sh };
    }
    const sw = srcW; const sh = Math.floor(sw / target);
    return { sx: 0, sy: Math.floor((srcH - sh) / 2), sw, sh };
  }
  return { sx: 0, sy: 0, sw: srcW, sh: srcH };
}

/** Comprime imagen a JPEG/WebP vía canvas. */
export async function compressImageFile(
  file: File,
  purpose: ImageUploadPurpose = "post",
): Promise<{ dataUrl: string; bytes: number }> {
  if (!file.type.startsWith("image/")) throw new Error("Solo se admiten imágenes en este modo");

  const preset = PRESETS[purpose];
  const img = await loadImage(file);
  const crop = cropRectForPurpose(img.naturalWidth, img.naturalHeight, purpose);
  const { w, h } = fitDimensions(crop.sw, crop.sh, preset.maxW, preset.maxH);

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);

  const preferredMime = webpSupported() ? "image/webp" : "image/jpeg";
  const tryMime = file.type === "image/png" ? "image/png" : preferredMime;
  let dataUrl = canvas.toDataURL(tryMime, preset.quality);

  let quality = preset.quality;
  const maxBytes = purpose === "avatar" ? 60_000 : purpose === "cover" ? 250_000 : 300_000;
  while (estimateDataUrlBytes(dataUrl) > maxBytes && quality > 0.30) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL(preferredMime, quality);
  }

  let currentW = w; let currentH = h;
  while (estimateDataUrlBytes(dataUrl) > maxBytes && currentW > 120 && currentH > 120) {
    currentW = Math.round(currentW * 0.8);
    currentH = Math.round(currentH * 0.8);
    const scaledCanvas = document.createElement("canvas");
    scaledCanvas.width = currentW; scaledCanvas.height = currentH;
    const sCtx = scaledCanvas.getContext("2d");
    if (sCtx) {
      sCtx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, currentW, currentH);
      dataUrl = scaledCanvas.toDataURL(preferredMime, 0.65);
    }
  }

  return { dataUrl, bytes: estimateDataUrlBytes(dataUrl) };
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}

/** @deprecated — ya no se usa en los toasts */
export const LOCAL_STORAGE_BUDGET_HINT = "";

export const COMMENT_MEDIA_SOFT_LIMIT = 80_000;

/** 100 MB — Cloudinary maneja el resto vía su API gratuita */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export async function readVideoAsDataUrlIfSmall(file: File): Promise<string> {
  if (!file.type.startsWith("video/")) throw new Error("Archivo de video no válido");
  if (file.size > MAX_VIDEO_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(`El video pesa ${mb} MB. El máximo permitido es 100 MB.`);
  }
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el video"));
    reader.readAsDataURL(file);
  });
}
