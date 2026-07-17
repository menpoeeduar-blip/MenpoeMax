import { Shell } from "@/components/layout/Shell";
import {
  useGetWallet,
  useGetWalletTransactions,
  useRequestWalletTopUp,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { formatTokens, TOKEN_TOPUP_PACKAGES } from "@/lib/gifts";
import { Coins, Clock, Gift, ArrowDownLeft, ArrowUpRight, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function WalletPage() {
  const { data: wallet, isLoading } = useGetWallet();
  const { data: transactions } = useGetWalletTransactions();
  const requestTopUp = useRequestWalletTopUp();
  const { toast } = useToast();

  const handleRequest = (packageId: string) => {
    requestTopUp.mutate(
      { packageId },
      {
        onSuccess: (t) => {
          toast({
            title: "Solicitud enviada",
            description: `+${formatTokens(t.tokens)} tokens pendientes de aprobación del admin.`,
          });
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Shell>
      <div className="max-w-lg mx-auto p-4 pb-24">
        <h1 className="text-3xl font-bold neon-title mb-2">Billetera</h1>
        <p className="text-sm text-muted-foreground neon-subtle mb-6">
          Tokens para enviar regalos en publicaciones. Las recargas las aprueba un administrador.
        </p>

        <div className="glass-panel glass-panel-glow neon-border rounded-3xl p-6 mb-6 text-center">
          <Coins className="w-12 h-12 mx-auto mb-2 text-primary drop-shadow-[0_0_16px_hsl(var(--primary)/0.7)]" />
          <p className="text-sm text-muted-foreground">Saldo disponible</p>
          <p className="text-4xl font-bold neon-title mt-1">
            {isLoading ? "…" : formatTokens(wallet?.balance ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">tokens</p>
        </div>

        {wallet?.pendingTopUp && (
          <div className="glass-panel rounded-2xl p-4 mb-6 flex items-start gap-3 border border-amber-500/30 bg-amber-500/10">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Recarga pendiente</p>
              <p className="text-xs text-muted-foreground mt-1">
                +{formatTokens(wallet.pendingTopUp.tokens)} tokens ({wallet.pendingTopUp.priceLabel}) — esperando
                aprobación del admin.
              </p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-sm font-semibold neon-text mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            Recargar tokens
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {TOKEN_TOPUP_PACKAGES.map((pack) => (
              <button
                key={pack.id}
                type="button"
                disabled={!!wallet?.pendingTopUp || requestTopUp.isPending}
                onClick={() => handleRequest(pack.id)}
                className="glass-panel neon-border rounded-2xl p-4 text-left hover:border-primary/50 transition-all disabled:opacity-50"
              >
                <p className="font-bold neon-text">{pack.label}</p>
                <p className="text-sm text-primary">{pack.priceLabel}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{pack.note}</p>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 text-center">
            Demo sin pago real — el admin aprueba desde el panel.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold neon-text mb-3 flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Movimientos
          </h2>
          <div className="space-y-2">
            {(transactions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin movimientos aún</p>
            ) : (
              (transactions ?? []).map((tx: any) => (
                <div key={tx.id} className="glass-panel rounded-xl p-3 flex items-center gap-3">
                  {tx.amount > 0 ? (
                    <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-pink-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">
                      {tx.type === "gift_sent" && "Regalo enviado"}
                      {tx.type === "gift_received" && "Regalo recibido"}
                      {tx.type === "topup" && "Recarga aprobada"}
                      {tx.type === "admin_adjust" && "Ajuste admin"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(tx.createdAt), "d MMM, HH:mm", { locale: es })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${tx.amount > 0 ? "text-emerald-400" : "text-pink-400"}`}>
                    {tx.amount > 0 ? "+" : ""}
                    {formatTokens(tx.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
