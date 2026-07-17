import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export type ProfileBackup = {
  version: 1;
  exportedAt: string;
  user: Record<string, unknown> | null;
  settings: unknown;
  localNotes?: string;
};

/** Exporta perfil + ajustes locales para backup sin Storage. */
export async function exportProfileBackup(): Promise<ProfileBackup> {
  const uid = auth.currentUser?.uid;
  let user: Record<string, unknown> | null = null;
  if (uid) {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) user = { id: snap.id, ...snap.data() };
    } catch {
      /* ignore */
    }
  }

  let settings: unknown = null;
  try {
    settings = JSON.parse(localStorage.getItem("social_account_settings_v1") || "null");
  } catch {
    settings = null;
  }

  // Quitar data URLs enormes del backup (solo metadatos)
  if (user?.avatarUrl && String(user.avatarUrl).startsWith("data:") && String(user.avatarUrl).length > 8000) {
    user = { ...user, avatarUrl: "(omitido_data_url_grande)" };
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    user,
    settings,
    localNotes: "Backup MenpoeMax. Las fotos base64 grandes se omiten para caber en el archivo.",
  };
}

export function downloadBackupJson(backup: ProfileBackup, filename = "menpoemax-backup.json") {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProfileBackupFile(file: File): Promise<{ ok: boolean; message: string }> {
  const text = await file.text();
  let data: ProfileBackup;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: "Archivo JSON inválido" };
  }
  if (!data || data.version !== 1) {
    return { ok: false, message: "Formato de backup no reconocido" };
  }
  if (data.settings != null) {
    localStorage.setItem("social_account_settings_v1", JSON.stringify(data.settings));
  }
  // Importación completa a Firestore requiere reescritura segura del user doc;
  // restauramos solo ajustes locales para no pisar identidad Auth.
  return {
    ok: true,
    message: "Ajustes restaurados. El perfil en la nube no se sobrescribe por seguridad.",
  };
}
