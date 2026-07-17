import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { GIFT_CATALOG, formatTokens } from "@/lib/gifts";
import { useGetWallet, useSendPostGift } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Coins, Gift, X } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export type GiftPickerTarget = {
  postId: string;
  receiverId: string;
  receiverName?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: GiftPickerTarget | null;
};

export function GiftPickerSheet({ open, onOpenChange, target }: Props) {
  const { data: wallet } = useGetWallet();
  const sendGift = useSendPostGift();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<string | null>(null);

  const balance = wallet?.balance ?? 0;

  const close = () => {
    setSelected(null);
    onOpenChange(false);
  };

  const handleSend = () => {
    if (!selected || !target) return;
    const gift = GIFT_CATALOG.find((g) => g.id === selected);
    if (!gift) return;
    if (balance < gift.tokens) {
      toast({ title: "Saldo insuficiente", description: "Recarga tokens en tu billetera.", variant: "destructive" });
      return;
    }
    sendGift.mutate(
      { postId: target.postId, giftId: selected, receiverId: target.receiverId },
      {
        onSuccess: () => {
          toast({
            title: "¡Regalo enviado!",
            description: `${gift.emoji} ${gift.name} para ${target.receiverName ?? "el creador"}`,
          });
          close();
        },
        onError: (err: Error) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  if (!target) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) close(); else onOpenChange(true); }}>
      <SheetContent side="bottom" className="glass-panel neon-border border-t rounded-t-3xl h-[85vh] p-0 flex flex-col">
        <SheetHeader className="p-4 pr-14 border-b border-primary/20 relative shrink-0">
          <button
            type="button"
            onClick={close}
            className="absolute right-3 top-3 z-[110] p-2 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <SheetTitle className="neon-title flex items-center gap-2 text-left">
            <Gift className="w-5 h-5 text-accent" />
            Enviar regalo
          </SheetTitle>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground">Para {target.receiverName ?? "creador"}</span>
            <span className="flex items-center gap-1 font-semibold text-primary">
              <Coins className="w-4 h-4" />
              {formatTokens(balance)} tokens
            </span>
          </div>
        </SheetHeader>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {GIFT_CATALOG.map((gift) => {
              const active = selected === gift.id;
              const afford = balance >= gift.tokens;
              return (
                <button
                  key={gift.id}
                  type="button"
                  disabled={!afford}
                  onClick={() => setSelected(gift.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-2xl border transition-all",
                    `bg-gradient-to-br ${gift.gradient}`,
                    active ? "border-primary ring-2 ring-primary/50 scale-105" : "border-white/10",
                    !afford && "opacity-40 grayscale",
                  )}
                >
                  <span className="text-3xl drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{gift.emoji}</span>
                  <span className="text-[10px] font-medium text-center leading-tight">{gift.name}</span>
                  <span className="text-[10px] text-primary font-bold">{formatTokens(gift.tokens)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-primary/20 space-y-2 shrink-0">
          <Button
            className="w-full neon-btn rounded-xl"
            disabled={!selected || sendGift.isPending}
            onClick={handleSend}
          >
            {sendGift.isPending ? "Enviando..." : selected ? "Confirmar regalo" : "Elige un regalo"}
          </Button>
          <button
            type="button"
            className="block w-full text-center text-xs text-primary hover:underline"
            onClick={() => {
              close();
              setLocation("/wallet");
            }}
          >
            Recargar tokens →
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
