import {
  compressImageFile,
  readVideoAsDataUrlIfSmall,
  type ImageUploadPurpose,
  LOCAL_STORAGE_BUDGET_HINT,
} from "./image-compress";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "./firebase";
import { getDevUserId } from "./queryClient";

export type UploadOptions = {
  purpose?: ImageUploadPurpose;
};

export { LOCAL_STORAGE_BUDGET_HINT };

/** Sube PNG de avatar/sticker generado en el estudio. */
export async function uploadAvatarStickerBlob(blob: Blob, label: string): Promise<string | null> {
  const uid = auth.currentUser?.uid || getDevUserId();
  if (!uid) return null;
  const safe = label.replace(/[^a-z0-9_-]/gi, "_").slice(0, 40);
  return uploadBlobToStorage(blob, `users/${uid}/avatars/stickers/${Date.now()}_${safe}.png`, "image/png");
}

async function uploadBlobToStorage(blob: Blob, path: string, contentType: string): Promise<string | null> {
  const uid = auth.currentUser?.uid || getDevUserId();
  if (!uid) return null;
  try {
    const storageRef = ref(storage, path);
    // Evita que la UI quede "subiendo..." indefinidamente en redes inestables.
    await Promise.race([
      uploadBytes(storageRef, blob, { contentType }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("upload-timeout")), 20_000)),
    ]);
    return await getDownloadURL(storageRef);
  } catch (err) {
    console.warn("[upload] Storage error:", err);
    return null;
  }
}

async function uploadImageToStorage(dataUrl: string, purpose: ImageUploadPurpose): Promise<string | null> {
  const uid = auth.currentUser?.uid || getDevUserId();
  if (!uid) return null;
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = blob.type.includes("webp") ? "webp" : blob.type.includes("png") ? "png" : "jpg";
    return uploadBlobToStorage(blob, `users/${uid}/${purpose}/${Date.now()}.${ext}`, blob.type || "image/jpeg");
  } catch {
    return null;
  }
}

async function uploadVideoToStorage(file: File): Promise<string | null> {
  const uid = auth.currentUser?.uid || getDevUserId();
  if (!uid) return null;
  const ext = file.name.split(".").pop() || "mp4";
  return uploadBlobToStorage(file, `users/${uid}/videos/${Date.now()}.${ext}`, file.type || "video/mp4");
}

/**
 * Imágenes y videos: sube a Firebase Storage cuando hay sesión.
 * Respaldo local (Data URL) solo si Storage no está disponible.
 */
export async function uploadFile(file: File, options: UploadOptions = {}): Promise<string> {
  const purpose = options.purpose ?? "post";

  if (file.type.startsWith("image/")) {
    const { dataUrl } = await compressImageFile(file, purpose);
    const publicUrl = await uploadImageToStorage(dataUrl, purpose);
    if (publicUrl) return publicUrl;
    if (!auth.currentUser?.uid && !getDevUserId()) {
      throw new Error("Inicia sesión para subir fotos. Las imágenes requieren una cuenta activa.");
    }
    return dataUrl;
  }

  if (file.type === "application/pdf") {
    return uploadPdfFile(file);
  }

  if (file.type.startsWith("video/")) {
    const publicUrl = await uploadVideoToStorage(file);
    if (publicUrl) return publicUrl;
    if (!auth.currentUser?.uid && !getDevUserId()) {
      throw new Error("Inicia sesión para subir videos.");
    }
    return readVideoAsDataUrlIfSmall(file);
  }

  if (file.type.startsWith("audio/")) {
    const publicUrl = await uploadAudioToStorage(file);
    if (publicUrl) return publicUrl;
    if (!auth.currentUser?.uid && !getDevUserId()) {
      throw new Error("Inicia sesión para subir audio.");
    }
    return readAudioAsDataUrlIfSmall(file);
  }

  throw new Error("Formato no soportado. Usa imagen, audio, GIF, PDF o video.");
}

async function uploadAudioToStorage(file: File): Promise<string | null> {
  const uid = auth.currentUser?.uid || getDevUserId();
  if (!uid) return null;
  const ext = file.name.split(".").pop() || "webm";
  return uploadBlobToStorage(file, `users/${uid}/audio/${Date.now()}.${ext}`, file.type || "audio/webm");
}

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

async function readAudioAsDataUrlIfSmall(file: File): Promise<string> {
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error("El audio supera 8 MB. Graba un clip más corto.");
  }
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el audio"));
    reader.readAsDataURL(file);
  });
}

const MAX_PDF_BYTES = 2 * 1024 * 1024;

async function uploadPdfFile(file: File): Promise<string> {
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(`El PDF supera ${MAX_PDF_BYTES / 1024 / 1024} MB. Comprime el archivo.`);
  }
  const uid = auth.currentUser?.uid || getDevUserId();
  if (uid) {
    const url = await uploadBlobToStorage(file, `users/${uid}/resumes/${Date.now()}.pdf`, "application/pdf");
    if (url) return url;
  }
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el PDF"));
    reader.readAsDataURL(file);
  });
}
