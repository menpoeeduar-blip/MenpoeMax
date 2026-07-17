import { useMemo, useState } from "react";
import { useGetMyFriends, useStartConversationWithUser } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquarePlus, Search, Users, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Person = {
  id: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  online?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onStarted: (conversationId: string) => void;
};

/** Modal Nuevo chat: amigos + buscador (no choca con el FAB de IA). */
export function NewChatDialog({ open, onClose, onStarted }: Props) {
  const { data, isLoading } = useGetMyFriends({ query: { enabled: open } });
  const startConv = useStartConversationWithUser();
  const { toast } = useToast();
  const [q, setQ] = useState("");

  const friends = (data?.friends || []) as Person[];
  const people = ((data as any)?.people || friends) as Person[];

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term.length >= 1 ? people : friends.length ? friends : people;
    if (!term) return base;
    return base.filter(
      (p) =>
        p.displayName?.toLowerCase().includes(term) ||
        p.username?.toLowerCase().includes(term),
    );
  }, [q, friends, people]);

  if (!open) return null;

  const pick = (userId: string) => {
    startConv.mutate(
      { userId },
      {
        onSuccess: (res) => {
          onStarted(res.conversationId);
          onClose();
          setQ("");
        },
        onError: (e: Error) =>
          toast({ title: "No se pudo iniciar el chat", description: e.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="glass-panel neon-border neon-run rounded-2xl w-full max-w-md max-h-[75dvh] flex flex-col overflow-hidden mb-16 md:mb-0"
        onClick={(e) => e.stopPropagation()}
        data-testid="new-chat-dialog"
      >
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm">Nuevo chat</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-border/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar amigo o persona..."
              className="pl-9 h-10 rounded-xl bg-white/5"
              autoFocus
              data-testid="input-new-chat-search"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 px-1">
            {friends.length > 0
              ? `${friends.length} amigo${friends.length === 1 ? "" : "s"} · también puedes buscar a quienes sigues`
              : "Busca personas que sigues o con amistad mutua"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-10 px-4 text-muted-foreground text-sm">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No hay coincidencias</p>
              <p className="text-xs mt-1">Agréga amigos o síguelos para chatear más fácil</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {list.map((p) => {
                const isFriend = friends.some((f) => f.id === p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={startConv.isPending}
                      onClick={() => pick(p.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/8 text-left transition-colors"
                      data-testid={`new-chat-user-${p.id}`}
                    >
                      <div className="relative flex-none">
                        <img
                          src={p.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`}
                          className="w-11 h-11 rounded-full object-cover bg-muted"
                          alt=""
                        />
                        {p.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p.displayName || "Usuario"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{p.username || "user"}
                          {isFriend ? " · Amigo" : ""}
                        </p>
                      </div>
                      <span className="text-xs text-primary">Chatear</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-3 border-t border-border/20">
          <Button type="button" variant="ghost" className="w-full rounded-xl" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
