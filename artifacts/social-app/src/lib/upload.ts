import {
  compressImageFile,
  readVideoAsDataUrlIfSmall,
  type ImageUploadPurpose,
  LOCAL_STORAGE_BUDGET_HINT,
} from "./image-compress";
import { auth } from "./firebase";
import { getDevUserId } from "./queryClient";

export type UploadOptions = {
  purpose?: ImageUploadPurpose | "video";
};

export { LOCAL_STORAGE_BUDGET_HINT };

// ─── Cloudinary (FREE tier: 25 GB almacenamiento, 25 GB ancho de banda/mes) ──
// Configura VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET en .env
const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

/**
 * Sube un archivo a Cloudinary usando un upload preset sin firma (unsigned).
 * Devuelve la URL segura del recurso o null si falla.
 */
async function uploadToCloudinary(file: File): Promise<string | null> {
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) return null;

  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`;

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_PRESET);

  try {
    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok) {
      const txt = await res.text();
      console.warn("[cloudinary] upload failed:", res.status, txt);
      return null;
    }
    const data = await res.json();
    return (data.secure_url as string) ?? null;
  } catch (err) {
    console.warn("[cloudinary] network error:", err);
    return null;
  }
}

/** Sube PNG de avatar/sticker generado en el estudio. */
export async function uploadAvatarStickerBlob(blob: Blob, label: string): Promise<string | null> {
  const uid = auth.currentUser?.uid || getDevUserId();
  if (!uid) return null;

  // Intentar Cloudinary primero; si no está configurado, convertir a dataURL
  if (CLOUDINARY_CLOUD && CLOUDINARY_PRESET) {
    const file = new File([blob], `sticker_${Date.now()}.png`, { type: "image/png" });
    const url = await uploadToCloudinary(file);
    if (url) return url;
  }

  // Fallback: dataURL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Punto de entrada principal para subir archivos:
 * - Imágenes → compresión canvas → dataURL (Firestore)
 * - Videos   → Cloudinary (hasta 100 MB gratis) → dataURL si no configurado y < 20 MB
 * - Audio    → dataURL (≤ 8 MB)
 * - PDF      → dataURL (≤ 2 MB) o Cloudinary
 */
export async function uploadFile(file: File, options: UploadOptions = {}): Promise<string> {
  // ── IMÁGENES ──────────────────────────────────────────────────────────────
  if (file.type.startsWith("image/")) {
    const purpose = (options.purpose as ImageUploadPurpose) ?? "post";

    // Si Cloudinary está configurado, úsalo para imágenes pesadas
    if (CLOUDINARY_CLOUD && CLOUDINARY_PRESET && file.size > 500_000) {
      const url = await uploadToCloudinary(file);
      if (url) return url;
    }

    // Siempre comprimir a canvas para garantizar calidad controlada
    const { dataUrl } = await compressImageFile(file, purpose);
    return dataUrl;
  }

  // ── VIDEOS ────────────────────────────────────────────────────────────────
  if (file.type.startsWith("video/")) {
    const MAX_MB = 100;
    const MAX_BYTES = MAX_MB * 1024 * 1024;

    if (file.size > MAX_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      throw new Error(`El video pesa ${mb} MB. El máximo es ${MAX_MB} MB.`);
    }

    // Cloudinary para videos (recomendado)
    if (CLOUDINARY_CLOUD && CLOUDINARY_PRESET) {
      const url = await uploadToCloudinary(file);
      if (url) return url;
    }

    // Fallback: dataURL si el video es pequeño (≤ 20 MB)
    const FALLBACK_BYTES = 20 * 1024 * 1024;
    if (file.size <= FALLBACK_BYTES) {
      return readVideoAsDataUrlIfSmall(file);
    }

    throw new Error(`Configura Cloudinary en el .env para subir videos de más de 20 MB.`);
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  if (file.type === "application/pdf") {
    return uploadPdfFile(file);
  }

  // ── AUDIO ─────────────────────────────────────────────────────────────────
  if (file.type.startsWith("audio/")) {
    return readAudioAsDataUrl(file);
  }

  throw new Error("Formato no soportado. Usa imagen, audio, GIF, PDF o video.");
}

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

async function readAudioAsDataUrl(file: File): Promise<string> {
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error("El audio supera 8 MB. Graba un clip más corto.");
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el audio"));
    reader.readAsDataURL(file);
  });
}

const MAX_PDF_BYTES = 2 * 1024 * 1024;

async function uploadPdfFile(file: File): Promise<string> {
  if (file.size > MAX_PDF_BYTES) {
    throw new Error("El PDF supera 2 MB. Comprime el archivo.");
  }
  // Intentar Cloudinary para PDFs también
  if (CLOUDINARY_CLOUD && CLOUDINARY_PRESET) {
    const url = await uploadToCloudinary(file);
    if (url) return url;
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el PDF"));
    reader.readAsDataURL(file);
  });
}
