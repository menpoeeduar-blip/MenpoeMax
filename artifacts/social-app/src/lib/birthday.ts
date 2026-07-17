/** Utilidades de cumpleaños (estilo Facebook/LinkedIn). */

export type BirthDateVisibility = "publico" | "amigos" | "solo_yo";

export function parseBirthDate(birthDate?: string | null): { month: number; day: number } | null {
  if (!birthDate) return null;
  const d = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return { month: d.getMonth(), day: d.getDate() };
}

export function daysUntilNextBirthday(birthDate: string, from = new Date()): number {
  const parsed = parseBirthDate(birthDate);
  if (!parsed) return -1;
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(from.getFullYear(), parsed.month, parsed.day);
  if (next < today) {
    next = new Date(from.getFullYear() + 1, parsed.month, parsed.day);
  }
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

export function isBirthdayToday(birthDate: string, from = new Date()): boolean {
  return daysUntilNextBirthday(birthDate, from) === 0;
}

export function formatBirthdayLabel(birthDate: string): string {
  const parsed = parseBirthDate(birthDate);
  if (!parsed) return "";
  const d = new Date(2000, parsed.month, parsed.day);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

export function canViewBirthDate(
  user: { id: string; birthDate?: string; birthDateVisibility?: BirthDateVisibility },
  viewerId: string,
  friendIds: Set<string>,
): boolean {
  if (!user.birthDate) return false;
  if (user.id === viewerId) return true;
  const vis = user.birthDateVisibility || "amigos";
  if (vis === "solo_yo") return false;
  if (vis === "publico") return true;
  return friendIds.has(user.id);
}

export function minBirthDateForAge(minYears = 13): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - minYears);
  return d.toISOString().slice(0, 10);
}

export function isOldEnough(birthDate: string, minYears = 13): boolean {
  const min = minBirthDateForAge(minYears);
  return birthDate <= min;
}
