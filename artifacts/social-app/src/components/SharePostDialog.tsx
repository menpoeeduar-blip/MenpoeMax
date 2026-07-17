import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useSharePostTo,
  useGetCommunities,
  useGetMyFriends,
  useGetMe,
} from "@workspace/api-client-react";
import { shareEntity } from "@/lib/share";
import { useToast } from "@/hooks/use-toast";
import { Home, Users, MessageSquare, Link2, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: { id: string; content?: string; sharesCount?: number };
};

export function SharePostDialog({ open, onOpenChange, post }: Props) {
  const shareTo = useSharePostTo();
  const { data: me } = useGetMe();
  const { data: friendsData } = useGetMyFriends();
  const { data: communities } = useGetCommunities();
  const { toast } = useToast();
  const [communityId, setCommunityId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [caption, setCaption] = useState("");

  const friends = ((friendsData as any)?.friends ?? []) as { id: string; displayName?: string }[];
  const joinedCommunities = ((communities ?? []) as any[]).filter((c) => c.isJoined);

  const runShare = (
    destination: "feed" | "community" | "message" | "link",
    extra?: { communityId?: string; targetUserId?: string }
  ) => {
    if (destination === "link") {
      shareEntity({
        title: "Publicación en MenpoeSocial",
        text: post.content?.slice(0, 120) || "Mira esta publicación",
        path: "/",
      }).then((r) => {
        shareTo.mutate({ postId: post.id, destination: "link" });
        toast({
          title: r.ok ? "Enlace copiado" : "No se pudo compartir",
          description: r.ok ? "El enlace está en tu portapapeles." : undefined,
        });
        onOpenChange(false);
      });
      return;
    }
    if (destination === "community" && !extra?.communityId) {
      toast({ title: "Elige una comunidad", variant: "destructive" });
      return;
    }
    if (destination === "message" && !extra?.targetUserId) {
      toast({ title: "Elige un amigo", variant: "destructive" });
      return;
    }
    shareTo.mutate(
      {
        postId: post.id,
        destination,
        communityId: extra?.communityId,
        targetUserId: extra?.targetUserId,
        caption: caption.trim() || undefined,
      },
      {
        onSuccess: (res: { destination?: string }) => {
          const labels: Record<string, string> = {
            feed: "republicada en tu muro",
            community: "publicada en el grupo",
            message: "enviada por mensaje",
          };
          toast({
            title: "¡Compartido!",
            description: `La publicación fue ${labels[res.destination ?? ""] || "compartida"}.`,
          });
          onOpenChange(false);
          setCaption("");
        },
        onError: () => {
          toast({ title: "Error al compartir", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="neon-title text-lg">Compartir publicación</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {post.content || "Contenido multimedia"}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button
            variant="outline"
            className="h-auto py-3 flex-col gap-1 rounded-xl"
            disabled={shareTo.isPending}
            onClick={() => runShare("feed")}
            data-testid="share-to-feed"
          >
            {shareTo.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Home className="w-5 h-5 text-primary" />}
            <span className="text-xs">Mi muro</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3 flex-col gap-1 rounded-xl"
            disabled={shareTo.isPending}
            onClick={() => runShare("link")}
            data-testid="share-to-link"
          >
            <Link2 className="w-5 h-5 text-accent" />
            <span className="text-xs">Enlace</span>
          </Button>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Comentario opcional
          </label>
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Añade tu opinión..."
            className="rounded-xl bg-white/5"
          />
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Grupo
          </p>
          {joinedCommunities.length === 0 ? (
            <p className="text-xs text-muted-foreground">Únete a una comunidad para compartir ahí.</p>
          ) : (
            <div className="flex gap-2">
              <select
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
                className="flex-1 h-9 rounded-xl bg-white/5 border border-border px-2 text-sm"
              >
                <option value="">Seleccionar grupo...</option>
                {joinedCommunities.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={!communityId || shareTo.isPending}
                onClick={() => runShare("community", { communityId })}
                data-testid="share-to-community"
              >
                Enviar
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" /> Mensaje privado
          </p>
          {friends.length === 0 ? (
            <p className="text-xs text-muted-foreground">Acepta solicitudes de amistad para enviar por mensaje.</p>
          ) : (
            <div className="flex gap-2">
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="flex-1 h-9 rounded-xl bg-white/5 border border-border px-2 text-sm"
              >
                <option value="">Seleccionar amigo...</option>
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>{f.displayName ?? f.id}</option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={!targetUserId || shareTo.isPending}
                onClick={() => runShare("message", { targetUserId })}
                data-testid="share-to-message"
              >
                Enviar
              </Button>
            </div>
          )}
        </div>

        {me && (
          <p className="text-[10px] text-muted-foreground mt-3 text-center">
            Compartido como @{(me as any).username}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
