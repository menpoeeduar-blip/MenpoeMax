import { Link, Redirect } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useAdminReviewTopUp,
  useGetPendingTopUps,
  useIsAdmin,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { formatTokens } from "@/lib/gifts";
import { Shield, Check, X, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AdminGiftsPage() {
  const { data: isAdmin, isLoading: loadingRole } = useIsAdmin();
  const { data: pending, isLoading } = useGetPendingTopUps();
  const review = useAdminReviewTopUp();
  const { toast } = useToast();

  if (!loadingRole && !isAdmin) {
    return <Redirect to="/" />;
  }

  const handle = (topUpId: string, action: "approve" | "reject") => {
    review.mutate(
      { topUpId, action },
      {
        onSuccess: (r) => {
          toast({
            title: action === "approve" ? "Recarga aprobada" : "Recarga rechazada",
            description: `+${formatTokens(r.tokens)} tokens`,
          });
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Shell>
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-2xl font-bold neon-title">Panel admin — Billetera</h1>
            <p className="text-sm text-muted-foreground">Aprueba o rechaza recargas de tokens</p>
          </div>
        </div>

        <Link href="/wallet" className="text-sm text-primary hover:underline mb-4 inline-block">
          ← Volver a billetera
        </Link>

        {isLoading ? (
          <div className="h-32 glass-panel rounded-2xl animate-pulse" />
        ) : (pending ?? []).length === 0 ? (
          <div className="glass-panel neon-border rounded-2xl p-10 text-center text-muted-foreground">
            <Coins className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay recargas pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(pending ?? []).map((t: any) => (
              <div key={t.id} className="glass-panel neon-border rounded-2xl p-4">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div>
                    <p className="font-semibold neon-text">+{formatTokens(t.tokens)} tokens</p>
                    <p className="text-sm text-muted-foreground">{t.priceLabel} · {t.packageId}</p>
                    <p className="text-xs text-muted-foreground mt-1">Usuario: {t.userId}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(t.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500"
                    disabled={review.isPending}
                    onClick={() => handle(t.id, "approve")}
                  >
                    <Check className="w-4 h-4 mr-1" /> Aprobar
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl border-destructive/50 text-destructive"
                    disabled={review.isPending}
                    onClick={() => handle(t.id, "reject")}
                  >
                    <X className="w-4 h-4 mr-1" /> Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
