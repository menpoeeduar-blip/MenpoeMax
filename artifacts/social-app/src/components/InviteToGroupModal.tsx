import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchUsers, useGetMe } from "@workspace/api-client-react";
import { useInviteToGroup } from "@/lib/invite-api";
import { Search, UserPlus, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Target = {
  id: string;
  name: string;
  type: "group" | "community" | "page";
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
};

export function InviteToGroupModal({ open, onOpenChange, target }: Props) {
  const [search, setSearch] = useState("");
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const { data: me } = useGetMe();
  const { data: searchResult } = useSearchUsers({ q: search || "a" });
  const invite = useInviteToGroup();
  const { toast } = useToast();

  const meId = (me as any)?.id ?? "";

  const filtered = useMemo(() => {
    const users = (searchResult as any)?.users ?? (Array.isArray(searchResult) ? searchResult : []);
    return (users as any[])
      .filter((u) => u.id !== meId)
      .slice(0, 20);
  }, [searchResult, meId]);

  const handleInvite = (userId: string, userName: string) => {
    invite.mutate(
      { userId, targetId: target.id, targetName: target.name, targetType: target.type },
      {
        onSuccess: () => {
          setInvited((prev) => new Set(prev).add(userId));
          toast({ title: `Invitación enviada a ${userName}` });
        },
        onError: () => {
          toast({ title: "Error al enviar invitación", variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="neon-title text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Invitar a {target.name}
          </DialogTitle>
        </DialogHeader>

        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario..."
            className="pl-9 rounded-xl bg-white/5"
          />
        </div>

        <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              No se encontraron usuarios
            </p>
          ) : (
            filtered.map((u: any) => {
              const isInvited = invited.has(u.id);
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 glass-panel rounded-xl p-2.5"
                >
                  <img
                    src={
                      u.avatarUrl ??
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`
                    }
                    className="w-9 h-9 rounded-full object-cover flex-none"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {u.displayName ?? u.username}
                    </p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isInvited ? "outline" : "default"}
                    disabled={isInvited || invite.isPending}
                    onClick={() => handleInvite(u.id, u.displayName ?? u.username)}
                    className="rounded-xl h-8 text-xs gap-1"
                  >
                    {isInvited ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Enviado
                      </>
                    ) : invite.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" /> Invitar
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
