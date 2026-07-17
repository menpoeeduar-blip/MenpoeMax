import { useState } from "react";
import { Link } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useGetMyFriends,
  useAcceptFriendRequest,
  useRejectFriendRequest,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, MessageSquare, Users, Search, Cake } from "lucide-react";

export default function Friends() {
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");
  const [search, setSearch] = useState("");
  const { data } = useGetMyFriends();
  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const { toast } = useToast();

  const friendsList = (data as any)?.friends ?? [];
  const requestsList = (data as any)?.incoming ?? [];
  const filteredFriends = friendsList.filter((friend: any) =>
    !search ||
    friend.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    friend.username?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAccept = (requestId: string) => {
    acceptRequest.mutate(
      { requestId },
      {
        onSuccess: () => toast({ title: "Solicitud aceptada", description: "Ya sois amigos." }),
      }
    );
  };

  const handleReject = (requestId: string) => {
    rejectRequest.mutate(
      { requestId },
      { onSuccess: () => toast({ title: "Solicitud rechazada" }) }
    );
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto w-full p-4 pb-24">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h1 className="text-2xl font-bold neon-title">Amigos</h1>
          <Link href="/birthdays">
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
              <Cake className="w-4 h-4" />
              Cumpleaños
            </Button>
          </Link>
        </div>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar perfiles en tus amigos..."
            className="pl-9 h-10 rounded-xl bg-white/5"
          />
        </div>

        <div className="flex gap-2 mb-6">
          {(["friends", "requests"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-[0_0_14px_hsl(var(--primary)/0.4)]"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              {tab === "friends" ? "Mis amigos" : `Solicitudes ${requestsList.length ? `(${requestsList.length})` : ""}`}
            </button>
          ))}
        </div>

        {activeTab === "friends" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredFriends.length > 0 ? (
              filteredFriends.map((friend: any) => (
                <div key={friend.id} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
                  <img
                    src={friend.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`}
                    className="w-12 h-12 rounded-full object-cover bg-muted ring-2 ring-primary/30"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate neon-text">{friend.displayName}</div>
                    <div className="text-xs text-muted-foreground">@{friend.username}</div>
                  </div>
                  <Link href="/messages">
                    <Button size="icon" variant="ghost" className="rounded-full" title="Enviar mensaje">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aún no tienes amigos agregados.</p>
                <p className="text-sm mt-1">Explora perfiles y envía solicitudes para conectar.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "requests" && (
          <div className="space-y-3">
            {requestsList.length > 0 ? (
              requestsList.map((req: any) => (
                <div key={req.id} className="glass-panel rounded-2xl p-4 flex items-center gap-3" data-testid={`friend-request-${req.id}`}>
                  <img
                    src={req.sender?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.requesterId ?? req.id}`}
                    className="w-12 h-12 rounded-full object-cover bg-muted"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{req.sender?.displayName ?? "Usuario"}</div>
                    <div className="text-xs text-muted-foreground">Quiere ser tu amigo</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      disabled={acceptRequest.isPending}
                      onClick={() => handleAccept(req.id)}
                      data-testid={`accept-request-${req.id}`}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={rejectRequest.isPending}
                      onClick={() => handleReject(req.id)}
                      data-testid={`reject-request-${req.id}`}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No hay solicitudes pendientes</p>
                <p className="text-sm mt-1">Cuando alguien te envíe una solicitud, aparecerá aquí.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
