import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { useGetPromoteCredits, useBoostPost } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Promote() {
  const { data } = useGetPromoteCredits();
  const boost = useBoostPost();
  const { toast } = useToast();
  const [postId, setPostId] = useState("");

  const handleBoost = () => {
    if (!postId.trim()) return;
    boost.mutate(
      { postId: postId.trim(), credits: 25 },
      {
        onSuccess: () => toast({ title: "Publicación impulsada", description: "Tu post tendrá más alcance durante 7 días." }),
        onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <Shell>
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <h1 className="text-3xl font-bold neon-title mb-2">Promocionar contenido</h1>
        <p className="text-sm text-muted-foreground neon-subtle mb-6">Impulsa publicaciones con créditos (modo demo, sin cobro real).</p>

        <div className="glass-panel neon-border rounded-2xl p-6 mb-6 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-accent drop-shadow-[0_0_12px_hsl(var(--accent)/0.8)]" />
          <p className="text-sm text-muted-foreground">Créditos disponibles</p>
          <p className="text-4xl font-bold neon-title">{data?.balance ?? 0}</p>
        </div>

        <div className="glass-panel neon-border rounded-2xl p-5 mb-6 space-y-3">
          <p className="font-semibold neon-text flex items-center gap-2"><Zap className="w-5 h-5 text-primary" />Impulsar publicación</p>
          <Input value={postId} onChange={(e) => setPostId(e.target.value)} placeholder="ID de la publicación" className="neon-input rounded-xl" />
          <Button onClick={handleBoost} disabled={boost.isPending} className="neon-btn w-full rounded-xl">Impulsar (25 créditos)</Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(data?.packages ?? []).map((pkg: any) => (
            <div key={pkg.id} className="glass-panel neon-border rounded-2xl p-4 text-center">
              <p className="font-bold neon-text">{pkg.credits} créditos</p>
              <p className="text-sm text-primary">{pkg.price}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Próximamente</p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
