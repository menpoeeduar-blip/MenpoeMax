import { useState } from "react";
import { Link } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useGetBirthdays, useSendBirthdayWish } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cake, Gift, Calendar, PartyPopper, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Birthdays() {
  const { data, isLoading } = useGetBirthdays();
  const sendWish = useSendBirthdayWish();
  const { toast } = useToast();
  const [wishText, setWishText] = useState<Record<string, string>>({});

  const send = (userId: string, name: string) => {
    sendWish.mutate(
      { userId, message: wishText[userId] || `¡Feliz cumpleaños, ${name}! 🎂` },
      {
        onSuccess: () => {
          toast({ title: "¡Enviado!", description: `Tu felicitación llegó a ${name}.` });
          setWishText((p) => ({ ...p, [userId]: "" }));
        },
      },
    );
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto w-full p-4 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold neon-title flex items-center gap-2">
            <Cake className="w-8 h-8 text-primary" />
            Cumpleaños
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Celebra a tus amigos — como en Facebook, recordatorios y felicitaciones en un toque.
          </p>
        </div>

        {data?.isMyBirthdayToday && (
          <div className="glass-panel glass-panel-glow rounded-2xl p-6 mb-6 border border-primary/30 text-center">
            <PartyPopper className="w-12 h-12 mx-auto text-primary mb-3" />
            <h2 className="text-xl font-bold neon-text">¡Es tu cumpleaños!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {data.myBirthdayLabel} — que tengas un día increíble en MenpoeSocial.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 glass-panel rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Hoy ({data?.today?.length ?? 0})
              </h2>
              {(data?.today ?? []).length === 0 ? (
                <div className="glass-panel rounded-2xl p-8 text-center text-muted-foreground text-sm">
                  Nadie de tus amigos cumple años hoy.
                </div>
              ) : (
                <div className="space-y-3">
                  {(data?.today ?? []).map((person: any) => (
                    <div key={person.id} className="glass-panel rounded-2xl p-4 border border-primary/20">
                      <div className="flex items-center gap-3 mb-3">
                        <Link href={`/profile/${person.id}`}>
                          <img
                            src={person.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.id}`}
                            className="w-14 h-14 rounded-full ring-2 ring-primary/50 object-cover"
                            alt=""
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/profile/${person.id}`} className="font-semibold hover:text-primary">
                            {person.displayName}
                          </Link>
                          <p className="text-xs text-muted-foreground">@{person.username} · ¡Hoy cumple años!</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={wishText[person.id] ?? ""}
                          onChange={(e) => setWishText((p) => ({ ...p, [person.id]: e.target.value }))}
                          placeholder="Escribe una felicitación..."
                          className="rounded-xl bg-white/5 text-sm h-9"
                        />
                        <Button
                          size="sm"
                          className="rounded-xl flex-none gap-1"
                          disabled={sendWish.isPending}
                          onClick={() => send(person.id, person.displayName)}
                        >
                          <MessageCircle className="w-4 h-4" />
                          Felicitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Próximos 30 días ({data?.upcoming?.length ?? 0})
              </h2>
              {(data?.upcoming ?? []).length === 0 ? (
                <div className="glass-panel rounded-2xl p-6 text-center text-muted-foreground text-sm">
                  No hay cumpleaños próximos visibles según la privacidad de tus contactos.
                </div>
              ) : (
                <div className="space-y-2">
                  {(data?.upcoming ?? []).map((person: any) => (
                    <Link
                      key={person.id}
                      href={`/profile/${person.id}`}
                      className="flex items-center gap-3 glass-panel rounded-xl p-3 hover:bg-white/5 transition-colors"
                    >
                      <img
                        src={person.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.id}`}
                        className="w-10 h-10 rounded-full object-cover"
                        alt=""
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{person.displayName}</div>
                        <div className="text-xs text-muted-foreground">{person.birthdayLabel}</div>
                      </div>
                      <span className="text-xs text-primary font-medium flex-none">
                        {person.daysUntil === 1 ? "Mañana" : `En ${person.daysUntil} días`}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Shell>
  );
}
