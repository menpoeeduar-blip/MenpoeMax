import { useState } from "react";
import { Link } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useGetBirthdays, useSendBirthdayWish } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cake, Gift, Calendar, PartyPopper, MessageCircle, Sparkles, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GiftPickerSheet, type GiftPickerTarget } from "@/components/gifts/GiftPickerSheet";

const WISH_PRESETS = [
  "🎉 ¡Feliz cumpleaños! Pásala increíble.",
  "🎂 ¡Que cumplas muchos más llenos de éxito!",
  "🎁 ¡Te mando un abrazo gigante en tu día!",
  "✨ ¡Bendiciones y los mejores deseos hoy!",
];

export default function Birthdays() {
  const { data, isLoading } = useGetBirthdays();
  const sendWish = useSendBirthdayWish();
  const { toast } = useToast();
  const [wishText, setWishText] = useState<Record<string, string>>({});
  const [giftTarget, setGiftTarget] = useState<GiftPickerTarget | null>(null);

  const send = (userId: string, name: string) => {
    const text = wishText[userId]?.trim() || `¡Feliz cumpleaños, ${name}! 🎂`;
    sendWish.mutate(
      { userId, message: text },
      {
        onSuccess: () => {
          toast({ title: "¡Felicitación enviada! 🎉", description: `Tu mensaje llegó a ${name}.` });
          setWishText((p) => ({ ...p, [userId]: "" }));
        },
      },
    );
  };

  const applyPreset = (userId: string, preset: string) => {
    setWishText((p) => ({ ...p, [userId]: preset }));
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto w-full p-4 pb-24">
        {/* Banner Hero */}
        <div className="glass-panel glass-panel-glow rounded-3xl p-6 mb-8 border border-primary/30 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shadow-[0_0_20px_hsl(var(--accent)/0.3)]">
              <Cake className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold neon-title">Cumpleaños</h1>
              <p className="text-xs text-muted-foreground">Celebra y felicita a tus amigos en su día especial</p>
            </div>
          </div>
        </div>

        {data?.isMyBirthdayToday && (
          <div className="glass-panel glass-panel-glow rounded-3xl p-8 mb-8 border border-primary/40 text-center relative overflow-hidden">
            <PartyPopper className="w-14 h-14 mx-auto text-primary mb-3 animate-bounce" />
            <h2 className="text-2xl font-extrabold neon-text">¡Hoy es tu cumpleaños! 🎂</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {data.myBirthdayLabel} — ¡Toda la comunidad MenpoeMax te desea un día extraordinario!
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 glass-panel rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Cumpleaños de hoy */}
            <section className="mb-10">
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                <Gift className="w-4 h-4 text-accent" />
                Cumpleaños de Hoy ({data?.today?.length ?? 0})
              </h2>
              {(data?.today ?? []).length === 0 ? (
                <div className="glass-panel neon-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
                  Ninguno de tus contactos cumple años hoy.
                </div>
              ) : (
                <div className="space-y-4">
                  {(data?.today ?? []).map((person: any) => (
                    <div key={person.id} className="glass-panel neon-border rounded-3xl p-5 border-primary/30">
                      <div className="flex items-center gap-4 mb-4">
                        <Link href={`/profile/${person.id}`}>
                          <div className="relative">
                            <img
                              src={person.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.id}`}
                              className="w-16 h-16 rounded-full ring-2 ring-primary object-cover shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                              alt=""
                            />
                            <span className="absolute -bottom-1 -right-1 text-lg">🎂</span>
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/profile/${person.id}`} className="font-bold text-base hover:text-primary transition-colors">
                            {person.displayName}
                          </Link>
                          <p className="text-xs text-muted-foreground">@{person.username}</p>
                          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-accent/20 text-accent border border-accent/30">
                            ¡Cumpleaños hoy!
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setGiftTarget({ type: "user", id: person.id, title: person.displayName })}
                          className="rounded-xl border-accent/40 text-accent hover:bg-accent/20 text-xs font-semibold gap-1.5"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          Regalar
                        </Button>
                      </div>

                      {/* Chips de mensajes rápidos */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {WISH_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            onClick={() => applyPreset(person.id, preset)}
                            className="text-[11px] px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-foreground transition-all truncate max-w-full"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      {/* Input de felicitación */}
                      <div className="flex gap-2">
                        <Input
                          value={wishText[person.id] ?? ""}
                          onChange={(e) => setWishText((p) => ({ ...p, [person.id]: e.target.value }))}
                          placeholder="Escribe una felicitación personalizada..."
                          className="rounded-xl bg-white/5 border-border/50 text-sm h-10"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") send(person.id, person.displayName);
                          }}
                        />
                        <Button
                          size="sm"
                          className="rounded-xl flex-none gap-1.5 neon-btn bg-primary text-black font-bold h-10 px-4"
                          disabled={sendWish.isPending}
                          onClick={() => send(person.id, person.displayName)}
                        >
                          <Send className="w-4 h-4" />
                          Felicitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Próximos cumpleaños */}
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
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
                      className="flex items-center gap-3 glass-panel neon-border rounded-2xl p-3.5 hover:bg-white/5 transition-all group"
                    >
                      <img
                        src={person.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.id}`}
                        className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform"
                        alt=""
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                          {person.displayName}
                        </div>
                        <div className="text-xs text-muted-foreground">{person.birthdayLabel}</div>
                      </div>
                      <span className="text-xs text-primary font-bold px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                        {person.daysUntil === 1 ? "Mañana" : `En ${person.daysUntil} días`}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* Gift Sheet Modal */}
        {giftTarget && (
          <GiftPickerSheet
            target={giftTarget}
            onClose={() => setGiftTarget(null)}
          />
        )}
      </div>
    </Shell>
  );
}
