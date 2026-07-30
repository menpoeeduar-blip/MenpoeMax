import { Shell } from "@/components/layout/Shell";
import {
  useGetNotifications,
  useMarkAllNotificationsRead,
  useAcceptFriendRequest,
  useRejectFriendRequest,
} from "@workspace/api-client-react";
import { useAcceptGroupInvite, useRejectGroupInvite } from "@/lib/invite-api";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Heart, MessageCircle, UserPlus, Share2, Bell, Briefcase,
  CheckCheck, UserCheck, UserX, User, Users, Building2, Globe,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  like:             { icon: Heart,          color: "text-red-400 bg-red-400/10" },
  comment:          { icon: MessageCircle,  color: "text-blue-400 bg-blue-400/10" },
  follow:           { icon: UserPlus,       color: "text-green-400 bg-green-400/10" },
  share:            { icon: Share2,         color: "text-purple-400 bg-purple-400/10" },
  job_match:        { icon: Briefcase,      color: "text-amber-400 bg-amber-400/10" },
  system:           { icon: Bell,           color: "text-primary bg-primary/10" },
  message:          { icon: MessageCircle,  color: "text-cyan-400 bg-cyan-400/10" },
  mention:          { icon: Bell,           color: "text-primary bg-primary/10" },
  page_follow:      { icon: Building2,      color: "text-emerald-400 bg-emerald-400/10" },
  group_invite:     { icon: Users,          color: "text-violet-400 bg-violet-400/10" },
  community_invite: { icon: Globe,          color: "text-sky-400 bg-sky-400/10" },
  page_invite:      { icon: Building2,      color: "text-orange-400 bg-orange-400/10" },
  friend_request:   { icon: UserPlus,       color: "text-green-400 bg-green-400/10" },
};

const INVITE_TYPES = new Set(["group_invite", "community_invite", "page_invite"]);
const FRIEND_REQ_TYPES = new Set(["friend_request", "follow"]);

export default function Notifications() {
  const { data: notifications, isLoading } = useGetNotifications({ query: { refetchInterval: 3_000, staleTime: 0 } });
  const markAllRead = useMarkAllNotificationsRead();
  const acceptFriend = useAcceptFriendRequest();
  const rejectFriend = useRejectFriendRequest();
  const acceptInvite = useAcceptGroupInvite();
  const rejectInvite = useRejectGroupInvite();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [showPrefs, setShowPrefs] = useState(false);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("social_notif_prefs_v1");
      return raw
        ? JSON.parse(raw)
        : { like: true, comment: true, follow: true, message: true, system: true, group_invite: true, community_invite: true, page_invite: true, page_follow: true };
    } catch {
      return { like: true, comment: true, follow: true, message: true, system: true, group_invite: true, community_invite: true, page_invite: true, page_follow: true };
    }
  });

  const savePrefs = (next: Record<string, boolean>) => {
    setPrefs(next);
    try { localStorage.setItem("social_notif_prefs_v1", JSON.stringify(next)); } catch {}
  };

  const allNotifs = (notifications ?? []) as any[];
  const filtered = allNotifs.filter((n) => prefs[n.type] ?? true);
  const unreadCount = allNotifs.filter((n) => !n.isRead).length;

  const markProcessed = (id: string) => setProcessedIds((prev) => new Set(prev).add(id));

  const handleAcceptFriend = (actorId: string, notifId: string, actorName?: string, requestId?: string) => {
    markProcessed(notifId);
    acceptFriend.mutate(
      { requestId: requestId || actorId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
          qc.invalidateQueries({ queryKey: ["my-friends"] });
          qc.invalidateQueries();
          toast({ title: "Solicitud aceptada", description: `¡Ahora eres amigo de ${actorName || "este usuario"}!` });
        },
        onError: () => {
          setProcessedIds((prev) => { const n = new Set(prev); n.delete(notifId); return n; });
          toast({ title: "Error", variant: "destructive" });
        },
      }
    );
  };

  const handleRejectFriend = (actorId: string, notifId: string, requestId?: string) => {
    markProcessed(notifId);
    rejectFriend.mutate(
      { requestId: requestId || actorId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
          toast({ title: "Solicitud rechazada" });
        },
        onError: () => {
          setProcessedIds((prev) => { const n = new Set(prev); n.delete(notifId); return n; });
        },
      }
    );
  };

  const handleAcceptInvite = (notif: any) => {
    markProcessed(notif.id);
    acceptInvite.mutate(
      { inviteId: notif.inviteId, targetId: notif.targetId, targetType: notif.targetType ?? "group" },
      {
        onSuccess: () => {
          qc.invalidateQueries();
          const label = notif.targetType === "community" ? "comunidad" : notif.targetType === "page" ? "página" : "grupo";
          toast({ title: "Invitación aceptada", description: `Te uniste al ${label} "${notif.targetName}"` });
        },
        onError: () => {
          setProcessedIds((prev) => { const n = new Set(prev); n.delete(notif.id); return n; });
          toast({ title: "Error", variant: "destructive" });
        },
      }
    );
  };

  const handleRejectInvite = (notif: any) => {
    markProcessed(notif.id);
    rejectInvite.mutate(
      { inviteId: notif.inviteId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          toast({ title: "Invitación rechazada" });
        },
        onError: () => {
          setProcessedIds((prev) => { const n = new Set(prev); n.delete(notif.id); return n; });
        },
      }
    );
  };

  return (
    <Shell>
      <div className="max-w-2xl mx-auto w-full p-4 pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notificaciones</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">{unreadCount} sin leer</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setShowPrefs((v) => !v)} className="text-xs">
              Preferencias
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate(undefined, { onSuccess: () => qc.invalidateQueries() })}
                disabled={markAllRead.isPending}
                data-testid="button-mark-all-read"
                className="text-xs whitespace-nowrap"
              >
                <CheckCheck className="w-4 h-4 mr-1" /> Marcar leídas
              </Button>
            )}
          </div>
        </div>

        {/* Preferences */}
        {showPrefs && (
          <div className="glass-panel rounded-2xl p-4 mb-4">
            <p className="text-sm font-semibold mb-3">Tipos de notificación</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { key: "like", label: "Me gusta" },
                { key: "comment", label: "Comentarios" },
                { key: "follow", label: "Seguidores" },
                { key: "message", label: "Mensajes" },
                { key: "system", label: "Sistema" },
                { key: "group_invite", label: "Invit. grupos" },
                { key: "community_invite", label: "Invit. comunidades" },
                { key: "page_invite", label: "Invit. páginas" },
                { key: "page_follow", label: "Seg. de páginas" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs[key] ?? true}
                    onChange={(e) => savePrefs({ ...prefs, [key]: e.target.checked })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="h-16 glass-panel rounded-2xl animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
              <Bell className="w-16 h-16 text-muted-foreground/30" />
              <div className="text-center">
                <p className="font-medium">¡Todo al día!</p>
                <p className="text-sm">No hay notificaciones todavía</p>
              </div>
            </div>
          ) : (
            filtered.map((notif: any) => {
              const typeInfo = TYPE_ICONS[notif.type] ?? TYPE_ICONS.system;
              const Icon = typeInfo.icon;
              const isProcessed = processedIds.has(notif.id);
              const actorId = notif.actor?.id || notif.actorId;

              // Detect pending friend request
              const isFriendReq =
                !isProcessed &&
                !notif.isRead &&
                !notif.friendStatus &&
                (notif.type === "friend_request" ||
                  (notif.title?.toLowerCase().includes("solicitud de amistad") &&
                    !notif.title?.toLowerCase().includes("aceptó") &&
                    !notif.title?.toLowerCase().includes("rechazó")));

              // Detect pending group/community/page invite
              const isInvite = !isProcessed && !notif.isRead && INVITE_TYPES.has(notif.type);

              // Readable time
              let timeAgo = "";
              try {
                timeAgo = formatDistanceToNow(new Date(notif.createdAt), { locale: es, addSuffix: true });
              } catch {
                timeAgo = notif.createdAt ?? "";
              }

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 transition-all",
                    notif.isRead || isProcessed ? "opacity-70" : "border border-primary/20",
                  )}
                  data-testid={`notif-${notif.id}`}
                >
                  {/* Left: icon + avatar + text */}
                  <div className="flex items-start gap-3 flex-1 min-w-0 w-full">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-none", typeInfo.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {notif.actor && (
                      <img
                        src={notif.actor.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.actor.id}`}
                        className="w-10 h-10 rounded-full object-cover bg-muted flex-none -ml-3 cursor-pointer ring-2 ring-background hover:scale-105 transition-transform"
                        alt=""
                        onClick={() => setLocation(`/profile/${notif.actor.id}`)}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">
                        {notif.title || notif.text}
                      </p>
                      {notif.body && notif.body !== notif.title && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                    </div>
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex items-center gap-2 mt-1 sm:mt-0 w-full sm:w-auto justify-end flex-wrap">
                    {/* Friend request buttons */}
                    {isFriendReq && actorId && (
                      <>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1 rounded-xl"
                          onClick={() => handleAcceptFriend(actorId, notif.id, notif.actor?.displayName, notif.requestId)}
                          disabled={acceptFriend.isPending}
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Aceptar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1 rounded-xl text-red-400 hover:text-red-300 border-red-500/30"
                          onClick={() => handleRejectFriend(actorId, notif.id, notif.requestId)}
                          disabled={rejectFriend.isPending}
                        >
                          <UserX className="w-3.5 h-3.5" /> Rechazar
                        </Button>
                      </>
                    )}

                    {/* Invite buttons (group / community / page) */}
                    {isInvite && (
                      <>
                        <Button
                          size="sm"
                          className="bg-violet-600 hover:bg-violet-700 text-white h-8 text-xs gap-1 rounded-xl"
                          onClick={() => handleAcceptInvite(notif)}
                          disabled={acceptInvite.isPending}
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Unirse
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1 rounded-xl text-red-400 hover:text-red-300 border-red-500/30"
                          onClick={() => handleRejectInvite(notif)}
                          disabled={rejectInvite.isPending}
                        >
                          <UserX className="w-3.5 h-3.5" /> Rechazar
                        </Button>
                      </>
                    )}

                    {/* View profile button */}
                    {actorId && !isFriendReq && !isInvite && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs gap-1 rounded-xl"
                        onClick={() => setLocation(`/profile/${actorId}`)}
                      >
                        <User className="w-3.5 h-3.5" /> Perfil
                      </Button>
                    )}

                    {/* Unread dot */}
                    {!notif.isRead && !isProcessed && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-none ml-1" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Shell>
  );
}
