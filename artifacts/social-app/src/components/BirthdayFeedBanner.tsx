import { Link } from "wouter";
import { useGetBirthdays } from "@workspace/api-client-react";
import { Cake, ChevronRight } from "lucide-react";

export function BirthdayFeedBanner() {
  const { data } = useGetBirthdays();
  const today = data?.today ?? [];
  if (today.length === 0 && !data?.isMyBirthdayToday) return null;

  const names = today
    .slice(0, 3)
    .map((p: any) => p.displayName?.split(" ")[0])
    .filter(Boolean);
  const label =
    data?.isMyBirthdayToday && today.length === 0
      ? "¡Es tu cumpleaños hoy! 🎂"
      : today.length === 1
        ? `${names[0]} cumple años hoy`
        : `${names.join(", ")}${today.length > 3 ? ` y ${today.length - 3} más` : ""} cumplen hoy`;

  return (
    <Link
      href="/birthdays"
      className="flex items-center gap-3 glass-panel rounded-2xl p-4 border border-primary/25 hover:border-primary/40 transition-colors group"
      data-testid="birthday-feed-banner"
    >
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center flex-none">
        <Cake className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold neon-text">Cumpleaños de hoy</p>
        <p className="text-xs text-muted-foreground truncate">{label}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-none" />
    </Link>
  );
}
