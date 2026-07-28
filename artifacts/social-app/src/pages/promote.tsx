import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { useGetPromoteCredits, useBoostPost, useGetMe, useGetUserPosts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, TrendingUp, Users, Target, CheckCircle2, Megaphone, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Promote() {
  const { data: creditsData } = useGetPromoteCredits();
  const { data: me } = useGetMe();
  const { data: userPosts, isLoading: postsLoading } = useGetUserPosts(me?.id || "");
  const boost = useBoostPost();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "pro" | "ultra">("standard");

  const PLANS = {
    standard: { label: "Básico", credits: 25, reach: "2,500 - 5,000 impresiones", duration: "3 días" },
    pro: { label: "Destacado", credits: 50, reach: "7,000 - 12,000 impresiones", duration: "7 días" },
    ultra: { label: "Máximo Alcance", credits: 100, reach: "18,000 - 30,000 impresiones", duration: "14 días" },
  };

  const handleBoost = () => {
    if (!selectedPostId) {
      toast({ title: "Selecciona una publicación", description: "Elige la publicación de tu muro que deseas impulsar.", variant: "destructive" });
      return;
    }

    const plan = PLANS[selectedPlan];
    boost.mutate(
      { postId: selectedPostId, credits: plan.credits },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["feed"] });
          qc.invalidateQueries({ queryKey: ["promote-credits"] });
          toast({
            title: "🚀 ¡Campaña Activada!",
            description: `Tu publicación fue impulsada con el plan ${plan.label} durante ${plan.duration}.`,
          });
          setSelectedPostId("");
        },
        onError: (e: any) => toast({ title: "Error", description: e.message || "No se pudo impulsar", variant: "destructive" }),
      }
    );
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto w-full p-4 pb-24">
        {/* Banner Hero */}
        <div className="glass-panel glass-panel-glow rounded-3xl p-6 mb-8 border border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-accent/20 via-primary/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shadow-[0_0_20px_hsl(var(--accent)/0.3)]">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold neon-title">Centro de Promoción</h1>
              <p className="text-xs text-muted-foreground">Multiplica el alcance de tu contenido en la comunidad MenpoeMax</p>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="glass-panel neon-border rounded-2xl p-5 text-center sm:col-span-1">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-accent" />
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Créditos de Impulso</p>
            <p className="text-3xl font-extrabold neon-title mt-1">{creditsData?.balance ?? 100}</p>
            <span className="inline-block mt-1 text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              Activos (Modo Demo)
            </span>
          </div>

          <div className="glass-panel neon-border rounded-2xl p-5 sm:col-span-2 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
              <Target className="w-4 h-4" /> ¿Cómo funciona el impulso?
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tus publicaciones destacadas aparecerán en la sección "Para ti" de todos los usuarios con un distintivo <span className="text-accent font-semibold">Promocionado</span> de alto impacto visual.
            </p>
          </div>
        </div>

        {/* Paso 1: Seleccionar publicación */}
        <div className="glass-panel neon-border rounded-3xl p-6 mb-6 space-y-4">
          <h2 className="text-base font-bold neon-text flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            1. Selecciona la publicación a impulsar
          </h2>

          {postsLoading ? (
            <div className="h-24 glass-panel rounded-2xl animate-pulse" />
          ) : (userPosts ?? []).length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
              Aún no tienes publicaciones en tu muro. Crea una publicación para poder promocionarla.
            </div>
          ) : (
            <div className="grid gap-3 max-h-60 overflow-y-auto pr-1">
              {(userPosts ?? []).map((post: any) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPostId(post.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    selectedPostId === post.id
                      ? "border-primary bg-primary/15 shadow-[0_0_16px_hsl(var(--primary)/0.3)]"
                      : "border-border/50 hover:border-primary/40 bg-white/5"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{post.content || "(Publicación con imagen/media)"}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {post.likesCount || 0} Me gusta · {post.commentsCount || 0} comentarios
                    </p>
                  </div>
                  {selectedPostId === post.id && (
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paso 2: Seleccionar Plan */}
        <div className="glass-panel neon-border rounded-3xl p-6 mb-6 space-y-4">
          <h2 className="text-base font-bold neon-text flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            2. Elige tu Plan de Alcance
          </h2>

          <div className="grid sm:grid-cols-3 gap-3">
            {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((key) => {
              const p = PLANS[key];
              const isSelected = selectedPlan === key;
              return (
                <div
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-accent bg-accent/15 shadow-[0_0_20px_hsl(var(--accent)/0.3)] scale-[1.02]"
                      : "border-border/50 hover:border-accent/40 bg-white/5"
                  }`}
                >
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-accent">{p.label}</span>
                    <p className="text-2xl font-black text-white mt-1">{p.credits} <span className="text-xs font-normal text-muted-foreground">créditos</span></p>
                    <p className="text-xs text-emerald-400 font-semibold mt-2">Est. {p.reach}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-white/10">Duración: {p.duration}</p>
                </div>
              );
            })}
          </div>

          <Button
            onClick={handleBoost}
            disabled={boost.isPending || !selectedPostId}
            className="w-full h-12 rounded-2xl neon-btn bg-gradient-to-r from-primary via-fuchsia-500 to-accent text-white font-extrabold text-base shadow-lg mt-4"
          >
            {boost.isPending ? "Activando campaña..." : `Lanzar Campaña (${PLANS[selectedPlan].credits} créditos)`}
          </Button>
        </div>
      </div>
    </Shell>
  );
}
